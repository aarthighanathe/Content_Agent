import { and, eq, inArray, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentJobs, scheduledPosts } from '../db/schema.js';
import { getJobFromStore, jobsMemory } from './jobStore.js';
import { logger } from './logger.js';
import { sseManager } from './sse.js';
import { isValidUUID } from './uuid.js';

const IN_FLIGHT_STATUSES = [
  'pending',
  'researching',
  'writing',
  'formatting',
  'critiquing',
] as const;

const ACTIVE_PIPELINE_STAGES = new Set([
  'planning',
  'researching',
  'writing',
  'formatting',
  'critiquing',
  'predicting',
  'processing',
]);

/**
 * True when this process still holds a live in-flight snapshot for the job.
 * WHY (M2): DB `updatedAt` can lag past the stale cutoff during a long single
 * LLM stage while emitProgress keeps stage/progress in jobsMemory/jobStore —
 * failing those rows aborted live co-hosted pipelines. Abandoned jobs (crash,
 * empty memory, terminal status) still return false so the sweep can reclaim them.
 */
// WHY: 45 min hard ceiling — a hung LLM promise can leave progress/stage
// "active" forever and previously skipped the 15-min stale sweep indefinitely.
export const MEMORY_ACTIVE_HARD_CEILING_MS = 45 * 60 * 1000;

export function isActivelyProcessingInMemory(jobId: string): boolean {
  const mem = getJobFromStore(jobId) || jobsMemory.get(jobId);
  if (!mem) return false;
  if (mem.status === 'done' || mem.status === 'failed') return false;

  const updatedMs = typeof mem.updatedAt === 'string' ? Date.parse(mem.updatedAt) : NaN;
  if (Number.isFinite(updatedMs) && Date.now() - updatedMs > MEMORY_ACTIVE_HARD_CEILING_MS) {
    return false;
  }

  if (mem.status === 'processing') return true;
  if (typeof mem.progress === 'number' && mem.progress > 0 && mem.progress < 100) {
    return true;
  }
  if (typeof mem.stage === 'string' && ACTIVE_PIPELINE_STAGES.has(mem.stage)) {
    return true;
  }
  return false;
}

/**
 * WHY (M3/S9): when persistWithRetries fails, pipeline.ts keeps the finished job
 * in memory as the only durable copy. Sweeping the DB row to 'failed' would
 * contradict the 'done' state clients already saw and could race a later save.
 */
export function isDoneHeldInMemory(jobId: string): boolean {
  const mem = getJobFromStore(jobId) || jobsMemory.get(jobId);
  return mem?.status === 'done';
}

// WHY: extracted from persistJob.ts: that file exceeded the 400-line cap;
// stale-job / publishing sweeps are independent of persistJobToDB's write path.

// WHY: 15 min (REL-001): a healthy pipeline with 3 critic retries is usually
// under ~10 min. The old 1h default left crashed pending rows invisible to
// Result's 404-based "lost" detector for the whole hour. 15 min is above the
// slow-path ceiling and below "stuck forever" UX.
export const STALE_IN_FLIGHT_MAX_AGE_MS = 15 * 60 * 1000;
// WHY (R6): multi-instance — updateJobStageInDb heartbeats touch updatedAt at
// least every ~5 min while a stage runs. Rows newer than this grace are still
// alive elsewhere even when this process has no memory snapshot; do not fail them.
export const RECENT_HEARTBEAT_MS = 8 * 60 * 1000;
const STALE_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
// WHY: 20 min for publishing: a healthy LinkedIn/Twitter publish is seconds.
// Crash after pending→publishing claim left rows forever (stale sweep only
// covered content_jobs). 20 min is far above publish latency, short enough
// that Calendar does not show "publishing" indefinitely.
export const STALE_PUBLISHING_MAX_AGE_MS = 20 * 60 * 1000;

