// WHY: isDoneHeldInMemory is process-local. A second API process's stale sweep
// would mark the DB row failed while backgroundRepersist still holds the only
// copy. This key is the cross-process equivalent; TTL covers a crashed holder.
import { getRedisClient } from './redisClient.js';
import { logger } from './logger.js';
import { isValidUUID } from './uuid.js';

// WHY: longer than the longest backgroundRepersist gap (5 min) so a missed
// renew cannot let another process fail the row mid-retry.
const PERSIST_PENDING_TTL_SECONDS = 12 * 60;
// WHY: after re-persist exhaust, keep the flag until memory eviction (~10 min)
// plus buffer — clearing it immediately let another instance's sweep emit
// cross-process `failed` SSE while this process still held the only `done` copy.
const PERSIST_EXHAUSTED_TTL_SECONDS = 15 * 60;

export function persistPendingKey(jobId: string): string {
  return `content:persist-pending:${jobId}`;
}

async function withPersistRedis(
  jobId: string,
  op: (redis: NonNullable<ReturnType<typeof getRedisClient>>, key: string) => Promise<void>,
): Promise<void> {
  const redis = getRedisClient();
  // SECURITY: only a validated id is interpolated into the Redis key.
  if (!redis || !isValidUUID(jobId)) return;
  try {
    await op(redis, persistPendingKey(jobId));
  } catch (err: unknown) {
    logger.warn('[DB] persist-pending redis op failed', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Renew the cross-process "do not sweep" flag while a done result is memory-only. */
export async function markPersistPending(jobId: string): Promise<void> {
  await withPersistRedis(jobId, async (redis, key) => {
    await redis.set(key, '1', 'EX', PERSIST_PENDING_TTL_SECONDS);
  });
}

/**
 * Keep the sweep skip flag after backgroundRepersist exhausts (memory-only done).
 * Value `exhausted` is informational; isPersistPending treats any non-null as skip.
 */
export async function markPersistPendingExhausted(jobId: string): Promise<void> {
  await withPersistRedis(jobId, async (redis, key) => {
    await redis.set(key, 'exhausted', 'EX', PERSIST_EXHAUSTED_TTL_SECONDS);
  });
}

/** Drop the flag once the save committed, the job was superseded, or memory was evicted. */
export async function clearPersistPending(jobId: string): Promise<void> {
  await withPersistRedis(jobId, async (redis, key) => {
    await redis.del(key);
  });
}

/**
 * True when some process still holds a memory-only finished job (retrying persist
 * or exhausted-and-awaiting-eviction). Stale sweeps must skip those rows.
 */
export async function isPersistPending(jobId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || !isValidUUID(jobId)) return false;
  try {
    const value = await redis.get(persistPendingKey(jobId));
    return value !== null;
  } catch (err: unknown) {
    logger.warn('[DB] persist-pending lookup failed during sweep', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
    // WHY: fail CLOSED for sweep purposes — treat as pending / skip failing the
    // row. A Redis blip must not let another instance mark a memory-only done
    // job failed; a delayed sweep is safer than a false terminal failure.
    return true;
  }
}
