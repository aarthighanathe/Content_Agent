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
import { readOutputs } from '../routes/content/shared.js';
import { assembleJobFromDB } from '../routes/jobs/ownership.js';
import { toClientPublishError } from '../lib/clientErrors.js';

// WHY: exported: tests/unit/publishWorker.test.ts calls this directly with a
// mocked db/dbGetToken/publishToSocialPlatform, exercising the row-not-found /
// already-non-pending / missing-platform early returns and the
// failure-durably-recorded-not-rethrown contract the review flagged as untested.
async function markPosted(scheduledPostId: string, postUrl: string | null | undefined): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: sequential retries with backoff are the point
      await db!.update(scheduledPosts)
        .set({ publishStatus: 'posted', publishedAt: new Date(), postUrl: postUrl ?? null, publishError: null })
        .where(eq(scheduledPosts.id, scheduledPostId));
      return true;
    } catch (err) {
      logger.warn('[PublishWorker] markPosted failed', {
        scheduledPostId, attempt, error: err instanceof Error ? err.message : String(err),
      });
      // eslint-disable-next-line no-await-in-loop -- WHY: backoff between retries
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  return false;
}

export async function processPublishJob(job: Job): Promise<void> {
  const data: unknown = job.data;
  const scheduledPostId = data && typeof data === 'object' && typeof (data as { scheduledPostId?: unknown }).scheduledPostId === 'string'
    ? (data as { scheduledPostId: string }).scheduledPostId
    : '';
  if (!scheduledPostId || !db) return;

  // WHY: tracked outside try: once the pending→publishing claim wins, a retry
  // could double-post, so only pre-claim (transient DB) errors may rethrow.
  let claimWon = false;
  let posted = false;

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

    const conn = await dbGetToken(jobRow.userId, platform);
    if (!conn?.accessToken) {
      throw new Error(`Not connected to ${PLATFORM_LABELS[platform] || platform}`);
    }

    const freshConn = await ensureFreshSocialToken(jobRow.userId, platform, conn);
    const { postUrl } = await publishToSocialPlatform(platform as 'linkedin' | 'twitter', finalOutput.content, freshConn);

    posted = true;
    // WHY: retry the DB write: the post is already live; a lone transient Neon
    // error here would otherwise leave 'publishing' → stale sweep → 'failed'
    // and invite a manual re-schedule that double-posts.
    const marked = await markPosted(scheduledPostId, postUrl);
    if (!marked) {
      logger.error('[PublishWorker] Posted but could not record status — left as publishing', {
        scheduledPostId, platform, postUrl,
      });
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
      console.error('[PublishWorker] Worker error:', err.message);
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
