import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import { verifyToken as clerkVerifyToken } from '@clerk/express';
import { AuthRequest } from '../../middleware/auth.js';
import { sseManager } from '../../lib/sse.js';
import { getRedisClient } from '../../lib/redisClient.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireJobOwnership, jobsMemory } from './ownership.js';
import { getJobFromStore } from '../../workers/contentWorker.js';
import { env } from '../../config.js';

const router = Router({ mergeParams: true });

// SECURITY: this always resolves to our internal DB UUID (never a raw Clerk ID) so
// callers can pass the result straight into requireJobOwnership() without a second
// resolution step. The stored token payload's `dbUserId` is the identity; `clerkId`
// (if present) is kept only for logging/debugging, never as the resolved identity.
export async function verifySSEToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;

  // First, check for a short-lived Redis-issued SSE token
  try {
    const client = getRedisClient();
    if (client) {
      const key = `sse:token:${token}`;
      const val = await client.get(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          return typeof parsed.dbUserId === 'string' ? parsed.dbUserId : null;
        } catch {
          return null;
        }
      }
    }
  } catch (e: unknown) {
    console.warn('[SSE] Redis lookup failed for token verification:', e instanceof Error ? e.message : e);
  }

  // Fallback: allow passing a full Clerk JWT directly (legacy support). This path
  // only has a Clerk ID (`sub`), so it must still be resolved to the DB UUID here —
  // the caller below no longer does this resolution itself.
  if (!env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await clerkVerifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    const clerkUserId = payload.sub;
    if (!clerkUserId || !db) return null;
    const [dbUser] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);
    return dbUser?.id || null;
  } catch {
    return null;
  }
}

// GET /:jobId/stream — SSE job progress stream
router.get('/:jobId/stream', async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  const token = req.query.token as string | undefined;

  // NOTE: verifySSEToken now always returns the DB UUID directly (never a Clerk
  // ID), so it can be passed straight into requireJobOwnership() — no separate
  // clerkId → dbUserId re-resolution step needed here anymore.
  const dbUserId = await verifySSEToken(token);
  if (!dbUserId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING', retryable: false });
    return;
  }

  const job = await requireJobOwnership(jobId, dbUserId, res);
  if (!job) return;

  const clientId = uuidv4();
  sseManager.addClient(jobId, clientId, res);

  // Send current state if available
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  if (memJob) {
    res.write(`data: ${JSON.stringify({ type: 'state', ...memJob })}\n\n`);
  }
});

// POST /:jobId/stream-token — issue a short-lived SSE token (stored in Redis)
router.post('/:jobId/stream-token', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.dbUserId || req.userId || 'demo';
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
    // checked against (including the 'demo' fallback for the unauthenticated/no-DB
    // path — this route is exempted from authMiddleware, see routes/jobs/index.ts's
    // openPaths check) under a single unambiguous `dbUserId` key. Also keeping
    // `clerkId` (when available) for logging/debugging only — it is never read back
    // as the resolved identity by verifySSEToken().
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
