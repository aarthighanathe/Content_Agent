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
  SkipResearchOpts,
} from './pipelineTypes.js';
import { logger } from './logger.js';
import { CLIENT_PIPELINE_FAILURE } from './clientErrors.js';
import { runContentPipeline, isSoftDeleted } from './pipelineRun.js';

// WHY: re-exported, not moved outright: consumers import types from this module
// while definitions live in pipelineTypes.ts — see that file's WHY.
export type {
  PipelineOutput,
  PipelineLog,
  PipelineJob,
  EmitProgress,
  PersistedJobResult,
  SkipResearchOpts,
} from './pipelineTypes.js';

// WHY: re-export the run loop: create.ts / contentWorker / tests historically
// imported runContentPipeline from pipeline.js.
export { runContentPipeline, isSoftDeleted } from './pipelineRun.js';

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
  opts?: { skipResearch?: SkipResearchOpts },
): Promise<void> {
  // WHY: cancel here: a prior run's 10-min eviction must not fire mid-regenerate
  // (same jobId) and wipe the in-flight snapshot (CORR-002).
  cancelJobEviction(job.id);

  try {
    const { outputs, logs, criticResult } = await runContentPipeline(job, emitProgress, opts);

    // WHY: the user may have deleted this job mid-run (DELETE /:jobId sets
    // deleted=1 in jobsMemory/jobStore + DB). Persisting a "done" result now
    // would resurrect a soft-deleted job and waste the write — bail out here
    // instead of racing the delete.
    if (isSoftDeleted(job.id)) {
      // WHY: terminal SSE before eviction (H2): Result's useJobData keeps
      // spinning until it sees a terminal stage — silent eviction left the UI
      // waiting forever on a job the user already deleted.
      sseManager.sendEvent(job.id, {
        type: 'progress',
        stage: 'failed',
        progress: 0,
        agent: 'system',
        message: 'Job cancelled — this content was deleted.',
      });
      cancelJobEviction(job.id);
      store.evict(job.id);
      return;
    }

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
      persisted = await persistWithRetries(jobResult, job.id);
    } catch (err: unknown) {
      // WHY: persist refused a soft-deleted row mid-race — treat like the
      // isSoftDeleted bail above (terminal SSE + evict), not a failed generation.
      if (err instanceof JobSoftDeletedError || isSoftDeleted(job.id)) {
        sseManager.sendEvent(job.id, {
          type: 'progress',
          stage: 'failed',
          progress: 0,
          agent: 'system',
          message: 'Job cancelled — this content was deleted.',
        });
        cancelJobEviction(job.id);
        store.evict(job.id);
        return;
      }
      throw err;
    }
    clearJobStageThrottle(job.id);
    if (!persisted) {
      sseManager.sendEvent(job.id, {
        type: 'progress', stage: 'done', progress: 100,
        agent: 'system',
        message: 'Content ready — saving failed, keep this tab open and retry if it disappears.',
      });
      // No eviction timer: memory is the only durable copy until a later save.
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
    console.error(`Pipeline failed for ${job.id}:`, error);

    if (isSoftDeleted(job.id)) {
      // WHY: terminal SSE before eviction (H2): same as the success-path soft-
      // delete bail — Result must leave the loading state.
      sseManager.sendEvent(job.id, {
        type: 'progress',
        stage: 'failed',
        progress: 0,
        agent: 'system',
        message: 'Job cancelled — this content was deleted.',
      });
      cancelJobEviction(job.id);
      store.evict(job.id);
      return;
    }

    // WHY: skip empty failed overwrite: if memory already holds a done result
    // with outputs (e.g. a concurrent path left them), do not replace with
    // outputs:[] — that erased a prior final when persist of a new run failed.
    const existing = getJobFromStore(job.id) || jobsMemory.get(job.id);
    const keepExistingDone = existing?.status === 'done'
      && Array.isArray(existing.outputs)
      && existing.outputs.some((o) => o.outputType === 'final');
    if (keepExistingDone) {
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
    try {
      await persistJobToDB(failedResult);
    } catch (persistErr: unknown) {
      if (persistErr instanceof JobSoftDeletedError) {
        sseManager.sendEvent(job.id, {
          type: 'progress',
          stage: 'failed',
          progress: 0,
          agent: 'system',
          message: 'Job cancelled — this content was deleted.',
        });
        cancelJobEviction(job.id);
        store.evict(job.id);
        return;
      }
      // WHY: persistJobToDB's platform/tone/targetAudience validation throws
      // before its own try/catch, so a job whose data was already invalid
      // (e.g. a stale tone value) throws again here identically. Without this
      // guard that second throw escapes uncaught, leaving the job marked
      // terminal in the in-memory store (line above) with zero DB row and no
      // record of why — this catch ensures at least a log + Sentry trail
      // survives even when the failed-job persist itself fails.
      console.error(`[pipeline] Failed to persist failed-job record for ${job.id} — job has no DB row:`, persistErr);
      Sentry.captureException(persistErr, {
        tags: { jobId: job.id, stage: 'pipeline-persist-failed-result' },
        contexts: { originalError: { message: errorMessage } },
      });
    }

    // WHY: schedule eviction on failure too (CORR-014): failed snapshots used
    // to sit in memory until process restart.
    scheduleJobEviction(job.id, store.evict);

    sseManager.sendEvent(job.id, {
      type: 'progress',
      stage: 'failed',
      progress: 0,
      agent: 'system',
      message: 'Content generation failed. Please try again or start a new job.',
    });
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
    tags: { jobId, stage: 'pipeline-persist-success-result' },
  });
  return false;
}
