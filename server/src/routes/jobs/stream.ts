import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../../middleware/auth.js';
import { sseStreamRateLimit, streamTokenRateLimit } from '../../middleware/rateLimit.js';
import { sseManager } from '../../lib/sse.js';
import { getRedisClient } from '../../lib/redisClient.js';
import { requireJobOwnership, toClientJob } from './ownership.js';
import { getJobFromStore, jobsMemory } from '../../lib/jobStore.js';
import { isValidUUID } from '../../lib/uuid.js';

const router = Router({ mergeParams: true });

// SECURITY: this always resolves to our internal DB UUID (never a raw Clerk ID) so
// callers can pass the result straight into requireJobOwnership() without a second
// resolution step. The stored token payload's `dbUserId` is the identity; `clerkId`
// (if present) is kept only for logging/debugging, never as the resolved identity.
export interface VerifiedSSEToken {
  dbUserId: string;
  jobId?: string;
}

export async function verifySSEToken(
  token: string | undefined,
  opts: { consume?: boolean } = {},
): Promise<VerifiedSSEToken | null> {
  if (!token) return null;
  // SECURITY: stream-token mints randomUUID — reject oversized / non-UUID strings
  // before hitting Redis (DoS / key abuse) (SEC-005).
  if (token.length > 64 || !isValidUUID(token)) return null;

  // First, check for a short-lived Redis-issued SSE token
  try {
    const client = getRedisClient();
    if (client) {
      const key = `sse:token:${token}`;
      // WHY: GETDEL is atomic, so two concurrent connects can't both redeem one token;
      // the 15-min TTL remains the fallback for tokens that are never used.
      const val = opts.consume ? await client.getdel(key) : await client.get(key);
      if (val) {
        try {
          const parsed = JSON.parse(val) as { dbUserId?: unknown; jobId?: unknown };
          if (typeof parsed.dbUserId !== 'string') return null;
          return {
            dbUserId: parsed.dbUserId,
            jobId: typeof parsed.jobId === 'string' ? parsed.jobId : undefined,
          };
        } catch {
          return null;
        }
      }
    }
  } catch (e: unknown) {
    console.warn('[SSE] Redis lookup failed for token verification:', e instanceof Error ? e.message : e);
  }

  // WHY: no Clerk session-JWT fallback: putting a full session token in the
  // EventSource query string exposes a bearer credential for the whole API
  // in access logs, history, and referrers. Stream auth is short-lived Redis
  // tokens only (POST /:jobId/stream-token). If Redis is down, that route
  // returns 503 and the client polls REST instead.
  return null;
}

// GET /:jobId/stream — SSE job progress stream
router.get('/:jobId/stream', ...sseStreamRateLimit, async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;

    // NOTE: verifySSEToken now always returns the DB UUID directly (never a Clerk
    // ID), so it can be passed straight into requireJobOwnership() — no separate
    // clerkId → dbUserId re-resolution step needed here anymore.
    // SECURITY: consume: true makes the token single-use (a leaked URL from logs/history
    // can't be replayed); the client mints a fresh token on every reconnect.
    const verified = await verifySSEToken(token, { consume: true });
    if (!verified) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING', retryable: false });
    }
    // WHY: 404 not 403: same ownership-enumeration rule as requireJobOwnership —
    // a 403 would confirm the token is valid for a different job id.
    if (verified.jobId && verified.jobId !== jobId) {
      return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
    }

    const job = await requireJobOwnership(jobId, verified.dbUserId, res);
    if (!job) return;

    const clientId = uuidv4();
    if (!sseManager.addClient(jobId, clientId, res)) {
      return res.status(429).json({
        error: 'Too many live streams for this job',
        code: 'RATE_LIMITED',
        retryable: true,
      });
    }

    // Send current state if available
    const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
    if (memJob) {
      // SECURITY: omit sourceMaterial/competitorContext — same strip as GET /:jobId.
      // WHY: jobId alias (CORR-013): memory jobs use `id`; the client bootstrap
      // historically required `data.jobId` and ignored the initial state event.
      const clientJob = toClientJob(memJob);
      res.write(`data: ${JSON.stringify({ type: 'state', jobId: memJob.id, ...clientJob })}\n\n`);
    }
  } catch (err: unknown) {
    console.error(
      '[SSE] Stream handler error:',
      err instanceof Error ? err.message : err,
    );
    // WHY: once event-stream headers are flushed, never res.status().json() —
    // that corrupts the stream. res.end() fires 'close', which runs closeClient
    // and clears keepAlive/idle timers.
    if (res.headersSent) {
      try {
        res.end();
      } catch {
        // already closed
      }
      return;
    }
    return res.status(500).json({
      error: 'Failed to open stream',
      code: 'SERVER_ERROR',
      retryable: true,
    });
  }
});

// POST /:jobId/stream-token — issue a short-lived SSE token (stored in Redis)
// SECURITY: exempt from jobMutationRateLimit (reconnects shouldn't burn that
// budget) but still capped by streamTokenRateLimit (60/min per user) so a
// mint loop can't spam Redis.
router.post('/:jobId/stream-token', streamTokenRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    // SECURITY: this route persists its resolved identity into a 15-minute
    // Redis-backed token (unlike a per-request fallback), so unlike other
    // routes' requireAuthUserId helper, fail closed
    // here instead of falling through to a shared 'demo' identity — that
    // fallback should be unreachable given authMiddleware's fail-closed
    // guarantee (this route runs behind it, see the SECURITY note below),
    // but a stateful token is exactly the wrong place to rely on that
    // invariant holding forever without a local backstop.
    if (!req.dbUserId) {
      res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING', retryable: false });
      return;
    }
    const userId = req.dbUserId;
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    const client = getRedisClient();
    if (!client) {
      res.status(503).json({ error: 'Redis unavailable', code: 'REDIS_UNAVAILABLE', retryable: true });
      return;
    }

    const token = randomUUID();
    const key = `sse:token:${token}`;
    // SECURITY: store the SAME resolved identifier requireJobOwnership() was just
    // checked against under a single unambiguous `dbUserId` key. This route
    // (POST /:jobId/stream-token) DOES still go through authMiddleware —
    // routes/jobs/index.ts only exempts the actual SSE stream endpoint
    // (GET /:jobId/stream, matched by SSE_STREAM_PATH) from auth;
    // STREAM_TOKEN_PATH there exempts this route from the rate limiter
    // only, not from authMiddleware. Also keeping `clerkId` (when available) for
    // logging/debugging only — it is never read back as the resolved identity by
    // verifySSEToken().
    const payload = JSON.stringify({
      dbUserId: userId,
      clerkId: req.userId || null,
      jobId,
      createdAt: Date.now(),
    });
    await client.set(key, payload, 'EX', 15 * 60);

    res.json({ token, expiresIn: 15 * 60 });
  } catch (err: unknown) {
    console.error('[SSE] Failed to create stream token:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to create stream token', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
