import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Sparkles } from 'lucide-react';
import { getJobs, getProfile, deleteJob, getScheduledPosts, getFeedMonitors } from '../api';
import { ErrorState } from '../components/ErrorState';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { RecentGenerations } from './Dashboard/RecentGenerations';
import { InsightsCards } from './Dashboard/InsightsCards';
import { StatsOverview } from './Dashboard/StatsOverview';
import { QualityTrendChart } from './Dashboard/QualityTrendChart';
import { PredictionInsights } from './Dashboard/PredictionInsights';
import { NextScheduledCard } from './Dashboard/NextScheduledCard';
import { FeedHealthCard } from './Dashboard/FeedHealthCard';
import { DashboardSkeleton } from './Dashboard/DashboardSkeleton';
import { DASHBOARD_STYLES } from './Dashboard/dashboardStyles';
import type { DashboardJob } from './Dashboard/dashboardTypes';
import { getContentScores } from './Dashboard/dashboardTypes';
import type { ProfileStats } from '../types/api';

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

const DEFAULT_STATS: ProfileStats = { totalPosts: 0, avgScore: 0, mostUsedPlatform: 'none' };

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // WHY gated on authLoaded && isSignedIn: same race AuthLayout.tsx's own
  // profile query guards against — Dashboard mounts in the same render pass
  // as AuthLayout (nested route via <Outlet/>, not after its effects run), so
  // without this gate these queries could fire before window.Clerk.session is
  // hydrated, get no Authorization header, and 401 into a retry loop that
  // leaves the page's skeletons stuck for several seconds on a hard refresh.
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const jobsQuery = useQuery({
    queryKey: ['dashboard', 'jobs'],
    queryFn: () => getJobs(1),
    enabled: authLoaded && isSignedIn,
  });
  const profileQuery = useQuery({
    queryKey: ['dashboard', 'profile'],
    queryFn: getProfile,
    enabled: authLoaded && isSignedIn,
  });
  // WHY the same keys as NextScheduledCard / FeedHealthCard: those cards own
  // the UI, but the page has to know when they settle so it can reveal every
  // section in one paint. React Query dedupes the request.
  const scheduleQuery = useQuery({
    queryKey: ['dashboard', 'nextScheduled'],
    queryFn: () => getScheduledPosts(),
    enabled: authLoaded && isSignedIn,
  });
  const feedQuery = useQuery({
    queryKey: ['dashboard', 'feedMonitors'],
    queryFn: getFeedMonitors,
    enabled: authLoaded && isSignedIn,
    staleTime: 60_000,
  });

  // WHY: memoize on jobsQuery.data — `data?.jobs || []` would otherwise
  // create a new [] literal every render, breaking the useMemo below that
  // depends on `jobs` (it would recompute even when data hasn't changed).
  const jobs: DashboardJob[] = useMemo(() => jobsQuery.data?.jobs || [], [jobsQuery.data]);
  const stats: ProfileStats = profileQuery.data?.stats || DEFAULT_STATS;
  const contentDna = profileQuery.data?.contentDna || null;

  // WHY isPending, not isLoading: while Clerk is still hydrating these queries
  // are disabled, and isLoading is false in that state. The page used to paint
  // zeros and an empty job list, then swap in skeletons, then fill each card
  // as its own request returned.
  const pagePending = jobsQuery.isPending
    || profileQuery.isPending
    || scheduleQuery.isPending
    || feedQuery.isPending;
  // WHY per-query, not one combined isError: audit #26 — a single `isError` wiped the
  // entire content area even when only one of the two independent queries failed. Each
  // section below only replaces its own area with ErrorState; the full-page fallback
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

  return (
    <div className="dashboard-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <style>{DASHBOARD_STYLES}</style>
      <style>{`
        /* WHY scoped to .dash-header, not the shared .section-header class: the global
           .section-header mobile rule stacks title-above-button, which Brand/Create rely
           on. Dashboard's title + "New content" button both fit on one line even on
           small screens, so this overrides just this page's header back to a row. */
        @media (max-width: 768px) {
          .dash-header {
            flex-direction: row !important;
            align-items: center !important;
          }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="section-header dash-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)', margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
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

      {pagePending && <DashboardSkeleton />}

      {!pagePending && !bothFailed && (
        <>
          {/* ── Stats grid + Content DNA bubble (profileQuery-scoped) ── */}
          <StatsOverview
            isError={profileQuery.isError}
            isLoading={profileQuery.isPending}
            onRetry={handleRetryProfile}
            totalPosts={stats.totalPosts}
            avgScore={stats.avgScore}
            mostUsedPlatform={stats.mostUsedPlatform}
            contentDna={contentDna}
          />

          {/* ── Next scheduled post (Calendar-awareness card) ── */}
          <NextScheduledCard />

          {/* ── Feed monitor health (F9) — hidden when user has zero monitors ── */}
          <FeedHealthCard />

          {/* ── Recent generations (jobsQuery-scoped) ── */}
          {jobsQuery.isError ? (
            <ErrorState message="We couldn't load your recent generations. Please try again." onRetry={handleRetryJobs} />
          ) : (
            <RecentGenerations
              jobs={jobs}
              loading={jobsQuery.isPending}
              onNavigate={navigate}
              onRequestDelete={setDeleteConfirm}
            />
          )}

          {/* ── Quality trend chart + predicted-engagement card (profileQuery-scoped) ── */}
          <div className="grid-halves" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <QualityTrendChart
              loading={profileQuery.isPending}
              dimensionAverages={profileQuery.isError ? null : stats.dimensionAverages}
              dimensionTrend={profileQuery.isError ? [] : stats.dimensionTrend}
            />
            <PredictionInsights
              loading={profileQuery.isPending}
              predictionTierCounts={profileQuery.isError ? undefined : stats.predictionTierCounts}
              latestPredictionTopReason={profileQuery.isError ? null : stats.latestPredictionTopReason}
            />
          </div>

          {/* ── Bottom cards — degrades gracefully if one query failed (empty tips/no
              breakdown) rather than needing its own ErrorState, since neither half is
              essential to the other rendering usefully. ── */}
          <InsightsCards
            loading={false}
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
