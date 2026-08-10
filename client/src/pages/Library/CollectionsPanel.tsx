// WHY a standalone file: same rationale as LibraryAnalyticsPanel.tsx — keeps
// Library.tsx a thin orchestrator under the 400-line split threshold.
// Implements FUTURE_FEATURES.md's Library "No collections/folders" item:
// named, persistent, many-to-many groupings of jobs (unlike the single
// free-text tag column, which is one label per job).
import { useState } from 'react';
import { Folder, Plus, X, Loader2 } from 'lucide-react';
import type { Collection } from '../../types/collection';

interface CollectionsPanelProps {
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: (name: string) => void;
  creating: boolean;
  /** WHY (id, name), not just id: the confirm modal needs the name to show
   *  "Delete <name>?" — requesting confirmation instead of firing the delete
   *  mutation directly on click (2026-08-10, the highest-severity UX finding
   *  in that audit run). */
  onRequestDeleteCollection: (id: string, name: string) => void;
  deletingId: string | null;
  loading: boolean;
}

export function CollectionsPanel({
  collections, activeCollectionId, onSelectCollection,
  onCreateCollection, creating, onRequestDeleteCollection, deletingId, loading,
}: CollectionsPanelProps) {
  const [showInput, setShowInput] = useState(false);
  const [draft, setDraft] = useState('');

  function handleCreate(): void {
    const trimmed = draft.trim();
    if (trimmed.length < 1 || trimmed.length > 60) return;
    onCreateCollection(trimmed);
    setDraft('');
    setShowInput(false);
  }

  if (loading) return null;

  return (
    <div className="lib-collections-panel" aria-label="Collections">
      <button
        className={`lib-collection-pill${activeCollectionId === null ? ' active' : ''}`}
        onClick={() => onSelectCollection(null)}
      >
        All jobs
      </button>
      {collections.map((c) => (
        <div key={c.id} className={`lib-collection-pill-wrap${activeCollectionId === c.id ? ' active' : ''}`}>
          <button
            className={`lib-collection-pill${activeCollectionId === c.id ? ' active' : ''}`}
            onClick={() => onSelectCollection(c.id)}
          >
            <Folder size={11} />
            {c.name}
            <span style={{ opacity: 0.55, fontSize: 9 }}>{c.jobCount}</span>
          </button>
          <button
            className="lib-collection-delete"
            title={`Delete "${c.name}"`}
            aria-label={`Delete collection ${c.name}`}
            disabled={deletingId === c.id}
            onClick={() => onRequestDeleteCollection(c.id, c.name)}
          >
            {deletingId === c.id ? <Loader2 size={9} className="lib-spin" /> : <X size={9} />}
          </button>
        </div>
      ))}
      {showInput ? (
        <div className="lib-collection-new-input-wrap">
          <input
            className="lib-collection-new-input"
            autoFocus
            maxLength={60}
            placeholder="Collection name…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
              if (e.key === 'Escape') { setShowInput(false); setDraft(''); }
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || draft.trim().length < 1}
            className="lib-collection-pill active"
            style={{ opacity: creating ? 0.6 : 1 }}
          >
            {creating ? 'Adding…' : 'Add'}
          </button>
          <button onClick={() => { setShowInput(false); setDraft(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button className="lib-collection-pill" onClick={() => setShowInput(true)}>
          <Plus size={11} /> New
        </button>
      )}
    </div>
  );
}
