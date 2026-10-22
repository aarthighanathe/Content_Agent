import { useRef } from 'react';
import {
  CheckSquare, Square, ExternalLink, Layers, Tag, MoreHorizontal,
} from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { timeAgo, isSafeHttpUrl } from '../../lib/utils';
import { QualityTierBadge } from '../../components/QualityTierBadge';
import type { LibraryJob } from './libraryHelpers';
import { statusConfig, getQualityScore } from './libraryHelpers';
import type { Collection } from '../../types/collection';
import { LibraryJobMenu } from './LibraryJobMenu';

export interface LibraryJobCardProps {
  job: LibraryJob;
  index: number;
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

export function LibraryJobCard({
  job, index, manageMode, selected, menuOpen, editingTag,
  onToggleSelect, onToggleMenu, onNavigate, onRequestDelete,
  onEditTag, onSaveTag, tagSaving, collections, onAddToCollection,
  activeCollectionId, onRemoveFromCollection,
}: LibraryJobCardProps): React.JSX.Element {
  const moreRef = useRef<HTMLButtonElement>(null);
  const pm = platformMeta[job.platform] || {
    label: job.platform, color: '#A78BFA', Icon: Layers,
    bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.20)', badgeClass: 'badge-purple',
  };
  const sc = statusConfig[job.status] || { label: job.status, color: '#A78BFA' };
  const qs = getQualityScore(job);
  const cardStyle = {
    animationDelay: `${index * 0.03}s`,
    borderColor: selected ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : undefined,
    background: selected ? 'color-mix(in srgb, var(--accent) 3%, transparent)' : undefined,
  };

  const cardInner = (
    <div className="lib-card-inner">
      {manageMode && (
        <div
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select "${job.topic}"`}
          style={{ flexShrink: 0 }}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(job.id); }}
        >
          {selected
            ? <CheckSquare size={14} color="var(--accent)" />
            : <Square size={14} color="var(--text-muted)" />}
        </div>
      )}
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: pm.bg,
        border: `1px solid ${pm.color}28`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <pm.Icon size={17} style={{ color: pm.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, lineHeight: 1.3,
        }}>
          {job.topic}
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 5, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: pm.color, fontWeight: 600 }}>
            {pm.label}
          </span>
          <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--rule)' }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: sc.color,
            background: `${sc.color}12`, borderRadius: 20, padding: '1px 6px',
            border: `1px solid ${sc.color}22`,
          }}>
            {sc.label}
          </span>
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
          {job.tag && (
            <button
              className="lib-tag-chip"
              title={`Tag: ${job.tag}. Click to edit.`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu(job.id);
                onEditTag(job.id);
              }}
            >
              <Tag size={8} />{job.tag}
            </button>
          )}
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <QualityTierBadge score={qs} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.2px' }}>
          {timeAgo(job.createdAt)}
        </span>
      </div>
      {!manageMode && (
        <>
          <button
            ref={moreRef}
            className="lib-more-btn"
            title="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(menuOpen ? null : job.id);
              if (menuOpen) onEditTag(null);
            }}
          >
            <MoreHorizontal size={15} />
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

  if (manageMode) {
    return (
      <div
        className="lib-card"
        role="button"
        tabIndex={0}
        style={cardStyle}
        onClick={() => onToggleSelect(job.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onToggleSelect(job.id);
        }}
      >
        {cardInner}
      </div>
    );
  }

  return (
    <div
      className="lib-card"
      role="button"
      tabIndex={0}
      style={{ ...cardStyle, cursor: 'pointer' }}
      onClick={() => onNavigate(`/result/${job.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(`/result/${job.id}`);
        }
      }}
    >
      {cardInner}
    </div>
  );
}
