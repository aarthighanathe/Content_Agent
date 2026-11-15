import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  collectionJobsQueryKey,
  fetchFirstJobPage,
  libraryJobsQueryKey,
  mergeInFlightPoll,
  type LibraryJobsPayload,
} from './libraryFetch';
import type { SortKey } from './libraryHelpers';

interface UseLibraryInFlightPollArgs {
  enabled: boolean;
  libraryInFlight: boolean;
  collectionInFlight: boolean;
  activeCollectionId: string | null;
  debouncedSearch: string;
  platformFilter: string;
  sort: SortKey;
  tagFilter: string;
}

async function writePolledCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  page1: LibraryJobsPayload,
  addNewcomers: boolean,
  isCancelled: () => boolean,
): Promise<void> {
  try {
    const prev = queryClient.getQueryData<LibraryJobsPayload>(queryKey);
    if (!prev || isCancelled()) return;
    const { merged, settled } = await mergeInFlightPoll(prev, page1, { addNewcomers });
    if (isCancelled()) return;
    queryClient.setQueryData(queryKey, merged);
    if (settled) {
      void queryClient.invalidateQueries({ queryKey }).catch(() => {});
    }
  } catch {
    // Next tick retries.
  }
}

// WHY: score and platform sorts push unscored writing jobs off page 1, so a
// poll of "the current sort" never sees them and `settled` stays false.
// GET /jobs has no status filter — ask for newest, merge by id, then
// getJobStatus for cached in-flight ids the newest page didn't include.
export function useLibraryInFlightPoll(args: UseLibraryInFlightPollArgs): void {
  const queryClient = useQueryClient();
  const {
    enabled,
    libraryInFlight,
    collectionInFlight,
    activeCollectionId,
    debouncedSearch,
    platformFilter,
    sort,
    tagFilter,
  } = args;

  useEffect(() => {
    if (!enabled || (!libraryInFlight && !collectionInFlight)) return undefined;
    let cancelled = false;
    let ticking = false;
    const tick = async (): Promise<void> => {
      if (cancelled || ticking) return;
      ticking = true;
      try {
        const page1 = await fetchFirstJobPage({
          search: debouncedSearch,
          platform: platformFilter,
          tag: tagFilter || undefined,
          sort: 'date',
        });
        if (cancelled) return;
        if (libraryInFlight) {
          await writePolledCache(
            queryClient,
            libraryJobsQueryKey(debouncedSearch, platformFilter, sort, tagFilter),
            page1,
            true,
            () => cancelled,
          );
        }
        if (cancelled) return;
        // WHY: folder view reads collectionJobs, not the library jobs cache.
        // Don't prepend global newcomers — they aren't folder members.
        if (collectionInFlight && activeCollectionId) {
          await writePolledCache(
            queryClient,
            collectionJobsQueryKey(activeCollectionId),
            page1,
            false,
            () => cancelled,
          );
        }
      } catch {
        // Next tick retries.
      } finally {
        ticking = false;
      }
    };
    void tick().catch(() => {});
    const id = setInterval(() => { void tick().catch(() => {}); }, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    enabled,
    libraryInFlight,
    collectionInFlight,
    activeCollectionId,
    debouncedSearch,
    platformFilter,
    sort,
    tagFilter,
    queryClient,
  ]);
}
