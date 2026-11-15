// lib/jobEviction.ts — generation-safe 10-minute memory eviction (CORR-002/014).
// WHY: a module-level Map: a bare setTimeout(evict(jobId)) from a prior run can
// fire mid-regenerate (same jobId) and delete the in-flight snapshot. Each
// schedule bumps a generation token; only the matching token may evict.

const EVICT_TTL_MS = 10 * 60 * 1000;

interface EvictionEntry {
  timer: ReturnType<typeof setTimeout>;
  generation: number;
}

const evictionByJobId = new Map<string, EvictionEntry>();
const generationByJobId = new Map<string, number>();
// WHY: monotonic so a cleared timer's callback cannot match a later schedule
// that would otherwise reuse generation 0 after the map entry was deleted.
let nextEvictionGeneration = 1;

/** Cancel any pending eviction when a job re-enters a non-terminal run. */
export function cancelJobEviction(jobId: string): void {
  const existing = evictionByJobId.get(jobId);
  if (existing) {
    clearTimeout(existing.timer);
    evictionByJobId.delete(jobId);
  }
  // WHY: drop the token with the timer. Only the matching generation — a newer
  // schedule's token must survive if this cancel lost the race.
  if (!existing || generationByJobId.get(jobId) === existing.generation) {
    generationByJobId.delete(jobId);
  }
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
  const generation = nextEvictionGeneration;
  nextEvictionGeneration += 1;
  const timer = setTimeout(() => {
    const current = evictionByJobId.get(jobId);
    if (!current || current.generation !== generation) return;
    evictionByJobId.delete(jobId);
    if (generationByJobId.get(jobId) === generation) {
      generationByJobId.delete(jobId);
    }
    evict(jobId);
  }, ttlMs);
  // WHY: unref so pending 10-min evictions don't keep the process alive on exit.
  timer.unref?.();
  generationByJobId.set(jobId, generation);
  evictionByJobId.set(jobId, { timer, generation });
}

/** Clear all pending eviction timers — called from graceful shutdown in index.ts. */
export function stopJobEvictions(): void {
  for (const entry of evictionByJobId.values()) {
    clearTimeout(entry.timer);
  }
  evictionByJobId.clear();
  generationByJobId.clear();
}
