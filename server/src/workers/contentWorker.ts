import * as Sentry from '@sentry/node';
import { Worker, Job, DelayedError } from 'bullmq';
import { config } from 'dotenv';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

// Load env from root
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });

import { createRedisConnection } from '../lib/queue.js';
import { env } from '../config.js';
import { sseManager } from '../lib/sse.js';
import { runAndPersistPipeline, type PipelineJob } from '../lib/pipeline.js';
import { markJobFailedIfInFlight, sweepStaleInFlightJobs, updateJobStageInDb } from '../lib/persistJob.js';
import { logger } from '../lib/logger.js';
import { getJobFromStore, setJobInStore } from '../lib/jobStore.js';
import { isValidUUID } from '../lib/uuid.js';
import { db } from '../db/index.js';
import { contentJobs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  ContentJobLockHeldError,
  CONTENT_RUN_LOCK_RENEW_MS,
  CONTENT_RUN_LOCK_TTL_SECONDS,
  contentRunLockKey,
  requeueWhileContentLockHeld,
  tryAcquireRedisLock,
  type AcquiredRedisLock,
} from '../lib/contentJobLock.js';
import { asString, parseSkipResearch } from '../lib/contentJobPayload.js';

// WHY: re-export: older call sites (manage/stream/versions tests) imported store
// helpers from this worker module — keep the path working after jobStore extract.
export { getJobFromStore, setJobInStore };

