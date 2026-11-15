// WHY: extracted from contentWorker.ts under the 400-line cap — BullMQ
// `failed` handler (lock-held requeue + terminal mark) stays next to the worker.
import type { Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import { addJobToQueueDetailed } from '../lib/queue.js';
import { markJobTerminalFailed } from '../lib/persistJob.js';
import { logger } from '../lib/logger.js';
import { isValidUUID } from '../lib/uuid.js';
import { asString } from '../lib/contentJobPayload.js';
import {
  ContentJobLockHeldError,
  CONTENT_LOCK_HELD_RETRY_DELAY_MS,
} from '../lib/contentJobLock.js';

function contentJobIdFromData(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  const id = asString((data as Record<string, unknown>).jobId);
  return id && isValidUUID(id) ? id : undefined;
}

/** BullMQ worker `failed` listener — lock-held requeue or durable terminal mark. */
export function onContentWorkerFailed(job: Job | undefined, err: Error): void {
  // WHY: lock-held retries (M1) must not flip the durable row to failed while
  // the winning worker is still running — DelayedError never reaches here,
  // but ContentJobLockHeldError can when moveToDelayed/token is unavailable.
  if (
    err instanceof ContentJobLockHeldError
    || err.name === 'ContentJobLockHeldError'
    || err.name === 'DelayedError'
  ) {
    logger.warn('Content job deferred (lock held)', { jobId: job?.id, error: err.message });
    // WHY: on final attempt, re-add a delayed sibling so the durable row is
    // not left pending forever after attempts are exhausted (requeue path
    // already prefers this; this is the last-chance safety net).
    const stalledLock = /stalled/i.test(err.message)
      || /stalled/i.test(job?.failedReason ?? '');
    const lockAttemptsExhausted = stalledLock
      || (job?.attemptsMade ?? 0) >= (job?.opts?.attempts ?? 1);
    if (
      lockAttemptsExhausted
      && err.name !== 'DelayedError'
      && job?.data
      && typeof job.data === 'object'
      && !Array.isArray(job.data)
    ) {
      const contentJobId = contentJobIdFromData(job.data);
      if (contentJobId) {
        // WHY: jobId = content UUID so stale sweep can see the delayed retry.
        addJobToQueueDetailed(
          contentJobId,
          { ...(job.data as Record<string, unknown>) },
          { delay: CONTENT_LOCK_HELD_RETRY_DELAY_MS },
        ).then((result) => {
          logger.warn('Re-enqueued content job after lock-held attempt exhaustion', {
            jobId: contentJobId,
            queueResult: result,
          });
        }).catch((requeueErr: unknown) => {
          logger.warn('Failed to re-enqueue after lock-held exhaustion', {
            jobId: contentJobId,
            error: requeueErr instanceof Error ? requeueErr.message : String(requeueErr),
          });
        });
      }
    }
    return;
  }
  console.error(`Job ${job?.id} failed:`, err.message);
  Sentry.captureException(err, { tags: { jobId: job?.id, action: 'worker-failed' } });
  // WHY: durable failed + SSE (CORR-001): after max BullMQ attempts / stall
  // exhaustion, runAndPersistPipeline may never have written a terminal row.
  // WHY: prefer data.jobId — auto-id lock-held siblings use a BullMQ id that
  // is not the content UUID; marking job.id failed never flips the durable row.
  const dataJobId = contentJobIdFromData(job?.data);
  const failedJobId = dataJobId
    ?? (typeof job?.id === 'string' && isValidUUID(job.id) ? job.id : undefined);
  // WHY: only after the final attempt — an intermediate failure must leave
  // the row in-flight so the BullMQ retry isn't blocked by the failed guard.
  // WHY: BullMQ fails a job that exceeded maxStalledCount without bumping
  // attemptsMade past `attempts`, so stalled failures must count as final too.
  const stalled = /stalled/i.test(err.message) || /stalled/i.test(job?.failedReason ?? '');
  const exhausted = stalled
    || (job?.attemptsMade ?? 0) >= (job?.opts?.attempts ?? 1);
  if (exhausted && failedJobId) {
    markJobTerminalFailed(failedJobId, err.message).catch(() => {});
  }
}
