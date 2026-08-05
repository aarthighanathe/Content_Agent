import { Check, AlertCircle } from 'lucide-react';
import { LIBRARY_STYLES } from './Library/libraryHelpers';
import { LibraryHeader } from './Library/LibraryHeader';
import { LibraryToolbar } from './Library/LibraryToolbar';
import { LibraryAnalyticsPanel } from './Library/LibraryAnalyticsPanel';
import { CollectionsPanel } from './Library/CollectionsPanel';
import { ContentTab } from './Library/ContentTab';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useLibraryData } from './Library/useLibraryData';

export default function LibraryPage() {
  const lib = useLibraryData();

  return (
    <div className="library-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{LIBRARY_STYLES}</style>
      <style>{`
        .library-page-container {
          padding: 0 20px;
        }
        @media (max-width: 480px) {
          .library-page-container {
            padding: 0 16px !important;
          }
        }
        @media (max-width: 375px) {
          .library-page-container {
            padding: 0 12px !important;
          }
        }
      `}</style>

      <LibraryHeader
        total={lib.total}
        manageMode={lib.manageMode}
        onToggleManageMode={() => { lib.setManageMode(p => !p); lib.setSelectedIds(new Set()); }}
        showAnalytics={lib.showAnalytics}
        onToggleAnalytics={() => lib.setShowAnalytics(p => !p)}
      />

      <CollectionsPanel
        collections={lib.collections}
        activeCollectionId={lib.activeCollectionId}
        onSelectCollection={lib.setActiveCollectionId}
        onCreateCollection={(name) => lib.createCollectionMutation.mutate(name)}
        creating={lib.createCollectionMutation.isPending}
        onDeleteCollection={(id) => lib.deleteCollectionMutation.mutate(id)}
        deletingId={lib.deleteCollectionMutation.isPending ? lib.deleteCollectionMutation.variables ?? null : null}
        loading={lib.collectionsLoading}
      />

      <LibraryToolbar
        search={lib.search}
        onSearchChange={lib.setSearch}
        manageMode={lib.manageMode}
        selectedCount={lib.selectedIds.size}
        onSelectAll={() => { lib.handleSelectAllMatching().catch(() => {}); }}
        selectingAll={lib.selectingAll}
        onExportCSV={() => { lib.exportCSV().catch(() => {}); }}
        exporting={lib.exporting}
        onBulkDelete={() => lib.setBulkDeleteConfirm(true)}
        jobsLoading={lib.jobsLoading}
        jobsError={lib.jobsError}
        platformFilters={lib.platformFilters}
        platformFilter={lib.platformFilter}
        onPlatformFilterChange={lib.setPlatformFilter}
        platformCounts={lib.platformCounts}
        total={lib.total}
        sort={lib.sort}
        onSortChange={(s) => { lib.setSort(s); lib.setShowSortMenu(false); }}
        showSortMenu={lib.showSortMenu}
        onToggleSortMenu={() => lib.setShowSortMenu(!lib.showSortMenu)}
        pageTags={lib.pageTags}
        tagFilter={lib.tagFilter}
        onTagFilterChange={lib.setTagFilter}
      />

      {lib.showAnalytics && !lib.jobsLoading && !lib.jobsError && (
        <LibraryAnalyticsPanel jobs={lib.jobs} />
      )}

      <ContentTab
        jobsError={lib.jobsError}
        onRetryJobs={() => lib.jobsQuery.refetch().catch(() => {})}
        isLoading={lib.jobsLoading}
        filteredJobs={lib.filteredJobs}
        search={lib.search}
        manageMode={lib.manageMode}
        selectedIds={lib.selectedIds}
        openJobMenu={lib.openJobMenu}
        onToggleSelect={lib.toggleSelect}
        onToggleMenu={lib.setOpenJobMenu}
        onNavigate={lib.navigate}
        onRequestDelete={lib.setDeleteJobConfirm}
        page={lib.page}
        totalPages={lib.totalPages}
        onPageChange={lib.setPage}
        editingTagJobId={lib.editingTagJobId}
        onEditTag={lib.setEditingTagJobId}
        onSaveTag={(jobId, tag) => lib.tagJobMutation.mutate({ jobId, tag })}
        tagSaving={lib.tagJobMutation.isPending}
        collections={lib.collections}
        onAddToCollection={(collectionId, jobId) => lib.addToCollectionMutation.mutate({ collectionId, jobId })}
      />

      {/* ── Delete Job Confirm Modal ── */}
      {lib.deleteJobConfirm && (
        <ConfirmDeleteModal
          title="Delete this generation?"
          message="This action is permanent and cannot be undone."
          onCancel={() => { lib.setDeleteJobConfirm(null); lib.setDeleteJobError(''); }}
          onConfirm={() => lib.deleteJobMutation.mutate(lib.deleteJobConfirm as string)}
          isPending={lib.deleteJobMutation.isPending}
          error={lib.deleteJobError}
        />
      )}

      {/* ── Bulk Delete Confirm Modal ── */}
      {lib.bulkDeleteConfirm && (
        <ConfirmDeleteModal
          title={`Delete ${lib.selectedIds.size} item${lib.selectedIds.size !== 1 ? 's' : ''}?`}
          message="This action is permanent and cannot be undone."
          onCancel={() => { lib.setBulkDeleteConfirm(false); lib.setBulkDeleteError(''); }}
          onConfirm={lib.handleConfirmBulkDelete}
          isPending={lib.bulkDeleteJobsMutation.isPending}
          error={lib.bulkDeleteError}
        />
      )}

      {/* WHY single toast element (#45): one unified toast for export success/error,
          consistent with the #36 pattern used in Brand.tsx. */}
      {lib.toast && (
        <div
          className={`toast ${lib.toast.isError ? 'toast-error' : 'toast-success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {lib.toast.isError ? <AlertCircle size={12} /> : <Check size={12} />}
          {lib.toast.message}
        </div>
      )}
    </div>
  );
}
