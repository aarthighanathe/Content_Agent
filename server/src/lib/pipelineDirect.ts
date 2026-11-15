import { sseManager } from './sse.js';
import {
  getJobFromStore,
  setJobInStore,
  jobsMemory,
} from './jobStore.js';
import {
  runAndPersistPipeline,
  type PipelineJob,
  type PipelineRunOpts,
  type SkipResearchOpts,
} from './pipeline.js';
import { markJobTerminalFailed, updateJobStageInDb } from './persistJob.js';
import { startJobHeartbeat } from './jobHeartbeat.js';
import { logger } from './logger.js';
import {
  CONTENT_LOCK_HELD_RETRY_DELAY_MS,
  CONTENT_RUN_LOCK_RENEW_MS,
  CONTENT_RUN_LOCK_TTL_SECONDS,
  contentRunLockKey,
  inFlightContentJobIds,
  isContentJobLockHeldError,
  tryAcquireRedisLock,
} from './contentJobLock.js';
import { addJobToQueueDetailed } from './queue.js';
import { env } from '../config.js';

// WHY: extracted from routes/jobs/pipelineDirect.ts into lib/ so createJobsForPlatforms
// (and other non-route callers) can kick direct-mode pipelines without lib → routes.

// WHY: concurrency gate for direct pipeline mode (when Redis/BullMQ is unavailable).
// Without this, N simultaneous job creates would spin up N parallel LLM pipelines,
// each consuming ~500ms of Gemini quota and significant RAM. The gate queues extras
// and processes them when a slot frees up. Max 3 avoids saturating the Gemini API.
let _activePipelines = 0;
const MAX_DIRECT_PIPELINES = 3;
// WHY: (X2/M13): unbounded _pipelineQueue let every create under load park a
// waiter forever and pin closures/RAM; cap rejects with a retryable error.
const MAX_DIRECT_PIPELINE_QUEUE = 20;
// WHY: a full queue already rejects immediately above; accepted waiters sit behind up
// to 3 pipelines that take 1-3+ min each, so 120s expired healthy waiters. 15 min
// still bounds a wedged slot without failing jobs that are simply queued.
const DIRECT_PIPELINE_WAIT_TIMEOUT_MS = 15 * 60_000;

// WHY: tracked so SIGTERM can await in-flight direct runs before closing the DB.
const activeDirectRuns = new Set<Promise<void>>();

