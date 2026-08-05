import { useMemo, useState } from 'react';
import { Radar as RadarIcon, LineChart as LineChartIcon } from 'lucide-react';
import { SkeletonBlock } from '../../components/SkeletonCard';
import { CardHeader } from './CardHeader';
import type { DimensionAverages, DimensionTrendPoint } from '../../types/api';

interface QualityTrendChartProps {
  loading: boolean;
  dimensionAverages: DimensionAverages | null | undefined;
  dimensionTrend: DimensionTrendPoint[] | undefined;
}

// WHY these 5 fixed hex values, not var(--accent)/var(--accent-2): per
// CLAUDE.md §13, dimension identity colors are meaningful signal (like
// platform-brand colors or quality-tier colors), not brand decoration, so
// they stay constant across all 6 UI themes rather than shifting with
// data-theme — a user comparing this chart across sessions in different
// themes must see the same dimension always mapped to the same hue.
// Chosen to be visually distinct at both small-multiple line width and as
// adjacent radar-polygon vertices.
const DIMENSION_META: Record<keyof DimensionAverages, { label: string; short: string; color: string }> = {
  hookStrength:       { label: 'Hook strength',       short: 'Hook',      color: '#F59E0B' },
  platformCompliance: { label: 'Platform fit',         short: 'Platform',  color: '#6366F1' },
  brandVoiceMatch:    { label: 'Brand voice',          short: 'Voice',     color: '#EC4899' },
  valueDelivery:      { label: 'Value delivery',       short: 'Value',     color: '#34D399' },
  ctaClarity:         { label: 'CTA clarity',          short: 'CTA',       color: '#38BDF8' },
};
const DIMENSION_ORDER = Object.keys(DIMENSION_META) as Array<keyof DimensionAverages>;
const MAX_DIM_VALUE = 20; // Critic agent scores each dimension 0-20 (see agents/critic.ts)

function polarPoint(cx: number, cy: number, radius: number, angleRad: number): [number, number] {
  return [cx + radius * Math.cos(angleRad), cy + radius * Math.sin(angleRad)];
}

// ── Radar: current profile across the 5 dimensions ────────────────────────
function RadarChart({ averages }: { averages: DimensionAverages }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 82;
  const rings = [0.25, 0.5, 0.75, 1];
  const angleStep = (Math.PI * 2) / DIMENSION_ORDER.length;
  const startAngle = -Math.PI / 2;

  const dataPoints = DIMENSION_ORDER.map((key, i) => {
    const value = Math.max(0, Math.min(MAX_DIM_VALUE, averages[key]));
    const radius = (value / MAX_DIM_VALUE) * maxRadius;
    return polarPoint(cx, cy, radius, startAngle + i * angleStep);
  });
  const polygonPoints = dataPoints.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radar chart of average score per dimension">
      {/* Grid rings */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={DIMENSION_ORDER.map((_, i) => polarPoint(cx, cy, maxRadius * r, startAngle + i * angleStep).join(',')).join(' ')}
          fill="none"
          stroke="var(--rule)"
          strokeWidth={1}
        />
      ))}
      {/* Spokes */}
      {DIMENSION_ORDER.map((key, i) => {
        const [x, y] = polarPoint(cx, cy, maxRadius, startAngle + i * angleStep);
        return <line key={key} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rule)" strokeWidth={1} />;
      })}
      {/* Data polygon */}
      <polygon points={polygonPoints} fill="color-mix(in srgb, var(--accent) 18%, transparent)" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {/* Vertex dots, colored per-dimension for legend correspondence */}
      {dataPoints.map(([x, y], i) => (
        <circle key={DIMENSION_ORDER[i]} cx={x} cy={y} r={3.5} fill={DIMENSION_META[DIMENSION_ORDER[i]].color} stroke="var(--bg-card)" strokeWidth={1.5} />
      ))}
      {/* Axis labels */}
      {DIMENSION_ORDER.map((key, i) => {
        const [x, y] = polarPoint(cx, cy, maxRadius + 22, startAngle + i * angleStep);
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9.5}
            fontFamily="var(--font-mono)"
            fill="var(--text-muted)"
          >
            {DIMENSION_META[key].short}
          </text>
        );
      })}
    </svg>
  );
}

