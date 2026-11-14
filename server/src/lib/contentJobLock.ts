// WHY: shared Redis SET NX + Lua release/renew for content-job single-flight
// (worker) and Adapt multiply (rootId+platform). Mirrors feedMonitorWorker.ts
// so cron/worker races cannot double-run the same jobId or spawn duplicate
// platform siblings. Process-local Sets alone fail across API instances.
import { randomUUID } from 'node:crypto';
import { getRedisClient } from './redisClient.js';
import { logger } from './logger.js';

// WHY: Lua: compare-and-delete/extend must be atomic so a TTL expiry cannot
// let us delete or renew a lock now owned by another holder.
const RELEASE_LOCK_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const RENEW_LOCK_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end";

/** Pipelines can run several minutes; renew keeps ownership across the TTL. */
export const CONTENT_RUN_LOCK_TTL_SECONDS = 600;
export const CONTENT_RUN_LOCK_RENEW_MS = 60_000;

/** Short-lived claim while multiply checks siblings + inserts the pending row. */
export const MULTIPLY_LOCK_TTL_SECONDS = 120;
export const MULTIPLY_LOCK_RENEW_MS = 30_000;

export function contentRunLockKey(jobId: string): string {
  return `content:run:${jobId}`;
}

export function multiplyLockKey(rootJobId: string, platform: string): string {
  return `multiply:${rootJobId}:${platform}`;
}

export interface AcquiredRedisLock {
  key: string;
  token: string;
  /** Stop the renew timer and delete the key if we still own it. */
  release: () => Promise<void>;
}

export type RedisLockAcquireResult =
  | { status: 'acquired'; lock: AcquiredRedisLock }
  | { status: 'held' }
  | { status: 'unavailable' };

/**
 * Try SET key token NX EX ttl. On success, starts a renew interval until release().
 * `held` = another owner; `unavailable` = no Redis / SET error (caller decides fail-open vs closed).
 */
export async function tryAcquireRedisLock(
  key: string,
  ttlSeconds: number,
  renewMs: number,
): Promise<RedisLockAcquireResult> {
  const redis = getRedisClient();
  if (!redis) {
    return { status: 'unavailable' };
  }

  const token = randomUUID();
  try {
    const got = await redis.set(key, token, 'EX', ttlSeconds, 'NX');
    if (got !== 'OK') {
      return { status: 'held' };
    }
  } catch (err: unknown) {
    logger.warn('[ContentJobLock] Lock acquire failed', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'unavailable' };
  }

  // WHY: renew while held — slow Gemini pipelines outlast a fixed TTL and would
  // otherwise let a second worker start mid-run.
  const renewTimer = setInterval(() => {
    redis
      .eval(RENEW_LOCK_LUA, 1, key, token, String(ttlSeconds))
      .catch(() => {
        // best-effort; TTL still bounds the lock
      });
  }, renewMs);
  // WHY: unref so a hung renew interval cannot keep the process alive on shutdown.
  if (typeof renewTimer.unref === 'function') {
    renewTimer.unref();
  }

  let released = false;
  const release = async (): Promise<void> => {
    if (released) return;
    released = true;
    clearInterval(renewTimer);
    try {
      await redis.eval(RELEASE_LOCK_LUA, 1, key, token);
    } catch {
      // lock TTL will expire
    }
  };

  return { status: 'acquired', lock: { key, token, release } };
}

/** Typed signal: another worker/process already holds content:run:{jobId}. */
export class ContentJobLockHeldError extends Error {
  readonly code = 'CONTENT_JOB_LOCK_HELD';
  readonly retryable = true;

  constructor(jobId: string) {
    super(`Content job ${jobId} is already running`);
    this.name = 'ContentJobLockHeldError';
  }
}

/** Delay before BullMQ re-picks a job whose content:run lock was held (M1). */
export const CONTENT_LOCK_HELD_RETRY_DELAY_MS = 10_000;

/**
 * Move the BullMQ job to delayed (no attempt burn) when moveToDelayed+token
 * are available; otherwise throw ContentJobLockHeldError for a normal retry.
 */
export async function requeueWhileContentLockHeld(
  job: { moveToDelayed?: (timestamp: number, token?: string) => Promise<void> },
  token: string | undefined,
  jobId: string,
  DelayedErrorCtor: new (message?: string) => Error,
): Promise<never> {
  logger.warn('Content job lock held — delaying without consuming attempt', { jobId });
  if (typeof job.moveToDelayed === 'function' && typeof token === 'string' && token.length > 0) {
    await job.moveToDelayed(Date.now() + CONTENT_LOCK_HELD_RETRY_DELAY_MS, token);
    throw new DelayedErrorCtor(`Content job ${jobId} already running`);
  }
  throw new ContentJobLockHeldError(jobId);
}
