import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { getScheduledPosts } from '../../api';
import { platformMeta } from '../../lib/platformMeta';
import { SkeletonBlock } from '../../components/SkeletonCard';
import { todayDateKey, formatDateKey } from '../Calendar/calendarHelpers';

// WHY its own query + component (not reusing Calendar's useSchedule hook):
// Dashboard only needs the single nearest-future scheduled post plus that
// one job's topic/platform — pulling in Calendar's whole ScheduleMap plus a
// second N-job fetch (fetchCalendarJobs's 4-page pull) would be a much
// heavier fetch for a small "next up" card. GET /scheduled-posts with no
// `month` already returns all of the user's scheduled posts cheaply, and now
// includes each row's job topic/platform inline (server-side join) — this no
// longer needs a second, sequential GET /jobs/:jobId per mount just to show
// a topic string.
export function NextScheduledCard() {
  // WHY gated on authLoaded && isSignedIn: same Clerk-session-not-hydrated-yet
  // race as Dashboard.tsx's own queries — see that file's matching comment.
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const scheduleQuery = useQuery({
    queryKey: ['dashboard', 'nextScheduled'],
    queryFn: () => getScheduledPosts(),
    enabled: authLoaded && isSignedIn,
  });

  const nextEntry = useMemo(() => {
    const rows = scheduleQuery.data?.scheduledPosts ?? [];
    const today = todayDateKey();
    return rows
      .filter((r) => r.scheduledDate >= today)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0] ?? null;
  }, [scheduleQuery.data]);

  const loading = scheduleQuery.isLoading;
  // WHY treat a row with no joined job as "nothing to show" rather than
  // rendering a broken card: the server only omits `job` when the
  // scheduled_posts row outlived its job (e.g. deleted before the cleanup in
  // jobs/manage.ts's DELETE handler ran, or from data scheduled before that
  // cleanup existed) — showing a "View" link that 404s on click would be
  // worse than the plain empty state.
  const orphaned = !!nextEntry && !nextEntry.job;

  // WHY silently render the empty state on error, not an ErrorState block:
  // this is a small "nice to have" awareness card, not essential dashboard
  // data — matching InsightsCards.tsx's own precedent of degrading quietly
  // when one of several independent queries fails rather than blocking the
  // whole page render.
  if (scheduleQuery.isError) return null;

  return (
    <div
      className="card"
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
        }}
      >
        <CalendarClock size={17} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <>
            <SkeletonBlock width="55%" height={11} radius={5} style={{ marginBottom: 6 }} />
            <SkeletonBlock width="35%" height={9} radius={4} />
          </>
        ) : !nextEntry || orphaned ? (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              No upcoming scheduled posts
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Plan your next post on the Calendar
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextEntry.job?.topic || 'Scheduled post'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}>
              {formatDateKey(nextEntry.scheduledDate)}
              {nextEntry.job?.platform && (
                <>
                  <span>·</span>
                  {platformMeta[nextEntry.job.platform]?.label || nextEntry.job.platform}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <Link
        to={nextEntry && !orphaned ? `/result/${nextEntry.jobId}` : '/calendar'}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          fontSize: 11.5, color: 'color-mix(in srgb, var(--accent) 65%, transparent)',
          textDecoration: 'none',
        }}
      >
        {nextEntry && !orphaned ? 'View' : 'Open calendar'} <ChevronRight size={12} />
      </Link>
    </div>
  );
}
