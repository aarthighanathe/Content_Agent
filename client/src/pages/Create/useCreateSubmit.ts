import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { createJob } from '../../api';
import { posthog } from '../../main';
import { isJobPlatform, isJobTone } from '../../types/job';
import { isTemplateId } from '../../lib/templateSystem';
import { getSubmitError } from './errorMessages';
import { writeRecentTopics } from './createConstants';
import type { CreateHandoff } from '../../lib/utils';

interface DraftFields {
  industry?: string;
  competitorContext?: string;
  competitorAnalysisId?: string;
}

interface Args {
  topic: string;
  platform: string;
  effectiveTone: string;
  effectiveAudience: string;
  templateId?: string;
  paletteId?: string;
  prefill: CreateHandoff;
  draft: DraftFields;
  recentTopics: string[];
  setRecentTopics: Dispatch<SetStateAction<string[]>>;
  topicsScopeId: string | null;
  clearDraft: () => void;
  setRetryAfterMs: Dispatch<SetStateAction<number | null>>;
}

interface Result {
  loading: boolean;
  errorMsg: string;
  handleSubmit: () => Promise<void>;
}

// WHY: extracted from Create.tsx under the 400-line cap — also owns the
// account-switch gate (capture submitUserId; skip navigate if switched).
export function useCreateSubmit({
  topic,
  platform,
  effectiveTone,
  effectiveAudience,
  templateId,
  paletteId,
  prefill,
  draft,
  recentTopics,
  setRecentTopics,
  topicsScopeId,
  clearDraft,
  setRetryAfterMs,
}: Args): Result {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const userIdRef = useRef(userId ?? null);
  userIdRef.current = userId ?? null;

  const [loading, setLoading] = useState(false);
  // WHY: ref in addition to state: a fast double-click sees loading===false twice
  // before the next paint, so both requests fire. The ref flips synchronously.
  const submittingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState('');

  // WHY: mid-submit account switch must not navigate the new user to the old job,
  // and must clear the stuck "Generating…" spinner left by the abandoned request.
  useEffect(() => {
    setLoading(false);
    submittingRef.current = false;
  }, [userId]);

  async function handleSubmit(): Promise<void> {
    if (!topic.trim() || loading || submittingRef.current) return;
    const trimmed = topic.trim();
    // WHY: client min-3 before POST: matches createJobSchema / BatchTopicList and
    // avoids a round-trip that used to surface only "Invalid request body" (QA-A3-003).
    if (trimmed.length < 3) {
      setErrorMsg('Topic must be at least 3 characters');
      return;
    }
    // WHY: capture at click — after await, Clerk may have switched accounts.
    const submitUserId = userIdRef.current;
    submittingRef.current = true;
    setLoading(true);
    setErrorMsg('');
    try {
      // WHY: industry folded into competitorContext, not a new field: Create
      // has no visible industry input, and createJobSchema only accepts
      // competitorContext/competitorAnalysisId — this is the "simplest option
      // that doesn't require new UI" the task calls for, matching how
      // focusTopic already flows into ideate.ts as plain extra prompt text.
      const industry = prefill.industry || draft.industry || '';
      const gapContext = prefill.competitorContext || draft.competitorContext || '';
      const analysisId = prefill.competitorAnalysisId || draft.competitorAnalysisId;
      const competitorContext = [industry ? `Industry: ${industry}` : '', gapContext]
        .filter(Boolean)
        .join(' — ') || undefined;
      // WHY: guards (not bare casts): Create state is still string-typed from
      // draft/prefill; createJob expects JobPlatform/JobTone unions.
      const platformForApi = isJobPlatform(platform) ? platform : 'instagram_carousel';
      const toneForApi = isJobTone(effectiveTone) ? effectiveTone : 'professional';
      // WHY: guards (not casts) — Args keep string for draft/localStorage; API wants TemplateId.
      const templateForApi = templateId && isTemplateId(templateId) ? templateId : undefined;
      const { jobId } = await createJob({
        topic: trimmed,
        platform: platformForApi,
        tone: toneForApi,
        targetAudience: effectiveAudience,
        competitorContext,
        competitorAnalysisId: analysisId,
        ...(platformForApi === 'instagram_carousel'
          ? { templateId: templateForApi, paletteId }
          : {}),
      });
      // WHY: skip navigate + local writes when the signed-in user changed mid-request.
      if (userIdRef.current !== submitUserId) {
        setLoading(false);
        submittingRef.current = false;
        return;
      }
      // WHY: after success only: a failed/rate-limited submit used to pollute
      // recent topics before the job existed (QA-A3-002).
      const updated = [trimmed, ...recentTopics.filter((r) => r !== trimmed)].slice(0, 10);
      writeRecentTopics(topicsScopeId, updated);
      setRecentTopics(updated);
      posthog.capture('content_generated', { platform, tone: effectiveTone });
      clearDraft();
      navigate(`/result/${jobId}`);
    } catch (err: unknown) {
      if (userIdRef.current !== submitUserId) {
        setLoading(false);
        submittingRef.current = false;
        return;
      }
      // NOTE: Error is displayed to user via setErrorMsg; no need for console.error in production
      const { message, retryAfterMs } = getSubmitError(err);
      setErrorMsg(message);
      setRetryAfterMs(retryAfterMs ?? null);
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return { loading, errorMsg, handleSubmit };
}
