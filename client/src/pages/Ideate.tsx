import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { generateIdeas, getCompetitorHistory, regenerateIdea } from '../api';
import { getSubmitError } from '../lib/errorMessages';
import { navigateToCreate, timeAgo } from '../lib/utils';
import { SkeletonCard } from '../components/SkeletonCard';
import { useAppStore } from '../store';
import type { IdeatedIdea } from '../store';
import { IdeateControls } from './Ideate/IdeateControls';
import { IdeaCard } from './Ideate/IdeaCard';
import { SavedIdeasSection } from './Ideate/SavedIdeasSection';

export default function IdeatePage() {
  const navigate = useNavigate();
  // WHY store instead of local state: ideas must survive navigating to /create and back,
  // AND a hard refresh — the store persists ideatedIdeas to localStorage (store.ts) so the
  // list only changes when the user explicitly regenerates.
  const ideas = useAppStore((s) => s.ideatedIdeas);
  const setIdeas = useAppStore((s) => s.setIdeatedIdeas);
  const ideasGeneratedAt = useAppStore((s) => s.ideasGeneratedAt);
  const savedIdeas = useAppStore((s) => s.savedIdeas);
  const saveIdea = useAppStore((s) => s.saveIdea);
  const unsaveIdea = useAppStore((s) => s.unsaveIdea);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusTopic, setFocusTopic] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  // WHY competitor-gap ideation mode is off by default: only meaningful once
  // a past analysis exists (see competitorHistoryQuery below). The toggle
  // in IdeateControls only shows when the history list is non-empty.
  const [useCompetitorGaps, setUseCompetitorGaps] = useState(false);
  const [competitorAnalysisId, setCompetitorAnalysisId] = useState<string | undefined>(undefined);
  // WHY track which single idea is regenerating: shows a spinner/disabled state
  // only on that specific card, not the entire list.
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // WHY reuse C1's history endpoint: checks if the user has at least one saved analysis.
  // IdeateControls only shows the competitor-gap toggle when this list is non-empty.
  const competitorHistoryQuery = useQuery({ queryKey: ['competitor', 'history'], queryFn: getCompetitorHistory });
  const competitorAnalyses = competitorHistoryQuery.data?.analyses || [];

  const visibleIdeas = useMemo(
    () => (platformFilter ? ideas.filter((idea) => idea.platform === platformFilter) : ideas),
    [ideas, platformFilter]
  );
  const savedTitles = useMemo(() => new Set(savedIdeas.map((s) => s.title)), [savedIdeas]);

  async function fetchIdeas() {
    setLoading(true);
    setError('');
    try {
      const activeAnalysisId = useCompetitorGaps ? competitorAnalysisId : undefined;
      const { ideas: newIdeas } = await generateIdeas(count, focusTopic.trim() || undefined, activeAnalysisId);
      setIdeas(newIdeas);
    } catch (err) {
      // WHY context-aware copy (#40): when ideas already exist and regeneration fails,
      // a generic error banner reads ambiguously — the user can't tell whether the old
      // ideas are still actionable or have been cleared. The fallback explicitly
      // acknowledges the previous ideas are still shown and usable; getSubmitError still
      // takes priority for a real server-provided reason (rate limit, validation).
      const fallback = ideas.length > 0
        ? "Couldn't generate new ideas — here are your last ones. Try again when ready."
        : 'Failed to generate ideas — please try again.';
      setError(getSubmitError(err, fallback).message);
    }
    setLoading(false);
  }

  function handleCreate(idea: IdeatedIdea) {
    navigateToCreate(navigate, { topic: idea.title, platform: idea.platform });
  }

  function handleDismiss(index: number) {
    setIdeas(ideas.filter((_, i) => i !== index));
  }

  // WHY regenerate in place via map: replacing the idea at `index` without
  // filtering/splicing preserves stable indices for other cards. This prevents
  // mid-flight index shifts that would confuse the UI during regeneration.
  async function handleRegenerateOne(index: number) {
    if (regeneratingIndex !== null) return;
    setRegeneratingIndex(index);
    try {
      // WHY exclude all titles, not just first 10: prevents duplicates when regenerating
      // idea #15+ — the old slice(0, 10) only excluded ideas #1-10, so the regenerated
      // idea could duplicate ideas #11-20 that weren't sent for exclusion.
      const excludeTitles = ideas.map((i) => i.title);
      const activeAnalysisId = useCompetitorGaps ? competitorAnalysisId : undefined;
      const newIdea = await regenerateIdea(focusTopic.trim() || undefined, excludeTitles, activeAnalysisId);
      setIdeas(ideas.map((idea, i) => (i === index ? newIdea : idea)));
    } catch (err) {
      setError(getSubmitError(err, 'Failed to regenerate that idea — please try again.').message);
    }
    setRegeneratingIndex(null);
  }

  function handleToggleSave(idea: IdeatedIdea) {
    if (savedTitles.has(idea.title)) {
      unsaveIdea(idea.title);
    } else {
      saveIdea(idea);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Ideation Mode
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
            AI generates trending topic ideas based on your brand voice and industry. Click any idea to jump straight into creation.
          </p>
          {ideasGeneratedAt && (
            <p style={{ color: 'var(--text-muted)', fontSize: 11.5, margin: '6px 0 0' }}>
              Generated {timeAgo(ideasGeneratedAt)}
            </p>
          )}
        </div>
      </div>

      <SavedIdeasSection savedIdeas={savedIdeas} onUse={handleCreate} onRemove={unsaveIdea} />

      <IdeateControls
        focusTopic={focusTopic}
        onFocusTopicChange={setFocusTopic}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        count={count}
        onCountChange={setCount}
        loading={loading}
        hasIdeas={ideas.length > 0}
        onGenerate={fetchIdeas}
        competitorAnalyses={competitorAnalyses}
        useCompetitorGaps={useCompetitorGaps}
        onUseCompetitorGapsChange={setUseCompetitorGaps}
        competitorAnalysisId={competitorAnalysisId}
        onCompetitorAnalysisIdChange={setCompetitorAnalysisId}
      />

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
          borderRadius: 10, padding: '12px 16px', color: 'var(--color-error)',
          fontSize: 13, marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <span>{error}</span>
          {/* WHY inline retry: the only other way to retry was the "Regenerate ideas"
              button up in IdeateControls, which can be scrolled out of view — this
              puts the recovery action right next to the error that caused it. */}
          <button
            type="button"
            onClick={() => { fetchIdeas().catch(() => {}); }}
            disabled={loading}
            style={{
              flexShrink: 0, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 7, padding: '5px 12px', color: 'var(--color-error)', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading skeletons — 2-column grid */}
      {loading && (
        <div className="ideate-grid-375-fix" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 10 }}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} size="lines" />
          ))}
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @media (max-width: 375px) {
              .ideate-grid-375-fix {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Ideas grid — 2 columns on desktop */}
      {!loading && visibleIdeas.length > 0 && (
        <div className="ideate-grid-375-fix" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 10 }}>
          {visibleIdeas.map((idea) => {
            // WHY the full-array index, not the loop-position index: filtering
            // visibleIdeas by platform reshuffles loop position on every filter
            // change even though the same idea is still showing — keying on
            // that position caused React to remount (not update) the card,
            // losing its local "copied" clipboard-feedback state. The index
            // into the stable, unfiltered `ideas` array stays constant for a
            // given idea regardless of which filter is applied, and is also
            // exactly the value IdeaCard already needs for dismiss/save.
            const stableIndex = ideas.indexOf(idea);
            return (
              <IdeaCard
                // WHY idea.title, not stableIndex: React key must identify the
                // idea itself, not its current array position — dismissing or
                // regenerating an earlier card shifts every later idea's index,
                // which would make React reuse a later card's DOM node (and its
                // local `copied` clipboard-feedback state in IdeaCard) for what
                // is now a different idea. Titles are unique within one
                // generated batch (already relied on elsewhere in this file —
                // see savedTitles/handleToggleSave), so they're a stable identity
                // stableIndex alone can't provide.
                key={idea.title}
                idea={idea}
                index={stableIndex}
                saved={savedTitles.has(idea.title)}
                onUse={handleCreate}
                onDismiss={handleDismiss}
                onToggleSave={handleToggleSave}
                onRegenerate={handleRegenerateOne}
                regenerating={regeneratingIndex === stableIndex}
              />
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && ideas.length === 0 && (
        <div style={{
          background: 'var(--bg-raised)', border: '1px dashed var(--rule)',
          borderRadius: 16, padding: '64px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, transparent), color-mix(in srgb, var(--accent-2) 12%, transparent))',
            border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lightbulb size={26} color="color-mix(in srgb, var(--accent) 70%, transparent)" />
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>
            No ideas yet
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
            Click "Suggest topics" to get AI-powered ideas tailored to your brand.
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Tip: Set your industry in Brand Settings for better results.
          </p>
        </div>
      )}

      {/* Filtered-to-empty state: ideas exist but the platform filter hides all of them */}
      {!loading && ideas.length > 0 && visibleIdeas.length === 0 && (
        <div style={{
          background: 'var(--bg-raised)', border: '1px dashed var(--rule)',
          borderRadius: 16, padding: '40px 24px', textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
            No ideas match this platform filter. Try "All" or regenerate.
          </p>
        </div>
      )}
    </div>
  );
}
