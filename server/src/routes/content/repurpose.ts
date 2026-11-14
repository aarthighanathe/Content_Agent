import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../middleware/auth.js';
import { runPipelineDirect } from '../jobs/index.js';
import { setJobInStore, requireAuthUserId } from '../jobs/ownership.js';
import { getUserProfile } from '../users.js';
import { addJobToQueue } from '../../lib/queue.js';
import { CLIENT_BATCH_URL_FAILURE } from '../../lib/clientErrors.js';
import { parseBody, repurposeSchema, repurposeBatchSchema, TOPIC_MAX_LENGTH } from '../../schemas/index.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import { logger } from '../../lib/logger.js';
import {
  reserveGenerationBudget,
  releaseGenerationBudget,
} from '../../middleware/rateLimit.js';
import { insertPendingJobRow } from '../../lib/persistJob.js';
import {
  fetchAndExtractArticle,
  buildSourceMaterial,
  type ExtractedArticle,
} from './articleExtract.js';

const router = Router();

router.post('/repurpose', async (req: AuthRequest, res: Response) => {
  let budgetKeyForRefund: string | null = null;
  let reservedForRefund = 0;
  try {
    const body = parseBody(repurposeSchema, req.body, res);
    if (!body) return;
    const { url, platform, platforms, tone, targetAudience } = body;

    const extracted = await fetchAndExtractArticle(url);
    if (!extracted.ok) {
      return res.status(extracted.status).json({ error: extracted.error, code: extracted.code, retryable: extracted.retryable });
    }
    const { text, topicSentence } = extracted.article;

    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    // WHY: Clerk id for budget: same key as authJobRateLimit (req.userId).
    // Charging with dbUserId wrote a different Redis key so the N-1 extras
    // never moved the generation-hour counter.
    const budgetKey = req.userId || userId;
    const userProfile = await getUserProfile(userId);

    // WHY: platforms ?? [platform]: multi-platform is purely additive — a
    // request that never sent `platforms` behaves exactly as before (one
    // platform, one job, same response shape below).
    const targetPlatforms = platforms ?? [platform];

    // WHY: reserve before create (COST-001): contentRateLimit does not touch the
    // generation-hour key — without a pre-check, over-cap users still burned
    // Gemini. alreadyCounted:false reserves the full platform count.
    const budget = await reserveGenerationBudget(budgetKey, targetPlatforms.length, {
      alreadyCounted: false,
    });
    if (!budget.allowed) {
      return res.status(429).json({
        error: 'Too many generation requests. You can create up to 10 pieces of content per hour.',
        code: 'RATE_LIMITED',
        retryable: false,
      });
    }
    budgetKeyForRefund = budgetKey;
    reservedForRefund = budget.reserved;

    // WHY: Promise.allSettled, not sequential creation: each platform's job
    // creation is independent (own jobId, own queue/direct-pipeline kickoff)
    // — awaiting them one at a time would serialize N queue round-trips for
    // no reason, same reasoning as jobs/batch's own WHY comment.
    const settled = await Promise.allSettled(
      targetPlatforms.map(async (targetPlatform) => {
        const jobId = uuidv4();
        const sourceMaterial = buildSourceMaterial(url, targetPlatform, text);

        const job: PipelineJob = {
          id: jobId,
          userId,
          topic: topicSentence.slice(0, TOPIC_MAX_LENGTH),
          platform: targetPlatform,
          tone,
          targetAudience,
          brandVoice: userProfile.brandVoice || 'professional',
          phrasesUse: userProfile.phrasesUse || '',
          phrasesAvoid: userProfile.phrasesAvoid || '',
          contentDna: userProfile.contentDna || null,
          sourceUrl: url,
          sourceMaterial,
          status: 'pending',
          retryCount: 0,
          deleted: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // WHY: persist first so a failed insert never leaves a phantom job in memory.

        await insertPendingJobRow(job);
        setJobInStore(jobId, job);

        const queued = await addJobToQueue(jobId, { ...job });
        if (!queued) {
          // WHY: .catch(), not a bare fire-and-forget call: if acquirePipelineSlot()
          // itself throws before runPipelineDirect's internal try/finally, the
          // rejection would otherwise be unhandled at this call site.
          runPipelineDirect(jobId, job).catch((err: unknown) => {
            logger.error('Repurpose direct pipeline failed', { jobId, platform: targetPlatform, error: err instanceof Error ? err.message : String(err) });
          });
        }

        return { jobId, platform: targetPlatform };
      }),
    );

    const jobs: Array<{ jobId: string; platform: string }> = [];
    for (const r of settled) {
      if (r.status === 'fulfilled') jobs.push(r.value);
    }

    if (jobs.length === 0) {
      await releaseGenerationBudget(budgetKey, reservedForRefund);
      budgetKeyForRefund = null;
      reservedForRefund = 0;
      return res.status(500).json({ error: 'Failed to start repurpose job for any platform', code: 'SERVER_ERROR', retryable: true });
    }

    // Refund platforms that failed to create so reserved == jobs.length.
    const unused = Math.max(0, reservedForRefund - jobs.length);
    if (unused > 0) {
      await releaseGenerationBudget(budgetKey, unused);
    }
    budgetKeyForRefund = null;
    reservedForRefund = 0;

    // WHY: jobId/topic kept at the top level (not just inside jobs[]): every
    // existing caller (Repurpose.tsx's single-platform submit) reads
    // `{ jobId, topic }` off the response directly — this keeps that call
    // shape working unchanged (jobs[0] and the top-level jobId are the same
    // job whenever only one platform was requested) while jobs[] carries the
    // full fan-out for a multi-platform submission.
    return res.status(201).json({ jobId: jobs[0].jobId, topic: topicSentence, jobs });
  } catch (error: unknown) {
    if (budgetKeyForRefund && reservedForRefund > 0) {
      try {
        await releaseGenerationBudget(budgetKeyForRefund, reservedForRefund);
      } catch (releaseErr: unknown) {
        logger.warn('Failed to refund repurpose generation budget after error', {
          error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
        });
      }
    }
    console.error('Repurpose failed:', error);
    Sentry.captureException(error, { tags: { route: 'POST /repurpose' } });
    return res.status(500).json({ error: 'Failed to start repurpose job', code: 'SERVER_ERROR', retryable: true });
  }
});
export type UserProfile = Awaited<ReturnType<typeof getUserProfile>>;

// WHY: extracted from the single-URL handler: POST /repurpose/batch reuses the
// exact same job-creation fan-out so a batch of N URLs gets identical behavior.
export async function createJobsForPlatforms(
  userId: string,
  userProfile: UserProfile,
  url: string,
  article: ExtractedArticle,
  targetPlatforms: string[],
  tone: string,
  targetAudience: string,
): Promise<Array<{ jobId: string; platform: string; topic: string }>> {
  const settled = await Promise.allSettled(
    targetPlatforms.map(async (targetPlatform) => {
      const jobId = uuidv4();
      const sourceMaterial = buildSourceMaterial(url, targetPlatform, article.text);
      const topic = article.topicSentence.slice(0, TOPIC_MAX_LENGTH);

      const job: PipelineJob = {
        id: jobId,
        userId,
        topic,
        platform: targetPlatform,
        tone,
        targetAudience,
        brandVoice: userProfile.brandVoice || 'professional',
        phrasesUse: userProfile.phrasesUse || '',
        phrasesAvoid: userProfile.phrasesAvoid || '',
        contentDna: userProfile.contentDna || null,
        sourceUrl: url,
        sourceMaterial,
        status: 'pending',
        retryCount: 0,
        deleted: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // WHY: persist first so a failed insert never leaves a phantom job in memory.

      await insertPendingJobRow(job);
      setJobInStore(jobId, job);
      const queued = await addJobToQueue(jobId, { ...job });
      if (!queued) {
        runPipelineDirect(jobId, job).catch((err: unknown) => {
          logger.error('Repurpose direct pipeline failed', { jobId, platform: targetPlatform, error: err instanceof Error ? err.message : String(err) });
        });
      }
      return { jobId, platform: targetPlatform, topic };
    }),
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<{ jobId: string; platform: string; topic: string }> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// POST /api/content/repurpose/batch — N different URLs, each to its own
// platform list, processed concurrently. Each URL is independently
// fetch+extracted (unlike multi-platform mode which shares one extraction).
// WHY: allSettled at the top level: a URL that 404s shouldn't abort the rest —
// the response carries successfully-created jobs AND failedItems[] so the
// client can report partial failures gracefully.
router.post('/repurpose/batch', async (req: AuthRequest, res: Response) => {
  let budgetKeyForRefund: string | null = null;
  let reservedForRefund = 0;
  try {
    const body = parseBody(repurposeBatchSchema, req.body, res);
    if (!body) return;
    const { items } = body;

    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    const budgetKey = req.userId || userId;
    const userProfile = await getUserProfile(userId);

    // WHY: reserve the planned platform fan-out up front (COST-001): charging
    // only after create let over-cap users still enqueue Gemini work.
    const plannedJobs = items.reduce(
      (n, item) => n + (item.platforms?.length ?? 1),
      0,
    );
    const budget = await reserveGenerationBudget(budgetKey, plannedJobs, {
      alreadyCounted: false,
    });
    if (!budget.allowed) {
      return res.status(429).json({
        error: 'Too many generation requests. You can create up to 10 pieces of content per hour.',
        code: 'RATE_LIMITED',
        retryable: false,
      });
    }
    budgetKeyForRefund = budgetKey;
    reservedForRefund = budget.reserved;

    // WHY: resolve instead of throw on failure: keeping every outcome (expected
    // extraction failure AND unexpected error) inside the fulfilled branch of
    // Promise.allSettled gives each result a single known shape, so downstream
    // code never has to narrow `unknown`/PromiseRejectedResult.reason.
    const itemResults = await Promise.allSettled(
      items.map(async (item) => {
        try {
          const extracted = await fetchAndExtractArticle(item.url);
          if (!extracted.ok) {
            return { ok: false as const, url: item.url, error: extracted.error };
          }
          const targetPlatforms = item.platforms ?? [item.platform];
          const jobs = await createJobsForPlatforms(userId, userProfile, item.url, extracted.article, targetPlatforms, item.tone, item.targetAudience);
          return { ok: true as const, url: item.url, jobs };
        } catch (err) {
          logger.warn('[Repurpose] Batch item unexpected failure', {
            url: item.url,
            error: err instanceof Error ? err.message : String(err),
          });
          return { ok: false as const, url: item.url, error: CLIENT_BATCH_URL_FAILURE };
        }
      }),
    );

    const allJobs: Array<{ jobId: string; platform: string; topic: string }> = [];
    const failedItems: Array<{ url: string; error: string }> = [];

    for (const r of itemResults) {
      if (r.status === 'rejected') {
        logger.warn('[Repurpose] Batch item rejected', {
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
        failedItems.push({ url: '', error: CLIENT_BATCH_URL_FAILURE });
        continue;
      }
      if (!r.value.ok) {
        failedItems.push({ url: r.value.url, error: r.value.error });
      } else {
        allJobs.push(...r.value.jobs);
      }
    }

    if (allJobs.length === 0) {
      await releaseGenerationBudget(budgetKey, reservedForRefund);
      budgetKeyForRefund = null;
      reservedForRefund = 0;
      return res.status(422).json({ error: 'All URLs in the batch failed to process', code: 'BATCH_ALL_FAILED', retryable: true, failedItems });
    }

    const unused = Math.max(0, reservedForRefund - allJobs.length);
    if (unused > 0) {
      await releaseGenerationBudget(budgetKey, unused);
    }
    budgetKeyForRefund = null;
    reservedForRefund = 0;

    return res.status(201).json({ jobs: allJobs, failedItems });
  } catch (error: unknown) {
    if (budgetKeyForRefund && reservedForRefund > 0) {
      try {
        await releaseGenerationBudget(budgetKeyForRefund, reservedForRefund);
      } catch (releaseErr: unknown) {
        logger.warn('Failed to refund repurpose-batch generation budget after error', {
          error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
        });
      }
    }
    console.error('Repurpose batch failed:', error);
    Sentry.captureException(error, { tags: { route: 'POST /repurpose/batch' } });
    return res.status(500).json({ error: 'Failed to start batch repurpose', code: 'SERVER_ERROR', retryable: true });
  }
});

export { fetchAndExtractArticle };
export default router;