/** Mark non-terminal jobs failed (worker exhausted / startup stale sweep). */
export async function markJobFailedIfInFlight(
  jobId: string,
  reason: string,
  updatedBefore?: Date,
): Promise<boolean> {
  if (!db || !isValidUUID(jobId)) return false;
  try {
    const conditions = [
      eq(contentJobs.id, jobId),
      inArray(contentJobs.status, [...IN_FLIGHT_STATUSES]),
    ];
    // WHY (R6): optional updatedAt ceiling so a mid-sweep heartbeat on another
    // instance cannot be overwritten by a stale candidate mark.
    if (updatedBefore) {
      conditions.push(lt(contentJobs.updatedAt, updatedBefore));
    }
    const updated = await db.update(contentJobs)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(and(...conditions))
      .returning({ id: contentJobs.id });
    if (updated.length > 0) {
      logger.warn('[DB] Marked in-flight job failed', { jobId, reason: reason.slice(0, 200) });
      return true;
    }
    return false;
  } catch (err: unknown) {
    logger.warn('[DB] Failed to mark in-flight job failed', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Fail pending/in-flight jobs older than `maxAgeMs` and emit terminal SSE so
 * Result clients exit the loading state (REL-001).
 */
export async function sweepStaleInFlightJobs(
  maxAgeMs = STALE_IN_FLIGHT_MAX_AGE_MS,
): Promise<number> {
  if (!db) return 0;
  try {
    // WHY (R6): pull rows idle past the heartbeat grace (not only past maxAgeMs)
    // so we can skip "recently heartbeating" in JS; hard-fail only past maxAgeMs.
    // Index: status + updatedAt. Single-process long stages without a heartbeat
    // still rely on isActivelyProcessingInMemory — that path is unchanged.
    const considerCutoff = new Date(Date.now() - Math.min(maxAgeMs, RECENT_HEARTBEAT_MS));
    const failCutoff = new Date(Date.now() - maxAgeMs);
    const candidates = await db.select({
      id: contentJobs.id,
      updatedAt: contentJobs.updatedAt,
    })
      .from(contentJobs)
      .where(and(
        inArray(contentJobs.status, [...IN_FLIGHT_STATUSES]),
        lt(contentJobs.updatedAt, considerCutoff),
      ));
    // WHY (R6): skip if still alive in this process's memory OR updatedAt is still
    // newer than failCutoff (another instance's stage heartbeat keeps the row live).
    const abandoned = candidates.filter((row) => {
      if (isActivelyProcessingInMemory(row.id) || isDoneHeldInMemory(row.id)) return false;
      if (row.updatedAt >= failCutoff) return false;
      return true;
    });
    if (abandoned.length === 0) return 0;

    const settled = await Promise.allSettled(
      abandoned.map(async (row) => {
        // WHY: re-assert updatedAt still past failCutoff at mark time — a heartbeat
        // may have landed after the SELECT on another instance.
        const marked = await markJobFailedIfInFlight(row.id, 'Stale in-flight sweep', failCutoff);
        if (!marked) return false;
        sseManager.sendEvent(row.id, {
          type: 'progress',
          stage: 'failed',
          progress: 0,
          agent: 'system',
          message: 'Content generation timed out. Please try again or start a new job.',
        });
        return true;
      }),
    );
    const swept = settled.filter(
      (r): r is PromiseFulfilledResult<true> => r.status === 'fulfilled' && r.value === true,
    ).length;
    if (swept > 0) {
      logger.warn('[DB] Swept stale in-flight jobs', { count: swept });
    }
    return swept;
  } catch (err: unknown) {
    logger.warn('[DB] Stale in-flight sweep failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Fail scheduled_posts stuck in `publishing` after a worker crash mid-claim.
 * WHY publishedAt: the table has no updatedAt; the worker stamps publishedAt
 * when claiming so a crash leaves a durable "claim started" timestamp to sweep.
 */
export async function sweepStalePublishingPosts(
  maxAgeMs = STALE_PUBLISHING_MAX_AGE_MS,
): Promise<number> {
  if (!db) return 0;
  try {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const updated = await db.update(scheduledPosts)
      .set({
        publishStatus: 'failed',
        publishError: 'Publish timed out — please try scheduling again.',
        publishedAt: null,
      })
      .where(and(
        eq(scheduledPosts.publishStatus, 'publishing'),
        lt(scheduledPosts.publishedAt, cutoff),
      ))
      .returning({ id: scheduledPosts.id });
    if (updated.length > 0) {
      logger.warn('[DB] Swept stale publishing scheduled posts', { count: updated.length });
    }
    return updated.length;
  } catch (err: unknown) {
    logger.warn('[DB] Stale publishing sweep failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

let staleSweepTimer: ReturnType<typeof setInterval> | null = null;

/** Periodic + immediate sweep from the web process (covers no-Redis / direct mode). */
export function startStaleJobSweep(): void {
  if (staleSweepTimer) return;
  const runSweeps = (): void => {
    sweepStaleInFlightJobs().catch((err: unknown) => {
      logger.warn('Periodic stale in-flight job sweep failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    sweepStalePublishingPosts().catch((err: unknown) => {
      logger.warn('Periodic stale publishing sweep failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  };
  runSweeps();
  staleSweepTimer = setInterval(runSweeps, STALE_SWEEP_INTERVAL_MS);
  staleSweepTimer.unref?.();
}

export function stopStaleJobSweep(): void {
  if (staleSweepTimer) {
    clearInterval(staleSweepTimer);
    staleSweepTimer = null;
  }
}

