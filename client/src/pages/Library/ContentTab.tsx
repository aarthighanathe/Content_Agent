import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Square, ExternalLink, X, Layers, Sparkles, Tag, FolderPlus, MoreHorizontal } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { timeAgo, isSafeHttpUrl } from '../../lib/utils';
import { QualityTierBadge } from '../../components/QualityTierBadge';
import { RowActionStrip } from '../../components/RowActionStrip';
import { EmptyStateIllustration } from '../../components/EmptyStateIllustration';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { LibraryJob } from './libraryHelpers';
import { statusConfig, getQualityScore } from './libraryHelpers';
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
  // ── tag editing ──
  editingTagJobId: string | null;
  onEditTag: (jobId: string | null) => void;
  onSaveTag: (jobId: string, tag: string) => void;
  tagSaving: boolean;
  // ── collections ──
  collections: Collection[];
  onAddToCollection: (collectionId: string, jobId: string) => void;
}

export function ContentTab({
  jobsError, onRetryJobs, isLoading, filteredJobs, search, manageMode, selectedIds, openJobMenu,
  onToggleSelect, onToggleMenu, onNavigate, onRequestDelete, page, totalPages, onPageChange,
  editingTagJobId, onEditTag, onSaveTag, tagSaving, collections, onAddToCollection,
}: ContentTabProps) {
  const [collectionMenuJobId, setCollectionMenuJobId] = useState<string | null>(null);
  if (jobsError) {
    return <ErrorState message="We couldn't load your content. Please try again." onRetry={onRetryJobs} />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} size="md" />)}
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
    // WHY the Dashboard's icon tile, not EmptyStateIllustration: this is the same
    // "No generations yet" empty state as Dashboard's RecentGenerations.tsx — matching
    // its solid gradient-tile + Sparkles glyph keeps the two consistent instead of one
    // page using a decorative illustration and the other a plain icon for identical copy.
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

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredJobs.map((job, i) => {
          const pm = platformMeta[job.platform] || { label: job.platform, color: '#A78BFA', Icon: Layers, bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.20)', badgeClass: 'badge-purple' };
          const sc = statusConfig[job.status] || { label: job.status, color: '#A78BFA' };
          const qs = getQualityScore(job);
          const isSel = selectedIds.has(job.id);
          const isExpanded = openJobMenu === job.id;
          const cardStyle = { animationDelay: `${i * 0.03}s`, borderColor: isSel ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : undefined, background: isSel ? 'color-mix(in srgb, var(--accent) 3%, transparent)' : undefined };
          const cardInner = (
            <div className="lib-card-inner">
              {manageMode && (
                <div
                  role="checkbox"
                  aria-checked={isSel}
                  aria-label={`Select "${job.topic}"`}
                  style={{ flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); onToggleSelect(job.id); }}
                >
                  {isSel ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text-muted)" />}
                </div>
              )}
              {/* Platform icon — sized up slightly, colored ring on hover */}
              <div style={{ width: 44, height: 44, borderRadius: 12, background: pm.bg, border: `1px solid ${pm.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color .2s, box-shadow .2s' }}>
                <pm.Icon size={19} style={{ color: pm.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, lineHeight: 1.3 }}>
                  {job.topic}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: pm.color, fontWeight: 600 }}>{pm.label}</span>
                  <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--rule)' }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: sc.color, background: `${sc.color}12`, borderRadius: 20, padding: '1px 6px', border: `1px solid ${sc.color}22` }}>
                    {sc.label}
                  </span>
                  {/* Repurpose lineage — icon-only at this row density, full URL in the tooltip/link target */}
                  {job.sourceUrl && isSafeHttpUrl(job.sourceUrl) && (
                    <a
                      href={job.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Repurposed from: ${job.sourceUrl}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'inline-flex', color: 'var(--text-muted)', flexShrink: 0 }}
                    >
                      <ExternalLink size={10} />
                    </a>
                  )}
                  {/* Tag chip — click to enter edit mode (opens the inline input below) */}
                  {job.tag && (
                    <button
                      className="lib-tag-chip"
                      title={`Tag: ${job.tag}. Click to edit.`}
                      onClick={(e) => { e.stopPropagation(); onEditTag(editingTagJobId === job.id ? null : job.id); }}
                    >
                      <Tag size={8} />{job.tag}
                    </button>
                  )}
                  {/* Lineage chip — visible on multiplied jobs that carry sourceJobId */}
                  {job.sourceJobId && (() => {
                    const spm = job.sourcePlatform ? platformMeta[job.sourcePlatform] : undefined;
                    return (
                      <a
                        className="lib-lineage-chip"
                        href={`/result/${job.sourceJobId}`}
                        title={`Adapted from ${spm?.label ?? job.sourcePlatform ?? 'another post'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {spm ? <spm.Icon size={8} /> : <Layers size={8} />}
                        from {spm?.label ?? 'original'}
                      </a>
                    );
                  })()}
                </div>
              </div>
              {/* Right meta — quality badge + timestamp + actions menu button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <QualityTierBadge score={qs} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.2px' }}>
                  {timeAgo(job.createdAt)}
                </span>
              </div>
              {/* ⋯ actions — stopPropagation so the card-level navigate doesn't fire */}
              {!manageMode && (
                <button
                  className="lib-more-btn"
                  title="More actions"
                  onClick={(e) => { e.stopPropagation(); onToggleMenu(isExpanded ? null : job.id); }}
                >
                  <MoreHorizontal size={15} />
                </button>
              )}
            </div>
          );

          // manageMode: whole card selects (bulk actions handled via the toolbar's own
          // bulk-delete/export — no per-row expand needed while selecting).
          if (manageMode) {
            return (
              <div
                key={job.id}
                className="lib-card"
                role="button"
                tabIndex={0}
                style={cardStyle}
                onClick={() => onToggleSelect(job.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleSelect(job.id); }}
              >
                {cardInner}
              </div>
            );
          }

          // normal mode — clicking the card navigates to the result page.
          // The ⋯ button (stopPropagation) opens the inline action strip for
          // secondary actions (tag / collection / delete) without navigating.
          const isEditingTag = editingTagJobId === job.id;
          const isCollectionMenuOpen = collectionMenuJobId === job.id;
          return (
            <div
              key={job.id}
              className="lib-card"
              role="button"
              tabIndex={0}
              style={{ ...cardStyle, cursor: 'pointer' }}
              onClick={() => onNavigate(`/result/${job.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(`/result/${job.id}`); } }}
            >
              {cardInner}
              {isExpanded && (
                <RowActionStrip
                  actions={[
                    {
                      key: 'tag', Icon: Tag, label: job.tag ? `Edit tag: ${job.tag}` : 'Add tag',
                      onClick: () => onEditTag(isEditingTag ? null : job.id),
                    },
                    {
                      key: 'collection', Icon: FolderPlus, label: 'Add to collection',
                      onClick: () => setCollectionMenuJobId(isCollectionMenuOpen ? null : job.id),
                    },
                    { key: 'delete', Icon: X, label: 'Delete', onClick: () => onRequestDelete(job.id), danger: true },
                  ]}
                />
              )}
              {/* WHY separate block, not inside RowActionStrip: the input needs its own
                  focus management and a submit handler — embedding that in the generic
                  action-strip would break its button-only contract. */}
              {isExpanded && isEditingTag && (
                <TagInputRow
                  jobId={job.id}
                  initialTag={job.tag ?? ''}
                  onSave={onSaveTag}
                  onCancel={() => onEditTag(null)}
                  saving={tagSaving}
                />
              )}
              {isExpanded && isCollectionMenuOpen && (
                <CollectionPickerRow
                  collections={collections}
                  onPick={(collectionId) => { onAddToCollection(collectionId, job.id); setCollectionMenuJobId(null); }}
                  onCancel={() => setCollectionMenuJobId(null)}
                />
              )}
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={{ padding: '8px 16px', fontSize: 12 }}>← Prev</button>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => onPageChange(p)} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${p === page ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--rule)'}`, background: p === page ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent', color: p === page ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: "var(--font-mono)", transition: 'all .18s' }}>{p}</button>
            ))}
          </div>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={{ padding: '8px 16px', fontSize: 12 }}>Next →</button>
        </div>
      )}
    </>
  );
}