/** Resolves when all direct-mode runs finish or `timeoutMs` elapses. */
export async function drainDirectPipelines(timeoutMs: number): Promise<void> {
  if (activeDirectRuns.size === 0) return;
  logger.info('Draining direct-mode pipelines', { count: activeDirectRuns.size });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([Promise.allSettled([...activeDirectRuns]).then(() => undefined), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (activeDirectRuns.size > 0) {
    logger.warn('Direct-mode drain timed out', { remaining: activeDirectRuns.size });
  }
}

type QueueWaiter = {
  resume: () => void;
  fail: (err: Error) => void;
};

const _pipelineQueue: QueueWaiter[] = [];

/** Typed reject when the direct-mode waiter queue is full or a waiter times out. */
export class DirectPipelineOverloadedError extends Error {
  readonly code = 'PIPELINE_OVERLOADED';
  readonly retryable = true;

  constructor(message: string) {
    super(message);
    this.name = 'DirectPipelineOverloadedError';
  }
}

function acquirePipelineSlot(): Promise<void> {
  if (_activePipelines < MAX_DIRECT_PIPELINES) {
    _activePipelines++;
    return Promise.resolve();
  }
  if (_pipelineQueue.length >= MAX_DIRECT_PIPELINE_QUEUE) {
    return Promise.reject(
      new DirectPipelineOverloadedError(
        'Too many content jobs waiting — please retry in a moment',
      ),
    );
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const waiter: QueueWaiter = {
      resume: () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        _activePipelines++;
        resolve();
      },
      fail: (err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
    };
    // WHY: timeout waiters so a stuck active pipeline cannot pin memory forever.
    const timer = setTimeout(() => {
      const idx = _pipelineQueue.indexOf(waiter);
      if (idx >= 0) {
        _pipelineQueue.splice(idx, 1);
      }
      waiter.fail(
        new DirectPipelineOverloadedError(
          'Timed out waiting for a content-generation slot — please retry',
        ),
      );
    }, DIRECT_PIPELINE_WAIT_TIMEOUT_MS);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    _pipelineQueue.push(waiter);
  });
}

function releasePipelineSlot(): void {
  _activePipelines = Math.max(0, _activePipelines - 1);
  const next = _pipelineQueue.shift();
  if (next) next.resume();
}

async function failJobForOverload(jobId: string, err: DirectPipelineOverloadedError): Promise<void> {
  logger.warn('Direct pipeline overloaded — marking job failed', {
    jobId,
    code: err.code,
    error: err.message,
  });
  try {
    // NOTE: err.message is a fixed server string (no provider text), safe to show.
    await markJobTerminalFailed(jobId, err.message, err.message);
  } catch {
    // best-effort
  }
}

async function _runPipelineDirect(
  jobId: string,
  job: PipelineJob,
  opts?: PipelineRunOpts,
): Promise<void> {
  function emitProgress(
    stage: string,
    progress: number,
    agent: string,
    message: string,
    durationMs?: number,
  ): void {
    const current = getJobFromStore(jobId) ?? jobsMemory.get(jobId);
    if (current) {
      current.status = stage === 'done' ? 'done' : 'processing';
      current.stage = stage;
      current.progress = progress;
      setJobInStore(jobId, { ...current });
    }
    updateJobStageInDb(jobId, stage);
    sseManager.sendEvent(jobId, { type: 'progress', stage, progress, agent, message, durationMs });
  }

  // FLOW: same heartbeat as contentWorker — long LLM stages without emitProgress
  // must still bump updatedAt so multi-instance stale sweeps don't kill the job.
  const stopHeartbeat = startJobHeartbeat(jobId);
  try {
    await runAndPersistPipeline(job, emitProgress, {
      set: (id, data) => { setJobInStore(id, data); },
      evict: (id) => { setJobInStore(id, undefined); },
    }, opts);
  } catch (err: unknown) {
    // WHY: lock loss is retryable — the caller re-acquires. Other errors were
    // already persisted as failed; swallowing those avoids a second LLM run.
    if (isContentJobLockHeldError(err)) throw err;
  } finally {
    stopHeartbeat();
  }
}

// Public wrapper — enforces direct-pipeline concurrency limit.
// WHY: opts: Content Multiplier used to call runAndPersistPipeline uncapped;
// routing it through here applies the same MAX_DIRECT_PIPELINES gate as create.
export async function runPipelineDirect(
  jobId: string,
  job: PipelineJob,
  opts?: { skipResearch?: SkipResearchOpts },
): Promise<void> {
  const run = runPipelineDirectTracked(jobId, job, opts);
  activeDirectRuns.add(run);
  try {
    await run;
  } finally {
    activeDirectRuns.delete(run);
  }
}

async function runPipelineDirectTracked(
  jobId: string,
  job: PipelineJob,
  opts?: { skipResearch?: SkipResearchOpts },
): Promise<void> {
  try {
    await acquirePipelineSlot();
  } catch (err: unknown) {
    if (err instanceof DirectPipelineOverloadedError) {
      await failJobForOverload(jobId, err);
    }
    throw err;
  }
  try {
    // WHY (M1): queue add may have timed out yet landed in BullMQ; take the same
    // content:run lock + process-local claim as contentWorker so only one runs.
    // One re-acquire after lock loss — a second loss means another holder may
    // be running; leave the row in-flight instead of marking it deleted.
    await runDirectWithLock(jobId, job, opts);
  } finally {
    releasePipelineSlot();
  }
}

// WHY: when Redis is configured, a blip on SET NX must not fail-open into an
// unlocked direct run — queue.add may have timed out yet still landed in BullMQ.
const DIRECT_LOCK_RETRY_ATTEMPTS = 4;
const DIRECT_LOCK_RETRY_BASE_MS = 400;

async function acquireDirectRunLock(
  jobId: string,
): Promise<Awaited<ReturnType<typeof tryAcquireRedisLock>>> {
  const redisConfigured = Boolean(env.UPSTASH_REDIS_URL || env.REDIS_URL);
  const attempts = redisConfigured ? DIRECT_LOCK_RETRY_ATTEMPTS : 1;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      // eslint-disable-next-line no-await-in-loop -- WHY: brief backoff between lock retries
      await new Promise((r) => setTimeout(r, DIRECT_LOCK_RETRY_BASE_MS * i));
    }
    // eslint-disable-next-line no-await-in-loop -- WHY: sequential acquire attempts
    const result = await tryAcquireRedisLock(
      contentRunLockKey(jobId),
      CONTENT_RUN_LOCK_TTL_SECONDS,
      CONTENT_RUN_LOCK_RENEW_MS,
    );
    if (result.status === 'acquired' || result.status === 'held') {
      return result;
    }
    if (!redisConfigured) {
      return result;
    }
  }
  logger.warn('Direct pipeline skipped — Redis lock unavailable (fail closed)', { jobId });
  // WHY: same skip path as held — leave durable pending for the BullMQ worker.
  return { status: 'held' };
}

