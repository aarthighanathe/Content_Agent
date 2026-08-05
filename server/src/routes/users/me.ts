import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { jobsMemory } from '../jobs/index.js';
import type { PipelineOutput } from '../../lib/pipeline.js';
import { db } from '../../db/index.js';
import { getUserProfile } from './profileStore.js';
import { readOutputs } from '../content/shared.js';

const router = Router();

// ─── Feature: per-dimension quality trend + prediction tier aggregation ──────
// WHY these types live here, not a shared types file: they're the exact shape
// this one route computes and returns; client/src/types/api.ts mirrors them
// for the response contract, which is the usual split in this codebase (see
// ProfileStats there already).
const DIMENSION_KEYS = ['hookStrength', 'platformCompliance', 'brandVoiceMatch', 'valueDelivery', 'ctaClarity'] as const;
type DimensionKey = (typeof DIMENSION_KEYS)[number];
type DimensionAverages = Record<DimensionKey, number>;

interface DimensionTrendPoint extends DimensionAverages {
  date: string;
  jobId: string;
}

interface PredictionTierCounts {
  high: number;
  medium: number;
  low: number;
}

// WHY a narrow runtime shape guard, not a zod schema: this reads back content
// this same server wrote (critic/predictor output), already validated once by
// agentResponses.ts's schemas at write time — a lightweight structural check
// here is defense against the jsonb column holding an older/differently-shaped
// row (e.g. pre-migration data), not a first line of input validation.
function isDimensionScores(v: unknown): v is DimensionAverages {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return DIMENSION_KEYS.every((k) => typeof obj[k] === 'number');
}

function extractScores(content: unknown): DimensionAverages | null {
  if (typeof content !== 'object' || content === null) return null;
  const scores = (content as Record<string, unknown>).scores;
  return isDimensionScores(scores) ? scores : null;
}

function isPredictionTier(v: unknown): v is 'high' | 'medium' | 'low' {
  return v === 'high' || v === 'medium' || v === 'low';
}

// WHY totalScore is read as number | null, not defaulted to 0 inline: a critic
// row that scored a legitimate 0 (every dimension clamped to 0 by critic.ts's
// clampScore on garbage LLM output) must still be counted in avgScore/
// platformStats — treating "score computed as 0" the same as "no score
// present" silently drops the worst-scoring content from the average instead
// of dragging it down, which is exactly backwards for a quality metric.
function extractScore(critique: PipelineOutput | undefined): number | null {
  if (!critique) return null;
  if (typeof critique.qualityScore === 'number') return critique.qualityScore;
  const c = critique.content;
  if (c !== null && typeof c === 'object' && 'totalScore' in c) {
    const ts = (c as Record<string, unknown>).totalScore;
    return typeof ts === 'number' ? ts : null;
  }
  return null;
}

// Normalized shape both the DB branch and the jobsMemory-fallback branch
// reduce their differently-typed job records into, so the actual stats
// aggregation below runs exactly once instead of being duplicated per branch
// (previously ~100 lines of near-identical loop logic in each branch, which
// already had to be edited in lockstep once for this same feature).
interface StatsJob {
  id: string;
  platform: string;
  createdAt: string;
  outputs: PipelineOutput[];
}

interface AggregatedStats {
  totalPosts: number;
  avgScore: number;
  mostUsedPlatform: string;
  platformBreakdown: Array<{ platform: string; avgScore: number; count: number }>;
  dimensionAverages: DimensionAverages | null;
  dimensionTrend: DimensionTrendPoint[];
  predictionTierCounts: PredictionTierCounts;
  latestPredictionTopReason: string | null;
}

