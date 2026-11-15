// WHY: extracted from pipeline.ts under the 400-line cap — background retries
// when persistWithRetries fails after a successful pipeline run.
import { sseManager } from './sse.js';
import { persistJobToDB, JobSoftDeletedError } from './persistJob.js';
import { scheduleJobEviction } from './jobEviction.js';
import { jobsMemory, getJobFromStore } from './jobStore.js';
import type { PipelineJob, PersistedJobResult } from './pipelineTypes.js';
import { logger } from './logger.js';
import { isSoftDeleted } from './pipelineRun.js';
import {
  clearPersistPending,
  markPersistPending,
  markPersistPendingExhausted,
} from './persistPending.js';
import { markJobFailedIfInFlight } from './persistJobSweeps.js';

function touchPersistPending(jobId: string, keep: boolean): void {
  const op = keep ? markPersistPending(jobId) : clearPersistPending(jobId);
  op.catch((err: unknown) => {
    logger.warn('[pipeline] persist-pending marker update failed', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

function touchPersistPendingExhausted(jobId: string): void {
  markPersistPendingExhausted(jobId).catch((err: unknown) => {
    logger.warn('[pipeline] persist-exhausted marker update failed', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

// WHY: ~8.5 min total. isDoneHeldInMemory is process-local; the Redis
// persist-pending marker is what other processes' stale sweeps honor.
const REPERSIST_DELAYS_MS = [5_000, 15_000, 45_000, 120_000, 300_000];

/** True when memory holds a done result with at least one final output. */
export function isLiveDoneResult(
  live: PipelineJob | PersistedJobResult,
): live is PersistedJobResult & { status: 'done' } {
  if (live.status !== 'done' || !('outputs' in live) || !Array.isArray(live.outputs)) {
    return false;
  }
  return live.outputs.some((o) => o.outputType === 'final');
}

/** True when memory still holds the terminal failed snapshot we need to persist. */
export function isLiveFailedResult(
  live: PipelineJob | PersistedJobResult,
): live is PersistedJobResult & { status: 'failed' } {
  return live.status === 'failed' && 'outputs' in live && Array.isArray(live.outputs);
}

/**
 * Retry persisting a memory-only done result. On exhaust, keeps a longer
 * persist-pending marker until eviction so cross-instance sweeps do not emit
 * failed SSE while this process still holds the only copy.
 */
export function backgroundRepersist(
  jobId: string,
  evict: (jobId: string) => void,
  attempt = 0,
): void {
  const delay = REPERSIST_DELAYS_MS[attempt];
  if (delay === undefined) {
    // WHY: keep a longer persist-pending marker until eviction — clearing it
    // let another instance's stale sweep mark the durable row failed and emit
    // cross-process failed SSE while this process still held memory-only done.
    touchPersistPendingExhausted(jobId);
    logger.error('[pipeline] Background re-persist exhausted — result remains memory-only', {
      jobId,
    });
    // WHY: honest terminal nudge — retries are done; still stage done so the
    // open tab can export/copy from memory without claiming durable success.
    sseManager.sendEvent(jobId, {
      type: 'progress',
      stage: 'done',
      progress: 100,
      agent: 'system',
      code: 'persist_failed',
      message:
        'Server save failed after retries — this tab still has your content. Export or copy now before closing.',
    });
    // WHY: clear the marker only when memory is actually dropped — sweep skips
    // until then via isPersistPending.
    scheduleJobEviction(jobId, (id) => {
      touchPersistPending(id, false);
      evict(id);
    });
    return;
  }
  // WHY: renew TTL so another process's sweep does not fail the memory-only copy.
  touchPersistPending(jobId, true);
  const timer = setTimeout(() => {
    const live = getJobFromStore(jobId) || jobsMemory.get(jobId);
    // WHY: abort if regenerate/delete superseded this memory-only done result,
    // or if the final was cleared — never write a stale closed-over snapshot.
    if (!live || isSoftDeleted(jobId) || !isLiveDoneResult(live)) {
      touchPersistPending(jobId, false);
      return;
    }
    // WHY: persist live memory (not a generation-time snapshot) so a mid-retry
    // PATCH /content edit lands in DB instead of being overwritten by stale copy.
    touchPersistPending(jobId, true);
    persistJobToDB(live)
      .then(() => {
        touchPersistPending(jobId, false);
        // WHY: re-check after await — a regenerate may have claimed the job
        // while persist was in flight; eviction would wipe the new run.
        const after = getJobFromStore(jobId) || jobsMemory.get(jobId);
        if (!after || isSoftDeleted(jobId) || after.status !== 'done') return;
        scheduleJobEviction(jobId, evict);
        logger.info('[pipeline] Background re-persist succeeded', { jobId, attempt: attempt + 1 });
        sseManager.sendEvent(jobId, {
          type: 'progress',
          stage: 'done',
          progress: 100,
          agent: 'system',
          message: 'Content generation complete!',
        });
      })
      .catch((err: unknown) => {
        if (err instanceof JobSoftDeletedError) {
          touchPersistPending(jobId, false);
          return;
        }
        logger.warn('[pipeline] Background re-persist failed', {
          jobId,
          attempt: attempt + 1,
          error: err instanceof Error ? err.message : String(err),
        });
        backgroundRepersist(jobId, evict, attempt + 1);
      });
  }, delay);
  timer.unref?.();
}

/**
 * Retry persisting a memory-only failed result after terminal failed SSE.
 * WHY: a thrown persistJobToDB(failed) left the durable row non-terminal while
 * the client already saw failed — sweeps could race or other instances still
 * poll pending. Same persist-pending marker as done re-persist.
 */
export function backgroundFailedRepersist(
  jobId: string,
  evict: (jobId: string) => void,
  attempt = 0,
): void {
  const delay = REPERSIST_DELAYS_MS[attempt];
  if (delay === undefined) {
    // WHY: full persistJobToDB may keep failing (validation / Neon); a status-only
    // flip still makes the durable row terminal so claim/Adapt/list unblock.
    markJobFailedIfInFlight(jobId, 'background failed-result persist exhausted')
      .then((marked) => {
        if (marked) {
          touchPersistPending(jobId, false);
          logger.warn('[pipeline] Failed-result persist exhausted — marked DB failed via status update', {
            jobId,
          });
        } else {
          touchPersistPendingExhausted(jobId);
          logger.error(
            '[pipeline] Background failed-result persist exhausted — DB may stay non-terminal',
            { jobId },
          );
        }
        scheduleJobEviction(jobId, (id) => {
          touchPersistPending(id, false);
          evict(id);
        });
      })
      .catch((err: unknown) => {
        touchPersistPendingExhausted(jobId);
        logger.error('[pipeline] Background failed-result persist exhaust mark failed', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
        scheduleJobEviction(jobId, (id) => {
          touchPersistPending(id, false);
          evict(id);
        });
      });
    return;
  }
  touchPersistPending(jobId, true);
  const timer = setTimeout(() => {
    const live = getJobFromStore(jobId) || jobsMemory.get(jobId);
    if (!live || isSoftDeleted(jobId) || !isLiveFailedResult(live)) {
      touchPersistPending(jobId, false);
      return;
    }
    touchPersistPending(jobId, true);
    persistJobToDB(live)
      .then(() => {
        touchPersistPending(jobId, false);
        const after = getJobFromStore(jobId) || jobsMemory.get(jobId);
        if (!after || isSoftDeleted(jobId) || after.status !== 'failed') return;
        scheduleJobEviction(jobId, evict);
        logger.info('[pipeline] Background failed-result persist succeeded', {
          jobId,
          attempt: attempt + 1,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof JobSoftDeletedError) {
          touchPersistPending(jobId, false);
          return;
        }
        logger.warn('[pipeline] Background failed-result persist failed', {
          jobId,
          attempt: attempt + 1,
          error: err instanceof Error ? err.message : String(err),
        });
        backgroundFailedRepersist(jobId, evict, attempt + 1);
      });
  }, delay);
  timer.unref?.();
}
