// WHY a separate sub-router, not inline in manage.ts: extracted 2026-08-10 to
// keep manage.ts under the 400-line split threshold — same "split when it
// grows, mirror the routes/jobs/ sub-router pattern" convention as
// render.ts/stream.ts/insights.ts/versions.ts. manage.ts already went through
// this once (list.ts/versions.ts were extracted from it previously) and
// regrew past the cap; these two handlers were the heaviest remaining ones.
import * as Sentry from '@sentry/node';
import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../middleware/auth.js';
import { sseManager } from '../../lib/sse.js';
import { setJobInStore } from './ownership.js';
import { addJobToQueue } from '../../lib/queue.js';
import { getUserProfile } from '../users.js';
import { db } from '../../db/index.js';
import { jobOutputVersions } from '../../db/schema.js';
import { getJobFromStore, requireJobOwnership } from './ownership.js';
import type { AssembledJob, MemoryJob } from './ownership.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import { runPipelineDirect } from './create.js';
import { runAndPersistPipeline } from '../../lib/pipeline.js';
import type { ResearchResult } from '../../agents/researcher.js';
import type { OrchestratorResult } from '../../agents/orchestrator.js';
import { z } from 'zod';
import { parseBody, regenerateJobSchema, multiplyJobSchema } from '../../schemas/index.js';
import { authJobRateLimit } from '../../middleware/rateLimit.js';
import { isValidTone } from '../../lib/persistJob.js';
import { logger } from '../../lib/logger.js';
import { readOutputs } from '../content/shared.js';
import { collectRelatedVariants, pickVariantForPlatform } from './related.js';

const router = Router({ mergeParams: true });

function applyGenerationRateLimit(req: AuthRequest, res: Response, next: NextFunction): void {
  const [failClosed, limiter] = authJobRateLimit;
  failClosed(req, res, (err?: unknown) => {
    if (err) return next(err);
    limiter(req, res, next);
  });
}

// WHY shared by both /regenerate and /multiply: both carry a source job's
// tone/targetAudience straight into a fresh pipeline run with no schema
// re-check (the request-body schemas only validate their own new fields). A
// legacy row whose tone predates a VALID_TONES vocabulary change, or a null
// targetAudience from some other historical edge case, would otherwise run an
// entire 5-agent pipeline only to fail at persistJobToDB's own validation —
// wasting Gemini/Tavily quota and losing the result (see pipeline.ts's
// runAndPersistPipeline catch-block handling). Reuses persistJob.ts's
// isValidTone so this predicate can't drift from the one persistJobToDB
// itself enforces.
function hasStaleJobData(job: { tone?: string | null; targetAudience?: string | null }): boolean {
  return !job.tone || !isValidTone(job.tone) || !job.targetAudience;
}

const cachedResearchSchema = z.object({
  trendingAngles: z.array(z.string()),
  keyFacts: z.array(z.string()),
  suggestedHashtags: z.array(z.string()),
  competitorHooks: z.array(z.string()),
  sourceUrls: z.array(z.string()),
  rawResults: z.array(z.object({
    title: z.string().optional(),
    url: z.string().optional(),
    content: z.string().optional(),
    score: z.number().optional(),
  })).optional(),
});

interface CachedResearchBundle {
  research: ResearchResult;
  orchestrator: OrchestratorResult | undefined;
}

function parseCachedResearch(raw: unknown): ResearchResult | undefined {
  const parsed = cachedResearchSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  return { ...parsed.data, rawResults: parsed.data.rawResults ?? [] };
}

function isOrchestratorResult(value: unknown): value is OrchestratorResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.taskPlan === 'string' && typeof v.platformRules === 'object';
}

function readCachedFromOutputs(outputs: ReturnType<typeof readOutputs>): CachedResearchBundle | null {
  const research = parseCachedResearch(
    outputs.find((o) => o.agentName === 'researcher' && o.outputType === 'research')?.content,
  );
  if (!research) return null;
  const orchRaw = outputs.find((o) => o.agentName === 'orchestrator')?.content;
  return {
    research,
    orchestrator: isOrchestratorResult(orchRaw) ? orchRaw : undefined,
  };
}

function jobSourceId(job: MemoryJob | AssembledJob): string | null {
  return typeof job.sourceJobId === 'string' ? job.sourceJobId : null;
}

