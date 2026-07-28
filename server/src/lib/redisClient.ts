// Single source of truth for Redis connection config/credentials. All other
// modules that need a Redis connection derive from this file instead of each
// independently reading env vars — see CLAUDE.md §7 finding 1.15.
//
// WHY the raw connection-builder lives here (not in queue.ts): BullMQ's Queue/
// Worker need their OWN dedicated ioredis connection (blocking commands like
// BRPOP on a Worker connection would stall any other command sharing it), but
// a shared connection used for plain get/set (rate limiting, SSE tokens) is
// fine. ioredis's `.duplicate()` clones a connection's config without reusing
// its socket, which is exactly BullMQ's documented pattern for "share config,
// not the connection" — so queue.ts calls getRedisClient().duplicate() rather
// than building its own connection from env vars a second time.
import IORedis from 'ioredis';
import { env } from '../config.js';
import { logger } from './logger.js';

function buildConnection(): IORedis | null {
  const redisUrl = env.UPSTASH_REDIS_URL || env.REDIS_URL || '';
  const redisToken = env.UPSTASH_REDIS_TOKEN || '';

  if (redisUrl && (redisUrl.startsWith('rediss://') || redisUrl.startsWith('redis://'))) {
    logger.info('[Redis] Creating Redis connection', { urlPrefix: redisUrl.substring(0, 30) });
    return new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
    });
  }

  if (redisUrl && redisUrl.startsWith('https://')) {
    const host = redisUrl.replace('https://', '').replace('http://', '');
    logger.info('[Redis] Creating Redis connection (REST mode)', { hostPrefix: host.substring(0, 30) });
    return new IORedis({
      host,
      port: 6379,
      password: redisToken,
      tls: {},
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
    });
  }

  // No Redis URL configured — every caller (queue, rate limiter, SSE tokens)
  // must degrade gracefully rather than throw.
  logger.warn('[Redis] No Redis URL found — Redis-backed features will be skipped');
  return null;
}

let _client: IORedis | null = null;
let _buildAttempted = false;

/**
 * Returns the shared Redis singleton for plain get/set/rate-limit style
 * commands. Safe to call repeatedly — the underlying IORedis instance is
 * created once and reused.
 */
export function getRedisClient(): IORedis | null {
  if (_client) return _client;
  if (_buildAttempted) return null; // already tried and failed — don't retry every call
  _buildAttempted = true;
  try {
    const conn = buildConnection();
    if (conn) {
      _client = conn;
      _client.on('error', (err) => {
        console.warn('[RedisClient] Redis error:', err?.message || err);
      });
    }
    return _client;
  } catch (err) {
    console.warn('[RedisClient] Failed to create Redis client:', err);
    return null;
  }
}

/**
 * Returns a dedicated ioredis connection for BullMQ Queue/Worker use, cloned
 * from the shared singleton's config via `.duplicate()` so credentials/config
 * come from one place, but the socket is NOT shared (satisfies BullMQ's
 * requirement that each Queue/Worker own its connection).
 *
 * Falls back to a deliberately-unreachable placeholder config (matching the
 * previous behavior of queue.ts's createRedisConnection) when no Redis URL is
 * configured at all, so callers (addJobToQueue) can attempt the connection
 * and gracefully catch the failure rather than needing a separate null-check
 * path.
 */
export function createDedicatedRedisConnection(): IORedis {
  const base = getRedisClient();
  if (base) return base.duplicate();

  logger.warn('[Redis] No Redis URL found — BullMQ will be skipped');
  return new IORedis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
    lazyConnect: true,
  });
}

export default getRedisClient;
