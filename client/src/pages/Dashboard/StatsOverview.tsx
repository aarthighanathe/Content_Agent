import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Target, Layers, Hexagon } from 'lucide-react';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonBlock } from '../../components/SkeletonCard';
import type { ContentDna } from '../../types/api';

interface StatCard {
  Icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  color: string;
  bg: string;
  border: string;
  suffix?: string;
  highlight?: boolean;
}

interface StatsOverviewProps {
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  totalPosts: number;
  avgScore: number;
  mostUsedPlatform: string;
  contentDna: ContentDna | null;
}

// WHY extracted from Dashboard.tsx: the stat-cards grid + Content DNA bubble
// (previously ~100 inline lines) was one of the two blocks pushing the page
// component past the 400-line split threshold — same rationale as
// RecentGenerations/InsightsCards already living in this folder.
export function StatsOverview({ isError, isLoading, onRetry, totalPosts, avgScore, mostUsedPlatform, contentDna }: StatsOverviewProps) {
  if (isError) {
    return <ErrorState message="We couldn't load your stats. Please try again." onRetry={onRetry} />;
  }

  const statCards: StatCard[] = [
    {
      Icon: LayoutGrid,
      label: 'Total posts',
      value: String(totalPosts),
      note: 'All time',
      color: 'var(--accent)',
      bg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
      border: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    },
    {
      Icon: Target,
      label: 'Avg quality score',
      value: String(avgScore),
      suffix: '/100',
      // WHY 70 explained inline: the Critic agent approves content at score >= 70
      // (agents/critic.ts) — this threshold was previously shown with no context
      // for why 70 specifically means "above average."
      note: avgScore >= 70 ? 'Above average (70+ is our quality bar)' : 'Below our 70-point quality bar — keep improving',
      color: 'var(--accent-2)',
      bg: 'color-mix(in srgb, var(--accent-2) 10%, transparent)',
      border: 'color-mix(in srgb, var(--accent-2) 22%, transparent)',
      highlight: true,
    },
    {
      Icon: Layers,
      label: 'Most-used platform',
      value: mostUsedPlatform === 'none' ? '—' : mostUsedPlatform.replace('_', ' '),
      note: '',
      color: 'var(--accent)',
      bg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
      border: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    },
  ];

  return (
    <>
      <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {statCards.map((stat) => (
          <div key={stat.label} className="dash-stat-card">
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${stat.color},transparent 80%)`, borderRadius: '16px 16px 0 0' }} />

            {/* Icon */}
            <div style={{ width: 40, height: 40, background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, marginBottom: 14 }}>
              <stat.Icon size={17} />
            </div>

            {/* Label */}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              {stat.label}
            </div>

            {/* Value */}
            <div style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(26px,5vw,38px)', fontWeight: 700, lineHeight: 1, textTransform: 'capitalize', color: stat.highlight ? stat.color : 'var(--text-primary)' }}>
              {isLoading ? <SkeletonBlock width={80} height={32} radius={6} /> : (
                <>
                  {stat.value}
                  {stat.suffix && (
                    <small style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "var(--font-sans)", fontWeight: 400 }}>
                      {stat.suffix}
                    </small>
                  )}
                </>
              )}
            </div>

            {stat.note && !isLoading && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {stat.note}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Content DNA bubble ── */}
      {!isLoading && (
        <Link
          to="/brand"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 9, background: contentDna ? 'color-mix(in srgb, var(--accent-2) 10%, transparent)' : 'color-mix(in srgb, var(--accent) 8%, transparent)', border: `1px solid ${contentDna ? 'color-mix(in srgb, var(--accent-2) 25%, transparent)' : 'color-mix(in srgb, var(--accent) 20%, transparent)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: contentDna ? 'var(--accent-2)' : 'var(--accent)' }}>
              <Hexagon size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {contentDna ? (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    Content DNA active
                  </div>
                  <div style={{ fontSize: 11, color: 'color-mix(in srgb, var(--accent-2) 70%, transparent)', fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {[contentDna.hookPattern, contentDna.vocabularyLevel, contentDna.ctaStyle].filter(Boolean).join(' · ') || 'Writing fingerprint captured'}
                  </div>
                </>
              ) : (
                <>
                  {/* WHY accent border + Recommended badge (#41): the "not set up"
                      state was near-invisible (low-contrast text, rgba(255,255,255,0.06)
                      border) despite Content DNA being one of the app's most
                      differentiating features. Strengthening the border to --accent
                      and adding a muted badge gives it enough presence to be noticed
                      without becoming a disruptive full-page CTA.
                      WHY badge is --accent-2, not --accent: the icon block, card
                      border, and "Set up ->" link all already read --accent, so a
                      same-color badge blended into the rest of the card and looked
                      identical across themes whose --accent hue reads similarly
                      against a dark background. Splitting the badge onto --accent-2
                      (matching the two-tone icon/text split the "active" state
                      already uses) makes each theme's full palette visible here,
                      not just one channel of it. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      Analyze your content DNA
                    </div>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--accent-2)', background: 'color-mix(in srgb, var(--accent-2) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 28%, transparent)', borderRadius: 20, padding: '1px 7px', letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Recommended
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", marginTop: 0 }}>
                    Capture your writing fingerprint for more consistent AI output
                  </div>
                </>
              )}
            </div>
            <div style={{ fontSize: 10, color: contentDna ? 'color-mix(in srgb, var(--accent-2) 50%, transparent)' : 'color-mix(in srgb, var(--accent) 60%, transparent)', fontFamily: "var(--font-mono)", whiteSpace: 'nowrap', flexShrink: 0 }}>
              {contentDna ? 'View →' : 'Set up →'}
            </div>
          </div>
        </Link>
      )}
    </>
  );
}