// WHY walk sourceJobId: Adapt (multiply) jobs skip orchestrator+researcher and
// used to persist no research row — multiplying from an adapted LinkedIn/Twitter
// job then failed with "No cached research". Follow the lineage back to the
// original Create/Repurpose job that still has the researcher output (cap the
// walk so a corrupt cycle can't hang the request).
async function loadCachedResearchBundle(
  startJob: MemoryJob | AssembledJob,
  userId: string,
  res: Response,
): Promise<CachedResearchBundle | null> {
  const visited = new Set<string>([startJob.id]);
  let outputs = readOutputs(startJob);
  let nextSourceId = jobSourceId(startJob);

  for (let depth = 0; depth < 5; depth++) {
    const found = readCachedFromOutputs(outputs);
    if (found) return found;
    if (!nextSourceId || visited.has(nextSourceId)) break;
    visited.add(nextSourceId);
    // SECURITY: never read another user's research via a forged sourceJobId
    // chain — requireJobOwnership returns 404 on mismatch (same as any :jobId).
    const ancestor = await requireJobOwnership(nextSourceId, userId, res);
    if (!ancestor) return null;
    outputs = readOutputs(ancestor);
    nextSourceId = jobSourceId(ancestor);
  }
  return null;
}

// POST /:jobId/regenerate
router.post('/:jobId/regenerate', applyGenerationRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(regenerateJobSchema, req.body, res);
    if (!body) return;
    const { feedback } = body;
    const userId = req.dbUserId || req.userId || 'demo';

    const existingJob = await requireJobOwnership(jobId, userId, res);
    if (!existingJob) return;

    if (hasStaleJobData(existingJob)) {
      return res.status(400).json({
        error: "This job's tone or audience data is no longer valid — please create a new job instead of regenerating.",
        code: 'STALE_JOB_DATA',
        retryable: false,
      });
    }

    // WHY snapshot here, not in persistJobToDB: persistJobToDB unconditionally
    // deletes+re-inserts contentOutputs on every persist (every job
    // completion, not just regenerates) — changing that shared path is a much
    // larger blast radius than needed just to keep regenerate history. This is
    // the one call site that actually destroys a previous result the user
    // might want back, so the snapshot lives here, immediately before the
    // in-memory job (and eventually its DB row) gets overwritten by the new run.
    // WHY best-effort, not blocking regenerate on failure: losing the ability
    // to look back at a previous version is worse UX than blocking a
    // regeneration the user explicitly asked for — same "don't fail the whole
    // request over a non-critical side write" stance as the scheduled_posts
    // cleanup in manage.ts's DELETE /:jobId.
    if (db) {
      const existingOutputs = readOutputs(existingJob);
      const finalOutput = existingOutputs.find((o) => o.outputType === 'final');
      if (finalOutput) {
        const critique = existingOutputs.find((o) => o.outputType === 'critique');
        const score = typeof critique?.qualityScore === 'number' ? critique.qualityScore : null;
        try {
          await db.insert(jobOutputVersions).values({
            jobId,
            content: finalOutput.content,
            qualityScore: score,
            label: feedback ? `Before regenerate: ${feedback.slice(0, 80)}` : 'Before regenerate',
          });
        } catch (dbErr) {
          logger.error('[DB] Failed to snapshot version before regenerate', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
          Sentry.captureException(dbErr, { tags: { route: 'POST /:jobId/regenerate', action: 'version-snapshot' } });
        }
      }
    }

    const regenProfile = await getUserProfile(userId);
    // WHY no outputs/logs/criticResult here: those only exist on the terminal
    // PersistedJobResult shape (status 'done'|'failed'); a fresh regenerate is
    // PipelineJob-shaped with status 'pending' — nothing reads those fields
    // until runAndPersistPipeline replaces this Map entry with the real result.
    const job: PipelineJob = {
      id: jobId, userId, topic: existingJob.topic, platform: existingJob.platform,
      tone: existingJob.tone ?? undefined, targetAudience: existingJob.targetAudience ?? undefined,
      brandVoice: regenProfile.brandVoice || existingJob.brandVoice || 'professional',
      phrasesUse: regenProfile.phrasesUse || existingJob.phrasesUse || '',
      phrasesAvoid: regenProfile.phrasesAvoid || existingJob.phrasesAvoid || '',
      contentDna: regenProfile.contentDna || existingJob.contentDna || null,
      status: 'pending', retryCount: 0,
      createdAt: typeof existingJob.createdAt === 'string' ? existingJob.createdAt : existingJob.createdAt?.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setJobInStore(jobId, job);

    sseManager.sendEvent(jobId, { type: 'progress', stage: 'planning', progress: 2, agent: 'system', message: 'Regeneration started…' });

    const queued = await addJobToQueue(jobId, { ...job, initialFeedback: feedback });
    if (!queued) {
      // WHY .catch(): guards against unhandled rejection if acquirePipelineSlot()
      // or the pipeline throws before its internal try/finally captures the error
      // (matches the multiply handler's pattern below and create.ts's own WHY comment).
      runPipelineDirect(jobId, { ...job, initialFeedback: feedback }).catch((err: unknown) => {
        logger.error('Regenerate pipeline failed', { jobId, error: err instanceof Error ? err.message : String(err) });
      });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to regenerate', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /:jobId/multiply — adapt content to another platform using cached research
router.post('/:jobId/multiply', applyGenerationRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(multiplyJobSchema, req.body, res);
    if (!body) return;
    const { targetPlatform } = body;
    const userId = req.dbUserId || req.userId || 'demo';

    const sourceJob = await requireJobOwnership(jobId, userId, res);
    if (!sourceJob) return;

    if (hasStaleJobData(sourceJob)) {
      return res.status(400).json({
        error: "This job's tone or audience data is no longer valid — please create a new job instead of multiplying.",
        code: 'STALE_JOB_DATA',
        retryable: false,
      });
    }

    const cached = await loadCachedResearchBundle(sourceJob, userId, res);
    // WHY null after ownership 404: loadCachedResearchBundle already sent the
    // response — bail without a second write.
    if (res.headersSent) return;
    if (!cached) {
      return res.status(400).json({
        error: 'No cached research found on source job',
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
    }
    const cachedResearch = cached.research;
    const cachedOrchestrator = cached.orchestrator;

    // WHY reuse a done sibling: Adapt LinkedIn → Carousel → Caption used to
    // create a second Caption when opening Adapt from Carousel, so the family
    // had duplicates and Open only worked for session-local multiplyJobs. If
    // this research tree already has a finished job for targetPlatform, return
    // that id so every Result page shares the same Open links.
    const family = await collectRelatedVariants(sourceJob, userId, res);
    if (res.headersSent) return;
    if (family) {
      const existing = pickVariantForPlatform(family.variants, targetPlatform, jobId);
      if (existing && existing.status === 'done') {
        return res.status(200).json({ jobId: existing.jobId, reused: true });
      }
    }

    const newJobId = uuidv4();
    const userProfile = await getUserProfile(userId);
    const newJob: PipelineJob = {
      id: newJobId, userId, topic: sourceJob.topic, platform: targetPlatform,
      tone: sourceJob.tone ?? undefined, targetAudience: sourceJob.targetAudience ?? undefined,
      brandVoice: userProfile.brandVoice || sourceJob.brandVoice || 'professional',
      phrasesUse: userProfile.phrasesUse || sourceJob.phrasesUse || '',
      phrasesAvoid: userProfile.phrasesAvoid || sourceJob.phrasesAvoid || '',
      contentDna: userProfile.contentDna || sourceJob.contentDna || null,
      sourceJobId: jobId, sourcePlatform: sourceJob.platform,
      status: 'pending', retryCount: 0, deleted: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    setJobInStore(newJobId, newJob);

    // FLOW: Content Multiplier skips orchestrator+researcher — it reuses the
    // source job's cached research/task-plan/platform-rules and starts
    // runContentPipeline directly at the Writer stage (see pipeline.ts's
    // `skipResearch` option). runAndPersistPipeline still owns the retry
    // loop, isSoftDeleted() guard, progress emission, and predictor stage, so
    // multiply can no longer drift from the canonical pipeline.
    // WHY .catch(): fire-and-forget background run — the 201 response below
    // returns immediately so the client can subscribe to SSE; errors inside
    // are already caught, persisted, and SSE'd by runAndPersistPipeline
    // itself, so this only guards against an unhandled rejection escaping
    // (matches routes/jobs/create.ts's runPipelineDirect fire-and-forget
    // pattern).
    runAndPersistPipeline(
      newJob,
      (stage, progress, agent, message, durationMs) => {
        const current = getJobFromStore(newJobId);
        if (current) {
          current.status = stage === 'done' ? 'done' : 'processing';
          current.stage = stage;
          current.progress = progress;
          setJobInStore(newJobId, { ...current });
        }
        sseManager.sendEvent(newJobId, { type: 'progress', stage, progress, agent, message, durationMs });
      },
      {
        set: (id, data) => { setJobInStore(id, data); },
        evict: (id) => { setJobInStore(id, undefined); },
      },
      {
        skipResearch: {
          researchResult: cachedResearch,
          taskPlan: cachedOrchestrator?.taskPlan || `Create engaging ${targetPlatform.replace(/_/g, ' ')} content about: ${sourceJob.topic}`,
          platformRules: cachedOrchestrator?.platformRules || {},
        },
      },
    ).catch((err: unknown) => {
      logger.error('Multiply pipeline failed', { jobId: newJobId, error: err instanceof Error ? err.message : String(err) });
    });

    return res.status(201).json({ jobId: newJobId });
  } catch (error: unknown) {
    console.error('Failed to multiply job:', error);
    Sentry.captureException(error, { tags: { route: 'POST /:jobId/multiply' } });
    return res.status(500).json({ error: 'Failed to multiply content', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
