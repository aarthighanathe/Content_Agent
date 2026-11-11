import { getJobs, type GetJobsOptions } from '../../api';
import type { LibraryJob } from './libraryHelpers';

// WHY capped: Library list + CSV export both need every job matching the active
// search/platform/sort/tag filters so topic grouping and export aren't page-scoped.
// 20 server pages × 10 jobs = 200 max — same bound as Calendar's FETCH_PAGES cap
// so a huge library can't fan one click into unbounded requests.
export const MAX_LIBRARY_JOB_PAGES = 20;

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
