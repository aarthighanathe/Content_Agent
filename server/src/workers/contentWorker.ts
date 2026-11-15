import * as Sentry from '@sentry/node';
import { startJobHeartbeat } from '../lib/jobHeartbeat.js';
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
import { markJobTerminalFailed, sweepStaleInFlightJobs, updateJobStageInDb } from '../lib/persistJob.js';
import { logger } from '../lib/logger.js';
import { getJobFromStore, setJobInStore } from '../lib/jobStore.js';
import { isValidUUID } from '../lib/uuid.js';
import {
  isContentJobLockHeldError,
  CONTENT_RUN_LOCK_RENEW_MS,
  CONTENT_RUN_LOCK_TTL_SECONDS,
  contentRunLockKey,
  inFlightContentJobIds,
  requeueWhileContentLockHeld,
  tryAcquireRedisLock,
  type AcquiredRedisLock,
} from '../lib/contentJobLock.js';
import { lookupDurableTerminalStatus } from '../lib/contentJobTerminalCheck.js';
import { asString, parseContentJobOptionalFields } from '../lib/contentJobPayload.js';
import { onContentWorkerFailed } from './contentWorkerFailed.js';

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
  // WHY: throw (not return): a bare return completes the BullMQ job as success
  // and never retries — poison payloads must fail the attempt.
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    logger.warn('Rejecting malformed BullMQ payload (not an object)', {
      bullmqJobId: job.id,
      dataType: data === null ? 'null' : typeof data,
    });
    throw new Error('Malformed BullMQ content job payload');
  }
  const d = data as Record<string, unknown>;
  const jobId = asString(d.jobId) ?? '';
  const userId = asString(d.userId) ?? '';
  const topic = asString(d.topic) ?? '';
  const platform = asString(d.platform) ?? '';

  // M8: jobId must be a UUID; topic/platform/userId are required to run.
  // WHY: throw (not return) so BullMQ does not silently succeed; when jobId is
  // a valid UUID, mark the durable row failed so Result stops spinning.
  if (!isValidUUID(jobId) || !userId || !topic || !platform) {
    logger.warn('Rejecting malformed BullMQ payload (missing/invalid required fields)', {
      bullmqJobId: job.id,
      hasJobId: Boolean(jobId),
      jobIdValid: isValidUUID(jobId),
      hasUserId: Boolean(userId),
      hasTopic: Boolean(topic),
      hasPlatform: Boolean(platform),
    });
    if (isValidUUID(jobId)) {
      await markJobTerminalFailed(jobId, 'Malformed job payload').catch(() => {});
    }
    throw new Error('Malformed BullMQ content job payload');
  }

  // H1: if a prior attempt already reached a terminal durable status, no-op —
  // BullMQ retries must not re-burn Gemini/Tavily after done/failed.
  // WHY: lookup_failed → delay (fail closed), never treat a Neon blip as
  // "not terminal" and re-run generation over existing content_outputs.
  const terminalLookup = await lookupDurableTerminalStatus(jobId);
  if (terminalLookup === 'terminal') {
    logger.warn('Skipping content job — durable row already terminal or deleted', { jobId });
    return;
  }
  if (terminalLookup === 'lookup_failed') {
    await requeueWhileContentLockHeld(job, token, jobId, DelayedError);
    return;
  }

  // WHY: optional fields parsed here so create/batch/repurpose/regenerate
  // queue payloads (incl. Adapt skipResearch) reach PipelineJob intact.
  const {
    tone, targetAudience, brandVoice, phrasesUse, phrasesAvoid, contentDna,
    initialFeedback, sourceMaterial, competitorContext, sourceCompetitorAnalysisId,
    templateId, paletteId, sourceUrl, sourceJobId, sourcePlatform, tag, skipResearch,
  } = parseContentJobOptionalFields(d);

  // WHY: (S2/M1): Redis content:run:{jobId} is the cross-process single-flight
  // lock; process-local Set remains defense-in-depth for co-hosted slots.
  // Never `return` on contention — that completes the BullMQ job as success
  // and burns an attempt / drops the retry (finding M1).
  if (inFlightContentJobIds.has(jobId)) {
    await requeueWhileContentLockHeld(job, token, jobId, DelayedError);
    return;
  }

  const lockResult = await tryAcquireRedisLock(
    contentRunLockKey(jobId),
    CONTENT_RUN_LOCK_TTL_SECONDS,
    CONTENT_RUN_LOCK_RENEW_MS,
  );
  if (lockResult.status === 'held') {
    await requeueWhileContentLockHeld(job, token, jobId, DelayedError);
    return;
  }
  if (lockResult.status === 'unavailable') {
    // WHY: when Redis is configured (prod / any BullMQ deploy), lock
    // unavailable is a blip — fail closed like held so two workers cannot
    // double-run the same jobId (feed monitors refuse check without Redis).
    // Fail-open only when Redis is intentionally unset (local direct mode /
    // unit tests); process-local inFlightContentJobIds is then the only guard.
    const redisConfigured = Boolean(env.UPSTASH_REDIS_URL || env.REDIS_URL);
    if (redisConfigured) {
      logger.warn('Redis content-run lock unavailable — delaying (fail closed)', { jobId });
      await requeueWhileContentLockHeld(job, token, jobId, DelayedError);
      return;
    }
    logger.warn('Redis content-run lock unavailable — using process-local only', { jobId });
  }

  const redisLock: AcquiredRedisLock | null =
    lockResult.status === 'acquired' ? lockResult.lock : null;
  inFlightContentJobIds.add(jobId);
  let requeueForLock = false;
  try {
    await runClaimedJob();
  } catch (err: unknown) {
    if (!isContentJobLockHeldError(err)) throw err;
    requeueForLock = true;
  } finally {
    inFlightContentJobIds.delete(jobId);
    if (redisLock) {
      await redisLock.release();
    }
  }
  // WHY: release first so a free key can be taken on the delayed retry. A live
  // holder makes the retry delay again; a terminal row is then a no-op (H1).
  if (requeueForLock) {
    await requeueWhileContentLockHeld(job, token, jobId, DelayedError);
    return;
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

  // FLOW: heartbeat covers the whole pipeline run; stopped in finally below.
  const stopHeartbeat = startJobHeartbeat(jobId);
  try {
    // WHY: pass this acquire's AbortSignal so stage boundaries abort on renew
    // loss without a jobId-keyed lost flag that a later holder could inherit.
    await runAndPersistPipeline(jobData, emitProgress, {
      set: (id, data) => setJobInStore(id, data),
      evict: (id) => setJobInStore(id, undefined),
    }, {
      ...(skipResearch ? { skipResearch } : {}),
      ...(redisLock ? { runLockSignal: redisLock.signal } : {}),
    });
  } catch (err: unknown) {
    // WHY: lock loss is not a persisted failure — rethrow so the outer handler
    // can moveToDelayed without burning an attempt or emitting "deleted".
    if (isContentJobLockHeldError(err)) throw err;
    // WHY: every other error was already saved as failed + terminal SSE.
    // Rethrowing would make BullMQ retry a terminal job and burn provider quota.
  } finally {
    stopHeartbeat();
  }
  }
}


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

    worker.on('failed', onContentWorkerFailed);

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
