import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

// WHY dateKey → jobId[] stays the in-memory shape even though persistence
// moved server-side: every consumer (CalendarGrid, CalendarSidebar,
// DayDetailPanel, SchedulePicker) already reads this grouped-by-day shape —
// keeping it means only the fetch/mutate layer below needed to change, not
// every component that renders the grid.
export type ScheduleMap = Record<string, string[]>; // dateKey → jobId[]

// WHY local getFullYear/getMonth/getDate, not toISOString().slice(0,10):
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

export function formatDateKey(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// WHY 4 pages, and why that's a real (disclosed) limit: this predates server-side
// "give me all done jobs" support — pulling everything would mean an unbounded number of
// requests. 4 pages covers most accounts; `hitFetchCap` tells the caller when a 5th page
// might exist so the UI can disclose that older content isn't in the schedulable pool
// (audit #31) instead of silently omitting it.
const FETCH_PAGES = 4;

export interface CalendarJobsResult {
  jobs: CalendarJob[];
  // WHY totalPages from the first fulfilled page, not re-derived from job counts:
  // JobListResponse (types/job.ts) already reports the server's real totalPages for the
  // account — comparing that to FETCH_PAGES is the actual ground truth for "is there more
  // beyond what we fetched," not a heuristic.
  hitFetchCap: boolean;
}

export async function fetchCalendarJobs(): Promise<CalendarJobsResult> {
  const pageNumbers = Array.from({ length: FETCH_PAGES }, (_, i) => i + 1);
  // WHY counts:false: calendar only needs jobs + totalPages (the month grid).
  // The server's default per-platform pill aggregate is unused here — opting out
  // drops 4 grouped COUNT queries (one per fetched page) from every load (perf audit).
  const results = await Promise.allSettled(pageNumbers.map((p) => getJobs(p, { counts: false })));
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getJobs>>> => r.status === 'fulfilled',
  );
  if (fulfilled.length === 0) throw new Error('Failed to load calendar data');

  // WHY guard fulfilled[0].value: Promise.allSettled filters by status='fulfilled', but the
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

// ── Server-synced schedule (replaces the old localStorage SCHEDULE_KEY) ────
export const SCHEDULE_QUERY_KEY = ['calendar', 'schedule'] as const;

// WHY no `month` param: unlike fetchCalendarJobs's paginated cap, scheduled
// posts are a much smaller row set per user (one per scheduled job) — fetching
// all of them in one request lets Calendar.tsx's allocate() move a job across
// month boundaries without a refetch, and lets Dashboard's NextScheduledCard
// search across months for the nearest future date without its own endpoint.
export function useSchedule() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SCHEDULE_QUERY_KEY,
    queryFn: async (): Promise<{ map: ScheduleMap; postsByJobId: Record<string, ScheduledPost> }> => {
      const { scheduledPosts } = await getScheduledPosts();
      const map: ScheduleMap = {};
      const postsByJobId: Record<string, ScheduledPost> = {};
      for (const row of scheduledPosts) {
        (map[row.scheduledDate] ??= []).push(row.jobId);
        postsByJobId[row.jobId] = row;
      }
      return { map, postsByJobId };
    },
    // Poll every 30 seconds to check for auto-publish status changes
    refetchInterval: 30000,
  });

  const scheduleMutation = useMutation({
    mutationFn: (vars: { dateKey: string; jobId: string; publishPlatform?: PublishPlatform }) =>
      scheduleJob({ jobId: vars.jobId, scheduledDate: vars.dateKey, publishPlatform: vars.publishPlatform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY }).catch(() => {});
    },
  });

  const unscheduleMutation = useMutation({
    mutationFn: (jobId: string) => unscheduleJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY }).catch(() => {});
    },
  });

  const schedule: ScheduleMap = useMemo(() => query.data?.map || {}, [query.data]);
  // WHY a separate jobId-keyed map, not folded into ScheduleMap: ScheduleMap
  // (dateKey → jobId[]) is read by CalendarGrid/CalendarSidebar/SchedulePicker
  // for pure date-grouping — changing its value type would force every one
  // of those to handle a richer shape they don't need. DayDetailPanel is the
  // only consumer that needs publishPlatform/publishStatus per job, so it
  // gets its own lookup instead.
  const postsByJobId = useMemo(() => query.data?.postsByJobId || {}, [query.data]);

  return {
    schedule,
    postsByJobId,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    // WHY (dateKey, jobId, publishPlatform?) => Promise<void>: server-side
    // upsert-on-jobId already enforces "remove from any other date first"
    // (the old client-side loop in allocate() is no longer needed, the DB's
    // unique constraint on jobId is the same invariant). publishPlatform is
    // optional — omitting it keeps a job reminder-only, matching the pre-
    // auto-publish behavior exactly.
    allocate: (dateKey: string, jobId: string, publishPlatform?: PublishPlatform) =>
      scheduleMutation.mutateAsync({ dateKey, jobId, publishPlatform }),
    removeFromSchedule: (jobId: string) => unscheduleMutation.mutateAsync(jobId),
    isMutating: scheduleMutation.isPending || unscheduleMutation.isPending,
  };
}
