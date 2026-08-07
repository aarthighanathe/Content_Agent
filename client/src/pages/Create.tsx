// WHY PostHog tracking: captures key user actions (job creation, platform selection, batch mode)
// for analytics and conversion funnel monitoring. Events are sent to PostHog via the global
// posthog instance initialized in main.tsx.
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarRange, ArrowLeft } from 'lucide-react';
import { createJob, getProfile, getAudienceDefaults } from '../api';
import { posthog } from '../main';
import { TopicStep } from './Create/TopicStep';
import { BatchTopicList } from './Create/BatchTopicList';
import { useDraft } from './Create/useDraft';
import { useBatchCreate } from './Create/useBatchCreate';
import { useCarouselTemplateSelection } from './Create/useCarouselTemplateSelection';
import { getSubmitError } from './Create/errorMessages';
import { useAppStore } from '../store';
import type { CreateHandoff } from '../lib/utils';

const RECENT_TOPICS_KEY  = 'ca_recent_topics';
// WHY still localStorage-backed: these two keys now only seed the DEFAULT
// selection for a brand-new Create session (so returning users see their last
// pick pre-selected) — the value actually submitted with the job lives in this
// component's own state and is sent explicitly in handleSubmit, no longer read
// back out of localStorage at Result-page render time. See CAROUSEL_TEMPLATE_PLAN.md §2.1.

const TOPIC_PLACEHOLDERS: Record<string, string> = {
  instagram_carousel: "e.g. '5 habits that transformed my mornings'",
  linkedin_post:      "e.g. 'Why most product launches fail in week 2'",
  twitter_thread:     "e.g. 'Thread: everything I learned building in public'",
  instagram_caption:  "e.g. 'Behind-the-scenes of our new product launch'",
  video_script:       "e.g. '3-minute guide to cold email that actually gets replies'",
};

const GENERATE_LABELS: Record<string, string> = {
  instagram_carousel: 'Instagram Carousel',
  linkedin_post:      'LinkedIn Post',
  twitter_thread:     'Twitter Thread',
  instagram_caption:  'Instagram Caption',
  video_script:       'Video Script',
};

const AUDIENCE_DEFAULTS: Record<string, string> = {
  instagram_carousel: 'content creators and marketers',
  linkedin_post:      'founders and business professionals',
  twitter_thread:     'tech enthusiasts and entrepreneurs',
  instagram_caption:  'lifestyle and brand followers',
  video_script:       'short-form video viewers aged 18-35',
};

// WHY a shared helper: the same fallback chain (user input → learned defaults →
// static defaults → 'general audience') is used in both handleSubmit and
// handleBatchSubmit. Extracting it prevents drift if the rule changes.
function resolveAudience(input: string, platform: string, learnedDefaults: Partial<Record<string, string>>): string {
  const trimmed = input.trim();
  if (trimmed) return trimmed;
  return learnedDefaults[platform] || AUDIENCE_DEFAULTS[platform] || 'general audience';
}

