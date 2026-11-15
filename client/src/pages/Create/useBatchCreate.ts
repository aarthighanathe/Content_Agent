import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { createBatchJobs } from '../../api';
import { posthog } from '../../main';
import { writeBatchResult } from '../../lib/batchResultStorage';
import { getSubmitError } from './errorMessages';
import type { BatchRow } from './BatchTopicList';

// WHY: extracted from Create.tsx: Create.tsx exceeded the 400-line file-size cap
// (436 lines) by mixing single-topic and batch-mode state/handlers in one
// component — batch submits up to 7 topic+platform pairs in one request
// (POST /jobs/batch), a genuinely different shape of input than the single
// TopicStep flow, so it earns its own hook rather than living inline.
export function useBatchCreate(
  learnedAudienceDefaults: Partial<Record<string, string>>,
  resolveAudience: (input: string, platform: string, learnedDefaults: Partial<Record<string, string>>) => string,
  carouselTemplate?: { templateId?: string; paletteId?: string },
  onRateLimited?: (retryAfterMs: number | null) => void,
) {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const userIdRef = useRef(userId ?? null);
  userIdRef.current = userId ?? null;
  const [batchMode, setBatchMode] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchRow[]>(() => [
    { id: crypto.randomUUID(), topic: '', platform: 'instagram_carousel' },
  ]);
  const [batchTone, setBatchTone] = useState('');
  const [batchAudience, setBatchAudience] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  // WHY: ref: same double-click race as Create's handleSubmit — both clicks
  // see batchLoading===false before the next paint.
  const submittingRef = useRef(false);

  // WHY: account switch mid-batch must clear spinner/rows so the new user
  // does not inherit the previous account's in-flight batch UI.
  useEffect(() => {
    setBatchMode(false);
    setBatchRows([{ id: crypto.randomUUID(), topic: '', platform: 'instagram_carousel' }]);
    setBatchTone('');
    setBatchAudience('');
    setBatchLoading(false);
    setBatchError('');
    submittingRef.current = false;
  }, [userId]);

  async function handleBatchSubmit() {
    if (batchLoading || submittingRef.current) return;
    const validRows = batchRows.filter((r) => r.topic.trim().length >= 3);
    if (validRows.length === 0) return;
    // WHY: capture at click — writeBatchResult/navigate must not run for a
    // different Clerk user after the await settles.
    const submitUserId = userIdRef.current;
    submittingRef.current = true;
    setBatchLoading(true);
    setBatchError('');
    try {
      const { jobs, failedItems } = await createBatchJobs(
        validRows.map((r) => ({
          topic: r.topic.trim(), platform: r.platform,
          tone: batchTone.trim() || 'professional',
          targetAudience: resolveAudience(batchAudience, r.platform, learnedAudienceDefaults),
        })),
        carouselTemplate,
      );
      if (userIdRef.current !== submitUserId) {
        setBatchLoading(false);
        submittingRef.current = false;
        return;
      }
      posthog.capture('batch_content_generated', { count: jobs.length, failedCount: failedItems.length });
      if (failedItems.length > 0) {
        // WHY: map server index -> validRows -> row id, not display directly:
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
        // WHY: functional update — user may have edited rows during the await.
        setBatchRows((prev) => prev.map((r) => (
          failuresByRowId.has(r.id) ? { ...r, error: failuresByRowId.get(r.id) } : r
        )));
      }
      if (jobs.length === 0) {
        // WHY: still surface the batch-level error, not just the per-row ones:
        // a total failure (every item rejected) previously navigated away with
        // an empty job list and no explanation — this keeps the user on the
        // form with each row's specific error visible instead.
        setBatchError('All items in the batch failed to process — see errors below.');
        setBatchLoading(false);
        submittingRef.current = false;
        return;
      }
      // WHY: sessionStorage is per Clerk user (L12 + shared-browser leak).
      // BatchResult used to rely only on router state, so a hard refresh
      // showed "No batch found". URL stays clean (no job IDs in query).
      writeBatchResult(submitUserId, { jobs, creationFailedCount: failedItems.length });
      navigate('/batch-result', {
        state: { jobs, creationFailedCount: failedItems.length, submitterUserId: submitUserId },
      });
    } catch (err: unknown) {
      if (userIdRef.current !== submitUserId) {
        setBatchLoading(false);
        submittingRef.current = false;
        return;
      }
      const { message, retryAfterMs } = getSubmitError(err);
      setBatchError(message);
      onRateLimited?.(retryAfterMs ?? null);
      setBatchLoading(false);
      submittingRef.current = false;
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
