import * as Sentry from '@sentry/node';
import { eq } from 'drizzle-orm';
import { sseManager } from './sse.js';
import { persistJobToDB, clearJobStageThrottle, JobSoftDeletedError } from './persistJob.js';
import { cancelJobEviction, scheduleJobEviction } from './jobEviction.js';
import { jobsMemory, getJobFromStore } from './jobStore.js';
import { db } from '../db/index.js';
import { contentOutputs } from '../db/schema.js';
import type {
  PipelineOutput,
  PipelineJob,
  EmitProgress,
  PersistedJobResult,
  PipelineRunOpts,
} from './pipelineTypes.js';
import { logger } from './logger.js';
import { CLIENT_PIPELINE_FAILURE } from './clientErrors.js';
import { runContentPipeline, isSoftDeleted } from './pipelineRun.js';
import {
  ContentJobLockHeldError,
  isContentJobLockHeldError,
} from './contentJobLock.js';
import {
  backgroundFailedRepersist,
  backgroundRepersist,
  isLiveDoneResult,
} from './pipelineRepersist.js';

// WHY: re-export for unit tests / callers that already import from pipeline.js.
export { isLiveDoneResult } from './pipelineRepersist.js';

// WHY: re-exported, not moved outright: consumers import types from this module
// while definitions live in pipelineTypes.ts — see that file's WHY.
export type {
  PipelineOutput,
  PipelineLog,
  PipelineJob,
  RuntimeJob,
  EmitProgress,
  PersistedJobResult,
  PipelineRunOpts,
  SkipResearchOpts,
} from './pipelineTypes.js';

// WHY: re-export the run loop: create.ts / contentWorker / tests historically
// imported runContentPipeline from pipeline.js.
export { runContentPipeline, isSoftDeleted } from './pipelineRun.js';
export type { PipelineRunResult } from './pipelineRun.js';

function emitDeletedAndEvict(jobId: string, evict: (jobId: string) => void): void {
  // WHY: terminal SSE before eviction (H2). Soft-delete only — not lock loss.
  sseManager.sendEvent(jobId, {
    type: 'progress',
    stage: 'failed',
    progress: 0,
    agent: 'system',
    message: 'Job cancelled — this content was deleted.',
  });
  cancelJobEviction(jobId);
  evict(jobId);
}

/**
 * Runs the pipeline, persists the terminal result (success or failure) to the
 * given store + DB, and emits the final SSE event. Shared tail logic for both
 * the direct-mode runner and the BullMQ worker so success/failure handling —
 * including the 10-minute memory eviction — can't drift between them again.
 */
