import { Response } from 'express';
import { db } from '../../db/index.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { isValidUUID } from '../../lib/uuid.js';
import { logger } from '../../lib/logger.js';
import {
  jobsMemory,
  getJobFromStore,
  setJobInStore,
  type MemoryJob,
} from '../../lib/jobStore.js';
import {
  assembleJobFromDB,
  toClientJob,
  type AssembledJob,
} from '../../lib/jobAssemble.js';

export { isValidUUID };
// WHY: re-export: route modules historically import jobsMemory/getJobFromStore/
// MemoryJob from ownership — keep that import path stable after the lib extract.
export { jobsMemory, getJobFromStore, setJobInStore, type MemoryJob };
// WHY: re-export: assembleJobFromDB lives in lib/ so workers can use it without
// importing this Express ownership module; route call sites keep this path.
export { assembleJobFromDB, toClientJob, type AssembledJob };

/**
 * Shared guard for any route that needs both a reachable DB and a real UUID
 * dbUserId (Clerk-only/demo users with no DB row can't own a foreign-key row
 * in a user-scoped table). Originally duplicated nearly identically across
 * scheduledPosts.ts, collections.ts, and (missing entirely, causing routes to
 * hang with zero response on DB outage) feedMonitors.ts — consolidated here
 * so the three copies can't diverge again.
 *
 * Returns the resolved userId on success, or writes a 503
 * `{ error, code: 'DB_UNAVAILABLE', retryable: true }` response and returns
 * null — callers check for null and return immediately.
 */
export function requireDbUser(req: AuthRequest, res: Response, featureLabel: string): string | null {
  const userId = req.dbUserId;
  if (!db || !userId || !isValidUUID(userId)) {
    res.status(503).json({
      error: `${featureLabel} requires a database connection`,
      code: 'DB_UNAVAILABLE',
      retryable: true,
    });
    return null;
  }
  return userId;
}

/**
 * Resolve the authenticated internal UUID for any protected route.
 * SECURITY: never fall back to Clerk id or the latent `'demo'` string —
 * authMiddleware already fails closed without dbUserId; this guards the
 * call site if middleware is ever weakened (SEC-006).
 */
export function requireAuthUserId(req: AuthRequest, res: Response): string | null {
  const userId = req.dbUserId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING', retryable: false });
    return null;
  }
  return userId;
}

/** Thrown by lookupOwnedJob when the DB lookup itself fails (distinct from a miss). */
export class OwnershipLookupError extends Error {
  constructor(cause: unknown) {
    super('Ownership lookup failed');
    this.name = 'OwnershipLookupError';
    this.cause = cause;
  }
}

/**
 * Soft ownership lookup — same memory → DB order as requireJobOwnership, but
 * never writes a response. Used when walking Adapt ancestry: a deleted parent
 * must stop the walk, not 404 the child the user actually owns.
 * WHY (B-M2): DB errors throw OwnershipLookupError instead of returning null —
 * a Neon blip must not look like a permanent, non-retryable 404.
 */
export async function lookupOwnedJob(
  jobId: string,
  requestingUserId: string,
): Promise<MemoryJob | AssembledJob | null> {
  // WHY: invalid UUID → miss (404), not a Postgres driver 503 from a bad id.
  if (!isValidUUID(jobId)) return null;

  // NOTE: check both in-memory stores — BullMQ worker uses jobStore, direct
  // pipeline uses jobsMemory. Both must be checked so every code path works.
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  if (memJob) {
    if (memJob.userId !== requestingUserId || memJob.deleted === 1) return null;
    return memJob;
  }

  if (db) {
    try {
      const dbJob = await db.query.contentJobs.findFirst({
        where: (j, { eq: jeq, and: jand }) =>
          jand(jeq(j.id, jobId), jeq(j.userId, requestingUserId), jeq(j.deleted, 0)),
        with: { outputs: true, logs: true },
      });
      if (dbJob) return assembleJobFromDB(dbJob);
    } catch (err: unknown) {
      throw new OwnershipLookupError(err);
    }
  }
  return null;
}

/**
 * Middleware-style ownership guard for all :jobId routes.
 *
 * Lookup order: BullMQ worker store → jobsMemory → DB.
 * This order ensures in-flight jobs (not yet in DB) are still accessible.
 *
 * SECURITY: Returns 404 (not 403) on ownership mismatch — a 403 would confirm
 * that the job exists but belongs to someone else, leaking enumeration info.
 *
 * FLOW: Returns the job object on success, or writes 404 (miss/wrong owner) /
 * 503 retryable (DB error) and returns null — callers return immediately.
 */
export async function requireJobOwnership(
  jobId: string,
  requestingUserId: string,
  res: Response,
): Promise<MemoryJob | AssembledJob | null> {
  // WHY: same 404-as-miss as lookupOwnedJob — reject before any store/DB hit.
  if (!isValidUUID(jobId)) {
    res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
    return null;
  }
  try {
    const job = await lookupOwnedJob(jobId, requestingUserId);
    if (job) return job;
  } catch (err: unknown) {
    if (err instanceof OwnershipLookupError) {
      logger.warn('[DB] Ownership lookup failed', {
        jobId,
        error: err.cause instanceof Error ? err.cause.message : String(err.cause),
      });
      res.status(503).json({
        error: 'Service temporarily unavailable',
        code: 'DB_UNAVAILABLE',
        retryable: true,
      });
      return null;
    }
    throw err;
  }
  res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
  return null;
}
