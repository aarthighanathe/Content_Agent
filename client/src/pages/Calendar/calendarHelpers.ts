import { getJobs } from '../../api';

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

export const SCHEDULE_KEY = 'content_schedule_v1';
export type ScheduleMap = Record<string, string[]>; // dateKey → jobId[]

export function loadSchedule(): ScheduleMap {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}'); } catch { return {}; }
}
export function saveSchedule(s: ScheduleMap) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s));
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
  const results = await Promise.allSettled(pageNumbers.map((p) => getJobs(p)));
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getJobs>>> => r.status === 'fulfilled',
  );
  if (fulfilled.length === 0) throw new Error('Failed to load calendar data');

  const totalPages = fulfilled[0].value.totalPages ?? 1;
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
