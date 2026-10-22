import { timeAgo } from '../../lib/utils';
import type { LibraryJob } from './libraryHelpers';
import type { Collection } from '../../types/collection';
import { LibraryFamilyChip } from './LibraryFamilyChip';

export interface LibraryFamilyCardProps {
  topic: string;
  jobs: LibraryJob[];
  index: number;
  manageMode: boolean;
  selectedIds: Set<string>;
  openJobMenu: string | null;
  editingTagJobId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleMenu: (jobId: string | null) => void;
  onNavigate: (path: string) => void;
  onRequestDelete: (jobId: string) => void;
  onEditTag: (jobId: string | null) => void;
  onSaveTag: (jobId: string, tag: string) => void;
  tagSaving: boolean;
  collections: Collection[];
  onAddToCollection: (collectionId: string, jobId: string) => void;
  activeCollectionId?: string | null;
  onRemoveFromCollection?: (jobId: string) => void;
}

/**
 * One topic + a single row of compact platform chips (open / score / ⋯).
 * Actions open a portaled popover so they never sit under the next card.
 */
export function LibraryFamilyCard({
  topic, jobs, index, manageMode, selectedIds, openJobMenu, editingTagJobId,
  onToggleSelect, onToggleMenu, onNavigate, onRequestDelete,
  onEditTag, onSaveTag, tagSaving, collections, onAddToCollection,
  activeCollectionId, onRemoveFromCollection,
}: LibraryFamilyCardProps): React.JSX.Element {
  const newest = jobs.reduce((a, b) =>
    new Date(a.createdAt).getTime() >= new Date(b.createdAt).getTime() ? a : b,
  );

  return (
    <article className="lib-family" style={{ animationDelay: `${index * 0.03}s` }}>
      <header className="lib-family-hd">
        <h3 className="lib-family-title">{topic}</h3>
        <div className="lib-family-side">
          <span className="lib-family-count">{jobs.length}</span>
          <span className="lib-family-ago" title={newest.createdAt}>
            {timeAgo(newest.createdAt)}
          </span>
        </div>
      </header>

      <div className="lib-family-chips" role="list">
        {jobs.map((job) => (
          <LibraryFamilyChip
            key={job.id}
            job={job}
            manageMode={manageMode}
            selected={selectedIds.has(job.id)}
            menuOpen={openJobMenu === job.id}
            editingTag={editingTagJobId === job.id}
            onToggleSelect={onToggleSelect}
            onToggleMenu={onToggleMenu}
            onNavigate={onNavigate}
            onRequestDelete={onRequestDelete}
            onEditTag={onEditTag}
            onSaveTag={onSaveTag}
            tagSaving={tagSaving}
            collections={collections}
            onAddToCollection={onAddToCollection}
            activeCollectionId={activeCollectionId}
            onRemoveFromCollection={onRemoveFromCollection}
          />
        ))}
      </div>
    </article>
  );
}
