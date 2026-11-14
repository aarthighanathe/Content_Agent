import { getJobs, getCollectionJobs, type GetJobsOptions } from '../../api';
import type { LibraryJob } from './libraryHelpers';

// WHY: capped: Library list + CSV export both need every job matching the active
// search/platform/sort/tag filters so topic grouping and export aren't page-scoped.
// 20 server pages × 10 jobs = 200 max — same bound as Calendar's FETCH_PAGES cap
// so a huge library can't fan one click into unbounded requests.
export const MAX_LIBRARY_JOB_PAGES = 20;
// WHY: collections GET /:id/jobs paginates (default 50, max 100) — Library still
// filters/sorts the full membership client-side, so pull pages at the server max.
export const COLLECTION_JOBS_PAGE_LIMIT = 100;
export const MAX_COLLECTION_JOB_PAGES = 20;

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
export function libraryHasInFlight(jobs: LibraryJob[]): boolean {
  return jobs.some((j) =>
    j.status === 'pending'
    || j.status === 'processing'
    || j.status === 'researching'
    || j.status === 'writing'
    || j.status === 'formatting'
    || j.status === 'critiquing');
}

/**
 * Patch cached multi-page rows with page-1 status (and outputs when present).
 * Newest/in-flight jobs sort onto page 1 under default date sort — enough for
 * the 4s poll without re-pulling up to 20 pages.
 */
export function mergePage1StatusesIntoLibrary(
  existing: LibraryJobsPayload,
  page1: LibraryJobsPayload,
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
  const newcomers = page1.jobs.filter((j) => !existingIds.has(j.id));
  return {
    ...existing,
    jobs: newcomers.length > 0 ? [...newcomers, ...jobs] : jobs,
  };
}

/** One in-flight poll tick: page 1 → merge → whether everything is terminal. */
export async function pollLibraryInFlightPage(
  options: GetJobsOptions,
  existing: LibraryJobsPayload | undefined,
): Promise<{ merged: LibraryJobsPayload; settled: boolean }> {
  const page1 = await fetchFirstJobPage(options);
  const merged = existing
    ? mergePage1StatusesIntoLibrary(existing, page1)
    : {
      jobs: page1.jobs,
      total: page1.total,
      platformCounts: page1.platformCounts,
      tagCounts: page1.tagCounts,
    };
  return { merged, settled: !libraryHasInFlight(merged.jobs) };
}
