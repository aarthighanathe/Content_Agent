import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SkeletonBlock } from '../../components/SkeletonCard';
import { CardHeader } from './CardHeader';
import type { PredictionTierCounts } from '../../types/api';

interface PredictionInsightsProps {
  loading: boolean;
  predictionTierCounts: PredictionTierCounts | undefined;
  latestPredictionTopReason: string | null | undefined;
}

// WHY fixed (non-themed) colors, same rationale as QualityTrendChart's
// DIMENSION_META: tier colors are meaningful signal (high/medium/low), not
// brand decoration — CLAUDE.md §13 keeps this category of color constant
// across all 6 UI themes.
const TIER_META = {
  high:   { label: 'High',   color: '#34D399', Icon: TrendingUp },
  medium: { label: 'Medium', color: '#F59E0B', Icon: Minus },
  low:    { label: 'Low',    color: '#F87171', Icon: TrendingDown },
} as const;

// WHY its own small card (not folded into InsightsCards.tsx): this feature's
// data is brand-new (no job created before 2026-08-04 has a 'prediction' row
// at all), so the empty state carries different copy than the two existing
// cards' "no data yet" — worth a component so that copy and the tier-bar
// rendering aren't squeezed into an already-two-column file.
export function PredictionInsights({ loading, predictionTierCounts, latestPredictionTopReason }: PredictionInsightsProps) {
  const total = predictionTierCounts
    ? predictionTierCounts.high + predictionTierCounts.medium + predictionTierCounts.low
    : 0;

  return (
    <div className="card">
      <CardHeader
        icon={<TrendingUp size={12} style={{ color: 'var(--accent-2)' }} />}
        accentVar="--accent-2"
        title="Predicted engagement"
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock height={10} radius={5} width="100%" />
          <SkeletonBlock height={8} radius={4} width="70%" />
        </div>
      ) : total === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          No predictions yet — generate a new post and the Performance Predictor's
          engagement-tier estimate will start showing up here.
        </div>
      ) : (
        <>
          {/* Tier distribution bar */}
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            {(['high', 'medium', 'low'] as const).map((tier) => {
              const count = predictionTierCounts?.[tier] ?? 0;
              if (count === 0) return null;
              return (
                <div
                  key={tier}
                  title={`${TIER_META[tier].label}: ${count}`}
                  style={{ width: `${(count / total) * 100}%`, background: TIER_META[tier].color }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: latestPredictionTopReason ? 14 : 0 }}>
            {(['high', 'medium', 'low'] as const).map((tier) => {
              const count = predictionTierCounts?.[tier] ?? 0;
              const meta = TIER_META[tier];
              return (
                <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                  <meta.Icon size={12} style={{ color: meta.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{meta.label}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>×{count}</span>
                </div>
              );
            })}
          </div>

          {latestPredictionTopReason && (
            <div style={{ padding: '11px 13px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--rule)' }}>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
                Latest insight
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {latestPredictionTopReason}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
