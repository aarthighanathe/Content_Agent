import { useId, useMemo } from 'react';

export interface WeekScorePoint {
  week: string;
  monday: Date;
  avg: number;
  count: number;
}

interface ScoreTrendChartProps {
  points: WeekScorePoint[];
}

const W = 200;
const H = 40;
const PAD = { top: 6, right: 6, bottom: 6, left: 6 };

/** Tiny inline sparkline for the insights strip. */
export function ScoreTrendChart({ points }: ScoreTrendChartProps): React.JSX.Element {
  const gradId = useId().replace(/:/g, '');
  const chart = useMemo(() => {
    const avgs = points.map((p) => p.avg);
    const dataMin = Math.min(...avgs);
    const dataMax = Math.max(...avgs);
    const span = Math.max(dataMax - dataMin, 8);
    const yMin = Math.max(0, dataMin - span * 0.2);
    const yMax = Math.min(100, dataMax + span * 0.2);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const xAt = (i: number): number =>
      PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const yAt = (v: number): number =>
      PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

    const linePts = points.map((p, i) => `${xAt(i)},${yAt(p.avg)}`).join(' ');
    const areaD = [
      `M ${xAt(0)} ${PAD.top + innerH}`,
      `L ${xAt(0)} ${yAt(points[0]!.avg)}`,
      ...points.slice(1).map((p, i) => `L ${xAt(i + 1)} ${yAt(p.avg)}`),
      `L ${xAt(points.length - 1)} ${PAD.top + innerH}`,
      'Z',
    ].join(' ');

    const last = points[points.length - 1]!.avg;
    const delta = last - points[0]!.avg;
    return { xAt, yAt, linePts, areaD, delta, last };
  }, [points]);

  const firstLabel = formatWeekLabel(points[0]!.monday);
  const lastLabel = formatWeekLabel(points[points.length - 1]!.monday);
  const deltaLabel = chart.delta === 0
    ? '0'
    : `${chart.delta > 0 ? '+' : ''}${chart.delta}`;

  return (
    <div className="lib-trend" title="Average score by week on this page">
      <div className="lib-trend-meta">
        <span className="lib-trend-now">{chart.last}</span>
        <span
          className={`lib-trend-delta${
            chart.delta > 0 ? ' up' : chart.delta < 0 ? ' down' : ''
          }`}
        >
          {deltaLabel}
        </span>
      </div>
      <svg
        className="lib-trend-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Weekly average score trend"
      >
        <defs>
          <linearGradient id={`tfill-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={chart.areaD} fill={`url(#tfill-${gradId})`} />
        <polyline
          points={chart.linePts}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={p.week}
            cx={chart.xAt(i)}
            cy={chart.yAt(p.avg)}
            r="2.4"
            className="lib-trend-dot"
          >
            <title>{`${formatWeekLabel(p.monday)} · ${p.avg}`}</title>
          </circle>
        ))}
      </svg>
      <div className="lib-trend-range">
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>
    </div>
  );
}

function formatWeekLabel(monday: Date): string {
  return monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
