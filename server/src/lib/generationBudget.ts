// lib/generationBudget.ts — shared hourly generation-job budget helpers.
// WHY extracted from middleware/rateLimit.ts: that file owns HTTP limiters +
// sanitizeGenerationInput and was over the 400-line split threshold once
// assert/charge helpers grew; callers still import via rateLimit re-exports.
import { getRedisClient } from './redisClient.js';
import { logger } from './logger.js';
import { env } from '../config.js';

export const AUTH_JOB_MAX = parseInt(env.RATE_LIMIT_MAX_JOBS, 10);

const BUDGET_TTL_SEC = 60 * 60;

// WHY Lua (COST-001): a GET-then-INCRBY race let two parallel batches both see
// the same counter and both proceed past AUTH_JOB_MAX. Atomic check+incr
// closes that window. KEYS[1]=rl key, ARGV[1]=needed, ARGV[2]=max, ARGV[3]=ttl.
const RESERVE_LUA = `
local key = KEYS[1]
local needed = tonumber(ARGV[1])
local max = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local current = tonumber(redis.call('GET', key) or '0')
if (current + needed) > max then
  return {0, current}
end
local hits = redis.call('INCRBY', key, needed)
if hits == needed then
  redis.call('EXPIRE', key, ttl)
end
return {1, hits}
`;

function neededHits(jobCount: number, alreadyCounted: boolean): number {
  return Math.max(0, Math.floor(jobCount) - (alreadyCounted ? 1 : 0));
}

/**
 * Atomically reserve `jobCount` (minus the HTTP hit when alreadyCounted)
 * against AUTH_JOB_MAX. Fail closed when Redis is unavailable — cron/feed
 * paths must not burn Gemini while the HTTP limiters are 503ing (COST-001).
 *
 * SECURITY: userKey MUST be the Clerk `req.userId` the limiter keys on.
 */
export async function reserveGenerationBudget(
  userKey: string,
  jobCount: number,
  opts?: { alreadyCounted?: boolean },
): Promise<{ allowed: boolean; reserved: number }> {
  const alreadyCounted = opts?.alreadyCounted !== false;
  const needed = neededHits(jobCount, alreadyCounted);
  if (needed === 0) return { allowed: true, reserved: 0 };

  const client = getRedisClient();
  if (!client) {
    logger.warn('Generation budget unavailable — Redis missing (fail closed)', { userKey, needed });
    return { allowed: false, reserved: 0 };
  }

  try {
    const key = `rl:auth:${userKey}`;
    const result = await client.eval(
      RESERVE_LUA,
      1,
      key,
      String(needed),
      String(AUTH_JOB_MAX),
      String(BUDGET_TTL_SEC),
    ) as [number, number] | null;
    if (!result || !Array.isArray(result)) {
      return { allowed: false, reserved: 0 };
    }
    const allowed = Number(result[0]) === 1;
    return { allowed, reserved: allowed ? needed : 0 };
  } catch (err: unknown) {
    logger.warn('Failed to reserve generation budget', {
      userKey,
      needed,
      error: err instanceof Error ? err.message : String(err),
    });
    return { allowed: false, reserved: 0 };
  }
}

/** Refund reserved hits when a fan-out created fewer jobs than reserved. */
export async function releaseGenerationBudget(
  userKey: string,
  count: number,
): Promise<void> {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return;
  const client = getRedisClient();
  if (!client) return;
  try {
    const key = `rl:auth:${userKey}`;
    const next = await client.decrby(key, n);
    if (next < 0) {
      await client.set(key, '0', 'EX', BUDGET_TTL_SEC);
    }
  } catch (err: unknown) {
    logger.warn('Failed to release generation budget', {
      userKey,
      count: n,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Soft pre-check (fail closed without Redis). Prefer reserveGenerationBudget
 * before creating jobs — this GET alone cannot close the parallel-batch race.
 */
export async function assertGenerationBudget(
  userKey: string,
  jobCount: number,
  opts?: { alreadyCounted?: boolean },
): Promise<{ allowed: boolean }> {
  const alreadyCounted = opts?.alreadyCounted !== false;
  const needed = neededHits(jobCount, alreadyCounted);
  if (needed === 0) return { allowed: true };
  const client = getRedisClient();
  if (!client) {
    logger.warn('Generation budget assert unavailable — Redis missing (fail closed)', { userKey, needed });
    return { allowed: false };
  }
  try {
    const key = `rl:auth:${userKey}`;
    const current = Number((await client.get(key)) || 0);
    if (!Number.isFinite(current)) return { allowed: false };
    if (current + needed > AUTH_JOB_MAX) return { allowed: false };
    return { allowed: true };
  } catch (err: unknown) {
    logger.warn('Failed to assert generation budget', {
      userKey,
      needed,
      error: err instanceof Error ? err.message : String(err),
    });
    return { allowed: false };
  }
}

/**
 * Charge after create — same atomic Lua as reserve. Prefer reserving before
 * create when fan-out size is known up front.
 */
export async function chargeGenerationBudget(
  userKey: string,
  jobCount: number,
  opts?: { alreadyCounted?: boolean },
): Promise<{ charged: boolean }> {
  const result = await reserveGenerationBudget(userKey, jobCount, opts);
  return { charged: result.allowed };
}
