import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../middleware/auth.js';
import { addJobToQueue } from '../../lib/queue.js';
import { sseManager } from '../../lib/sse.js';
import { setJobInStore } from '../../workers/contentWorker.js';
import { runAndPersistPipeline } from '../../lib/pipeline.js';
import { userProfiles } from '../users.js';
import { jobsMemory } from './ownership.js';
import { parseBody, createJobSchema, VALID_PLATFORMS } from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';

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

async function _runPipelineDirect(jobId: string, job: any) {
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
export async function runPipelineDirect(jobId: string, job: any) {
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

    const { topic, platform, tone, targetAudience } = body;
    const jobId = uuidv4();
    const userId = req.dbUserId || req.userId || 'demo';
    const userProfile = userProfiles.get(userId) || {};

    const job = {
      id: jobId, userId, topic, platform, tone, targetAudience,
      brandVoice: userProfile.brandVoice || 'professional',
      phrasesUse: userProfile.phrasesUse || '',
      phrasesAvoid: userProfile.phrasesAvoid || '',
      contentDna: userProfile.contentDna || null,
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
    });

    sseManager.sendEvent(jobId, { type: 'progress', stage: 'planning', progress: 1, agent: 'system', message: 'Starting content generation…' });

    // NOTE: runPipelineDirect is intentionally NOT awaited — it runs as a background
    // promise so the 201 response is returned immediately and the client can subscribe
    // to SSE. Errors inside the pipeline are caught and written to jobsMemory/SSE.
    if (!queued) {
      logger.info('Queue unavailable, running pipeline directly');
      runPipelineDirect(jobId, job);
    }

    return res.status(201).json({ jobId });
  } catch (error: any) {
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
    const userProfile = userProfiles.get(userId) || {};

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
  } catch (error: any) {
    console.error('Failed to create batch jobs:', error);
    Sentry.captureException(error, { tags: { route: 'POST /batch' } });
    return res.status(500).json({ error: 'Failed to create batch jobs', code: 'SERVER_ERROR' });
  }
});

export default router;