async function handleDirectLockLoss(
  jobId: string,
  job: PipelineJob,
  opts?: { skipResearch?: SkipResearchOpts },
): Promise<void> {
  logger.warn('Direct pipeline lost content:run lock after retries', { jobId });
  const payload: Record<string, unknown> = {
    ...job,
    ...(opts?.skipResearch ? { skipResearch: opts.skipResearch } : {}),
  };
  const queueResult = await addJobToQueueDetailed(
    jobId,
    payload,
    { delay: CONTENT_LOCK_HELD_RETRY_DELAY_MS },
  );
  if (queueResult === 'queued') {
    logger.warn('Direct pipeline lock loss — requeued to BullMQ', { jobId });
    return;
  }
  // WHY: another BullMQ worker already owns this jobId — leave pending for it.
  if (queueResult === 'active') {
    logger.warn('Direct pipeline lock loss — BullMQ job already active', { jobId });
    return;
  }
  const msg =
    'Generation interrupted after a lock conflict. Please retry — the job did not finish.';
  logger.warn('Direct pipeline lock loss — enqueue unavailable, marking failed', { jobId });
  await markJobTerminalFailed(jobId, msg, msg);
}

async function runDirectWithLock(
  jobId: string,
  job: PipelineJob,
  opts?: { skipResearch?: SkipResearchOpts },
): Promise<void> {
  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (inFlightContentJobIds.has(jobId)) {
      logger.warn('Direct pipeline skipped — job already running in this process', { jobId });
      return;
    }
    const lockResult = await acquireDirectRunLock(jobId);
    if (lockResult.status === 'held') {
      // WHY: another runner owns the job (or Redis is configured but lock SET failed);
      // do not double-run or mark it failed — leave pending for the worker.
      logger.warn('Direct pipeline skipped — content:run lock held elsewhere', { jobId });
      return;
    }
    if (lockResult.status === 'unavailable') {
      // WHY: fail-open only when Redis is intentionally unset (local / unit tests);
      // in-process claim below is then the only guard.
      logger.warn('Direct pipeline running without Redis lock', {
        jobId,
        redisConfigured: false,
      });
    }
    inFlightContentJobIds.add(jobId);
    try {
      // WHY: wire this acquire's AbortSignal so lock loss aborts the pipeline
      // without a jobId-keyed lost flag inherited by a later holder.
      await _runPipelineDirect(jobId, job, {
        ...opts,
        ...(lockResult.status === 'acquired'
          ? { runLockSignal: lockResult.lock.signal }
          : {}),
      });
      return;
    } catch (err: unknown) {
      const canRetry = isContentJobLockHeldError(err) && attempt + 1 < maxAttempts;
      if (!canRetry) {
        if (isContentJobLockHeldError(err)) {
          // WHY: create/batch only reach direct mode when queue add already
          // failed — leaving pending after lock loss orphaned the row until
          // the 15m sweep. Prefer a delayed BullMQ requeue; if Redis is still
          // down, mark failed (retryable copy) so the client can retry.
          await handleDirectLockLoss(jobId, job, opts);
          return;
        }
        throw err;
      }
      logger.warn('Direct pipeline lost content:run lock — retrying', {
        jobId,
        attempt: attempt + 1,
      });
    } finally {
      inFlightContentJobIds.delete(jobId);
      if (lockResult.status === 'acquired') {
        await lockResult.lock.release();
      }
    }
  }
}
