// Display-only — derives everything from the `jobs` prop; no extra API calls.
import { useMemo } from 'react';
import { BarChart3, Layers } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import type { LibraryJob } from './libraryHelpers';
import { getQualityScore } from './libraryHelpers';
import { ScoreTrendChart } from './ScoreTrendChart';
import type { WeekScorePoint } from './ScoreTrendChart';

interface LibraryAnalyticsPanelProps {
  jobs: LibraryJob[];
}

const TIERS: { label: string; short: string; min: number; max: number; color: string }[] = [
  { label: 'Exceptional', short: 'Exc', min: 95, max: 100, color: '#F59E0B' },
  { label: 'Strong',      short: 'Str', min: 85, max: 94,  color: '#34D399' },
  { label: 'Solid',       short: 'Sol', min: 70, max: 84,  color: '#6366F1' },
  { label: 'Needs Work',  short: 'NW',  min: 0,  max: 69,  color: '#F87171' },
];

/**
 * Compact insights strip: KPI chips + stacked quality bar + platform pills +
 * optional weekly sparkline. Designed to stay one short band above the feed.
 */
export function LibraryAnalyticsPanel({ jobs }: LibraryAnalyticsPanelProps): React.JSX.Element | null {
  const scoredJobs = useMemo(
    () => jobs.filter((j) => getQualityScore(j) !== null),
    [jobs],
  );

  const weeklyScores = useMemo((): WeekScorePoint[] => {
    const buckets = new Map<string, { monday: Date; scores: number[] }>();
    scoredJobs.forEach((j) => {
      const d = new Date(j.createdAt);
      const day = d.getDay();
      const mon = new Date(d);
      mon.setHours(0, 0, 0, 0);
      mon.setDate(d.getDate() - ((day + 6) % 7));
      const key = mon.toISOString().slice(0, 10);
      const score = getQualityScore(j);
      if (score === null) return;
      const existing = buckets.get(key);
      if (existing) {
        existing.scores.push(score);
      } else {
        buckets.set(key, { monday: mon, scores: [score] });
      }
    });
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, { monday, scores }]) => ({
        week,
        monday,
        avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
        count: scores.length,
      }));
  }, [scoredJobs]);

  const tierCounts = useMemo(() => TIERS.map((t) => ({
    ...t,
    count: scoredJobs.filter((j) => {
      const s = getQualityScore(j);
      return s !== null && s >= t.min && s <= t.max;
    }).length,
  })), [scoredJobs]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => { counts[j.platform] = (counts[j.platform] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [jobs]);

  const avgScore = useMemo(() => {
    if (scoredJobs.length === 0) return null;
    const sum = scoredJobs.reduce((s, j) => s + (getQualityScore(j) ?? 0), 0);
    return Math.round(sum / scoredJobs.length);
  }, [scoredJobs]);

  const scoredPct = jobs.length > 0
    ? Math.round((scoredJobs.length / jobs.length) * 100)
    : 0;

  if (jobs.length === 0) return null;

  const activeTiers = tierCounts.filter((t) => t.count > 0);
  const tierTotal = scoredJobs.length || 1;

  return (
    <div className="lib-analytics">
      <div className="lib-analytics-top">
        <div className="lib-analytics-brand">
          <span className="lib-analytics-icon" aria-hidden>
            <BarChart3 size={13} />
          </span>
          <span className="lib-analytics-heading">Page insights</span>
          <span className="lib-analytics-sub">{jobs.length} on this page</span>
        </div>
        <div className="lib-analytics-kpis" aria-label="Summary metrics">
          <span className="lib-kpi accent">
            <strong>{avgScore !== null ? avgScore : '—'}</strong> avg
          </span>
          <span className="lib-kpi">
            <strong>{scoredPct}%</strong> scored
          </span>
          <span className="lib-kpi">
            <strong>{platformCounts.length}</strong> platforms
          </span>
        </div>
      </div>

      <div className="lib-analytics-body">
        <div className="lib-analytics-block">
          <span className="lib-analytics-block-lbl">Quality</span>
          {scoredJobs.length === 0 ? (
            <p className="lib-analytics-empty">No scores yet</p>
          ) : (
            <>
              <div
                className="lib-stack-bar"
                role="img"
                aria-label="Quality tier distribution"
              >
                {activeTiers.map((t) => (
                  <div
                    key={t.label}
                    className="lib-stack-seg"
                    style={{
                      flexGrow: t.count,
                      background: t.color,
                    }}
                    title={`${t.label}: ${t.count} (${Math.round((t.count / tierTotal) * 100)}%)`}
                  />
                ))}
              </div>
              <div className="lib-stack-legend">
                {tierCounts.map((t) => (
                  <span
                    key={t.label}
                    className={`lib-stack-leg${t.count === 0 ? ' mute' : ''}`}
                  >
                    <i style={{ background: t.color }} />
                    {t.short}
                    <b>{t.count}</b>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lib-analytics-block">
          <span className="lib-analytics-block-lbl">Platforms</span>
          <div className="lib-plat-pills">
            {platformCounts.map(([platform, count]) => {
              const pm = platformMeta[platform];
              const color = pm?.color ?? 'var(--accent)';
              const Icon = pm?.Icon ?? Layers;
              return (
                <span
                  key={platform}
                  className="lib-plat-pill"
                  style={{
                    color,
                    borderColor: `${color}44`,
                    background: `${color}14`,
                  }}
                >
                  <Icon size={11} />
                  {pm?.label ?? platform}
                  <em>{count}</em>
                </span>
              );
            })}
          </div>
        </div>

        {weeklyScores.length >= 2 && (
          <div className="lib-analytics-block lib-analytics-block--trend">
            <span className="lib-analytics-block-lbl">Weekly avg</span>
            <ScoreTrendChart points={weeklyScores} />
          </div>
        )}
      </div>
    </div>
  );
}
