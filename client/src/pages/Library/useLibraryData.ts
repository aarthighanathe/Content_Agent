import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getJobs, deleteJob, tagJob,
  getCollections, createCollection, deleteCollection, getCollectionJobs, addJobToCollection,
} from '../../api';
import type { GetJobsOptions } from '../../api';
import { platformMeta } from '../../lib/platformMeta';
import type { SortKey, LibraryJob } from './libraryHelpers';
import { getQualityScore } from './libraryHelpers';

// WHY a bounded multi-page fetch, not just `jobs` (the current page): CSV export
// used to silently only cover whatever page was on screen (FUNCTIONAL_AUDIT_2026-07.md
// finding #4). This fetches every page matching the active search/platform filter,
// capped at 20 pages (200 jobs) so a very large library can't turn one export click
// into an unbounded number of requests — same rationale as Calendar's FETCH_PAGES cap.
const MAX_EXPORT_PAGES = 20;

// WHY this hook exists: Library.tsx's data layer (mutations, queries, CSV
// export, select-all-matching, debounced search/page-reset effects) previously
// lived inline in the page component, pushing it well past the 400-line split
// threshold. Extracting it here mirrors the Result/hooks/ pattern already used
// elsewhere in this codebase — Library.tsx becomes a thin render-only
// orchestrator that just wires this hook's return value into JSX.
export function useLibraryData() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Content (jobs) state
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [openJobMenu, setOpenJobMenu] = useState<string | null>(null);
  const [editingTagJobId, setEditingTagJobId] = useState<string | null>(null);
  const [deleteJobConfirm, setDeleteJobConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteJobError, setDeleteJobError] = useState('');
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [failedJobIds, setFailedJobIds] = useState<string[]>([]);

  // WHY unified toast (#45): CSV export previously gave no visible feedback on success
  // and silently swallowed Blob/download errors. Same { message, isError? } | null shape
  // as Brand.tsx's #36 toast — one state, one flashToast helper, one DOM node.
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashToast = useCallback((message: string, isError = false, durationMs = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, isError });
    toastTimerRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // WHY debounced, not raw `search`: search/platform/sort now hit the server
  // (FUNCTIONAL_AUDIT_2026-07.md finding #4 — this used to filter only the
  // already-fetched page client-side, silently missing everything on other
  // pages). Debouncing keeps a keystroke from firing a request per character.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // WHY reset to page 1 on search/filter/sort change: staying on page 3 of an
  // old unfiltered list while a new filter only has 1 page of results would
  // silently show "no results" even though matches exist.
  // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
  // triggers react-hooks/set-state-in-effect — deferring via a 0ms timeout keeps
  // identical user-visible behaviour while satisfying the rule (same pattern used
  // elsewhere in this codebase, e.g. Brand.tsx, BatchResult.tsx).
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(t);
  }, [debouncedSearch, platformFilter, sort]);

  const jobsQueryOptions: GetJobsOptions = { search: debouncedSearch, platform: platformFilter, sort };
  const jobsQuery = useQuery({
    queryKey: ['library', 'jobs', page, debouncedSearch, platformFilter, sort],
    queryFn: () => getJobs(page, jobsQueryOptions),
  });

  // ── Collections (folders) ───────────────────────────────────────────────
  // WHY a separate active-collection query rather than folding into
  // jobsQueryOptions: a collection has no pagination/search/sort of its own
  // (routes/collections.ts's GET /:id/jobs returns the full membership list
  // in one shot) — viewing a collection is a different data source, not an
  // extra filter on the paginated GET /jobs query.
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  const collectionsQuery = useQuery({
    queryKey: ['library', 'collections'],
    queryFn: getCollections,
  });
  const collections = useMemo(() => collectionsQuery.data?.collections || [], [collectionsQuery.data]);

  const collectionJobsQuery = useQuery({
    queryKey: ['library', 'collectionJobs', activeCollectionId],
    queryFn: () => getCollectionJobs(activeCollectionId as string),
    enabled: activeCollectionId !== null,
  });

  const createCollectionMutation = useMutation({
    mutationFn: (name: string) => createCollection(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'collections'] });
      flashToast('Collection created');
    },
    onError: () => flashToast('Failed to create collection — please try again.', true),
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (collectionId: string) => deleteCollection(collectionId),
    onSuccess: (_data, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'collections'] });
      if (activeCollectionId === collectionId) setActiveCollectionId(null);
      flashToast('Collection deleted');
    },
    onError: () => flashToast('Failed to delete collection — please try again.', true),
  });

  const addToCollectionMutation = useMutation({
    mutationFn: ({ collectionId, jobId }: { collectionId: string; jobId: string }) =>
      addJobToCollection(collectionId, jobId),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'collections'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'collectionJobs', collectionId] });
      flashToast('Added to collection');
    },
    onError: () => flashToast('Failed to add to collection — please try again.', true),
  });

  // WHY: memoize with a stable empty-array fallback — `data?.jobs || []` would
  // otherwise create a new [] literal every render, breaking the useMemo
  // hooks below that depend on `jobs` (they'd recompute on every render
  // regardless of whether the underlying data actually changed).
  const inCollectionView = activeCollectionId !== null;
  const jobs: LibraryJob[] = useMemo(
    () => (inCollectionView ? collectionJobsQuery.data?.jobs : jobsQuery.data?.jobs) || [],
    [inCollectionView, collectionJobsQuery.data, jobsQuery.data],
  );
  const totalPages = inCollectionView ? 1 : (jobsQuery.data?.totalPages || 1);
  const total = inCollectionView ? jobs.length : (jobsQuery.data?.total || 0);
  const jobsLoading = inCollectionView ? collectionJobsQuery.isLoading : jobsQuery.isLoading;
  const jobsError = inCollectionView ? collectionJobsQuery.isError : jobsQuery.isError;

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] });
      setDeleteJobConfirm(null);
      setDeleteJobError('');
      setOpenJobMenu(null);
    },
    onError: () => {
      setDeleteJobError('Failed to delete — please try again.');
    },
  });

  const bulkDeleteJobsMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(id => deleteJob(id))),
    onSuccess: (results, ids) => {
      // WHY variables (ids), not selectedIds: selectedIds is closure-captured
      // component state that may have changed by the time this callback fires,
      // which would misattribute failures to the wrong job IDs. `ids` is the
      // exact array passed to mutate(), guaranteed to match `results` by index.
      const failed = results
        .map((r, i) => r.status === 'rejected' ? ids[i] : null)
        .filter((id): id is string => id !== null);
      setFailedJobIds(failed);
      queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] });
      setSelectedIds(new Set());
      setManageMode(false);
      setBulkDeleteConfirm(false);
      setBulkDeleteError('');
      if (failed.length > 0) {
        flashToast(`${failed.length} job${failed.length !== 1 ? 's' : ''} failed to delete`);
      } else {
        flashToast('Selected jobs deleted');
      }
    },
    onError: () => {
      setBulkDeleteError('Failed to delete — please try again.');
    },
  });

  const tagJobMutation = useMutation({
    mutationFn: ({ jobId, tag }: { jobId: string; tag: string }) => tagJob(jobId, tag),
    onSuccess: () => {
      // WHY invalidate: the tag column is now reflected in the DB; the cache
      // needs a fresh fetch so the chip updates without a manual reload.
      queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] });
      setEditingTagJobId(null);
      flashToast('Tag saved');
    },
    onError: () => {
      flashToast('Failed to save tag — must be 1–30 characters.', true);
    },
  });

  useEffect(() => {
    const h = () => { setOpenJobMenu(null); setShowSortMenu(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  function handleConfirmBulkDelete(): void {
    bulkDeleteJobsMutation.mutate(Array.from(selectedIds));
  }

  async function fetchAllMatchingJobs(): Promise<{ jobs: LibraryJob[]; hitCap: boolean }> {
    const first = await getJobs(1, jobsQueryOptions);
    const totalPagesForExport = first.totalPages || 1;
    const pagesToFetch = Math.min(totalPagesForExport, MAX_EXPORT_PAGES);
    const rest = await Promise.allSettled(
      Array.from({ length: pagesToFetch - 1 }, (_, i) => getJobs(i + 2, jobsQueryOptions)),
    );
    const restJobs = rest.flatMap((r) => (r.status === 'fulfilled' ? r.value.jobs : []));
    return { jobs: [...first.jobs, ...restJobs], hitCap: totalPagesForExport > MAX_EXPORT_PAGES };
  }

  const [exporting, setExporting] = useState(false);

  async function exportCSV() {
    // WHY try/catch (#45): Blob construction or URL.createObjectURL can throw in
    // restricted environments (private browsing on some browsers, storage quota
    // exhaustion). Without this, failures were silent. flashToast surfaces both
    // outcomes — success confirmation and error — without a modal.
    setExporting(true);
    try {
      // A selection is explicit user intent — export exactly those rows, even
      // though they may span pages, without needing to fetch anything further.
      let toExport: LibraryJob[];
      let hitCap = false;
      if (selectedIds.size > 0) {
        toExport = jobs.filter(j => selectedIds.has(j.id));
      } else {
        const all = await fetchAllMatchingJobs();
        toExport = all.jobs;
        hitCap = all.hitCap;
      }
      const rows = [['Topic', 'Platform', 'Status', 'Score', 'Date', 'URL']];
      toExport.forEach(j => {
        rows.push([
          `"${(j.topic || '').replace(/"/g, '""')}"`,
          j.platform, j.status,
          String(getQualityScore(j) ?? ''),
          new Date(j.createdAt).toLocaleDateString(),
          `${window.location.origin}/result/${j.id}`,
        ]);
      });
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'content_library.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const capNote = hitCap ? ` (capped at ${MAX_EXPORT_PAGES * 10} most recent matches)` : '';
      flashToast(`Exported ${toExport.length} row${toExport.length !== 1 ? 's' : ''} to CSV${capNote}`);
    } catch {
      flashToast('Export failed — please try again.', true);
    } finally {
      setExporting(false);
    }
  }

  const [selectingAll, setSelectingAll] = useState(false);

  // WHY fetch-then-select rather than just selecting `jobs` (current page): the
  // toolbar's "Select all" previously only ever selected the current page's rows,
  // even when a search/filter was active with matches on other pages — the same
  // page-scoping bug as CSV export (finding #4).
  async function handleSelectAllMatching() {
    if (selectedIds.size > 0) { setSelectedIds(new Set()); return; }
    setSelectingAll(true);
    try {
      const { jobs: allMatching, hitCap } = await fetchAllMatchingJobs();
      setSelectedIds(new Set(allMatching.map((j) => j.id)));
      if (hitCap) flashToast(`Selected the first ${MAX_EXPORT_PAGES * 10} matches — narrow your search to select more precisely.`);
    } catch {
      flashToast('Failed to select all — please try again.', true);
    } finally {
      setSelectingAll(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // WHY `jobs` used directly, no re-filter/sort here: search/platform/sort are now
  // real query params sent to GET /jobs (FUNCTIONAL_AUDIT_2026-07.md finding #4) —
  // the server already returns exactly the matching, sorted, current page. Re-filtering
  // client-side would just be redundant (and was the actual bug: it silently hid
  // everything outside the current page instead of ever asking the server for more).
  // WHY tagFilter is client-side: tags live on the job row the server already returns;
  // adding a server-side tag WHERE clause would require the same heavier aggregate path
  // as sort=score, and tags are a low-cardinality within a page, so slicing client-side
  // is an acceptable match for the existing sort=score precedent.
    // WHY memoized: `jobs` is server-data identity-stable across unrelated re-renders
  // (React Query only swaps it on refetch), but the filter callback still re-ran on
  // every render when inline — memoizing the sliced array keeps the filtered page
  // stable for downstream consumers (perf audit nicety; cost is a 10-row slice).
  const filteredJobs = useMemo(() => tagFilter ? jobs.filter(j => j.tag === tagFilter) : jobs, [jobs, tagFilter]);

  // WHY derived from platformMeta, not a hardcoded array: the previous local list
  // could silently drift from the real set of platforms the app supports (a new
  // platform added to platformMeta would never show up as a Library filter pill
  // unless someone remembered to update this array too).
  const platformFilters = ['all', ...Object.keys(platformMeta)];
  const platformCounts = jobsQuery.data?.platformCounts || {};

  // WHY derived from the current page, not the entire library: tags have no server-side
  // aggregate query (same accepted limitation as sort=score). Collecting unique tags from
  // whatever page is loaded gives instant, no-extra-fetch filtering within that view.
  const pageTags = useMemo(() => {
    const seen = new Set<string>();
    jobs.forEach(j => { if (j.tag) seen.add(j.tag); });
    return Array.from(seen).sort();
  }, [jobs]);

  return {
    navigate,
    search, setSearch, manageMode, setManageMode, showAnalytics, setShowAnalytics,
    selectedIds, setSelectedIds,
    page, setPage, platformFilter, setPlatformFilter, tagFilter, setTagFilter,
    sort, setSort,
    showSortMenu, setShowSortMenu, openJobMenu, setOpenJobMenu,
    editingTagJobId, setEditingTagJobId,
    deleteJobConfirm, setDeleteJobConfirm, bulkDeleteConfirm, setBulkDeleteConfirm,
    deleteJobError, setDeleteJobError, bulkDeleteError, setBulkDeleteError,
    failedJobIds, setFailedJobIds,
    toast,
    jobs, totalPages, total, jobsLoading, jobsError, jobsQuery,
    deleteJobMutation, bulkDeleteJobsMutation, tagJobMutation,
    handleConfirmBulkDelete, exportCSV, exporting, handleSelectAllMatching, selectingAll,
    toggleSelect, filteredJobs, platformFilters, platformCounts, pageTags,
    flashToast,
    // ── Collections ──
    collections, collectionsLoading: collectionsQuery.isLoading,
    activeCollectionId, setActiveCollectionId,
    createCollectionMutation, deleteCollectionMutation, addToCollectionMutation,
  };
}
