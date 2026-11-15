// WHY: extracted from contentWorker so the H1 durable-terminal probe stays
// under the 400-line worker cap and unit tests can exercise fail-closed
// without spinning BullMQ.
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentJobs } from '../db/schema.js';
import { logger } from './logger.js';

export type DurableTerminalLookup = 'terminal' | 'in_flight' | 'lookup_failed';

/**
 * H1: whether a durable row is already done/failed/deleted.
 * WHY: lookup_failed must never be treated as in_flight — a Neon blip during
 * BullMQ retry must delay, not re-run the pipeline over existing outputs.
 */
export async function lookupDurableTerminalStatus(
  jobId: string,
): Promise<DurableTerminalLookup> {
  if (!db) return 'in_flight';
  try {
    const rows = await db
      .select({ status: contentJobs.status, deleted: contentJobs.deleted })
      .from(contentJobs)
      .where(eq(contentJobs.id, jobId))
      .limit(1);
    const row = rows[0];
    if (row && (row.status === 'done' || row.status === 'failed' || row.deleted === 1)) {
      return 'terminal';
    }
    return 'in_flight';
  } catch (err: unknown) {
    logger.warn('Terminal-status lookup failed; delaying (fail closed)', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 'lookup_failed';
  }
}
