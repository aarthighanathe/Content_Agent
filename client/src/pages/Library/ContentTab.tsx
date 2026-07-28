import { Link } from 'react-router-dom';
import { ChevronDown, CheckSquare, Square, ExternalLink, X, Layers } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { timeAgo } from '../../lib/utils';
import { QualityTierBadge } from '../../components/QualityTierBadge';
import { RowActionStrip } from '../../components/RowActionStrip';
import { EmptyStateIllustration } from '../../components/EmptyStateIllustration';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { LibraryJob } from './libraryHelpers';
import { statusConfig, getQualityScore } from './libraryHelpers';

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
}

export function ContentTab({
  jobsError, onRetryJobs, isLoading, filteredJobs, search, manageMode, selectedIds, openJobMenu,
  onToggleSelect, onToggleMenu, onNavigate, onRequestDelete, page, totalPages, onPageChange,
}: ContentTabProps) {
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
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(2.5rem,8vw,4rem) 1.5rem', textAlign: 'center', gap: 10 }}>
        <EmptyStateIllustration variant={search ? 'search' : 'library'} size={112} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          {search ? `No results for "${search}"` : 'No content yet'}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
          {search ? 'Try a different search term' : 'Create your first piece of content to see it here'}
        </p>
        {!search && <Link to="/create" className="btn-primary" style={{ marginTop: 12 }}>Create content →</Link>}
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
          const cardStyle = { animationDelay: `${i * 0.03}s`, borderColor: isSel ? 'rgba(245,158,11,0.3)' : undefined, background: isSel ? 'rgba(245,158,11,0.03)' : undefined };
          const cardInner = (
            <div className="lib-card-inner">
              {manageMode && (
                <div style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); onToggleSelect(job.id); }}>
                  {isSel ? <CheckSquare size={14} color="#F59E0B" /> : <Square size={14} color="rgba(255,255,255,0.25)" />}
                </div>
              )}
              <div style={{ width: 42, height: 42, borderRadius: 10, background: pm.bg, border: `1px solid ${pm.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <pm.Icon size={17} style={{ color: pm.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, lineHeight: 1.3 }}>
                  {job.topic}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: pm.color, fontWeight: 600 }}>{pm.label}</span>
                  <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: sc.color, background: `${sc.color}12`, borderRadius: 20, padding: '1px 6px', border: `1px solid ${sc.color}22` }}>
                    {sc.label}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <QualityTierBadge score={qs} />
                <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.2)', fontFamily: "var(--font-mono)" }}>
                  {timeAgo(job.createdAt)}
                </span>
              </div>
              {!manageMode && (
                <ChevronDown size={14} className={`row-expand-toggle${isExpanded ? ' open' : ''}`} style={{ flexShrink: 0, padding: 0 }} />
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

          // 4.4: normal mode — click-to-expand row (replaces the old kebab dropdown)
          // reveals an inline action strip instead of navigating away directly; the
          // strip's own "View result" action is what navigates now.
          return (
            <div key={job.id} className="lib-card" style={{ ...cardStyle, cursor: 'pointer' }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggleMenu(isExpanded ? null : job.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleMenu(isExpanded ? null : job.id); } }}
              >
                {cardInner}
              </div>
              {isExpanded && (
                <RowActionStrip
                  actions={[
                    { key: 'view', Icon: ExternalLink, label: 'View result', onClick: () => onNavigate(`/result/${job.id}`) },
                    { key: 'delete', Icon: X, label: 'Delete', onClick: () => onRequestDelete(job.id), danger: true },
                  ]}
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
              <button key={p} onClick={() => onPageChange(p)} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${p === page ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.07)'}`, background: p === page ? 'rgba(245,158,11,0.1)' : 'transparent', color: p === page ? '#F59E0B' : 'rgba(255,255,255,0.38)', fontSize: 12, cursor: 'pointer', fontFamily: "var(--font-mono)", transition: 'all .18s' }}>{p}</button>
            ))}
          </div>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={{ padding: '8px 16px', fontSize: 12 }}>Next →</button>
        </div>
      )}
    </>
  );
}
