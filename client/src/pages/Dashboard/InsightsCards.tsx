import { TrendingUp, Lightbulb, Layers } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { SkeletonBlock } from '../../components/SkeletonCard';
import { CardHeader } from './CardHeader';
import type { PlatformBreakdownItem } from './dashboardTypes';

interface InsightsCardsProps {
  loading: boolean;
  platformBreakdown?: PlatformBreakdownItem[];
  personalizedTips: string[];
  hasCritiqueData: boolean;
}

export function InsightsCards({ loading, platformBreakdown, personalizedTips, hasCritiqueData }: InsightsCardsProps) {
  return (
    <div className="grid-halves" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {/* Platform breakdown */}
      <div className="card">
        <CardHeader icon={<TrendingUp size={12} style={{ color: 'var(--accent)' }} />} title="Platform breakdown" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <SkeletonBlock width={14} height={14} radius={3} />
                <SkeletonBlock width={64} height={7} />
                <div style={{ flex: 1 }}><SkeletonBlock width="100%" height={4} radius={2} /></div>
                <SkeletonBlock width={26} height={7} />
              </div>
            ))
          ) : platformBreakdown && platformBreakdown.length > 0 ? (
            platformBreakdown.map((p) => {
              const meta = platformMeta[p.platform];
              const label = meta?.label || p.platform;
              const color = meta?.color || 'var(--accent)';
              return (
                <div key={p.platform} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11.5 }}>
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{meta ? <meta.Icon size={13} style={{ color: meta.color }} /> : <Layers size={13} style={{ color: 'var(--accent-2)' }} />}</span>
                  <span style={{ width: 60, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: `linear-gradient(90deg,${color},${color}55)`, borderRadius: 2, width: `${p.avgScore}%`, transition: 'width 1.2s cubic-bezier(.16,1,.3,1)' }} />
                  </div>
                  <span style={{ color: 'var(--accent)', fontFamily: "var(--font-mono)", fontSize: 10, width: 26, textAlign: 'right', fontWeight: 600 }}>
                    {p.avgScore || '0'}
                  </span>
                  {/* WHY: platformCounts was computed server-side (routes/users/me.ts)
                      but only ever used to pick "best platform," then discarded —
                      surfacing the raw post count per platform here closes that gap. */}
                  <span style={{ color: 'var(--text-muted)', fontFamily: "var(--font-mono)", fontSize: 9, width: 30, textAlign: 'right', flexShrink: 0 }}>
                    ×{p.count}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No data yet</div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card">
        <CardHeader
          icon={<Lightbulb size={12} style={{ color: 'var(--accent-2)' }} />}
          accentVar="--accent-2"
          title={hasCritiqueData ? 'Your insights' : 'Quick tips'}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ padding: '11px 13px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--rule)', display: 'flex', gap: 11 }}>
                <SkeletonBlock width={5} height={5} radius={3} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <SkeletonBlock width="88%" />
                  <SkeletonBlock width="62%" height={7} />
                </div>
              </div>
            ))
          ) : personalizedTips.map((tip, i) => (
            <div key={`${i}-${tip}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 13px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--rule)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', marginTop: 7, flexShrink: 0, boxShadow: '0 0 6px var(--accent-glow)' }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.62 }}>{tip}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
