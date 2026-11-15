// WHY: a separate worker/queue from contentWorker.ts: publish jobs are
// delayed-by-design (fire at a future scheduled time) rather than
// run-immediately, a different enough shape that sharing a queue/worker
// would compromise both configs (see lib/publishQueue.ts's own WHY).
// Implements FUTURE_FEATURES.md's Calendar "Actual auto-publish" item.
import * as Sentry from '@sentry/node';
import { Worker, Job } from 'bullmq';
import { createDedicatedRedisConnection } from '../lib/redisClient.js';
import { env } from '../config.js';
import { logger } from '../lib/logger.js';
import { db } from '../db/index.js';
import { scheduledPosts, contentJobs } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { dbGetToken, ensureFreshSocialToken, PLATFORM_LABELS } from '../lib/socialTokens.js';
import { publishToSocialPlatform } from '../lib/socialPublish.js';
import { readOutputs } from '../lib/contentHelpers.js';
import { assembleJobFromDB } from '../lib/jobAssemble.js';
import { toClientPublishError, POSTED_UNVERIFIED_ERROR_PREFIX } from '../lib/clientErrors.js';
import {
  markPosted,
  markPartialThread,
  markPostedUnverified,
  markPartialThreadUnverified,
  releaseClaim,
  type PartialThreadInfo,
} from '../lib/publishStatus.js';

// WHY: structural guard by error name, not instanceof: keeps this worker
// decoupled from the concrete class identity across module boundaries.
function asPartialThread(err: unknown): PartialThreadInfo | null {
  if (!(err instanceof Error) || err.name !== 'TwitterPartialThreadError') return null;
  const e = err as Error & Partial<PartialThreadInfo>;
  if (
    typeof e.postedCount !== 'number'
    || typeof e.totalCount !== 'number'
    || typeof e.rootId !== 'string'
    || typeof e.lastId !== 'string'
    || typeof e.postUrl !== 'string'
  ) {
    return null;
  }
  return {
    postedCount: e.postedCount,
    totalCount: e.totalCount,
    rootId: e.rootId,
    lastId: e.lastId,
    postUrl: e.postUrl,
  };
}

