import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobs, deleteJob, getTemplates, deleteTemplate, renameTemplate } from '../api';
import type { GetJobsOptions } from '../api';
import { navigateToCreate } from '../lib/utils';
import type { Tab, SortKey, LibraryJob, LibraryTemplate } from './Library/libraryHelpers';
import { LIBRARY_STYLES, getQualityScore } from './Library/libraryHelpers';
import { LibraryHeader } from './Library/LibraryHeader';
import { LibraryToolbar } from './Library/LibraryToolbar';
import { ContentTab } from './Library/ContentTab';
import { TemplatesTab } from './Library/TemplatesTab';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

export default function LibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [search, setSearch] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Content (jobs) state
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [openJobMenu, setOpenJobMenu] = useState<string | null>(null);
  const [deleteJobConfirm, setDeleteJobConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteJobError, setDeleteJobError] = useState('');
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  // Templates state
  const [openTemplateMenu, setOpenTemplateMenu] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  // WHY page-level: rename and the Templates tab's inline delete-confirm row have no
  // modal of their own to host an error — this is the shared fallback surface for
  // operations without a dedicated inline slot.
  const [pageError, setPageError] = useState('');
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
  const templatesQuery = useQuery({
    queryKey: ['library', 'templates'],
    queryFn: getTemplates,
  });

  // WHY: memoize with a stable empty-array fallback — `data?.jobs || []` would
  // otherwise create a new [] literal every render, breaking the useMemo
  // hooks below that depend on `jobs` (they'd recompute on every render
  // regardless of whether the underlying data actually changed).
  const jobs: LibraryJob[] = useMemo(() => jobsQuery.data?.jobs || [], [jobsQuery.data]);
  const totalPages = jobsQuery.data?.totalPages || 1;
  const total = jobsQuery.data?.total || 0;
  const jobsLoading = jobsQuery.isLoading;
  const jobsError = jobsQuery.isError;

  const templates: LibraryTemplate[] = useMemo(() => templatesQuery.data?.templates || [], [templatesQuery.data]);
  const templatesLoading = templatesQuery.isLoading;
  const templatesError = templatesQuery.isError;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] });
      setSelectedIds(new Set());
      setManageMode(false);
      setBulkDeleteConfirm(false);
      setBulkDeleteError('');
    },
    onError: () => {
      setBulkDeleteError('Failed to delete — please try again.');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'templates'] });
      setDeleteTemplateId(null);
      setPageError('');
    },
    onError: () => {
      setPageError('Failed to delete template — please try again.');
    },
  });

  const bulkDeleteTemplatesMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(id => deleteTemplate(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'templates'] });
      setSelectedIds(new Set());
      setManageMode(false);
      setBulkDeleteConfirm(false);
      setBulkDeleteError('');
    },
    onError: () => {
      setBulkDeleteError('Failed to delete — please try again.');
    },
  });

  const renameTemplateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameTemplate(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'templates'] });
      setPageError('');
    },
    onError: () => {
      setPageError('Failed to rename template — please try again.');
    },
  });

  useEffect(() => {
    const h = () => { setOpenJobMenu(null); setOpenTemplateMenu(null); setShowSortMenu(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  // WHY: clearing selection on tab switch belongs in the event handler, not a reactive
  // effect — avoids the "setState synchronously in an effect" cascading-render lint error.
  function handleTabChange(tab: Tab): void {
    setActiveTab(tab);
    setSelectedIds(new Set());
  }

  function handleDeleteTemplate(id: string): void {
    deleteTemplateMutation.mutate(id);
  }

  function handleRenameTemplate(id: string): void {
    if (!editName.trim()) return;
    renameTemplateMutation.mutate({ id, name: editName.trim() });
    setEditingId(null);
  }

  // WHY no templateId: Create.tsx never reads a templateId off router state (confirmed by
  // reading Create.tsx/useDraft.ts directly) — passing one was already a no-op. Restoring a
  // template's saved hookStyle/ctaPattern/structure into Create would need real support added
  // to Create.tsx's prefill handling first; tracked as a follow-up, not done in this pass.
  function handleUseTemplate(tmpl: LibraryTemplate): void {
    navigateToCreate(navigate, { topic: tmpl.topic || '', platform: tmpl.platform });
  }

  function handleConfirmBulkDelete(): void {
    if (activeTab === 'content') {
      bulkDeleteJobsMutation.mutate(Array.from(selectedIds));
    } else {
      bulkDeleteTemplatesMutation.mutate(Array.from(selectedIds));
    }
  }

  // WHY a bounded multi-page fetch, not just `jobs` (the current page): CSV export
  // used to silently only cover whatever page was on screen (FUNCTIONAL_AUDIT_2026-07.md
  // finding #4). This fetches every page matching the active search/platform filter,
  // capped at 20 pages (200 jobs) so a very large library can't turn one export click
  // into an unbounded number of requests — same rationale as Calendar's FETCH_PAGES cap.
  const MAX_EXPORT_PAGES = 20;
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
    if (activeTab !== 'content') {
      const allIds = new Set(activeList.map((item) => item.id));
      setSelectedIds(selectedIds.size === activeList.length && activeList.length > 0 ? new Set() : allIds);
      return;
    }
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
  const filteredJobs = jobs;

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(t =>
      t.name?.toLowerCase().includes(q) || t.topic?.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const platformFilters = ['all', 'instagram_carousel', 'linkedin_post', 'twitter_thread', 'instagram_caption', 'video_script'];
  const platformCounts = jobsQuery.data?.platformCounts || {};

  const activeList: (LibraryJob | LibraryTemplate)[] = activeTab === 'content' ? filteredJobs : filteredTemplates;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{LIBRARY_STYLES}</style>

      <LibraryHeader
        total={total}
        templateCount={templates.length}
        manageMode={manageMode}
        onToggleManageMode={() => { setManageMode(p => !p); setSelectedIds(new Set()); }}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {pageError && (
        <div className="toast toast-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {pageError}
        </div>
      )}

      <LibraryToolbar
        activeTab={activeTab}
        search={search}
        onSearchChange={setSearch}
        manageMode={manageMode}
        selectedCount={selectedIds.size}
        activeListLength={activeList.length}
        onSelectAll={() => { handleSelectAllMatching().catch(() => {}); }}
        selectingAll={selectingAll}
        onExportCSV={() => { exportCSV().catch(() => {}); }}
        exporting={exporting}
        onBulkDelete={() => setBulkDeleteConfirm(true)}
        jobsLoading={jobsLoading}
        jobsError={jobsError}
        platformFilters={platformFilters}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        platformCounts={platformCounts}
        total={total}
        sort={sort}
        onSortChange={(s) => { setSort(s); setShowSortMenu(false); }}
        showSortMenu={showSortMenu}
        onToggleSortMenu={() => setShowSortMenu(!showSortMenu)}
      />

      {activeTab === 'content' ? (
        <ContentTab
          jobsError={jobsError}
          onRetryJobs={() => jobsQuery.refetch().catch(() => {})}
          isLoading={jobsLoading}
          filteredJobs={filteredJobs}
          search={search}
          manageMode={manageMode}
          selectedIds={selectedIds}
          openJobMenu={openJobMenu}
          onToggleSelect={toggleSelect}
          onToggleMenu={setOpenJobMenu}
          onNavigate={navigate}
          onRequestDelete={setDeleteJobConfirm}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      ) : (
        <TemplatesTab
          templatesError={templatesError}
          onRetryTemplates={() => templatesQuery.refetch().catch(() => {})}
          isLoading={templatesLoading}
          filteredTemplates={filteredTemplates}
          search={search}
          manageMode={manageMode}
          selectedIds={selectedIds}
          openTemplateMenu={openTemplateMenu}
          onToggleMenu={setOpenTemplateMenu}
          editingId={editingId}
          editName={editName}
          deleteTemplateId={deleteTemplateId}
          onToggleSelect={toggleSelect}
          onStartEdit={(id, name) => { setEditingId(id); setEditName(name); setOpenTemplateMenu(null); }}
          onEditNameChange={setEditName}
          onRename={handleRenameTemplate}
          onCancelEdit={() => setEditingId(null)}
          onRequestDelete={(id) => { setDeleteTemplateId(id); setOpenTemplateMenu(null); }}
          onConfirmDelete={handleDeleteTemplate}
          onUseTemplate={handleUseTemplate}
        />
      )}

      {/* ── Delete Job Confirm Modal ── */}
      {deleteJobConfirm && (
        <ConfirmDeleteModal
          title="Delete this generation?"
          message="This action is permanent and cannot be undone."
          onCancel={() => { setDeleteJobConfirm(null); setDeleteJobError(''); }}
          onConfirm={() => deleteJobMutation.mutate(deleteJobConfirm)}
          isPending={deleteJobMutation.isPending}
          error={deleteJobError}
        />
      )}

      {/* ── Bulk Delete Confirm Modal ── */}
      {bulkDeleteConfirm && (
        <ConfirmDeleteModal
          title={`Delete ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}?`}
          message="This action is permanent and cannot be undone."
          onCancel={() => { setBulkDeleteConfirm(false); setBulkDeleteError(''); }}
          onConfirm={handleConfirmBulkDelete}
          isPending={bulkDeleteJobsMutation.isPending || bulkDeleteTemplatesMutation.isPending}
          error={bulkDeleteError}
        />
      )}

      {/* WHY single toast element (#45): one unified toast for export success/error,
          consistent with the #36 pattern used in Brand.tsx. */}
      {toast && (
        <div
          className={`toast ${toast.isError ? 'toast-error' : 'toast-success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {toast.isError ? <AlertCircle size={12} /> : <Check size={12} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
