import { Link } from 'react-router-dom';
import { CheckSquare, Square, Check, X, Pencil, Trash2, ArrowRight, ChevronDown, Smartphone } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import { EmptyStateIllustration } from '../../components/EmptyStateIllustration';
import { RowActionStrip } from '../../components/RowActionStrip';
import type { LibraryTemplate } from './libraryHelpers';
import { formatDate } from './libraryHelpers';

interface TemplatesTabProps {
  templatesError: boolean;
  onRetryTemplates: () => void;
  isLoading: boolean;
  filteredTemplates: LibraryTemplate[];
  search: string;
  manageMode: boolean;
  selectedIds: Set<string>;
  openTemplateMenu: string | null;
  onToggleMenu: (id: string | null) => void;
  editingId: string | null;
  editName: string;
  deleteTemplateId: string | null;
  onToggleSelect: (id: string) => void;
  onStartEdit: (id: string, name: string) => void;
  onEditNameChange: (value: string) => void;
  onRename: (id: string) => void;
  onCancelEdit: () => void;
  onRequestDelete: (id: string | null) => void;
  onConfirmDelete: (id: string) => void;
  onUseTemplate: (tmpl: LibraryTemplate) => void;
}

export function TemplatesTab({
  templatesError, onRetryTemplates, isLoading, filteredTemplates, search, manageMode, selectedIds,
  openTemplateMenu, onToggleMenu, editingId, editName, deleteTemplateId, onToggleSelect, onStartEdit,
  onEditNameChange, onRename, onCancelEdit, onRequestDelete, onConfirmDelete, onUseTemplate,
}: TemplatesTabProps) {
  if (templatesError) {
    return <ErrorState message="We couldn't load your templates. Please try again." onRetry={onRetryTemplates} />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(i => <SkeletonCard key={i} size="md" />)}
      </div>
    );
  }

  if (filteredTemplates.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(2.5rem,8vw,4rem) 1.5rem', textAlign: 'center', gap: 10 }}>
        <EmptyStateIllustration variant={search ? 'search' : 'templates'} size={112} style={{ marginBottom: 2 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          {search ? `No templates matching "${search}"` : 'No templates saved yet'}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
          {search ? 'Try a different search' : 'On any Result page, click "Save as template" to bottle your best content structures'}
        </p>
        {!search && <Link to="/create" className="btn-primary" style={{ marginTop: 12 }}>Generate content →</Link>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {filteredTemplates.map((tmpl, i) => {
        const meta = platformMeta[tmpl.platform] || { label: tmpl.platform, Icon: Smartphone, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' };
        const isEditing = editingId === tmpl.id;
        const isDeleting = deleteTemplateId === tmpl.id;
        const isSel = selectedIds.has(tmpl.id);
        const isExpanded = openTemplateMenu === tmpl.id;
        const cardStyle = { animationDelay: `${i * 0.04}s`, borderColor: isSel ? 'rgba(245,158,11,0.3)' : undefined, background: isSel ? 'rgba(245,158,11,0.03)' : undefined };

        const cardInner = (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {manageMode && (
              <div style={{ flexShrink: 0, paddingTop: 2 }}>
                {isSel ? <CheckSquare size={14} color="#F59E0B" /> : <Square size={14} color="rgba(255,255,255,0.25)" />}
              </div>
            )}
            <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: meta.bg, border: `1px solid ${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <meta.Icon size={16} style={{ color: meta.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }} onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => onEditNameChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onRename(tmpl.id); if (e.key === 'Escape') onCancelEdit(); }}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 7, padding: '5px 10px', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                  <button onClick={() => onRename(tmpl.id)} aria-label="Save name" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)', padding: 4 }}><Check size={14} /></button>
                  <button onClick={onCancelEdit} aria-label="Cancel rename" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}><X size={14} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {tmpl.name}
                  </p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', background: meta.bg, border: `1px solid ${meta.color}28`, borderRadius: 20, padding: '1px 8px', fontSize: 10, color: meta.color, fontWeight: 600, flexShrink: 0 }}>
                    {meta.label}
                  </span>
                </div>
              )}
              {tmpl.topic && (
                <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Topic: {tmpl.topic}
                </p>
              )}
              {tmpl.hookStyle && (
                <p style={{ margin: '0 0 2px', fontSize: 11.5, color: 'rgba(255,255,255,0.25)' }}>
                  Hook: {tmpl.hookStyle}{tmpl.ctaPattern ? ` · CTA: ${tmpl.ctaPattern}` : ''}
                </p>
              )}
              <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(255,255,255,0.2)', fontFamily: "var(--font-mono)" }}>
                Saved {formatDate(tmpl.createdAt)}
              </p>
            </div>
            {!manageMode && !isEditing && (
              <ChevronDown size={14} className={`row-expand-toggle${isExpanded ? ' open' : ''}`} style={{ flexShrink: 0, padding: 0, marginTop: 4 }} />
            )}
          </div>
        );

        // manageMode: whole card selects, matching ContentTab's manageMode behavior exactly
        // (bulk actions handled via the toolbar's own bulk-delete — no per-row expand needed
        // while selecting).
        if (manageMode) {
          return (
            <div
              key={tmpl.id}
              className="lib-tmpl-card"
              role="button"
              tabIndex={0}
              style={{ ...cardStyle, cursor: 'pointer' }}
              onClick={() => onToggleSelect(tmpl.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleSelect(tmpl.id); }}
            >
              {cardInner}
            </div>
          );
        }

        // Normal mode — click-to-expand row (matches ContentTab's pattern) reveals an
        // inline action strip (Rename/Use/Delete) instead of showing all three icons
        // persistently on every row (audit #30).
        return (
          <div key={tmpl.id} className="lib-tmpl-card" style={cardStyle}>
            <div
              role="button"
              tabIndex={0}
              style={{ cursor: isEditing ? 'default' : 'pointer' }}
              onClick={() => { if (!isEditing) onToggleMenu(isExpanded ? null : tmpl.id); }}
              onKeyDown={(e) => { if (!isEditing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggleMenu(isExpanded ? null : tmpl.id); } }}
            >
              {cardInner}
            </div>
            {isExpanded && !isDeleting && (
              <RowActionStrip
                actions={[
                  { key: 'rename', Icon: Pencil, label: 'Rename', onClick: () => onStartEdit(tmpl.id, tmpl.name) },
                  { key: 'use', Icon: ArrowRight, label: 'Use', onClick: () => onUseTemplate(tmpl) },
                  { key: 'delete', Icon: Trash2, label: 'Delete', onClick: () => onRequestDelete(tmpl.id), danger: true },
                ]}
              />
            )}
            {isDeleting && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--color-error)' }}>Delete "{tmpl.name}"?</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onConfirmDelete(tmpl.id)} style={{ background: 'var(--color-error)', border: 'none', borderRadius: 7, padding: '5px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  <button onClick={() => onRequestDelete(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '5px 12px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
