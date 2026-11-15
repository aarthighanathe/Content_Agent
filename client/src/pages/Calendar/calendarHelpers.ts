import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { getJobs, getScheduledPosts, scheduleJob, unscheduleJob } from '../../api';
import type { PublishPlatform, ScheduledPost } from '../../types/scheduledPost';

export interface CalendarJobOutput {
  outputType: string;
  qualityScore?: number | null;
  content?: { totalScore?: number | null } | null;
}
export interface CalendarJob {
  id: string;
  topic: string;
  platform: string;
  status: string;
  tone?: string;
  createdAt: string;
  deleted?: number;
  outputs?: CalendarJobOutput[] | null;
}

// WHY: dateKey → jobId[] stays the in-memory shape even though persistence
// moved server-side: every consumer (CalendarGrid, CalendarSidebar,
// DayDetailPanel, SchedulePicker) already reads this grouped-by-day shape —
// keeping it means only the fetch/mutate layer below needed to change, not
// every component that renders the grid.
export type ScheduleMap = Record<string, string[]>; // dateKey → jobId[]

// WHY: local getFullYear/getMonth/getDate, not toISOString().slice(0,10):
// comparing against UTC would misclassify "today" as "already past" for any
// user west of UTC in the evening. Shared here (promoted out of a duplicate
// that lived only in Dashboard/NextScheduledCard.tsx) since a second page
// needing the exact same dateKey format was the signal that this belonged in
// one place rather than a third/fourth inline copy.
export function todayDateKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// WHY: Date#getTimezoneOffset is the offset at that instant, not "today".
// Scheduling across a DST change must send the offset of the target local
// date+hour or the server fires an hour off. `hour` is the publish hour.
export function timezoneOffsetMinutesForDateKey(dateKey: string, hour: number): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const h = Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.floor(hour))) : 9;
  if (!match) return new Date().getTimezoneOffset();
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, monthIndex, day, h, 0, 0, 0).getTimezoneOffset();
}

// WHY: drag/Schedule/Add omit platform. A job that already has a row must keep
// auto-publish. Explicit null is the day-panel Cancel and must clear.
export function scheduleFieldsForMove(
  existing: ScheduledPost | undefined,
  publishPlatform: PublishPlatform | null | undefined,
  publishHour: number | undefined,
): { publishPlatform?: PublishPlatform | null; publishHour?: number } {
  return {
    publishPlatform: publishPlatform !== undefined
      ? publishPlatform
      : existing?.publishPlatform,
    publishHour: publishHour !== undefined ? publishHour : existing?.publishHour,
  };
}

// WHY: local YYYY-MM for GET /scheduled-posts — server defaults to UTC month
// when omitted; Calendar must pass the visible local month or other months
// render empty after the API stopped returning all rows.
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonthKey(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  return monthKey(new Date(year, mon - 1 + delta, 1));
}

// WHY: current + next month: GET /scheduled-posts is month-scoped; Dashboard's
// "next up" card would miss a post on the 1st of next month if it only fetched
// the current month (or relied on the UTC default).
export async function fetchScheduledPostsCurrentAndNext(): Promise<{
  scheduledPosts: ScheduledPost[];
}> {
  const now = new Date();
  const current = monthKey(now);
  const next = monthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const [a, b] = await Promise.all([
    getScheduledPosts(current),
    getScheduledPosts(next),
  ]);
  const byJobId = new Map<string, ScheduledPost>();
  for (const row of [...a.scheduledPosts, ...b.scheduledPosts]) {
    byJobId.set(row.jobId, row);
  }
  return { scheduledPosts: Array.from(byJobId.values()) };
}