function aggregateStats(jobs: StatsJob[]): AggregatedStats {
  const platformCounts: Record<string, number> = {};
  const platformStats: Record<string, { totalScore: number; count: number }> = {};
  const allScores: number[] = [];
  const dimensionSums: DimensionAverages = { hookStrength: 0, platformCompliance: 0, brandVoiceMatch: 0, valueDelivery: 0, ctaClarity: 0 };
  const dimensionCounts: DimensionAverages = { hookStrength: 0, platformCompliance: 0, brandVoiceMatch: 0, valueDelivery: 0, ctaClarity: 0 };
  let dimensionTrend: DimensionTrendPoint[] = [];
  const predictionTierCounts: PredictionTierCounts = { high: 0, medium: 0, low: 0 };
  let latestPredictionTopReason: string | null = null;

  // WHY jobs must already be chronologically ascending: both callers below
  // (the DB query's orderBy and jobsMemory's insertion order via Map) hand
  // this function jobs oldest-first, so "last prediction seen in this loop"
  // is the most recent job's prediction — simpler and more robust than a
  // timestamp comparison that would misbehave on a null createdAt.
  for (const job of jobs) {
    platformCounts[job.platform] = (platformCounts[job.platform] || 0) + 1;
    if (!platformStats[job.platform]) platformStats[job.platform] = { totalScore: 0, count: 0 };

    const critique = job.outputs.find((o) => o.outputType === 'critique');
    const score = extractScore(critique);
    if (score !== null) {
      allScores.push(score);
      platformStats[job.platform].totalScore += score;
      platformStats[job.platform].count += 1;
    }

    // Per-dimension aggregation (radar-friendly averages + trend-friendly series)
    const dims = critique ? extractScores(critique.content) : null;
    if (dims) {
      DIMENSION_KEYS.forEach((k) => { dimensionSums[k] += dims[k]; dimensionCounts[k] += 1; });
      dimensionTrend.push({ date: job.createdAt, jobId: job.id, ...dims });
    }

    // Prediction tier distribution — 'prediction' rows only exist for jobs
    // created after this feature shipped (2026-08-04); older jobs simply
    // contribute nothing here, which is the expected empty-state case.
    const prediction = job.outputs.find((o) => o.outputType === 'prediction');
    if (prediction && typeof prediction.content === 'object' && prediction.content !== null) {
      const tier = (prediction.content as Record<string, unknown>).tier;
      if (isPredictionTier(tier)) {
        predictionTierCounts[tier] += 1;
        const reason = (prediction.content as Record<string, unknown>).topReason;
        latestPredictionTopReason = typeof reason === 'string' && reason ? reason : null;
      }
    }
  }

  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;
  // WHY named mostUsedPlatform, not bestPlatform: this is picked by post count,
  // not quality — a platform someone spams low-quality posts to would otherwise
  // misleadingly show as "best." Renamed rather than re-ranked by avgScore so the
  // label always matches what it actually measures.
  const mostUsedPlatform =
    Object.entries(platformCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
  const platformBreakdown = Object.entries(platformStats)
    .map(([platform, data]) => ({
      platform,
      avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
      count: platformCounts[platform] || 0,
    }))
    .sort((a, b) => b.count - a.count);

  const hasDimensionData = DIMENSION_KEYS.some((k) => dimensionCounts[k] > 0);
  const dimensionAverages = hasDimensionData
    ? DIMENSION_KEYS.reduce((acc, k) => {
        acc[k] = dimensionCounts[k] > 0 ? Math.round((dimensionSums[k] / dimensionCounts[k]) * 10) / 10 : 0;
        return acc;
      }, {} as DimensionAverages)
    : null;

  // WHY cap at the most recent 50 points: dimensionTrend is built by iterating
  // jobs in chronological order (asc), so slicing the tail keeps the most
  // recent history for a line chart without an unbounded response payload for
  // high-volume accounts — 50 points is already dense for a trend line.
  const MAX_TREND_POINTS = 50;
  if (dimensionTrend.length > MAX_TREND_POINTS) {
    dimensionTrend = dimensionTrend.slice(-MAX_TREND_POINTS);
  }

  return {
    totalPosts: jobs.length,
    avgScore,
    mostUsedPlatform,
    platformBreakdown,
    dimensionAverages,
    dimensionTrend,
    predictionTierCounts,
    latestPredictionTopReason,
  };
}

// GET /api/users/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUserId || req.userId || 'demo';
    const profile = await getUserProfile(userId);

    // WHY: stats are read from DB rather than jobsMemory — completed jobs are evicted
    // from memory after 10 min, so jobsMemory is always empty for aged-out jobs.
    let stats: AggregatedStats;

    if (db && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      try {
        const completedJobs = await db.query.contentJobs.findMany({
          where: (j, { eq: jeq, and: jand }) =>
            jand(jeq(j.userId, userId), jeq(j.deleted, 0), jeq(j.status, 'done')),
          columns: { id: true, platform: true, createdAt: true },
          with: {
            outputs: {
              columns: { outputType: true, qualityScore: true, content: true, createdAt: true },
            },
          },
          // WHY orderBy createdAt asc: dimensionTrend must read chronologically for a
          // line chart to make sense, and aggregateStats's "latest prediction" tracking
          // depends on ascending iteration order — sorting once here avoids re-sorting
          // client-side or re-deriving order downstream.
          orderBy: (j, { asc }) => [asc(j.createdAt)],
        });

        stats = aggregateStats(completedJobs.map((job) => ({
          id: job.id,
          platform: job.platform,
          createdAt: job.createdAt.toISOString(),
          outputs: job.outputs as unknown as PipelineOutput[],
        })));
      } catch (dbErr) {
        console.error('[DB] Failed to compute stats:', dbErr);
        stats = aggregateStats([]);
      }
    } else {
      // Fallback: jobsMemory when DB is unavailable or userId is not a UUID (e.g. demo)
      const completedJobs = Array.from(jobsMemory.values()).filter(
        (j) => j.deleted !== 1 && j.userId === userId && j.status === 'done',
      );
      stats = aggregateStats(completedJobs.map((j) => ({
        id: j.id,
        platform: j.platform,
        createdAt: typeof j.createdAt === 'string' ? j.createdAt : new Date().toISOString(),
        outputs: readOutputs(j),
      })));
    }

    // Generate dynamic quick tips
    const quickTips: string[] = [];
    if (!profile.brandVoice || profile.brandVoice === 'professional') {
      quickTips.push('Setting up Brand Settings will improve voice consistency across generations.');
    }
    if (stats.totalPosts === 0) {
      quickTips.push('Try a LinkedIn Post next — it takes under 30 seconds to set up.');
    } else {
      quickTips.push('Add a hook in your first slide or sentence to boost engagement by up to 3×.');
    }
    if (stats.mostUsedPlatform.includes('instagram')) {
      quickTips.push('Instagram is your most-used platform — keep focusing on visual hooks.');
    } else if (stats.mostUsedPlatform.includes('linkedin')) {
      quickTips.push('LinkedIn audiences love actionable takeaways. Keep delivering high value.');
    } else if (stats.mostUsedPlatform.includes('twitter')) {
      quickTips.push('For Twitter threads, try asking a question in the last tweet to drive replies.');
    }

    // Fallback tips if we don't have 3
    if (quickTips.length < 3) quickTips.push('Experiment with different tones (e.g., Witty or Casual) to see what resonates.');
    if (quickTips.length < 3) quickTips.push('Review the Critic agent feedback to understand how to improve your prompts.');

    res.json({
      ...profile,
      stats: {
        ...stats,
        quickTips: quickTips.slice(0, 3),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
