// Progressive disclosure: folders stay available via a toolbar control, but
// no longer own a permanent full-width rail when the user has none.
import { useEffect, useRef, useState } from 'react';
import { Folder, Plus, X, Loader2, Check, ChevronDown } from 'lucide-react';
import type { Collection } from '../../types/collection';

interface CollectionsPanelProps {
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: (name: string) => void;
  creating: boolean;
  /** WHY (id, name): confirm modal needs the name for "Delete <name>?". */
  onRequestDeleteCollection: (id: string, name: string) => void;
  deletingId: string | null;
  loading: boolean;
}

export function CollectionsPanel({
  collections, activeCollectionId, onSelectCollection,
  onCreateCollection, creating, onRequestDeleteCollection, deletingId, loading,
}: CollectionsPanelProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [draft, setDraft] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const active = collections.find((c) => c.id === activeCollectionId) ?? null;
  const hasFolders = collections.length > 0;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowInput(false);
        setDraft('');
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function handleCreate(): void {
    const trimmed = draft.trim();
    if (trimmed.length < 1 || trimmed.length > 60) return;
    onCreateCollection(trimmed);
    setDraft('');
    setShowInput(false);
  }

  if (loading) return null;

  return (
    <div className="lib-folders-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`lib-folders-btn${active || open ? ' on' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        title={hasFolders ? 'Browse folders' : 'Organize jobs into folders'}
      >
        <Folder size={12} style={{ flexShrink: 0 }} />
        {active ? active.name : 'Folders'}
        {hasFolders && !active && (
          <span className="lib-folders-count">{collections.length}</span>
        )}
        <ChevronDown size={11} style={{ opacity: 0.65 }} />
      </button>

      {open && (
        <div className="lib-folders-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className={`lib-folders-item${activeCollectionId === null ? ' sel' : ''}`}
            onClick={() => {
              onSelectCollection(null);
              setOpen(false);
            }}
          >
            All jobs
            {activeCollectionId === null && <Check size={11} />}
          </button>

          {collections.map((c) => (
            <div key={c.id} className="lib-folders-row">
              <button
                type="button"
                role="menuitem"
                className={`lib-folders-item${activeCollectionId === c.id ? ' sel' : ''}`}
                onClick={() => {
                  onSelectCollection(c.id);
                  setOpen(false);
                }}
              >
                <Folder size={12} />
                <span className="lib-folders-item-name">{c.name}</span>
                <span className="lib-folders-item-n">{c.jobCount}</span>
                {activeCollectionId === c.id && <Check size={11} />}
              </button>
              <button
                type="button"
                className="lib-folders-del"
                title={`Delete "${c.name}"`}
                aria-label={`Delete collection ${c.name}`}
                disabled={deletingId === c.id}
                onClick={() => onRequestDeleteCollection(c.id, c.name)}
              >
                {deletingId === c.id
                  ? <Loader2 size={10} className="lib-spin" />
                  : <X size={10} />}
              </button>
            </div>
          ))}

          {!hasFolders && !showInput && (
            <p className="lib-folders-hint">
              Optional — group jobs for campaigns or clients.
            </p>
          )}

          {showInput ? (
            <div className="lib-folders-create">
              <input
                className="lib-folders-input"
                autoFocus
                maxLength={60}
                placeholder="Folder name…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                  if (e.key === 'Escape') {
                    setShowInput(false);
                    setDraft('');
                  }
                }}
              />
              <button
                type="button"
                className="lib-folders-add"
                disabled={creating || draft.trim().length < 1}
                onClick={handleCreate}
              >
                {creating ? '…' : 'Add'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="lib-folders-item new"
              onClick={() => setShowInput(true)}
            >
              <Plus size={12} /> New folder
            </button>
          )}
        </div>
      )}
    </div>
  );
}
