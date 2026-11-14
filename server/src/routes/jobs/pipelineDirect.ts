import { sseManager } from '../../lib/sse.js';
import {
  getJobFromStore,
  setJobInStore,
  jobsMemory,
} from './ownership.js';
import { runAndPersistPipeline, type PipelineJob, type SkipResearchOpts } from '../../lib/pipeline.js';
import { markJobFailedIfInFlight, updateJobStageInDb } from '../../lib/persistJob.js';
import { logger } from '../../lib/logger.js';

// WHY: extracted from create.ts: that file exceeded the 400-line cap; the
// direct-mode concurrency gate + runner is shared by create, regenerate, and
// multiply and has no dependency on the route handlers themselves.

// WHY: concurrency gate for direct pipeline mode (when Redis/BullMQ is unavailable).
// Without this, N simultaneous job creates would spin up N parallel LLM pipelines,
// each consuming ~500ms of Gemini quota and significant RAM. The gate queues extras
// and processes them when a slot frees up. Max 3 avoids saturating the Gemini API.
let _activePipelines = 0;
const MAX_DIRECT_PIPELINES = 3;
// WHY: (X2/M13): unbounded _pipelineQueue let every create under load park a
// waiter forever and pin closures/RAM; cap rejects with a retryable error.
const MAX_DIRECT_PIPELINE_QUEUE = 20;
const DIRECT_PIPELINE_WAIT_TIMEOUT_MS = 120_000;

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
    await markJobFailedIfInFlight(jobId, err.message);
  } catch {
    // best-effort
  }
  sseManager.sendEvent(jobId, {
    type: 'progress',
    stage: 'failed',
    progress: 0,
    agent: 'system',
    message: err.message,
  });
}

async function _runPipelineDirect(
  jobId: string,
  job: PipelineJob,
  opts?: { skipResearch?: SkipResearchOpts },
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

  try {
    await runAndPersistPipeline(job, emitProgress, {
      set: (id, data) => { setJobInStore(id, data); },
      evict: (id) => { setJobInStore(id, undefined); },
    }, opts);
  } catch {
    // runAndPersistPipeline already persisted the failure and emitted the SSE
    // event — swallow here since this direct-mode call site is fire-and-forget.
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
  try {
    await acquirePipelineSlot();
  } catch (err: unknown) {
    if (err instanceof DirectPipelineOverloadedError) {
      await failJobForOverload(jobId, err);
    }
    throw err;
  }
  try {
    await _runPipelineDirect(jobId, job, opts);
  } finally {
    releasePipelineSlot();
  }
}
