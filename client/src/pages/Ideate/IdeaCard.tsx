import { useState } from 'react';
import { ArrowRight, Bookmark, Check, Copy, ExternalLink, Loader2, RefreshCw, Smartphone, TrendingDown, TrendingUp, Minus, X } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { isSafeHttpUrl } from '../../lib/utils';
import { useTrackedTimeout } from '../../hooks/useTrackedTimeout';
import type { IdeatedIdea } from '../../store';

interface IdeaCardProps {
  idea: IdeatedIdea;
  index: number;
  saved: boolean;
  onUse: (idea: IdeatedIdea) => void;
  onDismiss: (index: number) => void;
  onToggleSave: (idea: IdeatedIdea) => void;
  onRegenerate: (index: number) => void;
  regenerating: boolean;
}

// WHY the exact same high/medium/low color scheme as Dashboard/PredictionInsights.tsx's
// TIER_META: tier colors are meaningful signal, not brand decoration (CLAUDE.md §13) —
// this codebase's own convention is to reuse one fixed mapping for this concept everywhere
// it appears, not invent a second one local to this card.
const TIER_META = {
  high:   { label: 'High',   color: '#34D399', Icon: TrendingUp },
  medium: { label: 'Medium', color: '#F59E0B', Icon: Minus },
  low:    { label: 'Low',    color: '#F87171', Icon: TrendingDown },
} as const;

export function IdeaCard({ idea, index, saved, onUse, onDismiss, onToggleSave, onRegenerate, regenerating }: IdeaCardProps) {
  const meta = platformMeta[idea.platform] || { label: idea.platform, Icon: Smartphone, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' };
  const [copied, setCopied] = useState(false);
  const tierMeta = idea.prediction ? TIER_META[idea.prediction.tier] : null;
  const safeSourceUrl = idea.sourceUrl && isSafeHttpUrl(idea.sourceUrl) ? idea.sourceUrl : null;
  // WHY: handleCopy fires from a click handler, not an effect — there's no
  // natural cleanup point for its 1.5s "revert to Copy icon" timer, so it's
  // tracked and cleared on unmount via the shared hook (same pattern as
  // useSocial.ts, ExportModal.tsx, FeedMonitorPanel.tsx).
  const pendingTimers = useTrackedTimeout();

  async function handleCopy(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${idea.title}\n\n${idea.angle}`);
      setCopied(true);
      pendingTimers.set(() => setCopied(false), 1500);
    } catch {
      // WHY no user-facing error: clipboard access can be denied by browser
      // permissions/insecure context — the button staying non-"copied" is
      // sufficient feedback that it didn't work, without an intrusive toast
      // for what's a low-stakes convenience action.
    }
  }

  return (
    <div
      className="idea-card"
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--rule)',
        borderRadius: 13,
        padding: '16px 18px',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        transition: 'border-color .2s, background .2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'color-mix(in srgb, var(--accent) 25%, transparent)';
        (e.currentTarget as HTMLDivElement).style.background = 'color-mix(in srgb, var(--accent) 3%, transparent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--rule)';
        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)';
      }}
    >
      {/* Number badge */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 14%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 500,
      }}>
        {index + 1}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>
            {idea.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* I4: predicted performance tier — same fixed color scheme as
                Dashboard's PredictionInsights, absent gracefully for ideas
                generated before this field existed. */}
            {tierMeta && (
              <span
                title={idea.prediction?.topReason || `${tierMeta.label} predicted engagement`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: `${tierMeta.color}18`, border: `1px solid ${tierMeta.color}38`,
                  borderRadius: 20, padding: '2px 8px',
                  fontSize: 10, fontWeight: 700, color: tierMeta.color, whiteSpace: 'nowrap',
                }}
              >
                <tierMeta.Icon size={10} /> {tierMeta.label}
              </span>
            )}
            {/* Platform pill */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: meta.bg, border: `1px solid ${meta.color}28`,
              borderRadius: 20, padding: '2px 9px',
              fontSize: 10.5, fontWeight: 600, color: meta.color, whiteSpace: 'nowrap',
            }}>
              <meta.Icon size={10} /> {meta.label}
            </span>
          </div>
        </div>
        <p style={{ margin: '0 0 4px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <span style={{ color: 'color-mix(in srgb, var(--accent-2) 80%, transparent)', fontWeight: 500 }}>Angle: </span>
          {idea.angle}
        </p>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {idea.why}
        </p>
        {/* I3: "why now" grounding source — only present when the idea was
            actually grounded in a real search result. */}
        {safeSourceUrl && (
          <a
            href={safeSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
              fontSize: 10.5, color: 'var(--accent)', textDecoration: 'none',
            }}
          >
            <ExternalLink size={10} /> Based on this source
          </a>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          className="idea-card-action-btn"
          aria-label={saved ? 'Remove from saved ideas' : 'Save idea for later'}
          title={saved ? 'Remove from saved ideas' : 'Save idea for later'}
          onClick={(e) => { e.stopPropagation(); onToggleSave(idea); }}
          style={{
            background: 'transparent', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer',
            color: saved ? 'var(--accent)' : 'var(--text-muted)', display: 'flex',
          }}
        >
          <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className="idea-card-action-btn"
          aria-label={copied ? 'Copied' : 'Copy idea to clipboard'}
          title={copied ? 'Copied' : 'Copy idea to clipboard'}
          onClick={handleCopy}
          style={{
            background: 'transparent', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer',
            color: copied ? 'var(--color-success)' : 'var(--text-muted)', display: 'flex',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        {/* I1: regenerate this one idea in place — kept as a distinct icon
            from × (dismiss) rather than folding the behavior into dismiss
            itself, so a user who clicks × to remove an idea isn't surprised
            by it silently coming back as something different. */}
        <button
          type="button"
          className="idea-card-action-btn"
          aria-label="Regenerate this idea"
          title="Regenerate this idea"
          disabled={regenerating}
          onClick={(e) => { e.stopPropagation(); onRegenerate(index); }}
          style={{
            background: 'transparent', border: 'none', borderRadius: 6, padding: 4,
            cursor: regenerating ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', display: 'flex',
            opacity: regenerating ? 0.5 : 1,
          }}
        >
          {regenerating ? <Loader2 size={14} style={{ animation: 'idea-card-spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
        </button>
        <button
          type="button"
          className="idea-card-action-btn"
          aria-label="Dismiss this idea"
          title="Dismiss this idea"
          onClick={(e) => { e.stopPropagation(); onDismiss(index); }}
          style={{ background: 'transparent', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
        >
          <X size={14} />
        </button>
        {/* WHY a dedicated button, not the whole card being role="button": real
            <button> elements (Save/Copy/Regenerate/Dismiss above) nested inside a
            parent with an interactive role is invalid ARIA/HTML — nested
            interactive controls confuse both keyboard nav and screen readers
            about what a single Tab stop/click actually activates. The card
            itself is now a plain, non-interactive div; only this button
            triggers onUse. */}
        <button
          type="button"
          className="idea-card-action-btn"
          aria-label={`Create content for ${idea.title}`}
          title="Create content from this idea"
          onClick={() => onUse(idea)}
          style={{
            background: 'transparent', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', marginTop: 2,
          }}
        >
          <ArrowRight size={14} />
        </button>
      </div>
      {/* WHY a local keyframe, not reusing Ideate.tsx's @keyframes spin: that
          one only exists in the DOM while the page-level `loading` state is
          true (its <style> block is inside the loading-skeletons branch) — a
          per-card regenerate spin needs to work independently of that. */}
      <style>{`@keyframes idea-card-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
