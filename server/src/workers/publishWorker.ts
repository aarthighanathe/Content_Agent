// WHY a separate worker/queue from contentWorker.ts: publish jobs are
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
import { eq } from 'drizzle-orm';
import { dbGetToken, PLATFORM_LABELS } from '../routes/social.js';
import { publishToSocialPlatform } from '../lib/socialPublish.js';
import { readOutputs } from '../routes/content/shared.js';
import { assembleJobFromDB } from '../routes/jobs/ownership.js';

// WHY exported: tests/unit/publishWorker.test.ts calls this directly with a
// mocked db/dbGetToken/publishToSocialPlatform, exercising the row-not-found /
// already-non-pending / missing-platform early returns and the
// failure-durably-recorded-not-rethrown contract the review flagged as untested.
export async function processPublishJob(job: Job): Promise<void> {
  const data: unknown = job.data;
  const scheduledPostId = data && typeof data === 'object' && typeof (data as { scheduledPostId?: unknown }).scheduledPostId === 'string'
    ? (data as { scheduledPostId: string }).scheduledPostId
    : '';
  if (!scheduledPostId || !db) return;

  const [row] = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, scheduledPostId)).limit(1);
  // WHY silently return, not throw: the row may have been deleted/rescheduled
  // (unscheduleJob, or moved to a new date — see publishQueue.ts's
  // remove-then-add) between this job being queued and firing. That's a
  // normal race, not a failure worth Sentry noise or a BullMQ retry.
  if (!row || row.publishStatus !== 'pending') return;

  const platform = row.publishPlatform;
  if (!platform) return; // reminder-only scheduling — nothing to publish

  try {
    const [jobRow] = await db.select().from(contentJobs).where(eq(contentJobs.id, row.jobId)).limit(1);
    if (!jobRow) throw new Error('Source job not found');

    const outputRows = await db.query.contentOutputs.findMany({ where: (o, { eq: eqOp }) => eqOp(o.jobId, row.jobId) });
    const assembled = assembleJobFromDB({ ...jobRow, outputs: outputRows });
    const finalOutput = readOutputs(assembled).find((o) => o.outputType === 'final');
    if (!finalOutput) throw new Error('No final content to publish');

    const conn = await dbGetToken(jobRow.userId, platform);
    if (!conn?.accessToken) {
      throw new Error(`Not connected to ${PLATFORM_LABELS[platform] || platform}`);
    }

    const { postUrl } = await publishToSocialPlatform(platform as 'linkedin' | 'twitter', finalOutput.content, conn);

    await db.update(scheduledPosts)
      .set({ publishStatus: 'posted', publishedAt: new Date(), postUrl, publishError: null })
      .where(eq(scheduledPosts.id, scheduledPostId));
    logger.info('[PublishWorker] Published scheduled post', { scheduledPostId, jobId: row.jobId, platform });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[PublishWorker] Failed to publish scheduled post', { scheduledPostId, error: message });
    Sentry.captureException(err, { tags: { action: 'publish-worker' }, extra: { scheduledPostId } });
    try {
      await db.update(scheduledPosts)
        .set({ publishStatus: 'failed', publishError: message.slice(0, 500) })
        .where(eq(scheduledPosts.id, scheduledPostId));
    } catch (dbErr) {
      logger.error('[PublishWorker] Failed to record publish failure', { scheduledPostId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
    }
    // WHY not rethrow: the failure is already durably recorded on the row
    // above (visible to the user via the Calendar's status badge) — letting
    // BullMQ retry would silently re-attempt with the same job.data and, on
    // eventual success, leave a 'failed' status invisibly stale if the retry
    // logic here didn't also clear it. attempts:1 (see publishQueue.ts) means
    // this never retries anyway; the try/catch's only job is to turn a thrown
    // error into a recorded 'failed' row instead of an unhandled rejection.
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
      if (err.message.includes('ECONNREFUSED') || err.message.includes('Connection is closed')) return;
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
