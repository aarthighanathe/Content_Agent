import { randomUUID } from 'crypto';
import type IORedis from 'ioredis';
import { getRedisClient } from './redisClient.js';
import { logger } from './logger.js';

// WHY: each API process gets its own origin id so the publisher can deliver
// locally and skip its own pub/sub echo — without this, pattern-subscribe would
// double-deliver to clients on the publishing instance.
const ORIGIN_ID = randomUUID();

export const SSE_JOB_CHANNEL_PREFIX = 'sse:job:';
const SSE_JOB_PATTERN = 'sse:job:*';

interface SSEPubPayload {
  originId: string;
  data: Record<string, unknown>;
}

let _subscriber: IORedis | null = null;
let _started = false;

function channelForJob(jobId: string): string {
  return `${SSE_JOB_CHANNEL_PREFIX}${jobId}`;
}

function jobIdFromChannel(channel: string): string | null {
  if (!channel.startsWith(SSE_JOB_CHANNEL_PREFIX)) return null;
  const id = channel.slice(SSE_JOB_CHANNEL_PREFIX.length);
  return id.length > 0 ? id : null;
}

/**
 * Publish a job SSE event for other API instances. No-op when Redis is down
 * (local-only degraded mode). Callers must already have delivered locally.
 */
export function publishJobSSE(jobId: string, data: Record<string, unknown>): void {
  const client = getRedisClient();
  if (!client) return;
  const payload: SSEPubPayload = { originId: ORIGIN_ID, data };
  // WHY: fire-and-forget: SSE progress must not await Redis; local clients
  // already got the event, and remote fan-out is best-effort.
  void client.publish(channelForJob(jobId), JSON.stringify(payload)).catch((err: unknown) => {
    logger.warn('[SSE Redis] publish failed', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Dedicated ioredis subscriber (subscribe mode blocks a connection). Delivers
 * remote events via onRemote; ignores this process's own publishes.
 */
export function startSSERedisSubscriber(
  onRemote: (jobId: string, data: Record<string, unknown>) => void,
): void {
  if (_started) return;
  _started = true;

  const base = getRedisClient();
  if (!base) {
    logger.info('[SSE Redis] No Redis — SSE stays process-local (degraded)');
    return;
  }

  try {
    const sub = base.duplicate({ maxRetriesPerRequest: null });
    _subscriber = sub;

    sub.on('error', (err: Error) => {
      logger.warn('[SSE Redis] subscriber error', { error: err.message });
    });

    sub.on('pmessage', (_pattern: string, channel: string, message: string) => {
      const jobId = jobIdFromChannel(channel);
      if (!jobId) return;
      try {
        const parsed: unknown = JSON.parse(message);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
        const obj = parsed as Record<string, unknown>;
        if (obj.originId === ORIGIN_ID) return;
        if (typeof obj.originId !== 'string') return;
        if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return;
        onRemote(jobId, obj.data as Record<string, unknown>);
      } catch {
        // malformed payload — ignore
      }
    });

    void sub.psubscribe(SSE_JOB_PATTERN).then(() => {
      logger.info('[SSE Redis] pattern subscribe ready', { pattern: SSE_JOB_PATTERN });
    }).catch((err: unknown) => {
      logger.warn('[SSE Redis] psubscribe failed — staying local-only', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  } catch (err: unknown) {
    logger.warn('[SSE Redis] failed to start subscriber', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function stopSSERedisSubscriber(): void {
  const sub = _subscriber;
  _subscriber = null;
  if (!sub) return;
  try {
    void sub.punsubscribe(SSE_JOB_PATTERN).catch(() => undefined);
    void sub.quit().catch(() => undefined);
  } catch {
    // shutdown best-effort
  }
}