export default function CreatePage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  // WHY the real CreateHandoff type, not an inline hand-typed cast: this used
  // to informally re-type location.state's shape locally, only kept in sync
  // with lib/utils.ts's CreateHandoff by convention — see CreateHandoff's own
  // WHY comment for the rule this now follows (widen the type and this read
  // together, in the same change).
  const prefill     = (location.state as CreateHandoff | null) || ({} as CreateHandoff);
  const userProfile = useAppStore((s) => s.userProfile);

  // Draft persists topic/platform/tone/audience across a trip to /brand and back;
  // cleared once a job is actually submitted (see handleSubmit).
  const { draft, setDraft, clearDraft, draftWriteFailed, dismissDraftWriteFailed } = useDraft();

  // Content inputs — prefill (nav state) wins over a saved draft, which wins over defaults
  const [platform, setPlatform] = useState(prefill.platform || draft.platform || 'instagram_carousel');
  const [topic,    setTopic]    = useState(prefill.topic || draft.topic || '');
  // WHY empty string, not a pre-picked pill: leaving no tone "selected" is honest —
  // the user hasn't made a choice yet. The backend already falls back to brand voice
  // (or 'professional') when tone is empty (writer.ts: `job.tone || 'professional'`),
  // so an unselected Tone row here doesn't change generation behavior, only the UI's
  // claim about what's been chosen. Once the user picks a pill, that tone is sent and
  // takes priority — see the "effective tone" resolution around handleSubmit below.
  const [tone,           setTone]           = useState(draft.tone || '');
  const [targetAudience, setTargetAudience] = useState(draft.targetAudience || '');

  // Platform grid is shown on first arrival (no prefill/draft platform chosen) or
  // whenever the user clicks "Change" on the compact summary row.
  const [showPlatformGrid, setShowPlatformGrid] = useState(!prefill.platform && !draft.platform);

  const [loading, setLoading] = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);

  // Recent topics autocomplete
  const [recentTopics,    setRecentTopics]    = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_TOPICS_KEY) || '[]'); } catch { return []; }
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);
  const topicRef   = useRef<HTMLTextAreaElement>(null);

  const filteredSuggestions = recentTopics.filter(
    (t) => t !== topic && (topic.trim() === '' || t.toLowerCase().includes(topic.toLowerCase()))
  );

  const hasBrandVoice = !!(userProfile.brandName || userProfile.brandVoice);

  // WHY same query key as AuthLayout.tsx's profileQuery (['dashboard', 'profile']):
  // React Query dedupes/caches by key, so this reads the already-fetched profile
  // instead of firing a second /users/me request. AuthLayout only copies brand-voice
  // fields into the Zustand store, not contentDna, so it's read directly off the
  // query here — Content DNA is sent to every job (create.ts) but this page never
  // confirmed on-screen that it's active.
  const profileQuery = useQuery({ queryKey: ['dashboard', 'profile'], queryFn: getProfile });
  const hasContentDna = !!profileQuery.data?.contentDna;

  // WHY its own query, not folded into profileQuery: audience defaults are
  // computed from job history (GET /jobs/audience-defaults), a different
  // read than the user's brand-voice profile — keeping them separate means a
  // brand-voice edit doesn't need to also invalidate/refetch this. Falls back
  // to {} on error (same as the server route's own empty-response behavior
  // for a brand-new/demo user), so a failed fetch just means "no learned
  // default for this platform yet," not a broken Create page.
  const audienceDefaultsQuery = useQuery({
    queryKey: ['create', 'audienceDefaults'],
    queryFn: getAudienceDefaults,
    retry: false,
  });
  const learnedAudienceDefaults = audienceDefaultsQuery.data?.audienceDefaults || {};

  const {
    batchMode, setBatchMode, batchRows, setBatchRows, batchTone, setBatchTone,
    batchAudience, setBatchAudience, batchLoading, batchError, handleBatchSubmit,
  } = useBatchCreate(learnedAudienceDefaults, resolveAudience);

  const { templateId, paletteId, handleTemplateChange, handlePaletteChange } = useCarouselTemplateSelection();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Countdown timer for rate-limit retry
  useEffect(() => {
    if (retryAfterMs === null) return;
    const interval = setInterval(() => {
      setRetryAfterMs((prev) => {
        if (prev === null) return null;
        const next = prev - 1000;
        return next <= 0 ? null : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfterMs]);

  // Format countdown for display
  const countdownText = retryAfterMs !== null ? formatCountdown(retryAfterMs) : null;

  function formatCountdown(ms: number): string {
    const seconds = Math.ceil(ms / 1000);
    if (seconds <= 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  }

  // WHY auto-dismiss on a timer, matching Brand.tsx's flashToast duration: this
  // draft-write failure is a low-stakes notice ("your topic won't survive a trip
  // to /brand and back"), not something requiring the user to manually clear it.
  useEffect(() => {
    if (!draftWriteFailed) return undefined;
    const t = setTimeout(() => dismissDraftWriteFailed(), 4000);
    return () => clearTimeout(t);
  }, [draftWriteFailed, dismissDraftWriteFailed]);

  // WHY cross-tab warning: sessionStorage is tab-specific by design — opening Create
  // in a new tab won't show drafts from other tabs. This disclosure informs users
  // of that limitation so they don't lose work by assuming drafts sync across tabs.
  // Rendered once, near the bottom of the page (see the .toast block below) —
  // matching Brand.tsx/Library.tsx's shared toast convention.
  const hasDraft = !!(draft.platform || draft.topic || draft.tone || draft.targetAudience);

  // WHY learned default before the static map: a user's own recent history
  // (most-frequent targetAudience they've actually typed for this platform,
  // see GET /jobs/audience-defaults) is a more accurate default than the
  // same hardcoded string every user sees — the static AUDIENCE_DEFAULTS map
  // still backs new users and platforms with no history yet.
  const learnedOrStaticAudience = learnedAudienceDefaults[platform] || AUDIENCE_DEFAULTS[platform];
  // WHY a shared helper: the same fallback chain (user input → learned defaults →
  // static defaults → 'general audience') is used in both handleSubmit and
  // handleBatchSubmit. Extracting it prevents drift if the rule changes.
  const effectiveAudience = resolveAudience(targetAudience, platform, learnedAudienceDefaults);
  // WHY fallback here (not in state): the server's tone field is a strict zod enum
  // (server/src/schemas/jobs.ts) with no empty/optional case, so an unselected Tone
  // row can't be submitted as-is. 'professional' matches the writer agent's own
  // `job.tone || 'professional'` fallback, so leaving no pill selected doesn't change
  // generation behavior — it only stops the UI from claiming a choice was made.
  const effectiveTone = tone || 'professional';

  async function handleSubmit() {
    if (!topic.trim() || loading) return;
    const trimmed = topic.trim();
    const updated  = [trimmed, ...recentTopics.filter((r) => r !== trimmed)].slice(0, 10);
    localStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(updated));
    setRecentTopics(updated);
    setLoading(true);
    setErrorMsg('');
    try {
      // WHY industry folded into competitorContext, not a new field: Create
      // has no visible industry input, and createJobSchema only accepts
      // competitorContext/competitorAnalysisId — this is the "simplest option
      // that doesn't require new UI" the task calls for, matching how
      // focusTopic already flows into ideate.ts as plain extra prompt text.
      const competitorContext = [prefill.industry ? `Industry: ${prefill.industry}` : '', prefill.competitorContext || '']
        .filter(Boolean)
        .join(' — ') || undefined;
      const { jobId } = await createJob({
        topic: trimmed, platform, tone: effectiveTone, targetAudience: effectiveAudience,
        competitorContext,
        competitorAnalysisId: prefill.competitorAnalysisId,
        ...(platform === 'instagram_carousel' ? { templateId, paletteId } : {}),
      });
      posthog.capture('content_generated', { platform, tone: effectiveTone });
      clearDraft();
      navigate(`/result/${jobId}`);
    } catch (err: unknown) {
      // NOTE: Error is displayed to user via setErrorMsg; no need for console.error in production
      const { message, retryAfterMs } = getSubmitError(err);
      setErrorMsg(message);
      setRetryAfterMs(retryAfterMs ?? null);
      setLoading(false);
    }
  }

  return (
    <div className="create-page-container">
      <style>{`
        @media (max-width: 480px) {
          .create-page-container {
            padding: 0 16px !important;
          }
        }
        @media (max-width: 375px) {
          .create-page-container {
            padding: 0 12px !important;
          }
        }
      `}</style>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)' }}>
            {batchMode ? 'Plan multiple posts' : 'Create new content'}
          </h1>
          <p style={{ fontSize: 'clamp(12px,2vw,13px)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {batchMode
              ? 'Generate up to 7 posts at once — one topic and platform per row'
              : 'Choose a platform, enter your topic, and generate AI-powered content'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBatchMode((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: 'transparent', border: '1px solid var(--rule)', borderRadius: 9,
            padding: '8px 14px', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {batchMode ? <><ArrowLeft size={13} /> Back to single post</> : <><CalendarRange size={13} /> Plan multiple topics</>}
        </button>
      </div>

      {batchMode ? (
        <BatchTopicList
          rows={batchRows}
          onRowsChange={setBatchRows}
          tone={batchTone}
          onToneChange={setBatchTone}
          targetAudience={batchAudience}
          onTargetAudienceChange={setBatchAudience}
          loading={batchLoading}
          errorMsg={batchError}
          onSubmit={() => { handleBatchSubmit().catch(() => {}); }}
        />
      ) : (
      <TopicStep
        platform={platform}
        onPlatformChange={(p) => { setPlatform(p); setDraft({ platform: p }); }}
        showPlatformGrid={showPlatformGrid}
        onTogglePlatformGrid={() => setShowPlatformGrid((v) => !v)}

        topic={topic}
        onTopicChange={(t) => { setTopic(t); setDraft({ topic: t }); }}
        topicPlaceholder={TOPIC_PLACEHOLDERS[platform] || 'e.g., 10 productivity hacks for remote workers'}
        topicRef={topicRef}
        suggestRef={suggestRef}
        showSuggestions={showSuggestions}
        onFocusTopic={() => setShowSuggestions(true)}
        onCloseSuggestions={() => setShowSuggestions(false)}
        filteredSuggestions={filteredSuggestions}
        onPickSuggestion={(t) => { setTopic(t); setDraft({ topic: t }); setShowSuggestions(false); }}

        tone={tone}
        onToneChange={(t) => { setTone(t); setDraft({ tone: t }); }}

        hasBrandVoice={hasBrandVoice}
        hasContentDna={hasContentDna}

        targetAudience={targetAudience}
        onTargetAudienceChange={(a) => { setTargetAudience(a); setDraft({ targetAudience: a }); }}
        audiencePlaceholder={`e.g., ${learnedOrStaticAudience}`}

        templateId={templateId}
        onTemplateChange={handleTemplateChange}
        paletteId={paletteId}
        onPaletteChange={handlePaletteChange}

        errorMsg={errorMsg}
        loading={loading}
        generateLabel={GENERATE_LABELS[platform] || 'Content'}
        onSubmit={handleSubmit}
        countdownText={countdownText}
      />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* WHY surfaced instead of swallowed: sessionStorage.setItem can throw (private
          mode, quota) — useDraft.ts used to catch and drop that silently, so a user
          could lose their in-progress topic/tone/audience on a trip to /brand with no
          warning. Reuses the same .toast/.toast-error classes Brand.tsx/Library.tsx
          already use for this pattern. */}
      {draftWriteFailed && (
        <div className="toast toast-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={12} />
          Couldn't save your draft — it may not survive leaving this page.
        </div>
      )}

      {/* Cross-tab navigation warning: drafts are sessionStorage-specific (per-tab) */}
      {hasDraft && (
        <div className="toast" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', color: 'color-mix(in srgb, var(--accent) 85%, transparent)' }}>
          <AlertCircle size={12} />
          Draft is saved in this tab only — opening Create in another tab won't see this draft.
        </div>
      )}
    </div>
  );
}
