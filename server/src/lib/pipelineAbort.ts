import { eq } from 'drizzle-orm';
import { contentJobs } from '../db/schema.js';
import { db } from '../db/index.js';
import type { CriticResult } from '../agents/critic.js';
import { jobsMemory, getJobFromStore } from './jobStore.js';
import type { PipelineLog, PipelineOutput } from './pipelineTypes.js';
import { isValidUUID } from './uuid.js';

/** True when soft-delete flipped deleted=1 mid-run (memory-first, sync). */
export function isSoftDeleted(jobId: string): boolean {
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  return memJob?.deleted === 1;
}

export type RunAbort = 'deleted' | 'lock_lost';

export type PipelineAbortResult = {
  status: 'cancelled' | 'lock_lost';
  outputs: PipelineOutput[];
  logs: PipelineLog[];
  criticResult: CriticResult | null;
};

// WHY: delete wins so a removed job is not requeued. Lock loss (this acquire's
// AbortSignal) is not a user delete — callers requeue instead. Must not consult
// a jobId-keyed lost set: that poisoned new holders after SET NX.
export async function classifyAbort(
  jobId: string,
  runLockSignal?: AbortSignal,
): Promise<RunAbort | null> {
  if (await isSoftDeletedDurable(jobId)) return 'deleted';
  if (runLockSignal?.aborted) return 'lock_lost';
  return null;
}

export function aborted(
  reason: RunAbort,
  outputs: PipelineOutput[],
  logs: PipelineLog[],
  criticResult: CriticResult | null,
): PipelineAbortResult {
  return {
    status: reason === 'deleted' ? 'cancelled' : 'lock_lost',
    outputs,
    logs,
    criticResult,
  };
}

// WHY (M2): DELETE elsewhere sets DB deleted=1 (memory may miss) — check DB once
// per stage boundary so Gemini stops sooner; persist refuse stays defense-in-depth.
async function isSoftDeletedDurable(jobId: string): Promise<boolean> {
  if (isSoftDeleted(jobId)) return true;
  if (!db || !isValidUUID(jobId)) return false;
  try {
    const rows = await db
      .select({ deleted: contentJobs.deleted })
      .from(contentJobs)
      .where(eq(contentJobs.id, jobId))
      .limit(1);
    if (rows.length > 0 && rows[0]?.deleted === 1) {
      const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
      if (memJob) memJob.deleted = 1;
      return true;
    }
  } catch {
    // WHY: fail open to memory-only — a DB blip must not abort a healthy run.
  }
  return false;
}
