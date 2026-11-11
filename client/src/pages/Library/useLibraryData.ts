import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteJob, tagJob,
  getCollections, createCollection, deleteCollection, getCollectionJobs,
  addJobToCollection, removeJobFromCollection,
} from '../../api';
import type { GetJobsOptions } from '../../api';
import { platformMeta } from '../../lib/platformMeta';
import type { SortKey, LibraryJob } from './libraryHelpers';
import { getQualityScore, jobsForTopicPage } from './libraryHelpers';
import { fetchAllMatchingJobPages, MAX_LIBRARY_JOB_PAGES } from './libraryFetch';
import { buildLibraryCsv, downloadLibraryCsv, exportCapNote } from './libraryExport';

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
  // WHY declared with other list filters: the page-reset effect below depends on
  // it, and hooks can't reference state declared later in the component body.
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
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
  // WHY a confirm-pending id, same pattern as deleteJobConfirm above: collection
  // delete previously fired the mutation directly on click with zero
  // confirmation step — the single highest-severity UX finding in the
  // 2026-08-10 audit run.
  const [deleteCollectionConfirm, setDeleteCollectionConfirm] = useState<{ id: string; name: string } | null>(null);

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
  }, [debouncedSearch, platformFilter, sort, tagFilter, activeCollectionId]);

  const jobsQueryOptions: GetJobsOptions = {
    search: debouncedSearch,
    platform: platformFilter,
    sort,
    tag: tagFilter || undefined,
  };
  // WHY page is not in the queryKey: list pagination is client-side over topic
  // groups (see jobsForTopicPage). Refetching on every page click would re-download
  // the same job set. Filters still re-query.
  const jobsQuery = useQuery({
    queryKey: ['library', 'jobs', debouncedSearch, platformFilter, sort, tagFilter],
    queryFn: () => fetchAllMatchingJobPages(jobsQueryOptions),
    // WHY poll while in-flight (QA-LIB-001): Library cached Pending/Processing
    // from mid-batch visits and stayed stale after BatchResult/Result flipped
    // those jobs to done — there was no invalidate on the Library mount path
    // and no interval. Stop polling once every visible job is terminal.
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs ?? [];
      const inFlight = jobs.some(
        (j) => j.status === 'pending' || j.status === 'processing',
      );
      return inFlight ? 4000 : false;
    },
  });

  // ── Collections (folders) ───────────────────────────────────────────────
  // WHY a separate active-collection query rather than folding into
  // jobsQueryOptions: a collection has no pagination/search/sort of its own
  // (routes/collections.ts's GET /:id/jobs returns the full membership list
  // in one shot) — viewing a collection is a different data source, not an
  // extra filter on the paginated GET /jobs query. activeCollectionId state
  // lives with the other list filters above (page-reset effect dependency).
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
      setDeleteCollectionConfirm(null);
      flashToast('Collection deleted');
    },
    // WHY closes the modal on failure too (unlike deleteJobMutation, which
    // keeps its modal open with a persistent error prop): this mutation
    // already had an established toast-based error convention (matching
    // createCollectionMutation right above) before the confirm step was
    // added — the toast is sufficient feedback, and the delete (X) button on
    // the pill remains available to retry without reopening a modal.
    onError: () => {
      setDeleteCollectionConfirm(null);
      flashToast('Failed to delete collection — please try again.', true);
    },
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

  const removeFromCollectionMutation = useMutation({
    mutationFn: ({ collectionId, jobId }: { collectionId: string; jobId: string }) =>
      removeJobFromCollection(collectionId, jobId),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'collections'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'collectionJobs', collectionId] });
      flashToast('Removed from collection');
    },
    onError: () => flashToast('Failed to remove from collection — please try again.', true),
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
  const total = inCollectionView ? jobs.length : (jobsQuery.data?.total || 0);
  const jobsLoading = inCollectionView ? collectionJobsQuery.isLoading : jobsQuery.isLoading;
  const jobsError = inCollectionView ? collectionJobsQuery.isError : jobsQuery.isError;

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => deleteJob(jobId),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar', 'jobs'] }),
      ]).catch(() => {});
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
      setOpenJobMenu(null);
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
    const payload = await fetchAllMatchingJobPages(jobsQueryOptions);
    // Server list page size is fixed at 10 jobs (routes/jobs/list.ts).
    const serverPages = Math.ceil((payload.total || 0) / 10) || 1;
    return { jobs: payload.jobs, hitCap: serverPages > MAX_LIBRARY_JOB_PAGES };
  }

  const [exporting, setExporting] = useState(false);

  async function exportCSV() {
    // WHY try/catch (#45): Blob/download can throw in restricted environments.
    setExporting(true);
    try {
      let toExport: LibraryJob[];
      let hitCap = false;
      if (selectedIds.size > 0) {
        toExport = jobs.filter((j) => selectedIds.has(j.id));
      } else {
        const all = await fetchAllMatchingJobs();
        toExport = all.jobs;
        hitCap = all.hitCap;
      }
      downloadLibraryCsv(buildLibraryCsv(toExport));
      flashToast(
        `Exported ${toExport.length} row${toExport.length !== 1 ? 's' : ''} to CSV${exportCapNote(hitCap)}`,
      );
    } catch {
      flashToast('Export failed — please try again.', true);
    } finally {
      setExporting(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // WHY filter then topic-page: search/platform/sort/tag hit GET /jobs for the
  // main list. Collection membership is a full one-shot list with no server
  // filters, so apply search/platform/tag/sort client-side here — otherwise
  // typing in search inside a folder did nothing.
  // Grouping collapses Adapt/same-topic siblings into one Library row, so
  // pagination is 10 topics per page — not 10 raw jobs.
  const jobsForPaging = useMemo(() => {
    let list = jobs;
    if (inCollectionView) {
      const q = debouncedSearch.toLowerCase();
      if (q) {
        list = list.filter((j) =>
          j.topic.toLowerCase().includes(q)
          || (j.tag || '').toLowerCase().includes(q),
        );
      }
      if (platformFilter && platformFilter !== 'all') {
        list = list.filter((j) => j.platform === platformFilter);
      }
      if (tagFilter) {
        list = list.filter((j) => j.tag === tagFilter);
      }
      // WHY getQualityScore (not job.qualityScore): LibraryJob has no top-level
      // score field — quality lives on critique outputs (see libraryHelpers).
      if (sort === 'score') {
        list = [...list].sort((a, b) => (getQualityScore(b) ?? 0) - (getQualityScore(a) ?? 0));
      } else if (sort === 'platform') {
        list = [...list].sort((a, b) => a.platform.localeCompare(b.platform));
      } else {
        list = [...list].sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
      }
    } else if (tagFilter) {
      list = list.filter((j) => j.tag === tagFilter);
    }
    return list;
  }, [jobs, tagFilter, inCollectionView, debouncedSearch, platformFilter, sort]);

  const topicPage = useMemo(
    () => jobsForTopicPage(jobsForPaging, page),
    [jobsForPaging, page],
  );
  const filteredJobs = topicPage.pageJobs;
  const totalPages = topicPage.totalPages;

  // WHY page-first selection (not "select entire library"): Manage's old
  // "Select all matching" grabbed every job when no search was set — easy to
  // mass-delete by accident. Gmail-style: select this page by default; offer
  // "select all N" only as an explicit second step once the page is selected.
  const pageFullySelected = filteredJobs.length > 0
    && filteredJobs.every((j) => selectedIds.has(j.id));
  const allMatchingSelected = jobsForPaging.length > 0
    && jobsForPaging.every((j) => selectedIds.has(j.id));
  const matchingCount = jobsForPaging.length;
  const listHitCap = !inCollectionView && matchingCount < total;
  const hasActiveFilter = Boolean(
    debouncedSearch
    || (platformFilter && platformFilter !== 'all')
    || tagFilter
    || activeCollectionId,
  );

  function handleSelectPage(): void {
    setSelectedIds(new Set(filteredJobs.map((j) => j.id)));
  }

  function handleClearSelection(): void {
    setSelectedIds(new Set());
  }

  function handleSelectAllMatching(): void {
    // WHY use already-loaded jobsForPaging: the list query already fetched the
    // filtered set (capped). No second network round-trip for selection.
    setSelectedIds(new Set(jobsForPaging.map((j) => j.id)));
    if (listHitCap) {
      flashToast(
        `Selected the first ${matchingCount} loaded pieces — narrow your search to select more precisely.`,
      );
    }
  }

  // WHY clamp after delete/filter: staying on page 3 when only 1 topic-page remains
  // would show an empty feed even though matches exist.
  useEffect(() => {
    const t = setTimeout(() => {
      if (page > totalPages) setPage(totalPages);
    }, 0);
    return () => clearTimeout(t);
  }, [page, totalPages]);

  const platformFilters = ['all', ...Object.keys(platformMeta)];
  const platformCounts = jobsQuery.data?.platformCounts || {};

  // WHY server tagCounts when not in a collection: filtering only the current page
  // misssed tagged jobs on other pages. Collection view falls back to page-local tags.
  const pageTags = useMemo(() => {
    const fromServer = jobsQuery.data?.tagCounts;
    if (!inCollectionView && fromServer && Object.keys(fromServer).length > 0) {
      return Object.keys(fromServer).sort();
    }
    const seen = new Set<string>();
    jobs.forEach((j) => { if (j.tag) seen.add(j.tag); });
    return Array.from(seen).sort();
  }, [jobs, jobsQuery.data?.tagCounts, inCollectionView]);

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
    handleConfirmBulkDelete, exportCSV, exporting,
    handleSelectPage, handleClearSelection, handleSelectAllMatching,
    pageFullySelected, allMatchingSelected, matchingCount, hasActiveFilter,
    toggleSelect, filteredJobs, platformFilters, platformCounts, pageTags,
    flashToast,
    // ── Collections ──
    collections, collectionsLoading: collectionsQuery.isLoading,
    activeCollectionId, setActiveCollectionId,
    createCollectionMutation, deleteCollectionMutation, addToCollectionMutation,
    removeFromCollectionMutation,
    deleteCollectionConfirm, setDeleteCollectionConfirm,
  };
}
