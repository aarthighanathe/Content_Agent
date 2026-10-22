import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { EmptyStateIllustration } from '../../components/EmptyStateIllustration';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { LibraryJob } from './libraryHelpers';
import { groupLibraryJobs } from './libraryHelpers';
import { LibraryJobCard } from './LibraryJobCard';
import { LibraryFamilyCard } from './LibraryFamilyCard';
import type { Collection } from '../../types/collection';

interface ContentTabProps {
  jobsError: boolean;
  onRetryJobs: () => void;
  isLoading: boolean;
  filteredJobs: LibraryJob[];
  search: string;
  manageMode: boolean;
  selectedIds: Set<string>;
  openJobMenu: string | null;
  onToggleSelect: (id: string) => void;
  onToggleMenu: (jobId: string | null) => void;
  onNavigate: (path: string) => void;
  onRequestDelete: (jobId: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  editingTagJobId: string | null;
  onEditTag: (jobId: string | null) => void;
  onSaveTag: (jobId: string, tag: string) => void;
  tagSaving: boolean;
  collections: Collection[];
  onAddToCollection: (collectionId: string, jobId: string) => void;
  activeCollectionId?: string | null;
  onRemoveFromCollection?: (jobId: string) => void;
}

export function ContentTab({
  jobsError, onRetryJobs, isLoading, filteredJobs, search, manageMode, selectedIds, openJobMenu,
  onToggleSelect, onToggleMenu, onNavigate, onRequestDelete, page, totalPages, onPageChange,
  editingTagJobId, onEditTag, onSaveTag, tagSaving, collections, onAddToCollection,
  activeCollectionId, onRemoveFromCollection,
}: ContentTabProps): React.JSX.Element {
  const groups = useMemo(() => groupLibraryJobs(filteredJobs), [filteredJobs]);

  if (jobsError) {
    return <ErrorState message="We couldn't load your content. Please try again." onRetry={onRetryJobs} />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} size="md" />)}
      </div>
    );
  }

  if (filteredJobs.length === 0) {
    if (search) {
      return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(2.5rem,8vw,4rem) 1.5rem', textAlign: 'center', gap: 10 }}>
          <EmptyStateIllustration variant="search" size={112} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
            {`No results for "${search}"`}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Try a different search term
          </p>
        </div>
      );
    }
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(2.5rem,8vw,4rem) 1.5rem', textAlign: 'center', gap: 10 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, marginBottom: 6,
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent-2) 16%, transparent))',
          border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={24} color="var(--accent)" />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
          No generations yet
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Create your first piece of content to see it here
        </p>
        <Link to="/create" className="btn-primary" style={{ marginTop: 12 }}>Create content →</Link>
      </div>
    );
  }

  const cardProps = {
    manageMode,
    onToggleSelect,
    onToggleMenu,
    onNavigate,
    onRequestDelete,
    onEditTag,
    onSaveTag,
    tagSaving,
    collections,
    onAddToCollection,
    activeCollectionId,
    onRemoveFromCollection,
  };

  return (
    <>
      <div className="lib-feed" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map((group, gi) => {
          if (group.jobs.length === 1) {
            const job = group.jobs[0]!;
            return (
              <LibraryJobCard
                key={job.id}
                job={job}
                index={gi}
                selected={selectedIds.has(job.id)}
                menuOpen={openJobMenu === job.id}
                editingTag={editingTagJobId === job.id}
                {...cardProps}
              />
            );
          }

          return (
            <LibraryFamilyCard
              key={group.key}
              topic={group.topic}
              jobs={group.jobs}
              index={gi}
              selectedIds={selectedIds}
              openJobMenu={openJobMenu}
              editingTagJobId={editingTagJobId}
              {...cardProps}
            />
          );
        })}
      </div>
      {totalPages > 1 && (
        <nav className="lib-pagination" aria-label="Library pages">
          <button
            type="button"
            className="lib-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Prev
          </button>
          <div className="lib-page-nums">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`lib-page-num${p === page ? ' on' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="lib-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </nav>
      )}
    </>
  );
}
