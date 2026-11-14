// WHY: extracted from routes/jobs/ownership.ts: lib/pipeline.ts and
// lib/pipelineRun.ts need the in-memory job maps, but importing from routes/
// inverted the dependency graph (lib → routes). Ownership still re-exports
// these helpers so route call sites stay stable.
import type { PipelineJob, PersistedJobResult } from './pipelineTypes.js';

// WHY: a union, not one interface: a job in jobsMemory/jobStore is either still
// running (PipelineJob — mutated in place with stage/progress/status as the
// pipeline advances) or has reached a terminal state (PersistedJobResult, the
// same discriminated 'done' | 'failed' union runAndPersistPipeline already
// produces). Both types carry index signatures via optional fields, so ad-hoc
// fields set by callers (tag, sourceJobId, stage, progress) remain assignable.
export type MemoryJob = PipelineJob | PersistedJobResult;

// Shared in-memory cache: holds active/in-flight jobs before they are persisted
// to DB. Also populated briefly after completion (TTL: 10 min) so polling
// clients can still read the result.
export const jobsMemory = new Map<string, MemoryJob>();

// BullMQ worker store — kept in sync with jobsMemory on every write so ownership
// and SSE never read a stale jobsMemory row after the worker evicts jobStore alone.
const jobStore = new Map<string, MemoryJob>();

export function getJobFromStore(jobId: string): MemoryJob | undefined {
  return jobStore.get(jobId);
}

export function setJobInStore(jobId: string, data: MemoryJob | undefined): void {
  if (data === undefined) {
    jobStore.delete(jobId);
    jobsMemory.delete(jobId);
  } else {
    jobStore.set(jobId, data);
    jobsMemory.set(jobId, data);
  }
}
