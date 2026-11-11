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
          width, height, borderRadius: radius, background: 'var(--rule)',
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
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 13, padding: '16px 18px' }}>
        <SkeletonBlock height={12} radius={6} width="60%" style={{ marginBottom: 8 }} />
        <SkeletonBlock height={9} radius={5} width="40%" />
      </div>
    );
  }

  const s = SIZES[size];
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: s.cardRadius, padding: s.pad, display: 'flex', alignItems: 'center', gap: s.gap }}>
      <SkeletonBlock width={s.avatar} height={s.avatar} radius={s.avatarRadius} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock height={s.titleH} radius={5} width="65%" />
        <SkeletonBlock height={s.subH} radius={4} width="38%" delay={0.1} />
      </div>
      <SkeletonBlock width={s.badgeW} height={s.badgeH} radius={10} delay={0.2} />
    </div>
  );
}

/** Same shell as a library job row: icon, title, meta, score, menu. */
export function LibraryRowSkeleton(): React.JSX.Element {
  return (
    <div className="lib-card" aria-hidden="true" style={{ cursor: 'default', animation: 'none' }}>
      <div className="lib-card-inner">
        <SkeletonBlock width={38} height={38} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SkeletonBlock height={14} radius={5} width="58%" style={{ marginBottom: 8 }} />
          <SkeletonBlock height={10} radius={8} width="26%" delay={0.1} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <SkeletonBlock width={72} height={22} radius={20} delay={0.15} />
          <SkeletonBlock width={48} height={9} radius={4} delay={0.2} />
        </div>
        <SkeletonBlock width={30} height={30} radius={9} delay={0.25} />
      </div>
    </div>
  );
}

/** Same shell as a dashboard recent-generation row. */
export function JobRowSkeleton(): React.JSX.Element {
  return (
    <div aria-hidden="true" style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 13 }}>
      <div className="dash-job-row" style={{ borderColor: 'transparent', cursor: 'default' }}>
        <SkeletonBlock width={36} height={36} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SkeletonBlock height={13} radius={5} width="54%" style={{ marginBottom: 6 }} />
          <SkeletonBlock height={9} radius={4} width="30%" delay={0.1} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <SkeletonBlock width={72} height={22} radius={20} delay={0.15} />
          <SkeletonBlock width={44} height={9} radius={4} delay={0.2} />
        </div>
        <SkeletonBlock width={26} height={26} radius={8} delay={0.25} />
        <SkeletonBlock width={26} height={26} radius={8} delay={0.3} />
      </div>
    </div>
  );
}

/** Same shell as an Ideate card: number, copy, action column. */
export function IdeaCardSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--rule)',
        borderRadius: 13,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <SkeletonBlock width={28} height={28} radius={8} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <SkeletonBlock height={14} radius={5} width="92%" style={{ marginBottom: 6 }} />
        <SkeletonBlock height={14} radius={5} width="68%" delay={0.05} style={{ marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <SkeletonBlock width={52} height={18} radius={20} delay={0.1} />
          <SkeletonBlock width={64} height={18} radius={20} delay={0.12} />
        </div>
        <SkeletonBlock height={10} radius={4} width="100%" delay={0.15} style={{ marginBottom: 6 }} />
        <SkeletonBlock height={10} radius={4} width="78%" delay={0.18} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['save', 'copy', 'regen', 'dismiss', 'open'].map((id) => (
          <SkeletonBlock key={id} width={22} height={22} radius={6} />
        ))}
      </div>
    </div>
  );
}
