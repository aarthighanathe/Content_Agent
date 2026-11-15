import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentJobs, scheduledPosts } from '../db/schema.js';
import { getJobFromStore, jobsMemory, setJobInStore } from './jobStore.js';
import { scheduleJobEviction } from './jobEviction.js';
import {
  CLIENT_PIPELINE_FAILURE,
  PARTIAL_THREAD_ERROR_PREFIX,
  POSTED_UNVERIFIED_ERROR_PREFIX,
} from './clientErrors.js';
import { contentQueue, withQueueTimeout } from './queue.js';
import { logger } from './logger.js';
import { sseManager } from './sse.js';
import { isValidUUID } from './uuid.js';
import { isPersistPending } from './persistPending.js';

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
  // WHY: a BullMQ-queued job sits in memory as plain 'pending' (no stage/progress)
  // until a worker picks it up; failing it here made contentWorker's H1 skip it.
  if (mem.status === 'pending') return true;
  if (typeof mem.progress === 'number' && mem.progress > 0 && mem.progress < 100) {
    return true;
  }
  if (typeof mem.stage === 'string' && ACTIVE_PIPELINE_STAGES.has(mem.stage)) {
    return true;
  }
  return false;
}

const QUEUED_BULLMQ_STATES = new Set(['waiting', 'delayed', 'active', 'paused', 'prioritized']);

/**
 * True when BullMQ still owns the job (queued or running).
 * WHY: the sweep runs in the web process and may not hold the job's memory
 * snapshot (restart, other instance); a long queue backlog is not abandonment.
 * No queue (Redis unset / direct mode) → false so those rows can still be swept.
 * Redis/getJobState errors → true (fail closed for sweep): same as
 * isPersistPending — a blip must not mark a still-queued job failed.
 */
export async function isQueuedInBullMq(jobId: string): Promise<boolean> {
  try {
    const queue = contentQueue();
    if (!queue) return false;
    const state = await withQueueTimeout(queue.getJobState(jobId), 'getJobState');
    return QUEUED_BULLMQ_STATES.has(state);
  } catch (err: unknown) {
    logger.warn('[DB] BullMQ state lookup failed during sweep', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
    return true;
  }
}

/**
 * WHY (M3/S9): when persistWithRetries fails, pipeline.ts keeps the finished job
 * in memory as the only durable copy. Sweeping the DB row to 'failed' would
 * contradict the 'done' state clients already saw and could race a later save.
 * Process-local — other API processes honor content:persist-pending (persistPending.ts).
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
// WHY: stamp timeouts with POSTED_UNVERIFIED_ERROR_PREFIX so Calendar reschedule
// guards reject them (a crash after the provider call may mean the post is live).
const PUBLISH_TIMEOUT_UNVERIFIED_ERROR =
  `${POSTED_UNVERIFIED_ERROR_PREFIX} publish timed out — check your social account `
  + 'before scheduling again.';

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
 * Single terminal-failure path for jobs the pipeline itself never finalized
 * (BullMQ exhausted, direct-mode overload, stale sweep).
 * WHY (B-H1): these paths used to flip only the DB row + SSE, leaving a
 * non-terminal jobsMemory snapshot behind — GET /:id kept serving "pending" and
 * regenerate returned 409 JOB_IN_PROGRESS forever. Memory is failed here and
 * eviction scheduled so it cannot outlive the 10-min TTL.
 * NOTE: `updatedBefore` (sweep) only fails the DB row when still stale; memory
 * is then touched only if that mark succeeded, never on a heartbeat race.
 */
export async function markJobTerminalFailed(
  jobId: string,
  reason: string,
  clientMessage: string = CLIENT_PIPELINE_FAILURE,
  updatedBefore?: Date,
): Promise<boolean> {
  const marked = await markJobFailedIfInFlight(jobId, reason, updatedBefore);
  const mem = getJobFromStore(jobId) || jobsMemory.get(jobId);
  const memInFlight = Boolean(mem) && mem?.status !== 'done' && mem?.status !== 'failed';
  if (!marked && !(memInFlight && !updatedBefore)) return false;

  if (mem && mem.status !== 'done') {
    setJobInStore(jobId, { ...mem, status: 'failed', error: clientMessage } as typeof mem);
    scheduleJobEviction(jobId, (id) => setJobInStore(id, undefined));
  }
  sseManager.sendEvent(jobId, {
    type: 'progress',
    stage: 'failed',
    progress: 0,
    agent: 'system',
    message: clientMessage,
  });
  return marked || memInFlight;
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
    const notYetStale = candidates.filter((row) => {
      if (isActivelyProcessingInMemory(row.id) || isDoneHeldInMemory(row.id)) return false;
      if (row.updatedAt >= failCutoff) return false;
      return true;
    });
    // WHY: another process may hold the only done copy and still be retrying
    // the save. isDoneHeldInMemory cannot see that snapshot.
    const pendingFlags = await Promise.allSettled(
      notYetStale.map((row) => isPersistPending(row.id)),
    );
    const queueCandidates = notYetStale.filter((_, i) => {
      const flag = pendingFlags[i];
      return !(flag?.status === 'fulfilled' && flag.value === true);
    });
    // WHY: contentWorker H1 skips any 'failed' row, so failing a still-queued job
    // would make it never run. Check BullMQ only for the remaining candidates.
    const queuedFlags = await Promise.allSettled(
      queueCandidates.map((row) => isQueuedInBullMq(row.id)),
    );
    const abandoned = queueCandidates.filter((_, i) => {
      const r = queuedFlags[i];
      return !(r?.status === 'fulfilled' && r.value);
    });
    if (abandoned.length === 0) return 0;

    const settled = await Promise.allSettled(
      abandoned.map(async (row) => {
        // WHY: re-assert updatedAt still past failCutoff at mark time — a heartbeat
        // may have landed after the SELECT on another instance.
        return await markJobTerminalFailed(
          row.id,
          'Stale in-flight sweep',
          'Content generation timed out. Please try again or start a new job.',
          failCutoff,
        );
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
        // WHY: a crash after the provider call may mean the post is live; wording must
        // not invite reschedule. Rows already carrying a partial-thread or
        // posted-unverified marker keep it (the scheduledPosts re-arm guard keys on it).
        publishError: sql`CASE
          WHEN ${scheduledPosts.publishError} LIKE ${`${PARTIAL_THREAD_ERROR_PREFIX}%`}
            OR ${scheduledPosts.publishError} LIKE ${`${POSTED_UNVERIFIED_ERROR_PREFIX}%`}
          THEN ${scheduledPosts.publishError}
          ELSE ${PUBLISH_TIMEOUT_UNVERIFIED_ERROR}
        END`,
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
  // WHY: re-entrancy guard — if a sweep hangs on a degraded Redis/DB and later
  // partially recovers, overlapping intervals must not pile up concurrent sweeps.
  let isSweeping = false;
  const runSweeps = (): void => {
    if (isSweeping) return;
    isSweeping = true;
    Promise.allSettled([
      sweepStaleInFlightJobs().catch((err: unknown) => {
        logger.warn('Periodic stale in-flight job sweep failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }),
      sweepStalePublishingPosts().catch((err: unknown) => {
        logger.warn('Periodic stale publishing sweep failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }),
    ])
      .finally(() => {
        isSweeping = false;
      })
      .catch(() => undefined);
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