// WHY: exported: tests/unit/contentWorker.test.ts calls this directly against
// a minimal { data } stand-in for BullMQ's Job, rather than spinning up a real
// Worker/Redis connection — this is the actual unit of behavior (malformed
// payload handling, emitProgress's read-through merge) the review flagged as
// untested; exporting it costs nothing since nothing else needed it private.
// WHY: token: BullMQ passes the lock token as the 2nd arg — required for
// moveToDelayed when content:run:{jobId} is held (M1 / S2).
export async function processContentJob(job: Job, token?: string): Promise<void> {
  const data: unknown = job.data;
  // M8: reject non-object payloads before any pipeline work — empty defaults
  // used to enqueue a useless Gemini run that could never persist cleanly.
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    logger.warn('Rejecting malformed BullMQ payload (not an object)', {
      bullmqJobId: job.id,
      dataType: data === null ? 'null' : typeof data,
    });
    return;
  }
  const d = data as Record<string, unknown>;
  const jobId = asString(d.jobId) ?? '';
  const userId = asString(d.userId) ?? '';
  const topic = asString(d.topic) ?? '';
  const platform = asString(d.platform) ?? '';

  // M8: jobId must be a UUID; topic/platform/userId are required to run.
  if (!isValidUUID(jobId) || !userId || !topic || !platform) {
    logger.warn('Rejecting malformed BullMQ payload (missing/invalid required fields)', {
      bullmqJobId: job.id,
      hasJobId: Boolean(jobId),
      jobIdValid: isValidUUID(jobId),
      hasUserId: Boolean(userId),
      hasTopic: Boolean(topic),
      hasPlatform: Boolean(platform),
    });
    return;
  }

  // H1: if a prior attempt already reached a terminal durable status, no-op —
  // BullMQ retries must not re-burn Gemini/Tavily after done/failed.
  if (db) {
    try {
      const rows = await db
        .select({ status: contentJobs.status, deleted: contentJobs.deleted })
        .from(contentJobs)
        .where(eq(contentJobs.id, jobId))
        .limit(1);
      const row = rows[0];
      if (row && (row.status === 'done' || row.status === 'failed' || row.deleted === 1)) {
        logger.warn('Skipping content job — durable row already terminal or deleted', {
          jobId,
          status: row.status,
          deleted: row.deleted,
        });
        return;
      }
    } catch (err: unknown) {
      // WHY: continue on lookup failure: a Neon blip must not drop a still-
      // pending job — idempotency is best-effort ahead of the pipeline.
      logger.warn('Terminal-status lookup failed; continuing with pipeline', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const tone = asString(d.tone);
  const targetAudience = asString(d.targetAudience);
  const brandVoice = asString(d.brandVoice);
  const phrasesUse = asString(d.phrasesUse);
  const phrasesAvoid = asString(d.phrasesAvoid);
  const contentDna = d.contentDna;
  const initialFeedback = asString(d.initialFeedback);
  const sourceMaterial = asString(d.sourceMaterial);
  // WHY: carried through the BullMQ payload too (C3): create.ts resolves
  // competitorContext server-side before enqueueing, so the worker only
  // needs to forward the already-sanitized string — same treatment as
  // brandVoice/phrasesUse above.
  const competitorContext = asString(d.competitorContext);
  const sourceCompetitorAnalysisId = asString(d.sourceCompetitorAnalysisId);
  // WHY: read from the BullMQ payload: create/batch/repurpose/regenerate put
  // these on the queue job; rebuilding without them made production Redis
  // runs persist null template/palette/sourceUrl even when memory had them.
  const templateId = asString(d.templateId);
  const paletteId = asString(d.paletteId);
  const sourceUrl = asString(d.sourceUrl);
  const sourceJobId = asString(d.sourceJobId);
  const sourcePlatform = asString(d.sourcePlatform);
  const tag = asString(d.tag);
  // WHY: Adapt (multiply) serializes cached research onto the queue so the
  // worker can skip orchestrator+researcher — without this, queued Adapt
  // jobs re-ran full research or fell back only to direct mode.
  const skipResearch = parseSkipResearch(d.skipResearch);

  // WHY: (S2/M1): Redis content:run:{jobId} is the cross-process single-flight
  // lock; process-local Set remains defense-in-depth for co-hosted slots.
  // Never `return` on contention — that completes the BullMQ job as success
  // and burns an attempt / drops the retry (finding M1).
  if (inFlightJobIds.has(jobId)) {
    await requeueWhileContentLockHeld(job, token, jobId, DelayedError);
  }

  const lockResult = await tryAcquireRedisLock(
    contentRunLockKey(jobId),
    CONTENT_RUN_LOCK_TTL_SECONDS,
    CONTENT_RUN_LOCK_RENEW_MS,
  );
  if (lockResult.status === 'held') {
    await requeueWhileContentLockHeld(job, token, jobId, DelayedError);
  }
  if (lockResult.status === 'unavailable') {
    // WHY: co-hosted single process can still rely on inFlightJobIds; multi-
    // instance without Redis for locks is unsupported for safe single-flight.
    logger.warn('Redis content-run lock unavailable — using process-local only', { jobId });
  }

  let redisLock: AcquiredRedisLock | null =
    lockResult.status === 'acquired' ? lockResult.lock : null;
  inFlightJobIds.add(jobId);
  try {
    await runClaimedJob();
  } finally {
    inFlightJobIds.delete(jobId);
    if (redisLock) {
      await redisLock.release();
      redisLock = null;
    }
  }

  async function runClaimedJob(): Promise<void> {
  logger.info('Processing job', { jobId, topic, platform, skipResearch: Boolean(skipResearch) });

  const jobData: PipelineJob = {
    id: jobId,
    userId,
    topic,
    platform,
    tone,
    targetAudience,
    brandVoice,
    phrasesUse,
    phrasesAvoid,
    contentDna,
    initialFeedback,
    sourceMaterial,
    competitorContext,
    sourceCompetitorAnalysisId,
    templateId: templateId ?? null,
    paletteId: paletteId ?? null,
    sourceUrl: sourceUrl ?? null,
    sourceJobId: sourceJobId ?? null,
    sourcePlatform,
    tag: tag ?? null,
    status: 'pending',
    retryCount: 0,
  };

  function emitProgress(stage: string, progress: number, agent: string, message: string, durationMs?: number): void {
    // WHY: read-through from the store: mutating the local `jobData` closure
    // variable and writing it back would clobber any richer snapshot (e.g. one
    // with `outputs` attached) that a later store.set() call already wrote —
    // this caused jobs to poll as status:'done' with no outputs forever.
    // Merging onto the current store value keeps whichever fields the last
    // writer added instead of reverting them.
    const current = getJobFromStore(jobId) || jobData;
    current.status = stage === 'done' ? 'done' : 'processing';
    current.stage = stage;
    current.progress = progress;
    setJobInStore(jobId, { ...current });
    updateJobStageInDb(jobId, stage);
    sseManager.sendEvent(jobId, { type: 'progress', stage, progress, agent, message, durationMs });
  }

  // NOTE: emit immediately when the worker picks up the job so SSE clients aren't
  // staring at a blank screen for 2-5s while the orchestrator spins up.
  // BullMQ may queue a job for seconds before a worker slot is free; this event
  // signals "your job is now running" vs "your job is queued".
  sseManager.sendEvent(jobId, {
    type: 'progress', stage: 'planning', progress: 1,
    agent: 'system', message: 'Job picked up by worker…',
  });

  try {
    await runAndPersistPipeline(jobData, emitProgress, {
      set: (id, data) => setJobInStore(id, data),
      evict: (id) => setJobInStore(id, undefined),
    }, skipResearch ? { skipResearch } : undefined);
  } catch {
    // WHY: swallow here: runAndPersistPipeline already persisted the job as
    // 'failed' and emitted the terminal SSE event before rethrowing — the
    // client has already been told this job is done (failed) and stopped
    // listening. Letting this propagate would make BullMQ's `attempts: 3`
    // retry an already-terminal job, burning provider quota a 2nd/3rd time
    // and risking a stale DB overwrite back to 'done' with no client
    // listening. Same contract as routes/jobs/create.ts's _runPipelineDirect.
  }
  }
}

const inFlightJobIds = new Set<string>();

// Create and start worker
let worker: Worker | null = null;

export function startWorker() {
  // Only start worker if Redis URL is configured
  const hasRedis = env.UPSTASH_REDIS_URL || env.REDIS_URL;
  if (!hasRedis) {
    logger.warn('No Redis configured — BullMQ worker disabled');
    logger.warn('Jobs will run directly in the Express process (development mode)');
    return null;
  }

  try {
    // WHY: separate connection: BullMQ's Queue and Worker must not share the same
  // Redis connection. The Worker uses blocking commands (BRPOP) that would
  // block the connection and prevent the Queue from sending new jobs.
    worker = new Worker('content-generation', processContentJob, {
      connection: createRedisConnection(),
      concurrency: 2,
    });

    worker.on('completed', (job) => {
      logger.info('Job completed', { jobId: job.id });
    });

    worker.on('failed', (job, err) => {
      // WHY: lock-held retries (M1) must not flip the durable row to failed while
      // the winning worker is still running — DelayedError never reaches here,
      // but ContentJobLockHeldError can when moveToDelayed/token is unavailable.
      if (
        err instanceof ContentJobLockHeldError
        || err.name === 'ContentJobLockHeldError'
        || err.name === 'DelayedError'
      ) {
        logger.warn('Content job deferred (lock held)', { jobId: job?.id, error: err.message });
        return;
      }
      console.error(`Job ${job?.id} failed:`, err.message);
      Sentry.captureException(err, { tags: { jobId: job?.id, action: 'worker-failed' } });
      // WHY: durable failed + SSE (CORR-001): after max BullMQ attempts / stall
      // exhaustion, runAndPersistPipeline may never have written a terminal row.
      const failedJobId = job?.id;
      if (typeof failedJobId === 'string' && failedJobId.length > 0) {
        void markJobFailedIfInFlight(failedJobId, err.message).then((marked) => {
          if (!marked) return;
          sseManager.sendEvent(failedJobId, {
            type: 'progress',
            stage: 'failed',
            progress: 0,
            agent: 'system',
            message: 'Content generation failed. Please try again or start a new job.',
          });
        }).catch(() => {});
      }
    });

    worker.on('error', (err) => {
      // Suppress transient Redis reconnect noise (same as publishWorker).
      const msg = err.message || '';
      if (
        msg.includes('ECONNREFUSED')
        || msg.includes('ECONNRESET')
        || msg.includes('Connection is closed')
        || msg.includes('ETIMEDOUT')
      ) {
        return;
      }
      console.error('Worker error:', err.message);
      Sentry.captureException(err, { tags: { action: 'worker-error' } });
    });

    logger.info('Content generation worker started');
    // WHY: fire-and-forget: a stuck pending row from a prior crash should not
    // block worker boot; sweep is best-effort recovery for CORR-001.
    sweepStaleInFlightJobs().catch((err: unknown) => {
      logger.warn('Stale in-flight job sweep failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return worker;
  } catch (error) {
    logger.warn('BullMQ worker not available — using direct pipeline');
    return null;
  }
}

// WHY: BullMQ's Worker.close() waits for the current job to finish (or requeues
// it) before resolving, instead of killing it mid-flight. Called from index.ts's
// coordinated shutdown sequence — never call process.exit() directly on signal
// receipt, or an in-flight LLM pipeline job gets abruptly terminated.
export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

// WHY: direct-run entry (DEPLOY-002): `npm run worker` used to import this
// module without calling startWorker(), so the process exited immediately
// with a silent non-worker. When this file is the process entrypoint, boot
// the BullMQ worker and keep the process alive until SIGINT/SIGTERM.
//
// H7 / DEPLOY-002: sseManager + jobsMemory are process-local. A standalone
// worker process never updates the API process's Maps — Result SSE / live
// progress will be blank. Supported deploy co-hosts via index.ts startWorker().
const entryArg = process.argv[1];
const isDirectRun = typeof entryArg === 'string'
  && import.meta.url === pathToFileURL(resolve(entryArg)).href;

if (isDirectRun) {
  if (env.ALLOW_STANDALONE_WORKER !== 'true') {
    logger.error(
      'STANDALONE WORKER UNSUPPORTED FOR LIVE PROGRESS: sseManager and '
      + 'jobsMemory are process-local Maps — progress events will NOT reach '
      + 'the API process or Result SSE clients. Co-host the worker via '
      + 'index.ts startWorker() (supported deploy). Set '
      + 'ALLOW_STANDALONE_WORKER=true to silence this warning if you '
      + 'intentionally run a split worker (DB status only).',
    );
  }
  const started = startWorker();
  if (!started) {
    logger.error('Standalone worker failed to start (is Redis configured?)');
    process.exit(1);
  }
  const shutdown = (): void => {
    stopWorker()
      .catch((err: unknown) => {
        logger.error('Worker shutdown error', {
          error: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
