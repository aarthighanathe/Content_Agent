// WHY a separate queue from queue.ts's 'content-generation' one: this is a
// delayed (scheduled-for-the-future) job, not an immediate one — mixing job
// types with wildly different delay/retry semantics onto one BullMQ queue
// makes the concurrency/backoff config a compromise for both. Implements
// FUTURE_FEATURES.md's Calendar "Actual auto-publish" item — see
// db/schema.ts's scheduledPosts WHY comment for the schema-level design,
// and workers/publishWorker.ts for what actually runs when this fires.
import { Queue } from 'bullmq';
import { logger } from './logger.js';
import { createDedicatedRedisConnection } from './redisClient.js';

let publishQueue: Queue | null = null;

function getPublishQueue(): Queue | null {
  if (!publishQueue) {
    try {
      publishQueue = new Queue('scheduled-publish', {
        connection: createDedicatedRedisConnection(),
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      });
    } catch (error) {
      console.warn('BullMQ publish queue not available:', error);
      return null;
    }
  }
  return publishQueue;
}

// WHY delayMs computed by the caller, not a Date passed in: BullMQ's `delay`
// option is milliseconds-from-now, not an absolute timestamp — keeping that
// conversion at the call site (routes/scheduledPosts.ts, which already knows
// "now") avoids a clock-skew surprise if this function's own idea of "now"
// ever diverged from the caller's.
export async function queuePublishJob(scheduledPostId: string, delayMs: number): Promise<boolean> {
  try {
    const queue = getPublishQueue();
    if (!queue) return false;

    // WHY remove-then-add, not upsert: a jobId can be rescheduled (moved to a
    // new date) after already being queued — BullMQ has no built-in "replace
    // this job's delay," so the old delayed job must be removed first or it
    // would still fire at the original time alongside the new one.
    try {
      const existing = await queue.getJob(scheduledPostId);
      if (existing) await existing.remove();
    } catch (err) {
      // WHY logged, not silently swallowed: same reasoning as queue.ts's
      // identical remove-before-add block — a transient Redis error here
      // would otherwise be indistinguishable from the expected "job doesn't
      // exist yet" case, masking a real connectivity issue.
      logger.warn('[PublishQueue] getJob/remove failed before re-add (may be transient, not necessarily "job not found")', {
        scheduledPostId, error: err instanceof Error ? err.message : String(err),
      });
    }

    // WHY log a warning on a negative delay, not just silently clamp: after
    // the scheduledPosts.ts timezone fix (dateKey now paired with the
    // client's real UTC offset), a negative delay should no longer be a
    // legitimate case — it previously masked the timezone bug entirely by
    // firing the job "almost immediately" with no signal anything was wrong.
    // Still clamped to 0 (not rejected) so a mis-scheduled post fires ASAP
    // rather than never, matching the pre-fix behavior for any edge case not
    // covered by the fix (e.g. an old client that never sends the offset).
    if (delayMs < 0) {
      logger.warn('[PublishQueue] Computed a negative publish delay — clamping to fire immediately', { scheduledPostId, delayMs });
    }
    await queue.add('publish', { scheduledPostId }, { jobId: scheduledPostId, delay: Math.max(delayMs, 0) });
    logger.info('[PublishQueue] Publish job scheduled', { scheduledPostId, delayMs });
    return true;
  } catch (error) {
    console.warn('Failed to queue publish job (Redis may not be available)', error);
    return false;
  }
}

export async function cancelPublishJob(scheduledPostId: string): Promise<void> {
  try {
    const queue = getPublishQueue();
    if (!queue) return;
    const existing = await queue.getJob(scheduledPostId);
    if (existing) await existing.remove();
  } catch (error) {
    console.warn('Failed to cancel publish job', error);
  }
}

export { getPublishQueue };
