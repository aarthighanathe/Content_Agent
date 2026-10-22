import { useRef } from 'react';
import { CheckSquare, Square, Layers, MoreHorizontal } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { timeAgo } from '../../lib/utils';
import type { LibraryJob } from './libraryHelpers';
import { getQualityScore } from './libraryHelpers';
import type { Collection } from '../../types/collection';
import { LibraryJobMenu } from './LibraryJobMenu';

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--text-muted)';
  if (score >= 95) return '#F59E0B';
  if (score >= 85) return '#34D399';
  if (score >= 70) return '#6366F1';
  return '#F87171';
}

interface LibraryFamilyChipProps {
  job: LibraryJob;
  manageMode: boolean;
  selected: boolean;
  menuOpen: boolean;
  editingTag: boolean;
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

export function LibraryFamilyChip({
  job, manageMode, selected, menuOpen, editingTag,
  onToggleSelect, onToggleMenu, onNavigate, onRequestDelete,
  onEditTag, onSaveTag, tagSaving, collections, onAddToCollection,
  activeCollectionId, onRemoveFromCollection,
}: LibraryFamilyChipProps): React.JSX.Element {
  const moreRef = useRef<HTMLButtonElement>(null);
  const pm = platformMeta[job.platform] || {
    label: job.platform, color: '#A78BFA', Icon: Layers,
  };
  const qs = getQualityScore(job);
  const sc = scoreColor(qs);

  return (
    <div
      role="listitem"
      className={`lib-chip${selected ? ' on' : ''}${menuOpen ? ' menu-on' : ''}`}
      style={{
        borderColor: selected || menuOpen
          ? 'color-mix(in srgb, var(--accent) 40%, transparent)'
          : `${pm.color}40`,
      }}
    >
      <button
        type="button"
        className="lib-chip-main"
        title={`${pm.label}${qs !== null ? ` · ${qs}/100` : ''} · ${timeAgo(job.createdAt)}`}
        onClick={() => {
          if (manageMode) {
            onToggleSelect(job.id);
            return;
          }
          onNavigate(`/result/${job.id}`);
        }}
      >
        {manageMode && (
          <span className="lib-chip-check" aria-hidden>
            {selected
              ? <CheckSquare size={12} color="var(--accent)" />
              : <Square size={12} color="var(--text-muted)" />}
          </span>
        )}
        <pm.Icon size={13} style={{ color: pm.color, flexShrink: 0 }} />
        <span className="lib-chip-label" style={{ color: pm.color }}>{pm.label}</span>
        <span className="lib-chip-score" style={{ color: sc }}>
          {qs !== null ? qs : '—'}
        </span>
      </button>
      {!manageMode && (
        <>
          <button
            ref={moreRef}
            type="button"
            className="lib-chip-more"
            title="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(menuOpen ? null : job.id);
              if (menuOpen) onEditTag(null);
            }}
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <LibraryJobMenu
              anchorRef={moreRef}
              jobId={job.id}
              tag={job.tag}
              collections={collections}
              activeCollectionId={activeCollectionId}
              tagSaving={tagSaving}
              startOnTag={editingTag}
              onClose={() => {
                onToggleMenu(null);
                onEditTag(null);
              }}
              onEditTag={onEditTag}
              onSaveTag={onSaveTag}
              onAddToCollection={onAddToCollection}
              onRemoveFromCollection={onRemoveFromCollection}
              onRequestDelete={onRequestDelete}
            />
          )}
        </>
      )}
    </div>
  );
}
