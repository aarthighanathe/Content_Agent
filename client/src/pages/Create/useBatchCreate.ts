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
      const { jobs } = await createBatchJobs(
        validRows.map((r) => ({
          topic: r.topic.trim(), platform: r.platform,
          tone: batchTone.trim() || 'professional',
          targetAudience: resolveAudience(batchAudience, r.platform, learnedAudienceDefaults),
        })),
      );
      posthog.capture('batch_content_generated', { count: jobs.length });
      // WHY router state, not URL params: BatchResult.tsx reads its job list
      // from location.state (same CreateHandoff-style pattern already used
      // elsewhere in this app) instead of encoding it into the URL — simpler,
      // and avoids re-deriving topic/platform from a compact URL format.
      navigate('/batch-result', { state: { jobs } });
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
