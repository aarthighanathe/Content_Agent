import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { Sparkles, LayoutGrid, Target, Layers, Hexagon } from 'lucide-react';
import { getJobs, getProfile, deleteJob } from '../api';
import { ErrorState } from '../components/ErrorState';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { SkeletonBlock } from '../components/SkeletonCard';
import { RecentGenerations } from './Dashboard/RecentGenerations';
import { InsightsCards } from './Dashboard/InsightsCards';
import type { DashboardJob, PlatformBreakdownItem } from './Dashboard/dashboardTypes';
import { getContentScores } from './Dashboard/dashboardTypes';

interface StatCard {
  Icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  color: string;
  bg: string;
  border: string;
  suffix?: string;
  highlight?: boolean;
}

const SCORE_TIPS: Record<string, string> = {
  hookStrength:       'Your hooks score low — open with a bold question or surprising stat to grab attention in the first second',
  platformCompliance: 'Platform fit could improve — double-check character limits and hashtag counts for each platform you use',
  brandVoiceMatch:    'Brand voice consistency is drifting — add your key tones and phrases to avoid in Brand Settings',
  valueDelivery:      'Value delivery is your weakest area — make every post teach something specific or solve a real problem',
  ctaClarity:         'Your CTAs need sharpening — use direct action verbs like "Save this", "Follow for more", or "Reply below"',
};

const DEFAULT_TIPS = [
  'Add a hook in your first slide to boost engagement by up to 3×',
  'Set up Brand Settings to improve voice consistency across all generations',
  'Try a LinkedIn Post next — it takes under 30 seconds to set up',
];

