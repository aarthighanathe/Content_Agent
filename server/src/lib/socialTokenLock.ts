// WHY: distinct from any content-job lock — Twitter refresh tokens are often
// single-use; concurrent ensureFreshSocialToken callers must serialize per
// user+platform without sharing keys with feed/content locks.
import { randomUUID } from 'node:crypto';
import { getRedisClient } from './redisClient.js';
import { logger } from './logger.js';

const RELEASE_LOCK_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

const SOCIAL_TOKEN_LOCK_TTL_SECONDS = 30;
const LOCK_WAIT_MS = 400;

// WHY: in-process fallback when Redis is down — single-instance still needs
// mutual exclusion; multi-instance without Redis accepts the race (rare in prod
// where Upstash is required for BullMQ).
const localLocks = new Map<string, Promise<void>>();

function lockKey(userId: string, platform: string): string {
  return `social:token-refresh:${userId}:${platform}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type SocialTokenLockHandle = {
  release: () => Promise<void>;
};

/**
 * Acquire a short-lived SET NX lock for social token refresh.
 * Returns null when another refresh holds the lock (caller should wait + re-read).
 */
export async function tryAcquireSocialTokenLock(
  userId: string,
  platform: string,
): Promise<SocialTokenLockHandle | null> {
  const key = lockKey(userId, platform);
  const redis = getRedisClient();

  if (redis) {
    const token = randomUUID();
    try {
      const got = await redis.set(key, token, 'EX', SOCIAL_TOKEN_LOCK_TTL_SECONDS, 'NX');
      if (got !== 'OK') return null;
      return {
        release: async (): Promise<void> => {
          try {
            await redis.eval(RELEASE_LOCK_LUA, 1, key, token);
          } catch {
            // TTL bounds the lock
          }
        },
      };
    } catch (err: unknown) {
      logger.warn('[socialTokenLock] Redis acquire failed — using local lock', {
        userId,
        platform,
        error: err instanceof Error ? err.message : String(err),
      });
      // fall through to local
    }
  }

  if (localLocks.has(key)) return null;
  let releaseLocal!: () => void;
  const held = new Promise<void>((resolve) => {
    releaseLocal = resolve;
  });
  localLocks.set(key, held);
  return {
    release: async (): Promise<void> => {
      localLocks.delete(key);
      releaseLocal();
    },
  };
}

/** Brief pause used when the refresh lock is held by another caller. */
export async function waitForSocialTokenLockRetry(): Promise<void> {
  await sleep(LOCK_WAIT_MS);
}