// ── Trend: each dimension as its own thin line across recent jobs ─────────
function TrendChart({ points }: { points: DimensionTrendPoint[] }) {
  const width = 100; // percentage-based viewBox so the SVG scales to its container
  const height = 140;
  const padTop = 10;
  const padBottom = 18;
  const plotHeight = height - padTop - padBottom;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function yFor(value: number): number {
    const clamped = Math.max(0, Math.min(MAX_DIM_VALUE, value));
    return padTop + plotHeight - (clamped / MAX_DIM_VALUE) * plotHeight;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend of each quality dimension over recent jobs"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Gridlines at 0/50/100% */}
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={0} x2={width} y1={padTop + plotHeight * f} y2={padTop + plotHeight * f} stroke="var(--rule)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        ))}

        {DIMENSION_ORDER.map((key) => {
          const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${yFor(p[key])}`).join(' ');
          return (
            <path
              key={key}
              d={d}
              fill="none"
              stroke={DIMENSION_META[key].color}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* Hover crosshair */}
        {hoverIdx !== null && (
          <line x1={hoverIdx * stepX} x2={hoverIdx * stepX} y1={padTop} y2={padTop + plotHeight} stroke="var(--text-muted)" strokeWidth={0.5} strokeDasharray="2,2" vectorEffect="non-scaling-stroke" />
        )}

        {/* Invisible hover targets — one per data point, generous hit area */}
        {points.map((p, i) => (
          <rect
            key={p.jobId}
            x={Math.max(0, i * stepX - stepX / 2)}
            y={0}
            width={points.length > 1 ? stepX : width}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
      </svg>

      {hoverIdx !== null && points[hoverIdx] && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: `${Math.min(78, Math.max(2, (hoverIdx * stepX)))}%`,
            transform: hoverIdx > points.length / 2 ? 'translateX(-100%)' : 'none',
            background: 'var(--bg-raised)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 10.5,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 1,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
            {new Date(points[hoverIdx].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
          {DIMENSION_ORDER.map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: DIMENSION_META[key].color, flexShrink: 0 }} />
              {DIMENSION_META[key].short}: <strong style={{ color: 'var(--text-primary)' }}>{points[hoverIdx][key]}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 12 }}>
      {DIMENSION_ORDER.map((key) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: DIMENSION_META[key].color, flexShrink: 0 }} />
          {DIMENSION_META[key].label}
        </div>
      ))}
    </div>
  );
}

// WHY a component of its own (not folded into InsightsCards.tsx): a chart with
// two view modes (radar/trend), hover interaction, and its own SVG geometry is
// a meaningfully different unit of complexity than the two simple list-based
// cards already in that file — keeping it separate keeps both files well
// under the 300/400-line split thresholds.
export function QualityTrendChart({ loading, dimensionAverages, dimensionTrend }: QualityTrendChartProps) {
  const [mode, setMode] = useState<'radar' | 'trend'>('radar');
  const hasTrendData = (dimensionTrend?.length ?? 0) >= 2;
  const hasAnyData = !!dimensionAverages || hasTrendData;

  const trendPoints = useMemo(() => dimensionTrend ?? [], [dimensionTrend]);

  return (
    <div className="card">
      <CardHeader
        icon={mode === 'radar' ? <RadarIcon size={12} style={{ color: 'var(--accent)' }} /> : <LineChartIcon size={12} style={{ color: 'var(--accent)' }} />}
        title="Content fitness"
        trailing={
          !loading && hasAnyData ? (
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 8, padding: 2 }}>
              {(['radar', 'trend'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  disabled={m === 'trend' && !hasTrendData}
                  style={{
                    fontSize: 10.5,
                    fontFamily: 'var(--font-mono)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: m === 'trend' && !hasTrendData ? 'not-allowed' : 'pointer',
                    opacity: m === 'trend' && !hasTrendData ? 0.4 : 1,
                    background: mode === m ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'transparent',
                    color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                    textTransform: 'capitalize',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <SkeletonBlock width={200} height={200} radius={100} />
        </div>
      ) : !hasAnyData ? (
        <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
          No quality scores yet — generate and approve some content to see your dimension breakdown here.
        </div>
      ) : (
        <>
          {mode === 'radar' && dimensionAverages && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart averages={dimensionAverages} />
            </div>
          )}
          {mode === 'radar' && !dimensionAverages && (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
              Not enough scored content yet for a profile view.
            </div>
          )}
          {mode === 'trend' && hasTrendData && <TrendChart points={trendPoints} />}
          <Legend />
        </>
      )}
    </div>
  );
}
