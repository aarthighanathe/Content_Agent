// AUDIT FIX #7 — PostHog event tracking
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createJob } from '../api';
import { posthog } from '../main';
import { TopicStep } from './Create/TopicStep';
import { useDraft } from './Create/useDraft';
import { getSubmitError } from './Create/errorMessages';
import { useAppStore } from '../store';

const CAROUSEL_THEME_KEY = 'ca_carousel_theme';
const RECENT_TOPICS_KEY  = 'ca_recent_topics';

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

export default function CreatePage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const prefill     = (location.state as { topic?: string; platform?: string } | null) || {};
  const userProfile = useAppStore((s) => s.userProfile);

  // Draft persists topic/platform/tone/audience across a trip to /brand and back;
  // cleared once a job is actually submitted (see handleSubmit).
  const { draft, setDraft, clearDraft } = useDraft();

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
  const [carouselTheme, setCarouselTheme] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(CAROUSEL_THEME_KEY) || '4', 10); } catch { return 4; }
  });

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const effectiveAudience = targetAudience.trim() || AUDIENCE_DEFAULTS[platform] || 'general audience';
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
    if (platform === 'instagram_carousel') {
      localStorage.setItem(CAROUSEL_THEME_KEY, String(carouselTheme));
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { jobId } = await createJob({ topic: trimmed, platform, tone: effectiveTone, targetAudience: effectiveAudience });
      posthog.capture('content_generated', { platform, tone: effectiveTone });
      clearDraft();
      navigate(`/result/${jobId}`);
    } catch (err: unknown) {
      console.error('Failed to create job:', err);
      const { message } = getSubmitError(err);
      setErrorMsg(message);
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: 32, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#F59E0B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 18, height: 1, background: 'linear-gradient(90deg,#F59E0B,transparent)', display: 'inline-block' }} />
          New generation
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'rgba(255,255,255,0.92)' }}>
          Create new content
        </h1>
        <p style={{ fontSize: 'clamp(12px,2vw,13px)', color: 'var(--color-text-muted)', marginTop: 4 }}>
          Choose a platform, enter your topic, and generate AI-powered content
        </p>
      </div>

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

        targetAudience={targetAudience}
        onTargetAudienceChange={(a) => { setTargetAudience(a); setDraft({ targetAudience: a }); }}
        audiencePlaceholder={`e.g., ${AUDIENCE_DEFAULTS[platform]}`}

        carouselTheme={carouselTheme}
        onCarouselThemeChange={(theme) => {
          setCarouselTheme(theme);
          localStorage.setItem(CAROUSEL_THEME_KEY, String(theme));
        }}

        errorMsg={errorMsg}
        loading={loading}
        generateLabel={GENERATE_LABELS[platform] || 'Content'}
        onSubmit={handleSubmit}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
