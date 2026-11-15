// WHY: a separate queue from queue.ts's 'content-generation' one: this is a
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
          // WHY: 3 + backoff: transient DB/Redis errors before the worker's
          // pending→publishing claim are safe to retry; the worker never
          // rethrows after the claim, so a post is never retried.
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
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

export type QueuePublishResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'active' | 'rejected' };

// WHY: BullMQ remove() throws "Could not remove job …" when the job is locked
// (active). That is not Redis being down — the worker may still post.
function removalFailureReason(err: unknown): 'active' | 'unavailable' {
  const message = err instanceof Error ? err.message : String(err);
  if (/could not remove job/i.test(message) || /locked/i.test(message)) return 'active';
  return 'unavailable';
}

function isInFlightQueueState(state: string): boolean {
  return state === 'active' || state === 'waiting-children';
}

// WHY: delayMs computed by the caller, not a Date passed in: BullMQ's `delay`
// option is milliseconds-from-now, not an absolute timestamp — keeping that
// conversion at the call site (routes/scheduledPosts.ts, which already knows
// "now") avoids a clock-skew surprise if this function's own idea of "now"
// ever diverged from the caller's.
export async function queuePublishJob(
  scheduledPostId: string,
  delayMs: number,
): Promise<QueuePublishResult> {
  try {
    const queue = getPublishQueue();
    if (!queue) return { ok: false, reason: 'unavailable' };

    // WHY: remove-then-add, not upsert: a jobId can be rescheduled (moved to a
    // new date) after already being queued — BullMQ has no built-in "replace
    // this job's delay," so the old delayed job must be removed first or it
    // would still fire at the original time alongside the new one.
    try {
      const existing = await queue.getJob(scheduledPostId);
      if (existing) {
        const state = await existing.getState();
        if (isInFlightQueueState(state)) {
          logger.warn('[PublishQueue] Job already in flight — not rescheduling', {
            scheduledPostId,
            state,
          });
          return { ok: false, reason: 'active' };
        }
        await existing.remove();
      }
    } catch (err: unknown) {
      const reason = removalFailureReason(err);
      const error = err instanceof Error ? err.message : String(err);
      if (reason === 'active') {
        logger.warn('[PublishQueue] Could not remove in-flight job', { scheduledPostId, error });
        return { ok: false, reason: 'active' };
      }
      logger.error('[PublishQueue] Could not remove existing job — not rescheduling', {
        scheduledPostId,
        error,
      });
      return { ok: false, reason: 'unavailable' };
    }
    // WHY: refuse a non-positive delay: clamping to 0 used to publish
    // immediately while the calendar still said "Will auto-publish". The
    // route now rejects past hours; this is the second line of defense.
    if (delayMs <= 0) {
      logger.warn('[PublishQueue] Refusing non-positive publish delay', {
        scheduledPostId,
        delayMs,
      });
      return { ok: false, reason: 'rejected' };
    }
    await queue.add(
      'publish',
      { scheduledPostId },
      { jobId: scheduledPostId, delay: delayMs },
    );
    // WHY: verify: a same-id job that survived (e.g. active/failed) makes add()
    // a silent no-op, so confirm the queued job exists and is delayed.
    const added = await queue.getJob(scheduledPostId);
    const addedState = added ? await added.getState() : 'missing';
    if (isInFlightQueueState(addedState)) {
      return { ok: false, reason: 'active' };
    }
    if (!added || addedState !== 'delayed') {
      logger.error('[PublishQueue] Job not in delayed state after add', {
        scheduledPostId,
        state: addedState,
      });
      return { ok: false, reason: 'unavailable' };
    }
    logger.info('[PublishQueue] Publish job scheduled', { scheduledPostId, delayMs });
    return { ok: true };
  } catch (error) {
    console.warn('Failed to queue publish job (Redis may not be available)', error);
    return { ok: false, reason: 'unavailable' };
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
