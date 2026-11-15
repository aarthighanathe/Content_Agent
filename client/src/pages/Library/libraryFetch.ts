import { getJobStatus, getJobs, getCollectionJobs, type GetJobsOptions } from '../../api';
import type { LibraryJob, SortKey } from './libraryHelpers';

// WHY: capped: Library list + CSV export both need every job matching the active
// search/platform/sort/tag filters so topic grouping and export aren't page-scoped.
// 20 server pages × 10 jobs = 200 max — same bound as Calendar's FETCH_PAGES cap
// so a huge library can't fan one click into unbounded requests.
export const MAX_LIBRARY_JOB_PAGES = 20;
// WHY: collections GET /:id/jobs paginates (default 50, max 100) — Library still
// filters/sorts the full membership client-side, so pull pages at the server max.
export const COLLECTION_JOBS_PAGE_LIMIT = 100;
export const MAX_COLLECTION_JOB_PAGES = 20;
// WHY: status refresh fans out getJobStatus for rows missing from page 1.
// 10 in flight at a time — a long library can have more than one page of them.
const IN_FLIGHT_STATUS_FETCH_CAP = 10;

export function libraryJobsQueryKey(
  search: string,
  platform: string,
  sort: SortKey,
  tag: string,
): readonly ['library', 'jobs', string, string, SortKey, string] {
  return ['library', 'jobs', search, platform, sort, tag];
}

export function collectionJobsQueryKey(
  collectionId: string,
): readonly ['library', 'collectionJobs', string] {
  return ['library', 'collectionJobs', collectionId];
}

export interface LibraryJobsPayload {
  jobs: LibraryJob[];
  total: number;
  platformCounts?: Record<string, number>;
  tagCounts?: Record<string, number>;
}

export async function fetchAllMatchingJobPages(
  options: GetJobsOptions,
): Promise<LibraryJobsPayload> {
  const first = await getJobs(1, options);
  const totalPagesForFetch = first.totalPages || 1;
  const pagesToFetch = Math.min(totalPagesForFetch, MAX_LIBRARY_JOB_PAGES);
  if (pagesToFetch <= 1) {
    return {
      jobs: first.jobs,
      total: first.total,
      platformCounts: first.platformCounts,
      tagCounts: first.tagCounts,
    };
  }
  const rest = await Promise.allSettled(
    Array.from({ length: pagesToFetch - 1 }, (_, i) => getJobs(i + 2, options)),
  );
  const restJobs = rest.flatMap((r) => (r.status === 'fulfilled' ? r.value.jobs : []));
  return {
    jobs: [...first.jobs, ...restJobs],
    total: first.total,
    platformCounts: first.platformCounts,
    tagCounts: first.tagCounts,
  };
}

export async function fetchAllCollectionJobPages(
  collectionId: string,
): Promise<LibraryJobsPayload> {
  const first = await getCollectionJobs(collectionId, {
    page: 1,
    limit: COLLECTION_JOBS_PAGE_LIMIT,
  });
  const pagesToFetch = Math.min(first.totalPages || 1, MAX_COLLECTION_JOB_PAGES);
  if (pagesToFetch <= 1) {
    return { jobs: first.jobs, total: first.total };
  }
  const rest = await Promise.allSettled(
    Array.from({ length: pagesToFetch - 1 }, (_, i) =>
      getCollectionJobs(collectionId, {
        page: i + 2,
        limit: COLLECTION_JOBS_PAGE_LIMIT,
      }),
    ),
  );
  const restJobs = rest.flatMap((r) => (r.status === 'fulfilled' ? r.value.jobs : []));
  return {
    jobs: [...first.jobs, ...restJobs],
    total: first.total,
  };
}

/** Slim in-flight poll: page 1 only, skip aggregate counts. */
export async function fetchFirstJobPage(
  options: GetJobsOptions,
): Promise<LibraryJobsPayload> {
  const first = await getJobs(1, { ...options, counts: false });
  return {
    jobs: first.jobs,
    total: first.total,
    platformCounts: first.platformCounts,
    tagCounts: first.tagCounts,
  };
}

