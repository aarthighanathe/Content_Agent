import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Mic } from 'lucide-react';
import { SkeletonBlock } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import type { DimensionTrendPoint } from '../../types/api';

interface VoiceDriftCardProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  dimensionTrend: DimensionTrendPoint[] | undefined;
}

// WHY the Critic agent's brandVoiceMatch dimension, not a new metric: this is the same
// 0-20 score already computed per job by agents/critic.ts and returned as part of
// stats.dimensionTrend from GET /api/users/me — Brand.tsx already fetches this via its
// existing profileQuery, so this card needs no new server call or endpoint.
const RECENT_WINDOW = 10;
const MAX_DIM_VALUE = 20;

function toPercent(avg: number): number {
  return Math.round((avg / MAX_DIM_VALUE) * 100);
}

export function VoiceDriftCard({ isLoading, isError, onRetry, dimensionTrend }: VoiceDriftCardProps) {
  // WHY comparing the last 10 against the 10 before that (not just showing one
  // number): "drift" implies direction — a flat 80% told in isolation doesn't say
  // whether brand voice consistency is improving or degrading, which is the whole
  // point of a *drift* card versus a plain average readout.
  const { recentPercent, priorPercent, recentCount } = useMemo(() => {
    const trend = dimensionTrend ?? [];
    const recent = trend.slice(-RECENT_WINDOW);
    const prior = trend.slice(-RECENT_WINDOW * 2, -RECENT_WINDOW);

    const avg = (points: DimensionTrendPoint[]): number | null =>
      points.length > 0 ? points.reduce((sum, p) => sum + p.brandVoiceMatch, 0) / points.length : null;

    const recentAvg = avg(recent);
    const priorAvg = avg(prior);

    return {
      recentPercent: recentAvg !== null ? toPercent(recentAvg) : null,
      priorPercent: priorAvg !== null ? toPercent(priorAvg) : null,
      recentCount: recent.length,
    };
  }, [dimensionTrend]);

  if (isError) {
    return (
      <div style={{ gridColumn: '1 / -1' }}>
        <ErrorState message="We couldn't load your voice consistency data." onRetry={onRetry} />
      </div>
    );
  }

  const delta = recentPercent !== null && priorPercent !== null ? recentPercent - priorPercent : null;
  const TrendIcon = delta === null || Math.abs(delta) < 3 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const trendColor = delta === null || Math.abs(delta) < 3 ? 'var(--text-muted)' : delta > 0 ? '#34D399' : '#F87171';

  return (
    <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '3px solid color-mix(in srgb, var(--accent-2) 40%, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 36, height: 36, background: 'color-mix(in srgb, var(--accent-2) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 28%, transparent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)', flexShrink: 0 }}>
          <Mic size={16} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Voice consistency</div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SkeletonBlock width={64} height={40} radius={8} />
          <SkeletonBlock width="45%" height={11} radius={5} />
        </div>
      ) : recentPercent === null ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          No scored content yet — generate and approve some posts to see how closely your
          content matches the voice you've configured above.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {recentPercent}%
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Your last {recentCount} scored post{recentCount === 1 ? '' : 's'} matched your configured
              brand voice, on average.
            </div>
            {delta !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: trendColor }}>
                <TrendIcon size={12} />
                {Math.abs(delta) < 3
                  ? 'Stable vs. your previous 10 posts'
                  : `${delta > 0 ? '+' : ''}${delta}pt vs. your previous 10 posts`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
