import { BarChart3 } from 'lucide-react';
import { SkeletonBlock } from '../../components/SkeletonCard';
import type { CompetitorAnalysis } from '../../types/social';
import type { DimensionAverages } from '../../types/api';

interface BenchmarkCardProps {
  isLoading: boolean;
  isError: boolean;
  totalPosts: number | undefined;
  avgScore: number | undefined;
  dimensionAverages: DimensionAverages | null | undefined;
  analysis: CompetitorAnalysis;
}

const MAX_DIM_VALUE = 20;

// WHY hookStrength only, not all 5 dimensions: it's the one axis both sides of this
// comparison actually describe — the Critic scores the user's own hookStrength 0-20,
// and the competitor analysis independently reports a qualitative contentPatterns.hookStyle
// (server/src/routes/content/competitor.ts). The other 4 Critic dimensions (platform fit,
// brand voice, value delivery, CTA clarity) have no competitor-side equivalent at all —
// showing them here would imply a comparison that doesn't exist. See CLAUDE.md-adjacent
// FUTURE_FEATURES.md "No benchmarking against the user's own content" for the item this
// card implements; deliberately narrow rather than fabricating a broader score.
export function BenchmarkCard({ isLoading, isError, totalPosts, avgScore, dimensionAverages, analysis }: BenchmarkCardProps) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <BarChart3 size={14} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>How You Compare</span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock height={11} radius={5} width="80%" />
          <SkeletonBlock height={9} radius={4} width="55%" />
        </div>
      ) : !hasOwnData ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
          Generate and approve some of your own content to see how your hook strength and
          overall quality score stack up against {analysis.brandName || 'this competitor'}'s patterns.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                Your avg quality score
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                {avgScore}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/100</span>
              </div>
            </div>
            {hookPercent !== null && (
              <div>
                <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  Your hook strength
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {hookPercent}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
            )}
          </div>

          {analysis.contentPatterns?.hookStyle && (
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--rule)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-muted)' }}>{analysis.brandName || 'They'}'s hook style: </span>
              {analysis.contentPatterns.hookStyle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
