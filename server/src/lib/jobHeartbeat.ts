import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentJobs } from '../db/schema.js';
import { logger } from './logger.js';
import { isValidUUID } from './uuid.js';

// WHY: well under the 15-min stale sweep, independent of stage events — a single
// LLM stage (or retry loop) can run longer than the sweep without emitting progress.
export const JOB_HEARTBEAT_MS = 2 * 60 * 1000;

/**
 * Periodically bump updatedAt on an in-flight row so another instance's stale
 * sweep does not fail a job that is still running. Returns a stop function;
 * callers must invoke it in a `finally`.
 */
export function startJobHeartbeat(jobId: string, intervalMs: number = JOB_HEARTBEAT_MS): () => void {
  if (!db || !isValidUUID(jobId)) return () => undefined;
  const database = db;
  const timer = setInterval(() => {
    database.update(contentJobs)
      .set({ updatedAt: new Date() })
      .where(and(
        eq(contentJobs.id, jobId),
        // NOTE: in-flight only — never resurrect updatedAt on a terminal row.
        inArray(contentJobs.status, ['pending', 'researching', 'writing', 'formatting', 'critiquing']),
      ))
      .then(() => undefined)
      .catch((err: unknown) => {
        logger.warn('[DB] Job heartbeat failed', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }, intervalMs);
  // WHY: never keep the process alive just for a heartbeat.
  timer.unref();
  return () => clearInterval(timer);
}