export function formatDateKey(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// WHY: 4 pages, and why that's a real (disclosed) limit: this predates server-side
// "give me all done jobs" support — pulling everything would mean an unbounded number of
// requests. 4 pages covers most accounts; `hitFetchCap` tells the caller when a 5th page
// might exist so the UI can disclose that older content isn't in the schedulable pool
// (audit #31) instead of silently omitting it.
const FETCH_PAGES = 4;

export interface CalendarJobsResult {
  jobs: CalendarJob[];
  // WHY: totalPages from the first fulfilled page, not re-derived from job counts:
  // JobListResponse (types/job.ts) already reports the server's real totalPages for the
  // account — comparing that to FETCH_PAGES is the actual ground truth for "is there more
  // beyond what we fetched," not a heuristic.
  hitFetchCap: boolean;
}

export async function fetchCalendarJobs(): Promise<CalendarJobsResult> {
  const pageNumbers = Array.from({ length: FETCH_PAGES }, (_, i) => i + 1);
  // WHY: counts:false: calendar only needs jobs + totalPages (the month grid).
  // The server's default per-platform pill aggregate is unused here — opting out
  // drops 4 grouped COUNT queries (one per fetched page) from every load (perf audit).
  const results = await Promise.allSettled(pageNumbers.map((p) => getJobs(p, { counts: false })));
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getJobs>>> => r.status === 'fulfilled',
  );
  if (fulfilled.length === 0) throw new Error('Failed to load calendar data');

  // WHY: guard fulfilled[0].value: Promise.allSettled filters by status='fulfilled', but the
  // value itself could still be malformed or null from the API. Accessing .totalPages without
  // this check would crash if the API returns an unexpected shape.
  const totalPages = fulfilled[0]?.value?.totalPages ?? 1;
  const hitFetchCap = totalPages > FETCH_PAGES;

  const all = fulfilled.flatMap((r) => r.value.jobs || []) as CalendarJob[];
  const jobs = all.filter((j) => !j.deleted && j.status === 'done');
  return { jobs, hitFetchCap };
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function getScore(job: CalendarJob): number | null {
  const c = job.outputs?.filter(o => o.outputType === 'critique')?.pop();
  return c?.content?.totalScore ?? c?.qualityScore ?? null;
}

export const SCHEDULE_QUERY_KEY = ['calendar', 'schedule'] as const;
// WHY: separate from the month-keyed grid query — unscheduled filtering must
// see every scheduled jobId, not only viewed±1 (far-future rows otherwise
// reappear as schedulable and a re-drag overwrites their date).
export const SCHEDULED_JOB_IDS_QUERY_KEY = ['calendar', 'scheduledJobIds'] as const;

// WHY: GET /scheduled-posts is month-scoped (omit → current UTC month only).
// Fan out a bounded local window around today so IDs are view-month-independent.
// Personal calendars are tiny; LIST_MAX_ROWS caps each month server-side.
const SCHEDULED_IDS_MONTH_RADIUS = 24;

export async function fetchAllScheduledJobIds(): Promise<string[]> {
  const now = new Date();
  const months: string[] = [];
  for (let delta = -SCHEDULED_IDS_MONTH_RADIUS; delta <= SCHEDULED_IDS_MONTH_RADIUS; delta++) {
    months.push(monthKey(new Date(now.getFullYear(), now.getMonth() + delta, 1)));
  }
  // WHY: allSettled — one month failure must not wipe the whole ID set.
  const results = await Promise.allSettled(months.map((m) => getScheduledPosts(m)));
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getScheduledPosts>>> =>
      r.status === 'fulfilled',
  );
  // WHY: throw on total failure — returning [] looked like "nothing scheduled"
  // and let far-future jobs flash as unscheduled forever.
  if (fulfilled.length === 0) {
    throw new Error('Failed to load scheduled job ids');
  }
  const ids = new Set<string>();
  for (const r of fulfilled) {
    for (const row of r.value.scheduledPosts) ids.add(row.jobId);
  }
  return Array.from(ids);
}

// WHY: shared by Calendar mutations + Result PostPanel so a schedule from either
// surface refreshes the month grid, the full-window ID set, and Dashboard next-up.
export function invalidateScheduleViews(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY }).catch(() => {});
  void queryClient.invalidateQueries({ queryKey: SCHEDULED_JOB_IDS_QUERY_KEY }).catch(() => {});
  // WHY: Dashboard "next up" reads ['dashboard','nextScheduled'], not the month grid.
  void queryClient.invalidateQueries({
    queryKey: ['dashboard', 'nextScheduled'],
  }).catch(() => {});
}

