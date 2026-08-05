// WHY a standalone file: Library.tsx is the thin orchestrator; putting the
// analytics panel inline would push it toward the 400-line split threshold.
// This panel is display-only — it derives everything from the `jobs` prop
// that useLibraryData already fetches, so there are no additional API calls.
import { useMemo } from 'react';
import { platformMeta } from '../../lib/platformMeta';
import type { LibraryJob } from './libraryHelpers';
import { getQualityScore } from './libraryHelpers';

interface LibraryAnalyticsPanelProps {
  jobs: LibraryJob[];
}

// Score tier labels matching QualityTierBadge's thresholds.
const TIERS: { label: string; min: number; max: number; color: string }[] = [
  { label: 'A  ≥ 80', min: 80, max: 100, color: '#10B981' },
  { label: 'B  60–79', min: 60, max: 79,  color: '#60A5FA' },
  { label: 'C  40–59', min: 40, max: 59,  color: '#F59E0B' },
  { label: 'D  < 40',  min: 0,  max: 39,  color: '#EF4444' },
];

export function LibraryAnalyticsPanel({ jobs }: LibraryAnalyticsPanelProps) {
  const scoredJobs = useMemo(() => jobs.filter(j => getQualityScore(j) !== null), [jobs]);

  // WHY grouped by week bucket: grouping by day would give a chart too sparse
  // for a 10-job page; weekly buckets smooth the trend across even a single
  // page of results. Each bucket is the ISO week of the job's createdAt.
  const weeklyScores = useMemo(() => {
    const buckets = new Map<string, number[]>();
    scoredJobs.forEach(j => {
      const d = new Date(j.createdAt);
      // ISO week: Monday-anchored, formatted as YYYY-Www
      const day = d.getDay();
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((day + 6) % 7));
      const key = `${mon.getFullYear()}-W${String(Math.ceil(mon.getDate() / 7)).padStart(2, '0')}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(getQualityScore(j)!);
    });
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, scores]) => ({
        week,
        avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      }));
  }, [scoredJobs]);

  const tierCounts = useMemo(() => TIERS.map(t => ({
    ...t,
    count: scoredJobs.filter(j => {
      const s = getQualityScore(j)!;
      return s >= t.min && s <= t.max;
    }).length,
  })), [scoredJobs]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => { counts[j.platform] = (counts[j.platform] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [jobs]);

  const maxPlatformCount = platformCounts[0]?.[1] ?? 1;
  const maxSparklineVal  = Math.max(...weeklyScores.map(b => b.avg), 1);

  if (jobs.length === 0) return null;

  return (
    <div className="lib-analytics-panel">
      {/* ── Score distribution ── */}
      <div className="lib-analytics-section">
        <div className="lib-analytics-title">Score distribution (this page)</div>
        {tierCounts.map(t => (
          <div key={t.label} className="lib-bar">
            <span className="lib-bar-label" style={{ color: t.color }}>{t.label}</span>
            <div className="lib-bar-track">
              <div
                className="lib-bar-fill"
                style={{
                  width: scoredJobs.length ? `${(t.count / scoredJobs.length) * 100}%` : '0%',
                  background: t.color,
                }}
              />
            </div>
            <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 18, textAlign: 'right' }}>{t.count}</span>
          </div>
        ))}
        {scoredJobs.length === 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>No scored jobs on this page yet.</p>
        )}
      </div>

      {/* ── Platform mix ── */}
      <div className="lib-analytics-section">
        <div className="lib-analytics-title">Platform mix (this page)</div>
        {platformCounts.map(([platform, count]) => {
          const pm = platformMeta[platform];
          return (
            <div key={platform} className="lib-bar">
              <span className="lib-bar-label" style={{ color: pm?.color ?? 'var(--text-muted)' }}>
                {pm?.label ?? platform}
              </span>
              <div className="lib-bar-track">
                <div
                  className="lib-bar-fill"
                  style={{ width: `${(count / maxPlatformCount) * 100}%`, background: pm?.color ?? 'var(--accent)' }}
                />
              </div>
              <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 18, textAlign: 'right' }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* ── Score trend sparkline (only when 2+ weekly buckets exist) ── */}
      {weeklyScores.length >= 2 && (
        <div className="lib-analytics-section" style={{ gridColumn: '1 / -1' }}>
          <div className="lib-analytics-title">Avg score trend by week</div>
          <div className="lib-sparkline" aria-label="Score trend">
            {weeklyScores.map((b, i) => {
              const heightPct = (b.avg / maxSparklineVal) * 100;
              const prev = weeklyScores[i - 1]?.avg;
              const trend = prev === undefined ? 0 : b.avg - prev;
              const barColor = trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#60A5FA';
              return (
                <div
                  key={b.week}
                  title={`${b.week}: avg ${b.avg}`}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'flex-end', gap: 2,
                  }}
                >
                  <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{b.avg}</span>
                  <div style={{
                    width: '100%', maxWidth: 24, borderRadius: '3px 3px 0 0',
                    height: `${Math.max(heightPct, 8)}%`,
                    background: barColor,
                    opacity: 0.8,
                    transition: 'height .4s ease',
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
