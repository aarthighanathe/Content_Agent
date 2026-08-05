import type { CSSProperties } from 'react';

interface QualityTierBadgeProps {
  /** Critic total score (0-100), or null/undefined while a job is still pending. */
  score: number | null | undefined;
  /** 'sm' fits inline list rows (Dashboard/History/Library). 'md' is for slightly more
   *  prominent contexts. This never replaces the full-size Gold Score Ring in
   *  InsightsSidebar.tsx, which keeps its own larger radial-fill render. */
  size?: 'sm' | 'md';
  className?: string;
}

interface TierInfo {
  label: string;
  color: string;
  bg: string;
}

// WHY these bands: REVIEW_FINDINGS.md §4.2 specifies <70 "Needs Work", 70-84 "Solid",
// 85-94 "Strong", 95+ "Exceptional" — replacing the old flat-color-only badge with a
// named tier so a list of scores reads as quality language, not just a raw number.
function getTier(score: number): TierInfo {
  if (score >= 95) return { label: 'Exceptional', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
  if (score >= 85) return { label: 'Strong',      color: '#34D399', bg: 'rgba(16,185,129,0.12)' };
  if (score >= 70) return { label: 'Solid',       color: '#6366F1', bg: 'rgba(99,102,241,0.12)' };
  return               { label: 'Needs Work',  color: '#F87171', bg: 'rgba(239,68,68,0.12)' };
}

const SIZES = {
  sm: { ring: 20, stroke: 2.5, fontSize: 10, labelSize: 9.5, gap: 6, pad: '3px 8px 3px 3px' },
  md: { ring: 26, stroke: 3,   fontSize: 11, labelSize: 10.5, gap: 7, pad: '4px 10px 4px 4px' },
} as const;

/**
 * Reusable "quality-tier" visual — reuses the Gold Score Ring's radial-fill logic (an SVG
 * circle whose stroke-dashoffset encodes the score fraction) at a small inline size, paired
 * with the tier name instead of a flat color-only `.badge` pill. Used everywhere a job's
 * quality score appears in a list row (Dashboard, History, Library) so the "scoring visual
 * grammar" — a partial ring = partial quality — is consistent across the whole app.
 *
 * WHY not extracted from InsightsSidebar.tsx's full-size ring: that ring is tightly bound
 * to the Result page's larger layout/tooltip; duplicating just the radial-fill math here (a
 * ~10-line SVG circle calc) is far less risky than reaching into a working full-size
 * component to force a shared abstraction. Both independently implement the same formula
 * (circumference * (1 - score/100) as stroke-dashoffset).
 */
export function QualityTierBadge({ score, size = 'sm', className }: QualityTierBadgeProps) {
  const s = SIZES[size];

  if (score === null || score === undefined) {
    return (
      <span
        className={className}
        style={{ fontSize: s.labelSize, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        —
      </span>
    );
  }

  const clamped = Math.max(0, Math.min(100, score));
  const tier = getTier(clamped);
  const radius = (s.ring - s.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = s.ring / 2;

  const wrapStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: s.gap,
    padding: s.pad,
    borderRadius: 20,
    background: tier.bg,
    border: `1px solid ${tier.color}30`,
    whiteSpace: 'nowrap',
  };

  return (
    <span className={className} style={wrapStyle} title={`${tier.label} · ${clamped}/100`}>
      <svg width={s.ring} height={s.ring} viewBox={`0 0 ${s.ring} ${s.ring}`} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--rule)" strokeWidth={s.stroke} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={tier.color}
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: s.fontSize, fontWeight: 700, color: tier.color }}>
          {tier.label}
        </span>
      </span>
    </span>
  );
}