// WHY: month required: GET /scheduled-posts scopes to one YYYY-MM (defaults to
// current UTC month when omitted). Calendar passes the visible local month so
// prev/next month navigation still paints dots; allocate across a month
// boundary refetches via the month-keyed query.
export function useSchedule(month: string) {
  const queryClient = useQueryClient();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const scheduleQueryKey = [...SCHEDULE_QUERY_KEY, month] as const;

  const query = useQuery({
    queryKey: scheduleQueryKey,
    queryFn: async (): Promise<{
      map: ScheduleMap;
      postsByJobId: Record<string, ScheduledPost>;
    }> => {
      // WHY: the grid stays on the viewed month, but postsByJobId also keeps
      // the adjacent months so a drag still sees publishPlatform/hour. Farther
      // months are intentionally NOT folded in here — unscheduled filtering
      // uses scheduledJobIds (full-window query) instead.
      const [primary, prev, next] = await Promise.allSettled([
        getScheduledPosts(month),
        getScheduledPosts(shiftMonthKey(month, -1)),
        getScheduledPosts(shiftMonthKey(month, 1)),
      ]);
      if (primary.status !== 'fulfilled') {
        const reason = primary.reason;
        throw reason instanceof Error ? reason : new Error('Failed to load schedule');
      }
      const map: ScheduleMap = {};
      const postsByJobId: Record<string, ScheduledPost> = {};
      for (const row of primary.value.scheduledPosts) {
        (map[row.scheduledDate] ??= []).push(row.jobId);
        postsByJobId[row.jobId] = row;
      }
      const context = [
        ...(prev.status === 'fulfilled' ? prev.value.scheduledPosts : []),
        ...(next.status === 'fulfilled' ? next.value.scheduledPosts : []),
      ];
      for (const row of context) {
        if (!postsByJobId[row.jobId]) postsByJobId[row.jobId] = row;
      }
      return { map, postsByJobId };
    },
    // WHY: gate like Create/Library — avoid an unauthenticated fetch before Clerk hydrates.
    enabled: authLoaded && isSignedIn,
    // Poll every 30 seconds to check for auto-publish status changes
    refetchInterval: 30000,
  });

  // WHY: not polled with the month grid — IDs only change on schedule/unschedule
  // (invalidated below). Avoids re-fanning ±24 months every 30s.
  const idsQuery = useQuery({
    queryKey: SCHEDULED_JOB_IDS_QUERY_KEY,
    queryFn: fetchAllScheduledJobIds,
    enabled: authLoaded && isSignedIn,
    staleTime: 60_000,
  });

  const scheduleMutation = useMutation({
    mutationFn: (vars: {
      dateKey: string;
      jobId: string;
      publishPlatform?: PublishPlatform | null;
      publishHour?: number;
    }) =>
      // WHY: offset of this dateKey at the chosen hour, not "now" — DST can
      // change the offset before the scheduled day. Omitted hour uses 9,
      // matching the server default when the client has no stored hour.
      scheduleJob({
        jobId: vars.jobId,
        scheduledDate: vars.dateKey,
        publishPlatform: vars.publishPlatform,
        timezoneOffsetMinutes: timezoneOffsetMinutesForDateKey(
          vars.dateKey,
          vars.publishHour ?? 9,
        ),
        publishHour: vars.publishHour,
      }),
    onSuccess: () => {
      // WHY: invalidate all schedule months: allocate may place a job on a day
      // outside the currently viewed month (SchedulePicker).
      invalidateScheduleViews(queryClient);
    },
  });

  const unscheduleMutation = useMutation({
    mutationFn: (jobId: string) => unscheduleJob(jobId),
    onSuccess: () => {
      invalidateScheduleViews(queryClient);
    },
  });

  const schedule: ScheduleMap = useMemo(() => query.data?.map || {}, [query.data]);
  // WHY: a separate jobId-keyed map, not folded into ScheduleMap: ScheduleMap
  // (dateKey → jobId[]) is read by CalendarGrid/CalendarSidebar/SchedulePicker
  // for pure date-grouping — changing its value type would force every one
  // of those to handle a richer shape they don't need. Day detail and drag
  // preservation read publishPlatform/publishHour from this lookup, which
  // also includes the adjacent months (the grid map does not).
  const postsByJobId = useMemo(() => query.data?.postsByJobId || {}, [query.data]);
  // WHY: union with postsByJobId — if the wide IDs fetch partially fails, the
  // viewed±1 rows still keep those jobs out of the unscheduled sidebar.
  const scheduledJobIds = useMemo(() => {
    const ids = new Set<string>(idsQuery.data ?? []);
    for (const id of Object.keys(postsByJobId)) ids.add(id);
    return ids;
  }, [idsQuery.data, postsByJobId]);

  return {
    schedule,
    postsByJobId,
    scheduledJobIds,
    // WHY: isPending, not isLoading: while Clerk hydrates the query is disabled
    // and isLoading is false — that would flash an empty calendar grid.
    // WHY: include idsQuery — otherwise far-future scheduled jobs briefly flash
    // as unscheduled before the ID set resolves.
    isLoading: query.isPending || idsQuery.isPending,
    // WHY: include idsQuery — total ID-fetch failure used to look like a healthy
    // empty calendar (scheduledJobIds = []) instead of the same error as schedule.
    isError: query.isError || idsQuery.isError,
    refetch: (): Promise<unknown> =>
      Promise.all([query.refetch(), idsQuery.refetch()]),
    // WHY: publishHour optional: omit → server default 9am local (L10/F12).
    allocate: (
      dateKey: string,
      jobId: string,
      publishPlatform?: PublishPlatform | null,
      publishHour?: number,
    ) => scheduleMutation.mutateAsync({ dateKey, jobId, publishPlatform, publishHour }),
    removeFromSchedule: (jobId: string) => unscheduleMutation.mutateAsync(jobId),
    isMutating: scheduleMutation.isPending || unscheduleMutation.isPending,
  };
}
