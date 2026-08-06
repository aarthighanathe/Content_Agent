import { BarChart3 } from 'lucide-react';
import { SkeletonBlock } from '../../components/SkeletonCard';
import { CardHeader } from '../Dashboard/CardHeader';
import type { CompetitorAnalysis } from '../../types/social';
import type { DimensionAverages } from '../../types/api';

interface BenchmarkCardProps {
  isLoading: boolean;
  isError: boolean;
  totalPosts: number | undefined;
  dimensionAverages: DimensionAverages | null | undefined;
  analysis: CompetitorAnalysis;
}

const MAX_DIM_VALUE = 20;

// WHY hookStrength only, not all 5 dimensions, and no avgScore here at all:
// hookStrength is the one axis both sides of this comparison actually describe —
// the Critic scores the user's own hookStrength 0-20, and the competitor analysis
// independently reports a qualitative contentPatterns.hookStyle
// (server/src/routes/content/competitor.ts). The other 4 Critic dimensions (platform
// fit, brand voice, value delivery, CTA clarity) have no competitor-side equivalent
// at all. avgScore was dropped from this card entirely (previously shown standalone,
// not as a comparison) because Dashboard's StatsOverview already surfaces it from the
// same getProfile() query — repeating it here was pure duplication with nothing new
// for the user, not a comparison against anything competitor-side.
export function BenchmarkCard({ isLoading, isError, totalPosts, dimensionAverages, analysis }: BenchmarkCardProps) {
  // WHY silently omitted, not an ErrorState block: this is a supplementary "how do you
  // compare" panel bolted onto an otherwise-complete competitor analysis — a failed
  // fetch of the user's own stats shouldn't block or visually break the primary result
  // the user came here for. Matches Dashboard's InsightsCards/NextScheduledCard
  // precedent of degrading quietly when a secondary query fails.
  if (isError) return null;

  const hasOwnData = !isLoading && !!dimensionAverages && (totalPosts ?? 0) > 0;
  const hookPercent = dimensionAverages ? Math.round((dimensionAverages.hookStrength / MAX_DIM_VALUE) * 100) : null;

  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)', borderRadius: 14, padding: 20 }}>
      <CardHeader icon={<BarChart3 size={14} style={{ color: 'var(--accent)' }} />} title="How You Compare" />

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock height={11} radius={5} width="80%" />
          <SkeletonBlock height={9} radius={4} width="55%" />
        </div>
      ) : !hasOwnData ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
          Generate and approve some of your own content to see how your hook strength
          stacks up against {analysis.brandName || 'this competitor'}'s patterns.
        </p>
      ) : hookPercent !== null ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 20px', alignItems: 'baseline' }}>
            <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase' }}>You</div>
            <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {analysis.brandName || 'Them'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{hookPercent}%</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>hook strength</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {analysis.contentPatterns?.hookStyle || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No hook style data available</span>}
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            Your side is a measured percentage from your approved content; {analysis.brandName || 'their'} side is
            a qualitative read of their public posts, not a directly comparable number — use it to spot tactics they lean on.
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
          No hook-strength data available yet.
        </p>
      )}
    </div>
  );
}