export async function processPublishJob(job: Job): Promise<void> {
  const data: unknown = job.data;
  const scheduledPostId = data && typeof data === 'object' && typeof (data as { scheduledPostId?: unknown }).scheduledPostId === 'string'
    ? (data as { scheduledPostId: string }).scheduledPostId
    : '';
  if (!scheduledPostId) return;
  // WHY: throw (not silent return) so BullMQ retries and the failed handler runs
  // instead of the job "completing" with the row still pending.
  if (!db) throw new Error('Database unavailable');

  // WHY: tracked outside try: once the pending→publishing claim wins, a retry
  // could double-post, so only pre-claim (transient DB) errors may rethrow.
  let claimWon = false;
  let posted = false;
  let tokenLookupFailed = false;

  try {
    const [row] = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, scheduledPostId)).limit(1);
    // WHY: silently return, not throw: the row may have been deleted/rescheduled
    // (unscheduleJob, or moved to a new date — see publishQueue.ts's
    // remove-then-add) between this job being queued and firing. Normal race.
    if (!row || row.publishStatus !== 'pending') return;

    const platform = row.publishPlatform;
    if (!platform) return; // reminder-only scheduling — nothing to publish

    // WHY: atomic claim (CORR-006): two overlapping delayed jobs for the same
    // row must not both call LinkedIn/Twitter. Only the winner of
    // pending→publishing proceeds; the loser exits as a no-op.
    // WHY: stamp publishedAt on claim: scheduled_posts has no updatedAt; a
    // crash after pending→publishing left rows stuck forever. Stale sweep
    // uses this claim timestamp (cleared on fail, overwritten on success).
    const claimed = await db.update(scheduledPosts)
      .set({ publishStatus: 'publishing', publishedAt: new Date() })
      .where(and(
        eq(scheduledPosts.id, scheduledPostId),
        eq(scheduledPosts.publishStatus, 'pending'),
      ))
      .returning({ id: scheduledPosts.id });
    if (claimed.length === 0) return;
    claimWon = true;

    const [jobRow] = await db.select().from(contentJobs).where(eq(contentJobs.id, row.jobId)).limit(1);
    // SECURITY: soft-deleted jobs / ownership mismatch must not publish even if
    // scheduled_posts cleanup raced the worker (SEC-011).
    if (!jobRow || jobRow.deleted === 1 || jobRow.userId !== row.userId) {
      await db.update(scheduledPosts)
        .set({
          publishStatus: 'failed',
          publishError: 'Source job unavailable',
          publishedAt: null,
        })
        .where(eq(scheduledPosts.id, scheduledPostId));
      return;
    }

    const outputRows = await db.query.contentOutputs.findMany({ where: (o, { eq: eqOp }) => eqOp(o.jobId, row.jobId) });
    const assembled = assembleJobFromDB({ ...jobRow, outputs: outputRows });
    const finalOutput = readOutputs(assembled).find((o) => o.outputType === 'final');
    if (!finalOutput) throw new Error('No final content to publish');

    let conn: Awaited<ReturnType<typeof dbGetToken>>;
    try {
      conn = await dbGetToken(jobRow.userId, platform);
    } catch (tokenErr: unknown) {
      // WHY: a transient DB error is not "Not connected" — nothing was posted,
      // so hand the row back to pending and let BullMQ retry instead of failing forever.
      tokenLookupFailed = true;
      throw tokenErr;
    }
    if (!conn?.accessToken) {
      throw new Error(`Not connected to ${PLATFORM_LABELS[platform] || platform}`);
    }

    const freshConn = await ensureFreshSocialToken(jobRow.userId, platform, conn);
    // WHY: re-check soft-delete immediately before the provider call — manage
    // DELETE may have raced after the earlier jobRow read (MEDIUM 5).
    const [jobStillLive] = await db.select({
      deleted: contentJobs.deleted,
      userId: contentJobs.userId,
    })
      .from(contentJobs)
      .where(eq(contentJobs.id, row.jobId))
      .limit(1);
    if (
      !jobStillLive
      || jobStillLive.deleted === 1
      || jobStillLive.userId !== row.userId
    ) {
      await db.update(scheduledPosts)
        .set({
          publishStatus: 'failed',
          publishError: 'Source job unavailable',
          publishedAt: null,
        })
        .where(eq(scheduledPosts.id, scheduledPostId));
      return;
    }
    const published = await publishToSocialPlatform(
      platform as 'linkedin' | 'twitter',
      finalOutput.content,
      freshConn,
    );

    posted = true;
    // WHY: retry the DB write: the post is already live; a lone transient Neon
    // error here would otherwise leave 'publishing' → stale sweep → 'failed'
    // and invite a manual re-schedule that double-posts.
    // WHY: unverified still counts as posted. LinkedIn 2xx with no id must not
    // land in the catch below, which stores failed and invites a second post.
    const unverifiedError = published.unverified
      ? `${POSTED_UNVERIFIED_ERROR_PREFIX} the post may be live`
        + `${published.postUrl ? ` (${published.postUrl})` : ''}. `
        + 'Check your social account — do not reschedule.'
      : null;
    const marked = await markPosted(scheduledPostId, published.postUrl, unverifiedError);
    if (!marked) {
      logger.error('[PublishWorker] Posted but could not record status — left as publishing', {
        scheduledPostId, platform, postUrl: published.postUrl,
      });
      await markPostedUnverified(scheduledPostId, published.postUrl);
      return;
    }
    logger.info('[PublishWorker] Published scheduled post', { scheduledPostId, jobId: row.jobId, platform });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[PublishWorker] Failed to publish scheduled post', { scheduledPostId, error: message });
    Sentry.captureException(err, { tags: { action: 'publish-worker' }, extra: { scheduledPostId } });
    // WHY: rethrow only pre-claim: nothing was posted and no row state changed,
    // so BullMQ's retry (attempts 3, backoff) is safe for transient DB errors.
    if (!claimWon) throw err;
    if (posted) return; // already live — never mark failed or retry

    const partial = asPartialThread(err);
    if (partial) {
      // WHY: no 'partial' enum value (avoids a migration): record 'posted' so the
      // Calendar/reschedule path never republishes the whole thread, and keep the
      // count + root URL + last tweet id so the user can finish it manually.
      logger.error('[PublishWorker] Partial Twitter thread posted', {
        scheduledPostId, ...partial,
      });
      const markedPartial = await markPartialThread(scheduledPostId, partial);
      if (!markedPartial) {
        await markPartialThreadUnverified(scheduledPostId, partial);
      }
      return;
    }

    if (tokenLookupFailed) {
      const attempts = job.opts?.attempts ?? 1;
      const isLastAttempt = (job.attemptsMade ?? 0) + 1 >= attempts;
      if (!isLastAttempt) {
        const released = await releaseClaim(scheduledPostId);
        if (released) throw err;
      }
    }
    try {
      await db.update(scheduledPosts)
        .set({
          publishStatus: 'failed',
          // SECURITY: publishError is shown on Calendar — never raw provider text (SEC-002).
          publishError: toClientPublishError(message),
          publishedAt: null,
        })
        .where(eq(scheduledPosts.id, scheduledPostId));
    } catch (dbErr) {
      logger.error('[PublishWorker] Failed to record publish failure', { scheduledPostId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
    }
    // WHY: not rethrow post-claim: the failure is durably recorded above and a
    // retry could re-post.
  }
}

