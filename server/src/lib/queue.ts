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

export async function addJobToQueue(jobId: string, data: Record<string, any>): Promise<boolean> {
  try {
    const queue = getQueue();
    if (!queue) return false;

    // Remove any existing job with this ID (e.g. from a previous run / regeneration)
    // so BullMQ doesn't silently deduplicate it.
    try {
      const existingJob = await queue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
        logger.info('[Queue] Removed old job before re-adding', { jobId });
      }
    } catch {
      // Ignore — job may not exist
    }

    await queue.add('generate', { jobId, ...data }, { jobId });
    logger.info('[Queue] Job added to BullMQ queue', { jobId });
    return true;
  } catch (error) {
    console.warn('Failed to add job to queue (Redis may not be available)');
    return false;
  }
}

export { getQueue as contentQueue };
