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

/**
 * Pipelines can run several minutes; renew keeps ownership across the TTL.
 * WHY: 120s TTL / 30s renew — a crashed holder blocks retries for at most ~2 min
 * instead of 10, while 4 missed renews are still needed before the lock lapses.
 */
export const CONTENT_RUN_LOCK_TTL_SECONDS = 120;
export const CONTENT_RUN_LOCK_RENEW_MS = 30_000;

/** Short-lived claim while multiply checks siblings + inserts the pending row. */
export const MULTIPLY_LOCK_TTL_SECONDS = 120;
export const MULTIPLY_LOCK_RENEW_MS = 30_000;

export function contentRunLockKey(jobId: string): string {
  return `content:run:${jobId}`;
}

export function multiplyLockKey(rootJobId: string, platform: string): string {
  return `multiply:${rootJobId}:${platform}`;
}

// WHY: process-wide in-flight set shared by contentWorker and runPipelineDirect so a
// co-hosted BullMQ worker and a direct-mode fallback cannot run the same jobId at once.
export const inFlightContentJobIds = new Set<string>();

// WHY: track loss by lock TOKEN, not Redis key. Key-based tracking poisoned a
// new holder B that SET NX after A lost ownership — B saw isContentRunLockLost
// until A's release cleared the set, so B moveToDelayed-looped for the rest of
// A's stage (infinite if A hung). Token sets are per-acquire.
const lostLockTokens = new Set<string>();

/** True when THIS acquire's token was marked lost (never another holder's). */
export function isContentRunLockLost(token: string): boolean {
  return lostLockTokens.has(token);
}

export interface AcquiredRedisLock {
  key: string;
  token: string;
  /** True once renew detected the lock was taken over or could not be extended in time. */
  isLost: () => boolean;
  /** Aborts when the lock is lost. */
  signal: AbortSignal;
  /** Stop the renew timer and delete the key if we still own it. */
  release: () => Promise<void>;
}

export type RedisLockAcquireResult =
  | { status: 'acquired'; lock: AcquiredRedisLock }
  | { status: 'held' }
  | { status: 'unavailable' };

/**
 * Try SET key token NX EX ttl. On success, starts a renew interval until release().
 * `held` = another owner; `unavailable` = no Redis / SET error.
 * Callers with Redis configured (contentWorker, feed monitors) must fail closed;
 * fail-open is only for intentional no-Redis dev / unit tests.
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
  const abort = new AbortController();
  let lost = false;
  let lastRenewOkAt = Date.now();
  const markLost = (reason: string): void => {
    if (lost) return;
    lost = true;
    lostLockTokens.add(token);
    // FLOW: abort.signal lets the in-flight pipeline abort at stage boundaries
    // without a process-wide key flag that a newer holder could inherit.
    abort.abort();
    logger.error('[ContentJobLock] Lock lost mid-run', { key, reason });
  };
  const renewTimer = setInterval(() => {
    redis
      .eval(RENEW_LOCK_LUA, 1, key, token, String(ttlSeconds))
      .then((result: unknown) => {
        if (result === 0 || result === '0') {
          markLost('renew found lock owned by another holder or expired');
          return;
        }
        lastRenewOkAt = Date.now();
      })
      .catch((err: unknown) => {
        logger.warn('[ContentJobLock] Lock renew failed', {
          key,
          error: err instanceof Error ? err.message : String(err),
        });
        // WHY: a single blip is tolerable (TTL has slack); once we have gone a full TTL
        // without a successful renew the key has expired and another holder may run.
        if (Date.now() - lastRenewOkAt >= ttlSeconds * 1000) {
          markLost('renew failing for longer than TTL');
        }
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
    lostLockTokens.delete(token);
    try {
      await redis.eval(RELEASE_LOCK_LUA, 1, key, token);
    } catch {
      // lock TTL will expire
    }
  };

  return {
    status: 'acquired',
    lock: { key, token, isLost: () => lost, signal: abort.signal, release },
  };
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

export function isContentJobLockHeldError(err: unknown): err is ContentJobLockHeldError {
  return err instanceof ContentJobLockHeldError
    || (err instanceof Error && err.name === 'ContentJobLockHeldError');
}

/** Delay before BullMQ re-picks a job whose content:run lock was held (M1). */
export const CONTENT_LOCK_HELD_RETRY_DELAY_MS = 10_000;

/**
 * Prefer moveToDelayed (no attempt burn) when token is present.
 * If that path is impossible, enqueue a delayed sibling with the same payload
 * and return so the current BullMQ job completes successfully — throwing
 * ContentJobLockHeldError would burn attempts, and the failed handler skips
 * markJobTerminalFailed for lock-held, leaving the durable row pending forever.
 */
export async function requeueWhileContentLockHeld(
  job: {
    moveToDelayed?: (timestamp: number, token?: string) => Promise<void>;
    data?: unknown;
  },
  token: string | undefined,
  jobId: string,
  DelayedErrorCtor: new (message?: string) => Error,
): Promise<void> {
  logger.warn('Content job lock held — delaying without consuming attempt', { jobId });
  if (typeof job.moveToDelayed === 'function' && typeof token === 'string' && token.length > 0) {
    await job.moveToDelayed(Date.now() + CONTENT_LOCK_HELD_RETRY_DELAY_MS, token);
    throw new DelayedErrorCtor(`Content job ${jobId} already running`);
  }

  // WHY: re-add with BullMQ jobId = content UUID (same as create path) so
  // isQueuedInBullMq / getJob(contentJobId) sees the delayed retry. Auto-id
  // siblings were invisible to the stale sweep, which then marked the durable
  // row failed while the sibling was still queued. remove-if-not-active lives
  // in addJobToQueueDetailed (delay resets when a prior delayed/waiting job exists).
  try {
    // NOTE: static import at top would be fine; keep local to avoid pulling Queue
    // into every lock acquire (multiply Adapt only needs SET NX).
    const { addJobToQueueDetailed } = await import('./queue.js');
    if (job.data && typeof job.data === 'object' && !Array.isArray(job.data)) {
      const result = await addJobToQueueDetailed(
        jobId,
        { ...(job.data as Record<string, unknown>) },
        { delay: CONTENT_LOCK_HELD_RETRY_DELAY_MS },
      );
      if (result === 'queued') {
        logger.warn('Content job lock held — enqueued delayed retry (no moveToDelayed token)', {
          jobId,
        });
        return;
      }
      // WHY: 'active' = this (or another) BullMQ job still owns the id — cannot
      // replace it; burn an attempt so BullMQ's own retry runs after completion.
      logger.warn('Content job lock held — delayed re-add not possible', {
        jobId,
        queueResult: result,
      });
    }
  } catch (err: unknown) {
    logger.warn('Content job lock held — delayed re-add failed', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  throw new ContentJobLockHeldError(jobId);
}
