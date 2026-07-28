// WHY: HistorySkeleton.tsx and CardSkeleton.tsx were near-identical (same layout, only
// differing in a few px of sizing and animation-name). Consolidated into one parameterized
// component per REVIEW_FINDINGS.md Section 3.
//
// WHY SkeletonBlock also lives here (audit #29): Dashboard.tsx/InsightsCards.tsx/Calendar/
// Ideate each had their own near-identical single-div shimmer primitive (a sized, rounded,
// animated placeholder rect) composed freely into custom multi-piece skeletons (a progress-bar
// row's icon+label+bar+number, a stat card's number, a grid cell). That's a genuinely different
// shape than SkeletonCard's fixed avatar+title+badge row, so rather than forcing every caller
// onto one rigid row layout, the shared primitive underneath both is extracted and exported —
// SkeletonCard is built from it below, and free-form callers use it directly. The keyframe
// lives in SkeletonBlock (not SkeletonCard) so it's declared regardless of which one a page uses.
export interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
  /** Stacks a shimmer keyframe delay so adjacent blocks in one skeleton don't pulse in perfect unison. */
  delay?: number;
  style?: React.CSSProperties;
}

export function SkeletonBlock({ width = '100%', height = 10, radius = 5, delay = 0, style }: SkeletonBlockProps) {
  return (
    <>
      <style>{`@keyframes skel-shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
      <div
        style={{
          width, height, borderRadius: radius, background: 'rgba(255,255,255,0.05)',
          animation: `skel-shimmer 1.4s ease-in-out infinite${delay ? ` ${delay}s` : ''}`,
          flexShrink: 0, ...style,
        }}
      />
    </>
  );
}

interface SkeletonCardProps {
  /** Size variant — 'sm' matches the old HistorySkeleton, 'md' matches the old CardSkeleton. 'lines' is a bare card with 2 stacked text lines and no avatar/badge (Ideate's idea-card placeholder). */
  size?: 'sm' | 'md' | 'lines';
}

const SIZES = {
  sm: { avatar: 34, avatarRadius: 9, cardRadius: 13, titleH: 10, subH: 7, badgeW: 32, badgeH: 18, gap: 10, pad: '12px 14px' },
  md: { avatar: 42, avatarRadius: 10, cardRadius: 14, titleH: 11, subH: 7, badgeW: 36, badgeH: 20, gap: 12, pad: '14px 16px' },
} as const;

export function SkeletonCard({ size = 'md' }: SkeletonCardProps) {
  if (size === 'lines') {
    return (
      <div style={{ background: '#08081A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 13, padding: '16px 18px' }}>
        <SkeletonBlock height={12} radius={6} width="60%" style={{ marginBottom: 8 }} />
        <SkeletonBlock height={9} radius={5} width="40%" />
      </div>
    );
  }

  const s = SIZES[size];
  return (
    <div style={{ background: '#08081A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: s.cardRadius, padding: s.pad, display: 'flex', alignItems: 'center', gap: s.gap }}>
      <SkeletonBlock width={s.avatar} height={s.avatar} radius={s.avatarRadius} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock height={s.titleH} radius={5} width="65%" />
        <SkeletonBlock height={s.subH} radius={4} width="38%" delay={0.1} />
      </div>
      <SkeletonBlock width={s.badgeW} height={s.badgeH} radius={10} delay={0.2} />
    </div>
  );
}