// WHY: match server isJobInFlightStatus — durable mid-pipeline rows use
// researching|writing|formatting|critiquing, not only pending|processing.
export function isLibraryInFlightStatus(status: string): boolean {
  return status === 'pending'
    || status === 'processing'
    || status === 'researching'
    || status === 'writing'
    || status === 'formatting'
    || status === 'critiquing';
}

export function libraryHasInFlight(jobs: LibraryJob[]): boolean {
  return jobs.some((j) => isLibraryInFlightStatus(j.status));
}

function httpStatusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined;
  const response = (err as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

/**
 * Patch cached rows with page-1 status (and outputs when present).
 * Callers pass a newest-sorted page 1 — score/platform sort hides unscored
 * in-flight jobs off page 1, so this merge is by id, not by list position.
 */
export function mergePage1StatusesIntoLibrary(
  existing: LibraryJobsPayload,
  page1: LibraryJobsPayload,
  options?: { addNewcomers?: boolean },
): LibraryJobsPayload {
  const byId = new Map(page1.jobs.map((j) => [j.id, j]));
  const existingIds = new Set(existing.jobs.map((j) => j.id));
  const jobs = existing.jobs.map((j) => {
    const fresh = byId.get(j.id);
    if (!fresh) return j;
    return {
      ...j,
      status: fresh.status,
      ...(fresh.outputs ? { outputs: fresh.outputs } : {}),
      ...(fresh.tag !== undefined ? { tag: fresh.tag } : {}),
    };
  });
  // WHY: folder caches must not gain jobs that aren't members. The global
  // newest page includes the whole library.
  const addNewcomers = options?.addNewcomers !== false;
  const newcomers = addNewcomers
    ? page1.jobs.filter((j) => !existingIds.has(j.id))
    : [];
  return {
    ...existing,
    jobs: newcomers.length > 0 ? [...newcomers, ...jobs] : jobs,
  };
}

async function patchMissingInFlightStatuses(
  jobs: LibraryJob[],
  ids: string[],
): Promise<LibraryJob[]> {
  try {
    const statusById = new Map<string, string>();
    for (let i = 0; i < ids.length; i += IN_FLIGHT_STATUS_FETCH_CAP) {
      const chunk = ids.slice(i, i + IN_FLIGHT_STATUS_FETCH_CAP);
      const results = await Promise.allSettled(chunk.map((id) => getJobStatus(id)));
      chunk.forEach((id, index) => {
        const result = results[index];
        if (!result) return;
        if (result.status === 'fulfilled') {
          statusById.set(id, result.value.status);
          return;
        }
        // WHY: 404 means the row is gone. Leaving it pending keeps the poll alive.
        if (httpStatusOf(result.reason) === 404) statusById.set(id, 'failed');
      });
    }
    if (statusById.size === 0) return jobs;
    return jobs.map((job) => {
      const status = statusById.get(job.id);
      return status ? { ...job, status } : job;
    });
  } catch {
    return jobs;
  }
}

/**
 * Merge a newest page-1 snapshot into `existing`, then refresh any cached
 * in-flight ids that page didn't include. `settled` is computed from the
 * merged list (what the UI is showing), not from page 1 alone.
 */
export async function mergeInFlightPoll(
  existing: LibraryJobsPayload,
  page1: LibraryJobsPayload,
  options?: { addNewcomers?: boolean },
): Promise<{ merged: LibraryJobsPayload; settled: boolean }> {
  try {
    const mergedPage = mergePage1StatusesIntoLibrary(existing, page1, options);
    const seen = new Set(page1.jobs.map((j) => j.id));
    const missingIds = mergedPage.jobs
      .filter((j) => isLibraryInFlightStatus(j.status) && !seen.has(j.id))
      .map((j) => j.id);
    const jobs = missingIds.length > 0
      ? await patchMissingInFlightStatuses(mergedPage.jobs, missingIds)
      : mergedPage.jobs;
    const merged = { ...mergedPage, jobs };
    return { merged, settled: !libraryHasInFlight(merged.jobs) };
  } catch {
    return { merged: existing, settled: !libraryHasInFlight(existing.jobs) };
  }
}
