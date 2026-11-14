// WHY: (R3): atomic regenerate claim lives outside the route so regenerate.ts
// stays under the 400-line cap and the UPDATE…RETURNING predicate can't drift.
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentJobs } from '../db/schema.js';
import { logger } from './logger.js';

export type RegenerateClaimResult = 'claimed' | 'busy' | 'error' | 'no-db';

/**
 * Atomically flip a terminal (done|failed) non-deleted job to pending.
 * 0 rows ⇒ another request already claimed it or it is still in-flight.
 */
export async function claimJobForRegenerate(
  jobId: string,
  userId: string,
): Promise<RegenerateClaimResult> {
  if (!db) return 'no-db';
  try {
    const claimed = await db.update(contentJobs)
      .set({ status: 'pending', updatedAt: new Date(), retryCount: 0 })
      .where(and(
        eq(contentJobs.id, jobId),
        eq(contentJobs.userId, userId),
        inArray(contentJobs.status, ['done', 'failed']),
        eq(contentJobs.deleted, 0),
      ))
      .returning({ id: contentJobs.id });
    return claimed.length > 0 ? 'claimed' : 'busy';
  } catch (dbErr: unknown) {
    logger.error('[DB] Failed to claim job for regenerate', {
      jobId,
      userId,
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
    return 'error';
  }
}

/**
 * Roll back a regenerate claim when enqueue refuses (stale BullMQ active lock).
 * WHY: claim flips DB→pending and the route wipes memory before queue check —
 * returning 409 without this left the job stuck pending until the stale sweep.
 */
export async function releaseRegenerateClaim(
  jobId: string,
  userId: string,
  previousStatus: 'done' | 'failed',
): Promise<void> {
  if (!db) return;
  try {
    await db.update(contentJobs)
      .set({ status: previousStatus, updatedAt: new Date() })
      .where(and(
        eq(contentJobs.id, jobId),
        eq(contentJobs.userId, userId),
        eq(contentJobs.status, 'pending'),
        eq(contentJobs.deleted, 0),
      ));
  } catch (dbErr: unknown) {
    logger.error('[DB] Failed to release regenerate claim', {
      jobId,
      userId,
      previousStatus,
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }
}

/** Durable or memory statuses that mean an Adapt sibling is still generating. */
export function isJobGeneratingStatus(status: string): boolean {
  return status === 'pending'
    || status === 'researching'
    || status === 'writing'
    || status === 'formatting'
    || status === 'critiquing'
    || status === 'processing';
}
