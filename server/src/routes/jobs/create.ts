import * as Sentry from '@sentry/node';
import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../../middleware/auth.js';
import { addJobToQueue } from '../../lib/queue.js';
import { sseManager } from '../../lib/sse.js';
import { getJobFromStore, setJobInStore, jobsMemory } from './ownership.js';
import {
  authJobRateLimit,
  reserveGenerationBudget,
  releaseGenerationBudget,
} from '../../middleware/rateLimit.js';
import { runAndPersistPipeline, type PipelineJob, type SkipResearchOpts } from '../../lib/pipeline.js';
import { getUserProfile } from '../users.js';
import { parseBody, createJobSchema, VALID_PLATFORMS, toneEnum, templateIdEnum, competitorResponseSchema, TOPIC_MAX_LENGTH } from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';
import { insertPendingJobRow } from '../../lib/persistJob.js';
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

async function _runPipelineDirect(
  jobId: string,
  job: PipelineJob,
  opts?: { skipResearch?: SkipResearchOpts },
) {
  function emitProgress(stage: string, progress: number, agent: string, message: string, durationMs?: number) {
    const current = getJobFromStore(jobId) ?? jobsMemory.get(jobId);
    if (current) {
      current.status = stage === 'done' ? 'done' : 'processing';
      current.stage = stage;
      current.progress = progress;
      setJobInStore(jobId, { ...current });
    }
    sseManager.sendEvent(jobId, { type: 'progress', stage, progress, agent, message, durationMs });
  }

  try {
    await runAndPersistPipeline(job, emitProgress, {
      set: (id, data) => { setJobInStore(id, data); },
      evict: (id) => { setJobInStore(id, undefined); },
    }, opts);
  } catch {
    // runAndPersistPipeline already persisted the failure and emitted the SSE
    // event — swallow here since this direct-mode call site is fire-and-forget.
  }
}

// Public wrapper — enforces direct-pipeline concurrency limit.
// WHY opts: Content Multiplier used to call runAndPersistPipeline uncapped;
// routing it through here applies the same MAX_DIRECT_PIPELINES gate as create.
export async function runPipelineDirect(
  jobId: string,
  job: PipelineJob,
  opts?: { skipResearch?: SkipResearchOpts },
) {
  await acquirePipelineSlot();
  try {
    await _runPipelineDirect(jobId, job, opts);
  } finally {
    releasePipelineSlot();
  }
}

function applyGenerationRateLimit(req: AuthRequest, res: Response, next: NextFunction): void {
  const [failClosed, limiter] = authJobRateLimit;
  failClosed(req, res, (err?: unknown) => {
    if (err) return next(err);
    limiter(req, res, next);
  });
}

