import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../../middleware/auth.js';
import { addJobToQueue } from '../../lib/queue.js';
import { sseManager } from '../../lib/sse.js';
import { setJobInStore } from '../../workers/contentWorker.js';
import { runAndPersistPipeline, type PipelineJob } from '../../lib/pipeline.js';
import { getUserProfile } from '../users.js';
import { jobsMemory } from './ownership.js';
import { parseBody, createJobSchema, VALID_PLATFORMS, competitorResponseSchema } from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';
import { db } from '../../db/index.js';
import { competitorAnalyses } from '../../db/schema.js';
import { isValidUUID } from '../../lib/uuid.js';

// WHY a small standalone loader, not requireJobOwnership: that helper is
// specific to contentJobs (jobsMemory/jobStore fallback, 404-not-403 IDOR
// shape) — competitor analyses have no in-memory store and are never fetched
// by :id anywhere else, so a focused query here avoids stretching that
// helper's contract to cover a second, differently-shaped table. Returns null
// on any failure (not owned, not found, DB unavailable, malformed content) —
// competitor context is supplementary framing for the prompt, never required
// for job creation to succeed, so every failure mode degrades to "no
// competitor context" rather than blocking or erroring the request.
async function loadOwnedCompetitorContext(
  analysisId: string,
  userId: string,
): Promise<string | null> {
  if (!db || !isValidUUID(userId)) return null;
  try {
    const row = await db.query.competitorAnalyses.findFirst({
      where: and(
        eq(competitorAnalyses.id, analysisId),
        eq(competitorAnalyses.userId, userId),
        eq(competitorAnalyses.deleted, 0),
      ),
    });
    if (!row) return null;
    const parsed = competitorResponseSchema.safeParse(row.analysis);
    if (!parsed.success) return null;

    const gaps = (parsed.data.contentGaps || [])
      .map((g) => [g.gap, g.opportunity].filter(Boolean).join(': '))
      .filter(Boolean);
    const angles = (parsed.data.suggestedAngles || [])
      .map((a) => [a.angle, a.rationale].filter(Boolean).join(': '))
      .filter(Boolean);
    const combined = [...gaps, ...angles].slice(0, 4).join('\n');
    return combined || null;
  } catch (err) {
    logger.warn('Failed to load competitor analysis for job context (non-fatal)', {
      analysisId, error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

const router = Router({ mergeParams: true });

// WHY: concurrency gate for direct pipeline mode (when Redis/BullMQ is unavailable).
// Without this, N simultaneous job creates would spin up N parallel LLM pipelines,
// each consuming ~500ms of Gemini quota and significant RAM. The gate queues extras
// and processes them when a slot frees up. Max 3 avoids saturating the Gemini API.
let _activePipelines = 0;
const MAX_DIRECT_PIPELINES = 3;
const _pipelineQueue: Array<() => void> = [];

function acquirePipelineSlot(): Promise<void> {
  if (_activePipelines < MAX_DIRECT_PIPELINES) {
    _activePipelines++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    _pipelineQueue.push(() => { _activePipelines++; resolve(); });
  });
}

function releasePipelineSlot(): void {
  _activePipelines = Math.max(0, _activePipelines - 1);
  const next = _pipelineQueue.shift();
  if (next) next();
}

async function _runPipelineDirect(jobId: string, job: PipelineJob) {
  function emitProgress(stage: string, progress: number, agent: string, message: string, durationMs?: number) {
    const current = jobsMemory.get(jobId);
    if (current) {
      current.status = stage === 'done' ? 'done' : 'processing';
      current.stage = stage;
      current.progress = progress;
      jobsMemory.set(jobId, current);
    }
    sseManager.sendEvent(jobId, { type: 'progress', stage, progress, agent, message, durationMs });
  }

  try {
    await runAndPersistPipeline(job, emitProgress, {
      set: (id, data) => { jobsMemory.set(id, data); setJobInStore(id, data); },
      evict: (id) => { jobsMemory.delete(id); setJobInStore(id, undefined); },
    });
  } catch {
    // runAndPersistPipeline already persisted the failure and emitted the SSE
    // event — swallow here since this direct-mode call site is fire-and-forget.
  }
}

// Public wrapper — enforces direct-pipeline concurrency limit
export async function runPipelineDirect(jobId: string, job: PipelineJob) {
  await acquirePipelineSlot();
  try {
    await _runPipelineDirect(jobId, job);
  } finally {
    releasePipelineSlot();
  }
}

// POST /create
router.post('/create', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(createJobSchema, req.body, res);
    if (!body) return;

    const { topic, platform, tone, targetAudience, competitorAnalysisId } = body;
    const jobId = uuidv4();
    const userId = req.dbUserId || req.userId || 'demo';

    // WHY Promise.all: getUserProfile and loadOwnedCompetitorContext are independent
    // DB queries — neither depends on the other's result. Running them in parallel
    // reduces latency on the job-creation hot path instead of awaiting sequentially.
    const [userProfile, competitorContextRaw] = await Promise.all([
      getUserProfile(userId),
      competitorAnalysisId ? loadOwnedCompetitorContext(competitorAnalysisId, userId) : Promise.resolve(null),
    ]);

    // C3: when the job was created from a Competitor.tsx CTA, load that
    // analysis's gaps/angles (ownership-checked) to inject as orchestrator
    // context — see loadOwnedCompetitorContext's WHY above. Falls back to the
    // client-supplied competitorContext string (already length-capped by
    // sanitizeGenerationInput + createJobSchema) if the id lookup comes back
    // empty, so a client that inlined the gap/angle text directly still works.
    const competitorContext = competitorContextRaw || body.competitorContext;

    const job = {
      id: jobId, userId, topic, platform, tone, targetAudience,
      brandVoice: userProfile.brandVoice || 'professional',
      phrasesUse: userProfile.phrasesUse || '',
      phrasesAvoid: userProfile.phrasesAvoid || '',
      contentDna: userProfile.contentDna || null,
      competitorContext,
      sourceCompetitorAnalysisId: competitorAnalysisId || null,
      status: 'pending', retryCount: 0, deleted: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    // FLOW: job goes into jobsMemory first so SSE /stream can find it immediately
    // even before BullMQ picks it up (~100-500ms queue lag).
    jobsMemory.set(jobId, job);

    const queued = await addJobToQueue(jobId, {
      userId, topic, platform, tone, targetAudience,
      brandVoice: job.brandVoice, phrasesUse: job.phrasesUse, phrasesAvoid: job.phrasesAvoid,
      contentDna: job.contentDna,
      competitorContext: job.competitorContext,
      sourceCompetitorAnalysisId: job.sourceCompetitorAnalysisId,
    });

    sseManager.sendEvent(jobId, { type: 'progress', stage: 'planning', progress: 1, agent: 'system', message: 'Starting content generation…' });

    // NOTE: runPipelineDirect is intentionally NOT awaited — it runs as a background
    // promise so the 201 response is returned immediately and the client can subscribe
    // to SSE. Errors inside the pipeline are caught and written to jobsMemory/SSE.
    // WHY .catch() here too: if acquirePipelineSlot() itself throws before
    // runPipelineDirect's internal try/finally, the rejection would otherwise
    // be unhandled at this call site — matches the batch-item path below.
    if (!queued) {
      logger.info('Queue unavailable, running pipeline directly');
      runPipelineDirect(jobId, job).catch((err: unknown) => {
        logger.error('Direct pipeline failed', { jobId, error: err instanceof Error ? err.message : String(err) });
      });
    }

    return res.status(201).json({ jobId });
  } catch (error: unknown) {
    console.error('Failed to create job:', error);
    Sentry.captureException(error, { tags: { route: 'POST /create' } });
    return res.status(500).json({ error: 'Failed to create job', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /batch — create up to 7 jobs in parallel
router.post('/batch', async (req: AuthRequest, res: Response) => {
  try {
    const { z } = await import('zod');
    const batchSchema = z.object({
      items: z.array(z.object({
        topic: z.string().min(3).max(250).trim(),
        platform: z.enum(VALID_PLATFORMS),
        tone: z.string().optional(),
        targetAudience: z.string().optional(),
      })).min(1).max(7),
      tone: z.string().optional(),
      targetAudience: z.string().optional(),
    });
    const body = parseBody(batchSchema, req.body, res);
    if (!body) return;

    const { items, tone, targetAudience } = body;
    const userId = req.dbUserId || req.userId || 'demo';
    const userProfile = await getUserProfile(userId);

    // WHY Promise.allSettled over a for-await loop: each item does an independent
    // addJobToQueue() round-trip (Redis) plus a possible direct-pipeline kickoff;
    // awaiting them one at a time serializes up to 7 network round-trips for no
    // reason. allSettled (not all) so one item's queue failure can't abort the
    // batch — each item already falls back to direct-pipeline mode individually.
    const settled = await Promise.allSettled(
      items.filter((item) => item.topic?.trim()).map(async (item) => {
        const jobId = uuidv4();
        const jobTone = item.tone || tone || 'professional';
        const jobAudience = item.targetAudience || targetAudience || 'general audience';
        const topic = item.topic.trim();

        const job = {
          id: jobId, userId, topic, platform: item.platform,
          tone: jobTone, targetAudience: jobAudience,
          brandVoice: userProfile.brandVoice || 'professional',
          phrasesUse: userProfile.phrasesUse || '', phrasesAvoid: userProfile.phrasesAvoid || '',
          contentDna: userProfile.contentDna || null,
          status: 'pending', retryCount: 0, deleted: 0,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };

        jobsMemory.set(jobId, job);
        const queued = await addJobToQueue(jobId, {
          userId, topic, platform: item.platform, tone: jobTone, targetAudience: jobAudience,
          brandVoice: job.brandVoice, phrasesUse: job.phrasesUse, phrasesAvoid: job.phrasesAvoid,
          contentDna: job.contentDna,
        });

        if (!queued) {
          runPipelineDirect(jobId, job).catch((err: unknown) => {
            logger.error('Batch item direct pipeline failed', { jobId, error: err instanceof Error ? err.message : String(err) });
          });
        }

        return { jobId, topic, platform: item.platform };
      }),
    );

    // WHY build from settled results in original order rather than push-inside-loop:
    // Promise.allSettled preserves input order in its output array, so mapping over
    // it keeps createdJobs in the same order the client submitted items — a failed
    // item (schema-impossible today, but defensive) is simply omitted instead of
    // aborting the whole batch.
    const createdJobs: Array<{ jobId: string; topic: string; platform: (typeof items)[number]['platform'] }> = [];
    for (const r of settled) {
      if (r.status === 'fulfilled') createdJobs.push(r.value);
    }

    return res.status(201).json({ jobs: createdJobs });
  } catch (error: unknown) {
    console.error('Failed to create batch jobs:', error);
    Sentry.captureException(error, { tags: { route: 'POST /batch' } });
    return res.status(500).json({ error: 'Failed to create batch jobs', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