const DEFAULT_STATS = { totalPosts: 0, avgScore: 0, bestPlatform: 'none' };

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ['dashboard', 'jobs'],
    queryFn: () => getJobs(1),
  });
  const profileQuery = useQuery({
    queryKey: ['dashboard', 'profile'],
    queryFn: getProfile,
  });

  // WHY: memoize on jobsQuery.data — `data?.jobs || []` would otherwise
  // create a new [] literal every render, breaking the useMemo below that
  // depends on `jobs` (it would recompute even when data hasn't changed).
  const jobs: DashboardJob[] = useMemo(() => jobsQuery.data?.jobs || [], [jobsQuery.data]);
  const stats: {
    totalPosts: number; avgScore: number; bestPlatform: string;
    platformBreakdown?: PlatformBreakdownItem[]; quickTips?: string[];
  } = profileQuery.data?.stats || DEFAULT_STATS;
  const contentDna = profileQuery.data?.contentDna || null;

  const loading = jobsQuery.isLoading || profileQuery.isLoading;
  // WHY per-query, not one combined isError: audit #26 — a single `isError` wiped the
  // entire content area even when only one of the two independent queries failed. Each
  // section below now only replaces its own area with ErrorState; the full-page fallback
  // is reserved for the (rarer) case where both fail at once.
  const bothFailed = jobsQuery.isError && profileQuery.isError;

  const [deleteError, setDeleteError] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] });
      setDeleteConfirm(null);
      setDeleteError('');
    },
    onError: () => {
      setDeleteError('Failed to delete — please try again.');
    },
  });

  function handleRetryAll(): void {
    jobsQuery.refetch().catch(() => {});
    profileQuery.refetch().catch(() => {});
  }

  function handleRetryJobs(): void {
    jobsQuery.refetch().catch(() => {});
  }

  function handleRetryProfile(): void {
    profileQuery.refetch().catch(() => {});
  }

  function handleDelete(jobId: string): void {
    deleteMutation.mutate(jobId);
  }

  const personalizedTips = useMemo(() => {
    const sums: Record<string, number>  = { hookStrength: 0, platformCompliance: 0, brandVoiceMatch: 0, valueDelivery: 0, ctaClarity: 0 };
    const counts: Record<string, number> = { ...sums };

    jobs.forEach((job) => {
      const critique = job.outputs?.find((o) => o.outputType === 'critique');
      const scores = getContentScores(critique?.content) || critique?.scores;
      if (scores) {
        Object.keys(sums).forEach((k) => {
          if (scores[k] != null) { sums[k] += scores[k]; counts[k]++; }
        });
      }
    });

    const avgScores = Object.keys(sums).map((k) => ({
      key: k,
      avg: counts[k] > 0 ? sums[k] / counts[k] : 20,
      hasData: counts[k] > 0,
    }));

    const withData = avgScores.filter((s) => s.hasData).sort((a, b) => a.avg - b.avg);
    if (withData.length === 0) return stats.quickTips?.length ? stats.quickTips : DEFAULT_TIPS;

    const tips = withData.slice(0, 3).map((s) => SCORE_TIPS[s.key]).filter(Boolean);
    while (tips.length < 3) tips.push(DEFAULT_TIPS[tips.length]);
    return tips;
  }, [jobs, stats.quickTips]);

  const statCards: StatCard[] = [
    {
      Icon: LayoutGrid,
      label: 'Total posts',
      value: String(stats.totalPosts),
      note: 'All time',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.10)',
      border: 'rgba(245,158,11,0.22)',
    },
    {
      Icon: Target,
      label: 'Avg quality score',
      value: String(stats.avgScore),
      suffix: '/100',
      note: stats.avgScore >= 70 ? 'Above average' : 'Keep improving',
      color: '#A78BFA',
      bg: 'rgba(139,92,246,0.10)',
      border: 'rgba(139,92,246,0.22)',
      highlight: true,
    },
    {
      Icon: Layers,
      label: 'Best platform',
      value: stats.bestPlatform === 'none' ? '—' : stats.bestPlatform.replace('_', ' '),
      note: '',
      color: '#22D3EE',
      bg: 'rgba(34,211,238,0.10)',
      border: 'rgba(34,211,238,0.22)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <style>{`
        .dash-job-row {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px 16px;
          background: #07071C;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 13px;
          cursor: pointer;
          transition: background .18s, border-color .2s, box-shadow .2s;
          overflow: hidden;
        }
        .dash-job-row:hover {
          background: #0A0A22;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }

        .dash-view-all {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(245,158,11,0.04);
          border: 1px solid rgba(245,158,11,0.12);
          border-radius: 12px;
          color: rgba(245,158,11,0.65);
          font-size: 12.5px;
          font-weight: 500;
          text-decoration: none;
          transition: all .18s;
        }
        .dash-view-all:hover {
          background: rgba(245,158,11,0.08);
          border-color: rgba(245,158,11,0.24);
          color: #F59E0B;
        }

        .dash-stat-card {
          background: #07071C;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 22px 20px;
          position: relative;
          overflow: hidden;
          transition: border-color .22s, box-shadow .22s;
        }
        .dash-stat-card:hover {
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 8px 40px rgba(0,0,0,0.45);
        }

        .kebab-menu {
          position: absolute;
          right: 0;
          top: 34px;
          width: 188px;
          background: #0D0D26;
          border: 1px solid rgba(124,58,237,0.22);
          border-radius: 12px;
          box-shadow: 0 18px 56px rgba(0,0,0,0.7);
          z-index: 20;
          overflow: hidden;
        }

        @media (max-width:480px) {
          .dash-job-row { padding:11px 12px; gap:8px; }
          .dash-stat-card { padding:18px 16px; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="section-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 3, textTransform: 'uppercase', color: '#A78BFA', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 1, background: '#A78BFA', display: 'inline-block' }} />
            Overview
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'rgba(255,255,255,0.92)', margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            Your content at a glance
          </p>
        </div>
        <Link to="/create" className="btn-primary" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Sparkles size={14} /> New content
        </Link>
      </div>

      {bothFailed && (
        <ErrorState message="We couldn't load your dashboard data. Please try again." onRetry={handleRetryAll} />
      )}

      {!bothFailed && (
        <>
          {/* ── Stats grid + Content DNA bubble (profileQuery-scoped) ── */}
          {profileQuery.isError ? (
            <ErrorState message="We couldn't load your stats. Please try again." onRetry={handleRetryProfile} />
          ) : (
            <>
              <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {statCards.map((stat) => (
                  <div key={stat.label} className="dash-stat-card">
                    {/* Top accent line */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${stat.color},transparent 80%)`, borderRadius: '16px 16px 0 0' }} />

                    {/* Icon */}
                    <div style={{ width: 40, height: 40, background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, marginBottom: 14 }}>
                      <stat.Icon size={17} />
                    </div>

                    {/* Label */}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: "var(--font-mono)", letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                      {stat.label}
                    </div>

                    {/* Value */}
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(26px,5vw,38px)', fontWeight: 700, lineHeight: 1, textTransform: 'capitalize', color: stat.highlight ? stat.color : 'rgba(255,255,255,0.92)' }}>
                      {profileQuery.isLoading ? <SkeletonBlock width={80} height={32} radius={6} /> : (
                        <>
                          {stat.value}
                          {stat.suffix && (
                            <small style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontFamily: "var(--font-sans)", fontWeight: 400 }}>
                              {stat.suffix}
                            </small>
                          )}
                        </>
                      )}
                    </div>

                    {stat.note && !profileQuery.isLoading && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.26)', marginTop: 6 }}>
                        {stat.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Content DNA bubble ── */}
              {!profileQuery.isLoading && (
                <Link
                  to="/brand"
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                    background: contentDna
                      ? 'linear-gradient(135deg,rgba(34,211,238,0.05),rgba(139,92,246,0.05))'
                      : 'rgba(245,158,11,0.03)',
                    border: `1px solid ${contentDna ? 'rgba(34,211,238,0.2)' : 'rgba(245,158,11,0.18)'}`,
                    borderRadius: 13, transition: 'border-color .2s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = contentDna ? 'rgba(34,211,238,0.35)' : 'rgba(245,158,11,0.32)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = contentDna ? 'rgba(34,211,238,0.2)' : 'rgba(245,158,11,0.18)')}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: contentDna ? 'rgba(34,211,238,0.1)' : 'rgba(245,158,11,0.08)', border: `1px solid ${contentDna ? 'rgba(34,211,238,0.25)' : 'rgba(245,158,11,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: contentDna ? '#22D3EE' : '#F59E0B' }}>
                      <Hexagon size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {contentDna ? (
                        <>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.82)', lineHeight: 1.3 }}>
                            Content DNA active
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(34,211,238,0.7)', fontFamily: "var(--font-mono)", marginTop: 2 }}>
                            {[contentDna.hookPattern, contentDna.vocabularyLevel, contentDna.ctaStyle].filter(Boolean).join(' · ') || 'Writing fingerprint captured'}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* WHY amber accent + Recommended badge (#41): the "not set up"
                              state was near-invisible (low-contrast text, rgba(255,255,255,0.06)
                              border) despite Content DNA being one of the app's most
                              differentiating features. Slightly strengthening the border to amber
                              and adding a muted badge gives it enough presence to be noticed
                              without becoming a disruptive full-page CTA. */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.72)', lineHeight: 1.3 }}>
                              Analyze your content DNA
                            </div>
                            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 20, padding: '1px 7px', letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                              Recommended
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: "var(--font-mono)", marginTop: 0 }}>
                            Capture your writing fingerprint for more consistent AI output
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: contentDna ? 'rgba(34,211,238,0.5)' : 'rgba(245,158,11,0.6)', fontFamily: "var(--font-mono)", whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {contentDna ? 'View →' : 'Set up →'}
                    </div>
                  </div>
                </Link>
              )}
            </>
          )}

          {/* ── Recent generations (jobsQuery-scoped) ── */}
          {jobsQuery.isError ? (
            <ErrorState message="We couldn't load your recent generations. Please try again." onRetry={handleRetryJobs} />
          ) : (
            <RecentGenerations
              jobs={jobs}
              loading={jobsQuery.isLoading}
              onNavigate={navigate}
              onRequestDelete={setDeleteConfirm}
            />
          )}

          {/* ── Bottom cards — degrades gracefully if one query failed (empty tips/no
              breakdown) rather than needing its own ErrorState, since neither half is
              essential to the other rendering usefully. ── */}
          <InsightsCards
            loading={loading}
            platformBreakdown={profileQuery.isError ? undefined : stats.platformBreakdown}
            personalizedTips={personalizedTips}
            hasCritiqueData={jobs.some((j) => j.outputs?.find((o) => o.outputType === 'critique'))}
          />
        </>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <ConfirmDeleteModal
          title="Delete this job?"
          message="This action cannot be undone."
          onCancel={() => { setDeleteConfirm(null); setDeleteError(''); }}
          onConfirm={() => handleDelete(deleteConfirm)}
          isPending={deleteMutation.isPending}
          error={deleteError}
        />
      )}
    </div>
  );
}