// POST /create
router.post('/create', applyGenerationRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(createJobSchema, req.body, res);
    if (!body) return;

    const { topic, platform, tone, targetAudience, competitorAnalysisId, templateId, paletteId } = body;
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
      // WHY only carried for carousel jobs: templateId/paletteId are meaningless
      // for every other platform, and persisting them regardless would let a
      // stray leftover value from a previous carousel selection silently attach
      // itself to an unrelated LinkedIn/Twitter/etc. job.
      templateId: platform === 'instagram_carousel' ? (templateId || null) : null,
      paletteId: platform === 'instagram_carousel' ? (paletteId || null) : null,
      status: 'pending', retryCount: 0, deleted: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    // FLOW: job goes into jobsMemory first so SSE /stream can find it immediately
    // even before BullMQ picks it up (~100-500ms queue lag).
    setJobInStore(jobId, job);
    // WHY durable pending row (CORR-001): without this, kill/redeploy mid-run
    // left a permanent client 404 — no Library row and nothing for L9 recovery.
    await insertPendingJobRow(job);

    // WHY templateId/paletteId on the queue payload: the worker rebuilds a
    // fresh PipelineJob from this data (it does not read the in-memory copy).
    // Omitting them made production Redis carousels persist with null template
    // while local direct-mode (no Redis) kept the original object and looked fine.
    const queued = await addJobToQueue(jobId, {
      userId, topic, platform, tone, targetAudience,
      brandVoice: job.brandVoice, phrasesUse: job.phrasesUse, phrasesAvoid: job.phrasesAvoid,
      contentDna: job.contentDna,
      competitorContext: job.competitorContext,
      sourceCompetitorAnalysisId: job.sourceCompetitorAnalysisId,
      templateId: job.templateId,
      paletteId: job.paletteId,
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
router.post('/batch', applyGenerationRateLimit, async (req: AuthRequest, res: Response) => {
  // WHY hoisted for catch refund: reserve can succeed then getUserProfile (or
  // later work) throw — without releasing, the user loses quota for an hour
  // with no jobs created (pre-push review finding).
  let budgetKeyForRefund: string | null = null;
  let reservedForRefund = 0;
  try {
    const { z } = await import('zod');
    // WHY toneEnum, not z.string(): matches the single-topic createJobSchema's
    // enum-validated `tone` — this was the one generation field that broke the
    // "every generation field is enum-validated" invariant, letting the batch
    // path accept a value the single-topic path would reject.
    const batchSchema = z.object({
      items: z.array(z.object({
        topic: z.string().min(3).max(TOPIC_MAX_LENGTH).trim(),
        platform: z.enum(VALID_PLATFORMS),
        tone: toneEnum.optional(),
        targetAudience: z.string().max(300).trim().optional(),
      })).min(1).max(7),
      tone: toneEnum.optional(),
      targetAudience: z.string().max(300).trim().optional(),
      // WHY templateIdEnum, not z.string(): matches single-topic createJobSchema
      // so a batch carousel cannot accept an unbounded template id the single
      // path would reject.
      templateId: templateIdEnum.optional(),
      paletteId: z.string().max(50).optional(),
    });
    const body = parseBody(batchSchema, req.body, res);
    if (!body) return;

    const { items, tone, targetAudience, templateId, paletteId } = body;
    const userId = req.dbUserId || req.userId || 'demo';
    // WHY Clerk id for budget charge: authJobRateLimit's keyGenerator prefers
    // req.userId (Clerk). Charging with dbUserId wrote a different Redis key
    // and the N-1 extra hits never moved the counter the limiter reads.
    const budgetKey = req.userId || userId;
    // WHY atomic reserve before create (COST-001): GET-then-charge raced two
    // parallel batches past AUTH_JOB_MAX. Reserve N-1 extras now (HTTP already
    // counted 1); refund unused after fan-out.
    const budget = await reserveGenerationBudget(budgetKey, items.length);
    if (!budget.allowed) {
      return res.status(429).json({
        error: 'Too many generation requests. You can create up to 10 pieces of content per hour.',
        code: 'RATE_LIMITED',
        retryable: false,
      });
    }
    budgetKeyForRefund = budgetKey;
    reservedForRefund = budget.reserved;
    const userProfile = await getUserProfile(userId);

    // WHY track skipped-before-attempt items separately, not just silently
    // filtering them out: an item with an all-whitespace topic passes the
    // schema's length check (counted before trim) but fails this post-trim
    // guard — previously this simply vanished from the response with no
    // signal, indistinguishable from the client's own perspective between
    // "the server dropped my topic" and "everything I submitted succeeded."
    const failedItems: Array<{ index: number; topic: string; error: string }> = [];
    const attemptable = items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => {
        if (item.topic?.trim()) return true;
        failedItems.push({ index, topic: item.topic ?? '', error: 'Topic is empty after trimming whitespace' });
        return false;
      });

    // WHY Promise.allSettled over a for-await loop: each item does an independent
    // addJobToQueue() round-trip (Redis) plus a possible direct-pipeline kickoff;
    // awaiting them one at a time serializes up to 7 network round-trips for no
    // reason. allSettled (not all) so one item's queue failure can't abort the
    // batch — each item already falls back to direct-pipeline mode individually.
    const settled = await Promise.allSettled(
      attemptable.map(async ({ item, index }) => {
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
          templateId: item.platform === 'instagram_carousel' ? (templateId || null) : null,
          paletteId: item.platform === 'instagram_carousel' ? (paletteId || null) : null,
          status: 'pending', retryCount: 0, deleted: 0,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };

        setJobInStore(jobId, job);
        await insertPendingJobRow(job);
        const queued = await addJobToQueue(jobId, {
          userId, topic, platform: item.platform, tone: jobTone, targetAudience: jobAudience,
          brandVoice: job.brandVoice, phrasesUse: job.phrasesUse, phrasesAvoid: job.phrasesAvoid,
          contentDna: job.contentDna,
          templateId: job.templateId,
          paletteId: job.paletteId,
        });

        if (!queued) {
          runPipelineDirect(jobId, job).catch((err: unknown) => {
            logger.error('Batch item direct pipeline failed', { jobId, error: err instanceof Error ? err.message : String(err) });
          });
        }

        return { jobId, topic, platform: item.platform, index };
      }),
    );

    // WHY build from settled results in original order rather than push-inside-loop:
    // Promise.allSettled preserves input order in its output array, so mapping over
    // it keeps createdJobs in the same order the client submitted items. A rejected
    // settlement (e.g. addJobToQueue itself throwing, rather than just returning
    // false) now lands in failedItems instead of silently vanishing.
    const createdJobs: Array<{ jobId: string; topic: string; platform: (typeof items)[number]['platform'] }> = [];
    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      const { item, index } = attemptable[i];
      if (r.status === 'fulfilled') {
        createdJobs.push({ jobId: r.value.jobId, topic: r.value.topic, platform: r.value.platform });
      } else {
        failedItems.push({
          index,
          topic: item.topic?.trim() || '',
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }
    // WHY sort by index: attemptable/failedItems are populated in two different
    // passes (pre-filter skips, then allSettled results) — sorting once at the
    // end keeps failedItems in the same original submission order regardless of
    // which pass caught a given item, so the client can map failures back to
    // rows without needing to search.
    failedItems.sort((a, b) => a.index - b.index);

    if (createdJobs.length === 0) {
      // Refund the full pre-reserve — HTTP still counted 1 for the empty attempt.
      await releaseGenerationBudget(budgetKey, budget.reserved);
      budgetKeyForRefund = null;
      reservedForRefund = 0;
      return res.status(422).json({ error: 'All items in the batch failed to process', code: 'BATCH_ALL_FAILED', retryable: true, failedItems });
    }

    // WHY refund unused extras: reserved for items.length - 1; keep only
    // createdJobs.length - 1 beyond the HTTP hit.
    const unusedExtras = Math.max(0, budget.reserved - Math.max(0, createdJobs.length - 1));
    if (unusedExtras > 0) {
      await releaseGenerationBudget(budgetKey, unusedExtras);
    }

    // Successful response — don't refund again in catch.
    budgetKeyForRefund = null;
    reservedForRefund = 0;
    return res.status(201).json({ jobs: createdJobs, failedItems });
  } catch (error: unknown) {
    if (budgetKeyForRefund && reservedForRefund > 0) {
      try {
        await releaseGenerationBudget(budgetKeyForRefund, reservedForRefund);
      } catch (releaseErr: unknown) {
        logger.warn('Failed to refund batch generation budget after error', {
          error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
        });
      }
    }
    console.error('Failed to create batch jobs:', error);
    Sentry.captureException(error, { tags: { route: 'POST /batch' } });
    return res.status(500).json({ error: 'Failed to create batch jobs', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
