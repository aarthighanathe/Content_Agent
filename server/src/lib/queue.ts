import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from './logger.js';
import { createDedicatedRedisConnection } from './redisClient.js';

// BullMQ requires SEPARATE Redis connections for Queue and Worker (a Worker's
// blocking commands would otherwise stall a connection shared with the Queue).
// WHY: delegate to redisClient.ts: previously this factory independently read
// env vars and built its own IORedis instance on every call, duplicating the
// same connection-building logic that lived in lib/redisClient.ts. Now both
// derive from redisClient's singleton via `.duplicate()`, so config/credentials
// come from one source of truth — see redisClient.ts's createDedicatedRedisConnection().
export function createRedisConnection(): IORedis {
  return createDedicatedRedisConnection();
}

// Legacy alias used by contentWorker.ts
export { createRedisConnection as redisConnection };

// WHY: Queue connections use maxRetriesPerRequest:null + offline queue (BullMQ
// requirement), so getJob/add hang forever while Redis is down. Bound them so callers
// fall back to direct mode / skip instead of hanging the HTTP request or a sweep.
export const QUEUE_OP_TIMEOUT_MS = 3_000;

export class QueueOpTimeoutError extends Error {
  constructor(label: string) {
    super(`Queue operation timed out: ${label}`);
    this.name = 'QueueOpTimeoutError';
  }
}

export async function withQueueTimeout<T>(
  op: Promise<T>,
  label: string,
  timeoutMs: number = QUEUE_OP_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new QueueOpTimeoutError(label)), timeoutMs);
  });
  // WHY: swallow the loser's late rejection so it is not an unhandled rejection.
  op.catch(() => undefined);
  try {
    return await Promise.race([op, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let contentQueue: Queue | null = null;

function getQueue(): Queue | null {
  if (!contentQueue) {
    try {
      contentQueue = new Queue('content-generation', {
        connection: createRedisConnection(),
        defaultJobOptions: {
          // NOTE: (L8): attempts: 3 is for worker *crashes* / stalled jobs (BullMQ
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

// WHY: detailed result: regenerate used to treat a locked active job's failed
// remove + duplicate add as "queued" (BullMQ returns the old id) and skip
// direct mode — or, when remove threw and add failed, as "unavailable" and
// start a second pipeline beside the worker. Callers that need to distinguish
// those cases use this; create/batch only care about boolean success.
export async function addJobToQueueDetailed(
  jobId: string,
  data: Record<string, unknown>,
  opts?: { delay?: number },
): Promise<QueueAddResult> {
  try {
    const queue = getQueue();
    if (!queue) return 'unavailable';

    // Remove any existing job with this ID (e.g. from a previous run / regeneration)
    // so BullMQ doesn't silently deduplicate it.
    let existingJob: Awaited<ReturnType<Queue['getJob']>> | undefined;
    try {
      existingJob = await withQueueTimeout(queue.getJob(jobId), 'getJob');
      if (existingJob) {
        const state = await withQueueTimeout(existingJob.getState(), 'getState');
        // WHY: refuse while active/waiting-children: remove() throws when the
        // job is locked, and a subsequent queue.add with the same id returns
        // the old job without writing the new payload — so regenerate wiped
        // the UI, returned success, and never ran with the new feedback.
        if (state === 'active' || state === 'waiting-children') {
          logger.warn('[Queue] Refusing to re-add while job is still running', { jobId, state });
          return 'active';
        }
        await withQueueTimeout(existingJob.remove(), 'remove');
        logger.info('[Queue] Removed old job before re-adding', { jobId });
      }
    } catch (err) {
      // WHY: return 'active' when an existing job could not be removed: falling
      // through to queue.add with the same id returns the OLD job without the
      // new payload, and regenerate treated that as success.
      logger.warn('[Queue] getJob/remove failed before re-add', {
        jobId, error: err instanceof Error ? err.message : String(err),
      });
      if (existingJob) return 'active';
      // WHY: getJob itself timed out/failed — Redis is unreachable, so report
      // unavailable rather than hanging on queue.add too.
      if (err instanceof QueueOpTimeoutError) return 'unavailable';
    }

    try {
      // WHY: always set BullMQ jobId = content UUID so stale sweep's
      // getJob(contentJobId) / getJobState finds delayed lock-held retries
      // (auto-id siblings were invisible and got marked failed while queued).
      const addOpts: { jobId: string; delay?: number } = { jobId };
      if (typeof opts?.delay === 'number' && opts.delay > 0) {
        addOpts.delay = opts.delay;
      }
      await withQueueTimeout(queue.add('generate', { jobId, ...data }, addOpts), 'add');
      logger.info('[Queue] Job added to BullMQ queue', { jobId, delay: addOpts.delay });
      return 'queued';
    } catch (addErr: unknown) {
      // WHY: withQueueTimeout races queue.add — a timeout does not cancel the add.
      // If the job landed, report queued so callers do not also runPipelineDirect.
      if (addErr instanceof QueueOpTimeoutError) {
        try {
          const landed = await withQueueTimeout(queue.getJob(jobId), 'getJob-after-add-timeout');
          if (landed) {
            logger.warn('[Queue] add timed out but job is present — treating as queued', {
              jobId,
            });
            return 'queued';
          }
        } catch {
          // fall through to unavailable
        }
      }
      throw addErr;
    }
  } catch (error) {
    console.warn('Failed to add job to queue (Redis may not be available)');
    return 'unavailable';
  }
}

/**
 * Best-effort cancel of a queued content-generation job (soft-delete).
 * WHY: DELETE used to only flip deleted=1 in memory/DB — waiting BullMQ jobs
 * still started and burned Gemini/Tavily. Active/locked jobs cannot be removed
 * from another process (no lock token); those rely on pipeline isSoftDeleted.
 */
export async function cancelContentJob(jobId: string): Promise<boolean> {
  try {
    const queue = getQueue();
    if (!queue) return false;
    const existingJob = await withQueueTimeout(queue.getJob(jobId), 'getJob');
    if (!existingJob) return false;
    const state = await withQueueTimeout(existingJob.getState(), 'getState');
    // WHY: skip active: remove() throws when locked by a worker. Soft-delete
    // flags in memory/DB still abort the pipeline between stages.
    if (state === 'active' || state === 'waiting-children') {
      logger.info('[Queue] Soft-deleted job still active; pipeline will abort', {
        jobId,
        state,
      });
      return false;
    }
    await withQueueTimeout(existingJob.remove(), 'remove');
    logger.info('[Queue] Cancelled content job after soft-delete', { jobId, state });
    return true;
  } catch (err: unknown) {
    logger.warn('[Queue] Failed to cancel content job', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export { getQueue as contentQueue };