// WHY: pre-claim errors are rethrown for retry; once BullMQ exhausts attempts nothing else
// touches the row, so it would stay 'pending' forever. Guarded on status 'pending' so it
// never clobbers a claimed/posted row.
export async function handleFailedPublishJob(job: Job | undefined, err: Error): Promise<void> {
  if (!job || !db) return;
  const attempts = job.opts?.attempts ?? 1;
  if ((job.attemptsMade ?? 0) < attempts) return;
  const data: unknown = job.data;
  const id = data && typeof data === 'object'
    ? (data as { scheduledPostId?: unknown }).scheduledPostId
    : undefined;
  if (typeof id !== 'string' || !id) return;
  try {
    const updated = await db.update(scheduledPosts)
      .set({ publishStatus: 'failed', publishError: toClientPublishError(err.message), publishedAt: null })
      .where(and(eq(scheduledPosts.id, id), eq(scheduledPosts.publishStatus, 'pending')))
      .returning({ id: scheduledPosts.id });
    if (updated.length > 0) {
      logger.warn('[PublishWorker] Marked pending post failed after retries exhausted', {
        scheduledPostId: id,
      });
    }
  } catch (dbErr: unknown) {
    logger.error('[PublishWorker] Failed to mark exhausted job failed', {
      scheduledPostId: id, error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }
}

let worker: Worker | null = null;

export function startPublishWorker(): Worker | null {
  const hasRedis = env.UPSTASH_REDIS_URL || env.REDIS_URL;
  if (!hasRedis) {
    logger.warn('No Redis configured — publish worker disabled (Calendar auto-publish will not fire)');
    return null;
  }

  try {
    worker = new Worker('scheduled-publish', processPublishJob, {
      connection: createDedicatedRedisConnection(),
      concurrency: 2,
    });

    worker.on('completed', (job) => {
      logger.info('[PublishWorker] Job completed', { jobId: job.id });
    });

    worker.on('failed', (job, err) => {
      void handleFailedPublishJob(job, err).catch((handlerErr: unknown) => {
        logger.error('[PublishWorker] failed handler threw', {
          error: handlerErr instanceof Error ? handlerErr.message : String(handlerErr),
        });
      });
    });

    worker.on('error', (err) => {
      // WHY: swallow transient Redis reconnect noise: Upstash/Render blips show
      // up as ECONNRESET / Connection is closed while ioredis is already
      // retrying — Sentry-ing every one is alert fatigue, not a real job failure.
      const msg = err.message || '';
      if (
        msg.includes('ECONNREFUSED')
        || msg.includes('ECONNRESET')
        || msg.includes('Connection is closed')
        || msg.includes('ETIMEDOUT')
      ) {
        return;
      }
      logger.error('[PublishWorker] Worker error', { error: err.message });
      Sentry.captureException(err, { tags: { action: 'publish-worker-error' } });
    });

    logger.info('Scheduled-publish worker started');
    return worker;
  } catch (error) {
    logger.warn('Publish worker not available', { error });
    return null;
  }
}

export async function stopPublishWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
