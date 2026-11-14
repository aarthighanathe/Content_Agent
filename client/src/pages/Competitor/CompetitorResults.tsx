import type { ReactElement } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import { TrendingUp, Target, Lightbulb, AlertCircle, Sparkles } from 'lucide-react';
import { navigateToCreate } from '../../lib/utils';
import type { AnalyzeCompetitorResponse, CompetitorPlatform } from '../../types/social';
import type { Profile } from '../../types/api';
import { BenchmarkCard } from './BenchmarkCard';
import { competitorPlatformLabel } from './platforms';
import { CardHeader } from '../Dashboard/CardHeader';

const engagementColor = {
  high:   'var(--color-success)',
  medium: 'var(--accent)',
  low:    'var(--color-error)',
};

interface Props {
  analysis: NonNullable<AnalyzeCompetitorResponse['analysis']>;
  result: AnalyzeCompetitorResponse;
  platform: CompetitorPlatform | '';
  industry: string;
  navigate: NavigateFunction;
  profileQuery: Pick<UseQueryResult<Profile>, 'isLoading' | 'isError' | 'data'>;
}

export function CompetitorResults({
  analysis,
  result,
  platform,
  industry,
  navigate,
  profileQuery,
}: Props): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'comp-fadeUp .3s ease both' }}>
              <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRadius: 14, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: 'var(--accent)', letterSpacing: 1.5, textTransform: 'uppercase' }}>@{result?.handle}</div>
                      {(result?.platform || platform) && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase',
                          color: 'var(--text-muted)', border: '1px solid var(--rule)', borderRadius: 20,
                          padding: '2px 8px',
                        }}>
                          {competitorPlatformLabel(result?.platform || platform)}
                        </span>
                      )}
                    </div>
                    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{analysis.brandName}</h2>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>{analysis.estimatedNiche}</p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, paddingTop: 14, borderTop: '1px solid var(--rule)' }}>
                  {analysis.keyTakeaway}
                </p>
                {analysis.dataQualityNote && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    {analysis.dataQualityNote}
                  </p>
                )}
              </div>
    
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="comp-grid">
                <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 14, padding: 20 }}>
                  <CardHeader icon={<TrendingUp size={14} style={{ color: 'var(--accent)' }} />} title="Top Content Themes" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(analysis.topThemes || []).map((t) => {
                      const engagementLevel = t.engagementLevel || 'medium';
                      const color = engagementColor[engagementLevel] || 'var(--accent)';
                      return (
                        <div key={`${t.theme}|${t.frequency}|${t.engagementLevel}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.theme}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", marginTop: 1 }}>{t.frequency}</div>
                          </div>
                          <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, padding: '2px 8px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {engagementLevel}
                          </span>
                        </div>
                      );
                    })}
                    {(!analysis.topThemes || analysis.topThemes.length === 0) && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No theme data available</div>
                    )}
                  </div>
                </div>
    
                {/* WHY: var(--accent-2): decorative card-icon color for visual distinction between
                    the Top Themes / Content Patterns cards — not a platform brand, status color,
                    or the badge-purple category-tag system, so it follows the active theme. */}
                <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 14, padding: 20 }}>
                  <CardHeader icon={<Target size={14} style={{ color: 'var(--accent-2)' }} />} accentVar="--accent-2" title="Content Patterns" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {analysis.contentPatterns ? [
                      { label: 'Format', val: analysis.contentPatterns.formatPreference },
                      { label: 'Hook style', val: analysis.contentPatterns.hookStyle },
                      { label: 'CTA pattern', val: analysis.contentPatterns.ctaPattern },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)', fontFamily: "var(--font-mono)", fontSize: 10, minWidth: 80, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                        <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{val}</span>
                      </div>
                    )) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No pattern data available</div>
                    )}
                  </div>
                </div>
              </div>
    
              {/* How You Compare — benchmarks the user's own hook strength (from
                  GET /api/users/me, same aggregation Dashboard/Brand use) against
                  this competitor's analysis. avgScore is deliberately not passed:
                  Dashboard's StatsOverview already shows it, and there's no
                  competitor-side equivalent to compare it against here (see
                  BenchmarkCard's own WHY comment). Full-width: it's a single card
                  in an otherwise 2-up grid, so spanning avoids leaving it stranded
                  alone in a half-empty row. */}
              <BenchmarkCard
                isLoading={profileQuery.isLoading}
                isError={profileQuery.isError}
                totalPosts={profileQuery.data?.stats?.totalPosts}
                dimensionAverages={profileQuery.data?.stats?.dimensionAverages}
                analysis={analysis}
              />
    
              <div style={{ background: 'var(--bg-raised)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 14, padding: 20 }}>
                <CardHeader icon={<AlertCircle size={14} style={{ color: 'var(--color-success)' }} />} title="Content Gaps — Your Opportunity" />
                <div style={{ display: 'grid', gridTemplateColumns: (analysis.contentGaps || []).length > 1 ? '1fr 1fr' : '1fr', gap: 12 }} className="comp-angles-grid">
                  {(analysis.contentGaps || []).map((g) => (
                    <div
                      key={`${g.gap}|${g.opportunity}`}
                      style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 10, padding: '14px' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)', marginBottom: 5, lineHeight: 1.3 }}>{g.gap}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>{g.opportunity}</div>
                      <button
                        onClick={() => navigateToCreate(navigate, {
                          topic: g.opportunity || g.gap || '',
                          industry: industry.trim() || undefined,
                          competitorContext: [g.gap, g.opportunity].filter(Boolean).join(': '),
                          competitorAnalysisId: result?.analysisId,
                        })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 7, padding: '5px 11px', color: 'var(--color-success)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.18)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.1)'; }}
                      >
                        <Sparkles size={11} /> Create content →
                      </button>
                    </div>
                  ))}
                  {(!analysis.contentGaps || analysis.contentGaps.length === 0) && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No gap data available</div>
                  )}
                </div>
              </div>
    
              {/* WHY: var(--accent-2): same decorative-card-accent reasoning as "Content Patterns"
                  above — violet here was chosen for visual variety between cards, not because
                  this represents the badge-purple hashtag/category system or a platform brand. */}
              <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent-2) 18%, transparent)', borderRadius: 14, padding: 20 }}>
                <CardHeader icon={<Lightbulb size={14} style={{ color: 'var(--accent-2)' }} />} accentVar="--accent-2" title="Content Angles to Beat Them" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="comp-angles-grid">
                  {(analysis.suggestedAngles || []).map((a) => (
                    <div
                      key={`${a.angle}|${a.rationale}`}
                      style={{ background: 'color-mix(in srgb, var(--accent-2) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 15%, transparent)', borderRadius: 10, padding: '14px' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{a.angle}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>{a.rationale}</div>
                      <button
                        onClick={() => navigateToCreate(navigate, {
                          topic: a.angle || '',
                          industry: industry.trim() || undefined,
                          competitorContext: [a.angle, a.rationale].filter(Boolean).join(': '),
                          competitorAnalysisId: result?.analysisId,
                        })}
                        style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'color-mix(in srgb, var(--accent-2) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 25%, transparent)', borderRadius: 7, padding: '5px 11px', color: 'var(--accent-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent-2) 20%, transparent)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent-2) 12%, transparent)'; }}
                      >
                        <Sparkles size={11} /> Create content →
                      </button>
                    </div>
                  ))}
                  {(!analysis.suggestedAngles || analysis.suggestedAngles.length === 0) && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No angle suggestions available</div>
                  )}
                </div>
              </div>
            </div>
  );
}
