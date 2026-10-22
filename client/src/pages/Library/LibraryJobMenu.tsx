import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Tag, FolderPlus, FolderMinus, Trash2, Folder,
} from 'lucide-react';
import type { Collection } from '../../types/collection';

type MenuPanel = 'main' | 'tag' | 'folder';

interface LibraryJobMenuProps {
  /** Anchor for fixed positioning (the ⋯ button). */
  anchorRef: React.RefObject<HTMLElement | null>;
  jobId: string;
  tag: string | null | undefined;
  collections: Collection[];
  activeCollectionId?: string | null;
  tagSaving: boolean;
  onClose: () => void;
  onEditTag: (jobId: string | null) => void;
  onSaveTag: (jobId: string, tag: string) => void;
  onAddToCollection: (collectionId: string, jobId: string) => void;
  onRemoveFromCollection?: (jobId: string) => void;
  onRequestDelete: (jobId: string) => void;
  /** Prefer opening tag panel immediately (when parent already set editingTag). */
  startOnTag?: boolean;
}

interface MenuCoords {
  top: number;
  left: number;
}

/**
 * Compact action menu portaled to document.body so it is never clipped or
 * painted under the next Library card (those cards create stacking contexts
 * via their entrance animation transform).
 */
export function LibraryJobMenu({
  anchorRef, jobId, tag, collections, activeCollectionId, tagSaving,
  onClose, onEditTag, onSaveTag, onAddToCollection,
  onRemoveFromCollection, onRequestDelete, startOnTag = false,
}: LibraryJobMenuProps): React.JSX.Element | null {
  const [panel, setPanel] = useState<MenuPanel>(startOnTag ? 'tag' : 'main');
  const [draft, setDraft] = useState(tag ?? '');
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    function place(): void {
      const anchor = anchorRef.current;
      const menu = rootRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const menuW = menu?.offsetWidth ?? 188;
      const menuH = menu?.offsetHeight ?? 140;
      const pad = 8;
      let top = rect.bottom + 6;
      let left = rect.right - menuW;
      if (left < pad) left = pad;
      if (left + menuW > window.innerWidth - pad) {
        left = Math.max(pad, window.innerWidth - menuW - pad);
      }
      // WHY flip above when near the bottom of the viewport
      if (top + menuH > window.innerHeight - pad && rect.top > menuH + pad) {
        top = rect.top - menuH - 6;
      }
      setCoords({ top, left });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef, panel]);

  useEffect(() => {
    function onDoc(e: MouseEvent): void {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (rootRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
      onEditTag(null);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onClose();
        onEditTag(null);
      }
    }
    // WHY rAF: skip the same click that opened the menu
    const openAt = performance.now();
    function onDocDeferred(e: MouseEvent): void {
      if (performance.now() - openAt < 50) return;
      onDoc(e);
    }
    document.addEventListener('mousedown', onDocDeferred);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDeferred);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, onClose, onEditTag]);

  function handleSaveTag(): void {
    const trimmed = draft.trim();
    if (trimmed.length < 1 || trimmed.length > 30) return;
    onSaveTag(jobId, trimmed);
  }

  const menu = (
    <div
      ref={rootRef}
      className="lib-job-menu"
      role="menu"
      style={coords
        ? { top: coords.top, left: coords.left, visibility: 'visible' }
        : { top: 0, left: 0, visibility: 'hidden' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {panel === 'main' && (
        <>
          <button
            type="button"
            role="menuitem"
            className="lib-job-menu-item"
            onClick={() => {
              setDraft(tag ?? '');
              setPanel('tag');
              onEditTag(jobId);
            }}
          >
            <Tag size={13} />
            {tag ? 'Edit tag' : 'Add tag'}
            {tag && <span className="lib-job-menu-meta">{tag}</span>}
          </button>

          {activeCollectionId && onRemoveFromCollection ? (
            <button
              type="button"
              role="menuitem"
              className="lib-job-menu-item"
              onClick={() => {
                onRemoveFromCollection(jobId);
                onClose();
              }}
            >
              <FolderMinus size={13} />
              Remove from folder
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="lib-job-menu-item"
              onClick={() => setPanel('folder')}
            >
              <FolderPlus size={13} />
              Add to folder
            </button>
          )}

          <div className="lib-job-menu-sep" />

          <button
            type="button"
            role="menuitem"
            className="lib-job-menu-item danger"
            onClick={() => {
              onRequestDelete(jobId);
              onClose();
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </>
      )}

      {panel === 'tag' && (
        <div className="lib-job-menu-panel">
          <p className="lib-job-menu-panel-title">Tag</p>
          <input
            className="lib-job-menu-input"
            autoFocus
            maxLength={30}
            placeholder="e.g. Q4 campaign"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveTag();
              }
              if (e.key === 'Escape') {
                setPanel('main');
                onEditTag(null);
              }
            }}
          />
          <div className="lib-job-menu-panel-actions">
            <button
              type="button"
              className="lib-job-menu-ghost"
              onClick={() => {
                setPanel('main');
                onEditTag(null);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="lib-job-menu-primary"
              disabled={tagSaving || draft.trim().length < 1}
              onClick={handleSaveTag}
            >
              {tagSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {panel === 'folder' && (
        <div className="lib-job-menu-panel">
          <p className="lib-job-menu-panel-title">Add to folder</p>
          {collections.length === 0 ? (
            <p className="lib-job-menu-empty">
              No folders yet — create one from Folders in the toolbar.
            </p>
          ) : (
            <div className="lib-job-menu-folders">
              {collections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="lib-job-menu-item"
                  onClick={() => {
                    onAddToCollection(c.id, jobId);
                    onClose();
                  }}
                >
                  <Folder size={13} />
                  <span className="lib-job-menu-folder-name">{c.name}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="lib-job-menu-ghost"
            onClick={() => setPanel('main')}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
