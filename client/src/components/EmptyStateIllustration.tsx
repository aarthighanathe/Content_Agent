import type { CSSProperties } from 'react';

export type EmptyStateVariant = 'dashboard' | 'history' | 'search';

interface EmptyStateIllustrationProps {
  variant: EmptyStateVariant;
  size?: number;
  style?: CSSProperties;
}

// WHY hand-drawn line art instead of a filled icon-in-a-box: REVIEW_FINDINGS.md §4.5 —
// empty states previously reused the same rounded-square + centered-glyph pattern as
// ErrorState.tsx (see components/ErrorState.tsx), so an empty dashboard and a broken one
// looked almost identical apart from color. Each variant below is a small stroke-based
// SVG relevant to that specific page (matches the lucide-style convention already used
// throughout this codebase: fill="none" stroke="currentColor" strokeWidth="1.5"
// strokeLinecap="round" — see InsightsSidebar.tsx / PostPanel.tsx for the sibling pattern),
// deliberately faint (low opacity) so it reads as a watermark, not competing with the CTA.
const commonProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// Faint agent-pipeline relay — echoes the Orchestrator→Researcher→Writer→Formatter→Critic
// chain that's the product's real loading-state hero (see LoadingView.tsx / 4.1).
function DashboardIllustration() {
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%" {...commonProps}>
      <line x1="14" y1="30" x2="106" y2="30" strokeDasharray="1 6" opacity="0.6" />
      {[14, 40, 66, 92].map((cx) => (
        <circle key={cx} cx={cx} cy="30" r="7" />
      ))}
      <circle cx="106" cy="30" r="9" strokeWidth="2" />
      <path d="M103 30 l3 3 l4 -6" strokeWidth="1.5" />
    </svg>
  );
}

// Faint clock-on-timeline — echoes History's chronological job list.
function HistoryIllustration() {
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%" {...commonProps}>
      <circle cx="60" cy="30" r="20" />
      <path d="M60 19v11l8 6" strokeWidth="1.75" />
      <line x1="8" y1="30" x2="30" y2="30" strokeDasharray="1 5" opacity="0.6" />
      <line x1="90" y1="30" x2="112" y2="30" strokeDasharray="1 5" opacity="0.6" />
    </svg>
  );
}

// Faint magnifier over a blank card — used for "no search results" (distinct from the
// true empty states above; a search yielding nothing isn't "you have nothing", it's
// "nothing matched" — worth a slightly different visual even within 4.5's scope).
function SearchIllustration() {
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%" {...commonProps}>
      <rect x="20" y="12" width="50" height="36" rx="6" opacity="0.5" />
      <line x1="30" y1="24" x2="58" y2="24" opacity="0.5" />
      <line x1="30" y1="32" x2="50" y2="32" opacity="0.35" />
      <circle cx="80" cy="34" r="14" strokeWidth="1.75" />
      <line x1="90" y1="44" x2="100" y2="54" strokeWidth="1.75" />
    </svg>
  );
}

const VARIANTS: Record<EmptyStateVariant, typeof DashboardIllustration> = {
  dashboard: DashboardIllustration,
  history: HistoryIllustration,
  search: SearchIllustration,
};

/**
 * Page-specific line-art illustration for empty states — see REVIEW_FINDINGS.md §4.5.
 * Distinct from ErrorState.tsx's alert-triangle-in-a-box pattern (reserved for actual
 * fetch failures) so a first-time user can tell "nothing here yet" apart from "something
 * broke" at a glance, not just by re-reading the copy underneath.
 */
export function EmptyStateIllustration({ variant, size = 96, style }: EmptyStateIllustrationProps) {
  const Illustration = VARIANTS[variant];
  return (
    <div
      style={{
        width: size,
        height: size * 0.5,
        color: 'rgba(245,158,11,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      aria-hidden="true"
    >
      <Illustration />
    </div>
  );
}
