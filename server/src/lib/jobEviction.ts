// lib/jobEviction.ts — generation-safe 10-minute memory eviction (CORR-002/014).
// WHY a module-level Map: a bare setTimeout(evict(jobId)) from a prior run can
// fire mid-regenerate (same jobId) and delete the in-flight snapshot. Each
// schedule bumps a generation token; only the matching token may evict.

const EVICT_TTL_MS = 10 * 60 * 1000;

interface EvictionEntry {
  timer: ReturnType<typeof setTimeout>;
  generation: number;
}

const evictionByJobId = new Map<string, EvictionEntry>();
const generationByJobId = new Map<string, number>();

/** Bump/cancel any pending eviction when a job re-enters a non-terminal run. */
export function cancelJobEviction(jobId: string): void {
  const existing = evictionByJobId.get(jobId);
  if (existing) {
    clearTimeout(existing.timer);
    evictionByJobId.delete(jobId);
  }
  generationByJobId.set(jobId, (generationByJobId.get(jobId) ?? 0) + 1);
}

/**
 * Schedule eviction after a terminal persist. Safe across regenerate: a later
 * cancelJobEviction / scheduleJobEviction invalidates this generation.
 */
export function scheduleJobEviction(
  jobId: string,
  evict: (jobId: string) => void,
  ttlMs: number = EVICT_TTL_MS,
): void {
  cancelJobEviction(jobId);
  const generation = generationByJobId.get(jobId) ?? 0;
  const timer = setTimeout(() => {
    const current = evictionByJobId.get(jobId);
    if (!current || current.generation !== generation) return;
    evictionByJobId.delete(jobId);
    evict(jobId);
  }, ttlMs);
  evictionByJobId.set(jobId, { timer, generation });
}