export async function runAndPersistPipeline(
  job: PipelineJob,
  emitProgress: EmitProgress,
  store: {
    set: (jobId: string, data: PersistedJobResult) => void;
    evict: (jobId: string) => void;
  },
  opts?: PipelineRunOpts,
): Promise<void> {
  // WHY: cancel here: a prior run's 10-min eviction must not fire mid-regenerate
  // (same jobId) and wipe the in-flight snapshot (CORR-002).
  cancelJobEviction(job.id);

  try {
    const runResult = await runContentPipeline(job, emitProgress, opts);

    // WHY: lock loss is retryable. Throw so contentWorker requeues (DelayedError)
    // and this catch does not persist failed or emit the deleted message.
    if (runResult.status === 'lock_lost') {
      throw new ContentJobLockHeldError(job.id);
    }

    // WHY: cancelled status OR live deleted flag — soft-delete used to return
    // status:'done' (no final), which looked like success to status-only callers.
    if (runResult.status === 'cancelled' || isSoftDeleted(job.id)) {
      emitDeletedAndEvict(job.id, store.evict);
      return;
    }

    const { outputs, logs, criticResult } = runResult;

    // WHY: merge live editable fields (CORR-003): the pipeline closure/`job`
    // is the create/queue payload — mid-run Library tag/template PATCH updates
    // memory+DB but not this object. Prefer live memory so persist doesn't
    // write the stale create-time template/tag back over the user's edit.
    const mergedJob = mergeLiveEditableFields(job);
    const jobResult: PersistedJobResult = { ...mergedJob, status: 'done', outputs, logs, criticResult };
    store.set(job.id, jobResult);
    // WHY: await before done SSE / eviction: persistJobToDB now rethrows on
    // failure. Emitting "complete" and starting the 10-minute eviction before
    // a confirmed commit made a Neon blip look like success, then deleted the
    // only copy of the result.
    // WHY: inline retries, not rethrow to BullMQ: contentWorker swallows errors
    // to avoid re-running a finished LLM pipeline; falling into the failed
    // catch below used to overwrite done+outputs with failed+[] (regen wipe).
    let persisted: boolean;
    try {
      persisted = await persistWithRetries(jobResult, job.id, 'pipeline-persist-success-result');
    } catch (err: unknown) {
      // WHY: persist refused a soft-deleted row mid-race — treat like the
      // cancelled bail above (terminal SSE + evict), not a failed generation.
      if (err instanceof JobSoftDeletedError || isSoftDeleted(job.id)) {
        emitDeletedAndEvict(job.id, store.evict);
        return;
      }
      throw err;
    }
    clearJobStageThrottle(job.id);
    if (!persisted) {
      // WHY: stage stays 'done' so Result stops loading (frontend terminals on
      // done|failed) but code+message make clear the DB write did not commit —
      // never emit the durable "Content generation complete!" string here.
      sseManager.sendEvent(job.id, {
        type: 'progress',
        stage: 'done',
        progress: 100,
        agent: 'system',
        code: 'persist_failed',
        message:
          'Content is ready in this tab only — server save failed. Keep this tab open; we are retrying the save. Do not refresh until save succeeds.',
      });
      // WHY (B-M1): memory is the only copy — keep it, retry from live memory
      // (not this closed-over snapshot) so a mid-retry PATCH is not overwritten.
      backgroundRepersist(job.id, store.evict);
      return;
    }

    scheduleJobEviction(job.id, store.evict);

    // WHY: sseManager directly, not emitProgress: emitProgress's implementations
    // (contentWorker.ts, create.ts) write their own snapshot of the job back to
    // the store on every call. contentWorker.ts's snapshot never carries
    // `outputs` (it's a separate local variable), so calling emitProgress here
    // would overwrite the jobResult we just stored above with an output-less
    // one — the exact bug that left clients polling a "done" job with no
    // outputs forever. The store write is already complete; only the SSE
    // notification is still needed.
    sseManager.sendEvent(job.id, {
      type: 'progress', stage: 'done', progress: 100,
      agent: 'system', message: 'Content generation complete!',
    });
  } catch (error: unknown) {
    if (isSoftDeleted(job.id)) {
      emitDeletedAndEvict(job.id, store.evict);
      return;
    }
    // WHY: a lost content:run lock is not a business failure. Rethrow so the
    // worker requeues without writing failed or completing as a user cancel.
    // Prefer this acquire's AbortSignal — never a jobId-keyed lost set (poisons
    // a newer SET NX holder for the same key).
    if (isContentJobLockHeldError(error) || opts?.runLockSignal?.aborted) {
      logger.warn('[pipeline] Content run lock lost — leaving job in-flight', { jobId: job.id });
      throw isContentJobLockHeldError(error) ? error : new ContentJobLockHeldError(job.id);
    }

    console.error(`Pipeline failed for ${job.id}:`, error);

    // WHY: skip empty failed overwrite: if memory already holds a done result
    // with outputs (e.g. a concurrent path left them), do not replace with
    // outputs:[] — that erased a prior final when persist of a new run failed.
    const existing = getJobFromStore(job.id) || jobsMemory.get(job.id);
    if (existing && isLiveDoneResult(existing)) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal pipeline failure';
    // SECURITY: persist/return a stable client string — GET /:jobId and Result
    // render job.error; never echo provider/DB internals (SEC-002).
    logger.error('[pipeline] Job failed', { jobId: job.id, error: errorMessage });
    Sentry.captureException(error, { tags: { jobId: job.id, stage: 'pipeline' }, contexts: { job: { topic: job.topic, platform: job.platform } } });
    // WHY: rehydrate prior finals into the failed memory row: regenerate clears
    // memory before the new run; an empty failed snapshot made GET /:jobId
    // (memory-first) hide the still-valid DB finals until the 10-min eviction.
    const priorOutputs = await loadPriorOutputsFromDb(job.id);
    const mergedJob = mergeLiveEditableFields(job);
    const failedResult: PersistedJobResult = {
      ...mergedJob,
      status: 'failed',
      error: CLIENT_PIPELINE_FAILURE,
      outputs: priorOutputs,
      logs: [],
    };
    store.set(job.id, failedResult);
    clearJobStageThrottle(job.id);
    // WHY: mirror success persistWithRetries — await durable failed before
    // terminal failed SSE when Neon recovers quickly, so regenerate/Adapt/list
    // do not see DB pending while Result already shows failed.
    let failedRowPersisted = false;
    try {
      failedRowPersisted = await persistWithRetries(
        failedResult,
        job.id,
        'pipeline-persist-failed-result',
      );
    } catch (persistErr: unknown) {
      if (persistErr instanceof JobSoftDeletedError || isSoftDeleted(job.id)) {
        emitDeletedAndEvict(job.id, store.evict);
        return;
      }
      // WHY: persistWithRetries only rethrows soft-delete; keep a Sentry trail
      // if that contract changes so a failed-job persist cannot go silent.
      console.error(
        `[pipeline] Failed to persist failed-job record for ${job.id}:`,
        persistErr,
      );
      Sentry.captureException(persistErr, {
        tags: { jobId: job.id, stage: 'pipeline-persist-failed-result' },
        contexts: { originalError: { message: errorMessage } },
      });
    }

    // WHY: still emit failed SSE when durable write is retrying — Result must
    // unblock; backgroundFailedRepersist + claim/Adapt memory-failed guards
    // keep regenerate from 409-ing on a still-pending DB row forever.
    sseManager.sendEvent(job.id, {
      type: 'progress',
      stage: 'failed',
      progress: 0,
      agent: 'system',
      message: 'Content generation failed. Please try again or start a new job.',
    });

    if (failedRowPersisted) {
      scheduleJobEviction(job.id, store.evict);
    } else {
      backgroundFailedRepersist(job.id, store.evict);
    }
    throw error;
  }
}

