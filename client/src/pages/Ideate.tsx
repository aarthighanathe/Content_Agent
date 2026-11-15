import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Lightbulb } from 'lucide-react';
import { generateIdeas, getCompetitorHistory, regenerateIdea } from '../api';
import { getSubmitError } from '../lib/errorMessages';
import { navigateToCreate, timeAgo } from '../lib/utils';
import { IdeaCardSkeleton } from '../components/SkeletonCard';
import { useAppStore } from '../store';
import type { IdeatedIdea } from '../store';
import { IdeateControls } from './Ideate/IdeateControls';
import { IdeaCard } from './Ideate/IdeaCard';
import { SavedIdeasSection } from './Ideate/SavedIdeasSection';

export default function IdeatePage() {
  const navigate = useNavigate();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  // WHY: store instead of local state: ideas must survive navigating to /create and back,
  // AND a hard refresh — the store persists ideatedIdeas to localStorage (store.ts) so the
  // list only changes when the user explicitly regenerates.
  const ideas = useAppStore((s) => s.ideatedIdeas);
  const setIdeas = useAppStore((s) => s.setIdeatedIdeas);
  const ideasGeneratedAt = useAppStore((s) => s.ideasGeneratedAt);
  const savedIdeas = useAppStore((s) => s.savedIdeas);
  const saveIdea = useAppStore((s) => s.saveIdea);
  const unsaveIdea = useAppStore((s) => s.unsaveIdea);
  // WHY: gate empty state — before setActiveUser, ideas is [] and would flash "No ideas yet"
  const activeUserId = useAppStore((s) => s.activeUserId);

  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState('');
  const [focusTopic, setFocusTopic] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  // WHY: competitor-gap ideation mode is off by default: only meaningful once
  // a past analysis exists (see competitorHistoryQuery below). The toggle
  // in IdeateControls only shows when the history list is non-empty.
  const [useCompetitorGaps, setUseCompetitorGaps] = useState(false);
  const [competitorAnalysisId, setCompetitorAnalysisId] = useState<string | undefined>(undefined);
  // WHY: track which single idea is regenerating: shows a spinner/disabled state
  // only on that specific card, not the entire list.
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // WHY: mid-request account switch used to skip setLoading(false) (gated on user
  // match) and leave the spinner stuck for the new user. Also clear competitor-gap
  // selection — analysis ids belong to the previous account's history.
  useEffect(() => {
    setLoading(false);
    submittingRef.current = false;
    setError('');
    setRegeneratingId(null);
    setUseCompetitorGaps(false);
    setCompetitorAnalysisId(undefined);
    setFocusTopic('');
  }, [activeUserId]);

  // WHY: reuse C1's history endpoint: checks if the user has at least one saved analysis.
  // IdeateControls only shows the competitor-gap toggle when this list is non-empty.
  const competitorHistoryQuery = useQuery({
    queryKey: ['competitor', 'history'],
    queryFn: getCompetitorHistory,
    // WHY: gate like Create/Library — avoid an unauthenticated fetch before Clerk hydrates.
    enabled: authLoaded && isSignedIn,
  });
  const competitorAnalyses = competitorHistoryQuery.data?.analyses || [];

  const visibleIdeas = useMemo(
    () => (platformFilter ? ideas.filter((idea) => idea.platform === platformFilter) : ideas),
    [ideas, platformFilter]
  );
  // WHY: key by id, not title — two ideas can share a title after regenerate.
  const savedIds = useMemo(
    () => new Set(savedIdeas.map((s) => s.id).filter((id): id is string => Boolean(id))),
    [savedIdeas],
  );

  async function fetchIdeas() {
    // WHY: regeneratingId — a full regenerate must not race a single-card regenerate
    // (which maps by id against the live store) and wipe/replace mid-flight.
    if (loading || submittingRef.current || regeneratingId !== null) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');
    // WHY: capture at start — drop the result if Clerk switches accounts before settle.
    const requestUserId = useAppStore.getState().activeUserId;
    try {
      const activeAnalysisId = useCompetitorGaps ? competitorAnalysisId : undefined;
      const { ideas: newIdeas } = await generateIdeas(count, focusTopic.trim() || undefined, activeAnalysisId);
      if (useAppStore.getState().activeUserId !== requestUserId) return;
      setIdeas(newIdeas, { forUserId: requestUserId });
    } catch (err) {
      if (useAppStore.getState().activeUserId !== requestUserId) return;
      // WHY: context-aware copy (#40): when ideas already exist and regeneration fails,
      // a generic error banner reads ambiguously — the user can't tell whether the old
      // ideas are still actionable or have been cleared. The fallback explicitly
      // acknowledges the previous ideas are still shown and usable; getSubmitError still
      // takes priority for a real server-provided reason (rate limit, validation).
      const fallback = ideas.length > 0
        ? "Couldn't generate new ideas — here are your last ones. Try again when ready."
        : 'Failed to generate ideas — please try again.';
      setError(getSubmitError(err, fallback).message);
    } finally {
      // WHY: always clear — gating on user match left loading stuck after a switch.
      setLoading(false);
      submittingRef.current = false;
    }
  }

  function handleCreate(idea: IdeatedIdea) {
    navigateToCreate(navigate, { topic: idea.title, platform: idea.platform });
  }

  // WHY: by id, read from the live store: index-based removal raced with in-flight regenerates
  function handleDismiss(id: string | undefined): void {
    setIdeas(
      useAppStore.getState().ideatedIdeas.filter((idea) => idea.id !== id),
      { preserveGeneratedAt: true },
    );
  }

  // WHY: regenerate in place via map: replacing the idea at `index` without
  // filtering/splicing preserves stable indices for other cards. This prevents
  // mid-flight index shifts that would confuse the UI during regeneration.
  async function handleRegenerateOne(id: string | undefined): Promise<void> {
    if (regeneratingId !== null || loading || submittingRef.current || !id) return;
    setRegeneratingId(id);
    const requestUserId = useAppStore.getState().activeUserId;
    try {
      // WHY: getState() for exclude titles + map: `ideas` from the render closure can be
      // stale if another regenerate finished between click and this await — reading the
      // live store avoids writing an outdated snapshot back over fresher cards.
      const currentIdeas = useAppStore.getState().ideatedIdeas;
      const excludeTitles = currentIdeas.map((i) => i.title);
      const activeAnalysisId = useCompetitorGaps ? competitorAnalysisId : undefined;
      const newIdea = await regenerateIdea(focusTopic.trim() || undefined, excludeTitles, activeAnalysisId);
      setIdeas(
        useAppStore.getState().ideatedIdeas.map((idea) => (idea.id === id ? { ...newIdea, id } : idea)),
        { preserveGeneratedAt: true, forUserId: requestUserId },
      );
    } catch (err) {
      if (useAppStore.getState().activeUserId === requestUserId) {
        setError(getSubmitError(err, 'Failed to regenerate that idea — please try again.').message);
      }
    }
    setRegeneratingId(null);
  }

  function handleToggleSave(idea: IdeatedIdea): void {
    const id = idea.id;
    if (!id) {
      saveIdea(idea);
      return;
    }
    if (savedIds.has(id)) {
      unsaveIdea(id);
    } else {
      saveIdea(idea);
    }
  }

  return (
    <div>
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
          {/* WHY: inline retry: the only other way to retry was the "Regenerate ideas"
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

      {loading && (
        <div className="ideate-grid">
          {Array.from({ length: count }, (_, i) => `idea-skel-${i}`).map((id) => (
            <IdeaCardSkeleton key={id} />
          ))}
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {!loading && visibleIdeas.length > 0 && (
        <div className="ideate-grid">
          {visibleIdeas.map((idea) => {
            // WHY: the full-array index, not the loop-position index: filtering
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
                key={idea.id ?? idea.title}
                idea={idea}
                index={stableIndex}
                saved={Boolean(idea.id && savedIds.has(idea.id))}
                onUse={handleCreate}
                onDismiss={() => handleDismiss(idea.id)}
                onToggleSave={handleToggleSave}
                onRegenerate={() => { handleRegenerateOne(idea.id).catch(() => {}); }}
                regenerating={regeneratingId !== null && regeneratingId === idea.id}
              />
            );
          })}
        </div>
      )}

      {!loading && activeUserId && ideas.length === 0 && (
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
