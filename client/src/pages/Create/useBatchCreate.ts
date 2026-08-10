import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBatchJobs } from '../../api';
import { posthog } from '../../main';
import { getSubmitError } from './errorMessages';
import type { BatchRow } from './BatchTopicList';

// WHY extracted from Create.tsx: Create.tsx exceeded the 400-line file-size cap
// (436 lines) by mixing single-topic and batch-mode state/handlers in one
// component — batch submits up to 7 topic+platform pairs in one request
// (POST /jobs/batch), a genuinely different shape of input than the single
// TopicStep flow, so it earns its own hook rather than living inline.
export function useBatchCreate(
  learnedAudienceDefaults: Partial<Record<string, string>>,
  resolveAudience: (input: string, platform: string, learnedDefaults: Partial<Record<string, string>>) => string,
) {
  const navigate = useNavigate();
  const [batchMode, setBatchMode] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchRow[]>(() => [
    { id: crypto.randomUUID(), topic: '', platform: 'instagram_carousel' },
  ]);
  const [batchTone, setBatchTone] = useState('');
  const [batchAudience, setBatchAudience] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');

  async function handleBatchSubmit() {
    if (batchLoading) return;
    const validRows = batchRows.filter((r) => r.topic.trim().length >= 3);
    if (validRows.length === 0) return;
    setBatchLoading(true);
    setBatchError('');
    try {
      const { jobs, failedItems } = await createBatchJobs(
        validRows.map((r) => ({
          topic: r.topic.trim(), platform: r.platform,
          tone: batchTone.trim() || 'professional',
          targetAudience: resolveAudience(batchAudience, r.platform, learnedAudienceDefaults),
        })),
      );
      posthog.capture('batch_content_generated', { count: jobs.length, failedCount: failedItems.length });
      if (failedItems.length > 0) {
        // WHY map server index -> validRows -> row id, not display directly:
        // the server's failedItems[].index refers to a position in the
        // validRows array actually sent (a filtered subset of batchRows), not
        // the full row list the user sees — mapping through validRows keeps
        // each error attached to the correct row even when earlier rows were
        // blank/too-short and silently excluded from the submission.
        const failuresByRowId = new Map<string, string>();
        for (const f of failedItems) {
          const rowId = validRows[f.index]?.id;
          if (rowId !== undefined) failuresByRowId.set(rowId, f.error);
        }
        setBatchRows(batchRows.map((r) => (
          failuresByRowId.has(r.id) ? { ...r, error: failuresByRowId.get(r.id) } : r
        )));
      }
      if (jobs.length === 0) {
        // WHY still surface the batch-level error, not just the per-row ones:
        // a total failure (every item rejected) previously navigated away with
        // an empty job list and no explanation — this keeps the user on the
        // form with each row's specific error visible instead.
        setBatchError('All items in the batch failed to process — see errors below.');
        setBatchLoading(false);
        return;
      }
      // WHY router state, not URL params: BatchResult.tsx reads its job list
      // from location.state (same CreateHandoff-style pattern already used
      // elsewhere in this app) instead of encoding it into the URL — simpler,
      // and avoids re-deriving topic/platform from a compact URL format.
      // WHY creationFailedCount, not failedCount: BatchResult.tsx already has
      // its own `failedCount` local variable meaning "jobs that were created
      // but whose generation pipeline later failed" — a same-named field here
      // would mean something different (items that never got a job created at
      // all) and silently collide if someone destructured both without care.
      navigate('/batch-result', { state: { jobs, creationFailedCount: failedItems.length } });
    } catch (err: unknown) {
      const { message } = getSubmitError(err);
      setBatchError(message);
      setBatchLoading(false);
    }
  }

  return {
    batchMode, setBatchMode,
    batchRows, setBatchRows,
    batchTone, setBatchTone,
    batchAudience, setBatchAudience,
    batchLoading, batchError,
    handleBatchSubmit,
  };
}