// ── CollectionPickerRow ────────────────────────────────────────────────────────
// WHY a separate component, same rationale as TagInputRow: a private, colocated
// implementation detail of one row's expanded state, not a shared component.
interface CollectionPickerRowProps {
  collections: Collection[];
  onPick: (collectionId: string) => void;
  onCancel: () => void;
}

function CollectionPickerRow({ collections, onPick, onCancel }: CollectionPickerRowProps): React.JSX.Element {
  return (
    <div className="lib-tag-input-wrap" onClick={(e) => e.stopPropagation()}>
      <FolderPlus size={12} style={{ color: 'var(--accent-2)', flexShrink: 0 }} />
      {collections.length === 0 ? (
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', flex: 1 }}>
          No collections yet — create one above.
        </span>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {collections.map((c) => (
            <button
              key={c.id}
              className="lib-collection-pill"
              onClick={() => onPick(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={onCancel}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── TagInputRow ─────────────────────────────────────────────────────────────────
// WHY a separate component: it needs its own useState for the draft value so the
// controlled input doesn't force re-renders on the entire ContentTab on every keystroke.
// Keeping it colocated (not a separate file) is fine — it's a private implementation
// detail of ContentTab, not a shared component.
interface TagInputRowProps {
  jobId: string;
  initialTag: string;
  onSave: (jobId: string, tag: string) => void;
  onCancel: () => void;
  saving: boolean;
}

function TagInputRow({ jobId, initialTag, onSave, onCancel, saving }: TagInputRowProps): React.JSX.Element {
  const [draft, setDraft] = useState(initialTag);

  function handleSubmit(): void {
    const trimmed = draft.trim();
    if (trimmed.length < 1 || trimmed.length > 30) return;
    onSave(jobId, trimmed);
  }

  return (
    <div className="lib-tag-input-wrap" onClick={(e) => e.stopPropagation()}>
      <Tag size={12} style={{ color: 'var(--accent-2)', flexShrink: 0 }} />
      <input
        className="lib-tag-input"
        value={draft}
        autoFocus
        maxLength={30}
        placeholder="Add a tag (max 30 chars)…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={saving || draft.trim().length < 1 || draft.trim().length > 30}
        style={{
          padding: '4px 11px', borderRadius: 7, border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)',
          fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)', opacity: saving ? 0.6 : 1,
          transition: 'opacity .15s',
        }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        onClick={onCancel}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