/** Prefer mid-run memory edits for display fields the queue payload may be stale on. */
function mergeLiveEditableFields(job: PipelineJob): PipelineJob {
  const live = getJobFromStore(job.id) || jobsMemory.get(job.id);
  if (!live) return job;
  return {
    ...job,
    templateId: live.templateId !== undefined ? live.templateId : job.templateId,
    paletteId: live.paletteId !== undefined ? live.paletteId : job.paletteId,
    tag: live.tag !== undefined ? live.tag : job.tag,
  };
}

async function loadPriorOutputsFromDb(jobId: string): Promise<PipelineOutput[]> {
  if (!db) return [];
  try {
    const rows = await db
      .select({
        agentName: contentOutputs.agentName,
        outputType: contentOutputs.outputType,
        content: contentOutputs.content,
        qualityScore: contentOutputs.qualityScore,
        partial: contentOutputs.partial,
      })
      .from(contentOutputs)
      .where(eq(contentOutputs.jobId, jobId));
    return rows.map((o) => ({
      agentName: o.agentName,
      outputType: o.outputType as PipelineOutput['outputType'],
      content: o.content,
      qualityScore: o.qualityScore ?? undefined,
      partial: o.partial === 1,
    }));
  } catch (err: unknown) {
    console.warn(
      `[pipeline] Could not rehydrate prior outputs for ${jobId}:`,
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

// WHY: separate from the outer catch: a Neon blip after a successful generation
// must not mark the job failed or burn another full LLM run via BullMQ retry.
async function persistWithRetries(
  jobResult: PersistedJobResult,
  jobId: string,
  sentryStage: string,
): Promise<boolean> {
  const delaysMs = [0, 500, 1500];
  let lastErr: unknown;
  for (let i = 0; i < delaysMs.length; i++) {
    const delay = delaysMs[i] ?? 0;
    if (delay > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
    try {
      await persistJobToDB(jobResult);
      return true;
    } catch (err: unknown) {
      // WHY: no retry: soft-delete is terminal — another attempt won't undelelete.
      if (err instanceof JobSoftDeletedError) throw err;
      lastErr = err;
      console.error(
        `[pipeline] Persist attempt ${i + 1}/${delaysMs.length} failed for ${jobId}:`,
        err,
      );
    }
  }
  Sentry.captureException(lastErr, {
    tags: { jobId, stage: sentryStage },
  });
  return false;
}
