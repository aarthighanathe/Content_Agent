import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from './logger.js';
import { createDedicatedRedisConnection } from './redisClient.js';

// BullMQ requires SEPARATE Redis connections for Queue and Worker (a Worker's
// blocking commands would otherwise stall a connection shared with the Queue).
// WHY delegate to redisClient.ts: previously this factory independently read
// env vars and built its own IORedis instance on every call, duplicating the
// same connection-building logic that lived in lib/redisClient.ts. Now both
// derive from redisClient's singleton via `.duplicate()`, so config/credentials
// come from one source of truth — see redisClient.ts's createDedicatedRedisConnection().
export function createRedisConnection(): IORedis {
  return createDedicatedRedisConnection();
}

// Legacy alias used by contentWorker.ts
export { createRedisConnection as redisConnection };

let contentQueue: Queue | null = null;

function getQueue(): Queue | null {
  if (!contentQueue) {
    try {
      contentQueue = new Queue('content-generation', {
        connection: createRedisConnection(),
        defaultJobOptions: {
          // NOTE (L8): attempts: 3 is for worker *crashes* / stalled jobs (BullMQ
          // stalledInterval), not for pipeline business failures. contentWorker
          // deliberately swallows errors after runAndPersistPipeline has already
          // written status:'failed' + terminal SSE — rethrowing would retry an
          // already-terminal job and burn provider quota. Do not "fix" the
          // swallow without also making the catch distinguish crash vs persist.
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });
    } catch (error) {
      console.warn('BullMQ queue not available:', error);
      return null;
    }
  }
  return contentQueue;
}

export type QueueAddResult = 'queued' | 'unavailable' | 'active';

export async function addJobToQueue(jobId: string, data: Record<string, unknown>): Promise<boolean> {
  const result = await addJobToQueueDetailed(jobId, data);
  return result === 'queued';
}

// WHY detailed result: regenerate used to treat a locked active job's failed
// remove + duplicate add as "queued" (BullMQ returns the old id) and skip
// direct mode — or, when remove threw and add failed, as "unavailable" and
// start a second pipeline beside the worker. Callers that need to distinguish
// those cases use this; create/batch only care about boolean success.
export async function addJobToQueueDetailed(
  jobId: string,
  data: Record<string, unknown>,
): Promise<QueueAddResult> {
  try {
    const queue = getQueue();
    if (!queue) return 'unavailable';

    // Remove any existing job with this ID (e.g. from a previous run / regeneration)
    // so BullMQ doesn't silently deduplicate it.
    let existingJob: Awaited<ReturnType<Queue['getJob']>> | undefined;
    try {
      existingJob = await queue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        // WHY refuse while active/waiting-children: remove() throws when the
        // job is locked, and a subsequent queue.add with the same id returns
        // the old job without writing the new payload — so regenerate wiped
        // the UI, returned success, and never ran with the new feedback.
        if (state === 'active' || state === 'waiting-children') {
          logger.warn('[Queue] Refusing to re-add while job is still running', { jobId, state });
          return 'active';
        }
        await existingJob.remove();
        logger.info('[Queue] Removed old job before re-adding', { jobId });
      }
    } catch (err) {
      // WHY return 'active' when an existing job could not be removed: falling
      // through to queue.add with the same id returns the OLD job without the
      // new payload, and regenerate treated that as success.
      logger.warn('[Queue] getJob/remove failed before re-add', {
        jobId, error: err instanceof Error ? err.message : String(err),
      });
      if (existingJob) return 'active';
    }

    await queue.add('generate', { jobId, ...data }, { jobId });
    logger.info('[Queue] Job added to BullMQ queue', { jobId });
    return 'queued';
  } catch (error) {
    console.warn('Failed to add job to queue (Redis may not be available)');
    return 'unavailable';
  }
}

export { getQueue as contentQueue };
