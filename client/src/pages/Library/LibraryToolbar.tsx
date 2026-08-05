import { Search, X, CheckSquare, Square, Download, Trash2, ArrowUpDown, Check, Tag } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import type { SortKey } from './libraryHelpers';
import { SORT_OPTS } from './libraryHelpers';

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  manageMode: boolean;
  selectedCount: number;
  onSelectAll: () => void;
  selectingAll?: boolean;
  onExportCSV: () => void;
  exporting?: boolean;
  onBulkDelete: () => void;
  jobsLoading: boolean;
  jobsError: boolean;
  platformFilters: string[];
  platformFilter: string;
  onPlatformFilterChange: (value: string) => void;
  platformCounts: Record<string, number>;
  total: number;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  showSortMenu: boolean;
  onToggleSortMenu: () => void;
  // ── tag filter ──
  pageTags: string[];
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
}

export function LibraryToolbar({
  search, onSearchChange, manageMode, selectedCount,
  onSelectAll, selectingAll, onExportCSV, exporting, onBulkDelete, jobsLoading, jobsError,
  platformFilters, platformFilter, onPlatformFilterChange, platformCounts, total,
  sort, onSortChange, showSortMenu, onToggleSortMenu,
  pageTags, tagFilter, onTagFilterChange,
}: LibraryToolbarProps) {
  return (
    <>
      {/* ── Search ── */}
      <div className="lib-search-wrap">
        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          placeholder="Search by topic..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        {search && (
          <button onClick={() => onSearchChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Manage Mode Bar ── */}
      {manageMode && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          background: 'color-mix(in srgb, var(--accent) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
          borderRadius: 11, padding: '10px 16px', animation: 'lib-up .18s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onSelectAll}
              disabled={selectingAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: selectingAll ? 'default' : 'pointer', color: 'var(--color-text-secondary)', fontSize: 12, padding: 0, opacity: selectingAll ? 0.6 : 1 }}
            >
              {selectedCount > 0
                ? <CheckSquare size={14} color="var(--accent)" />
                : <Square size={14} />}
              {selectingAll ? 'Selecting…' : 'Select all matching'}
            </button>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: "var(--font-mono)" }}>
              {selectedCount} selected
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onExportCSV}
              disabled={exporting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, cursor: exporting ? 'default' : 'pointer', color: 'var(--color-success)', fontSize: 12, fontWeight: 500, opacity: exporting ? 0.6 : 1 }}
            >
              <Download size={13} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            {selectedCount > 0 && (
              <button
                onClick={onBulkDelete}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, cursor: 'pointer', color: 'var(--color-error)', fontSize: 12, fontWeight: 500 }}
              >
                <Trash2 size={13} /> Delete {selectedCount}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Platform filters + sort ── */}
      {!jobsLoading && !jobsError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="lib-filters" style={{ flex: 1 }}>
            {platformFilters.map(f => {
              const meta  = platformMeta[f];
              const label = f === 'all' ? 'All' : (meta?.label || f);
              const color = meta?.color || 'var(--accent)';
              const active = platformFilter === f;
              const count  = f === 'all' ? total : (platformCounts[f] || 0);
              return (
                <button
                  key={f}
                  className="lib-pill"
                  onClick={() => onPlatformFilterChange(f)}
                  style={{
                    borderColor: active ? (f === 'all' ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : `${color}45`) : 'var(--rule)',
                    background:  active ? (f === 'all' ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : `${color}12`) : 'transparent',
                    color:       active ? (f === 'all' ? 'var(--accent)' : color) : 'var(--color-text-muted)',
                  }}
                >
                  {f !== 'all' && meta && <meta.Icon size={12} style={{ marginRight: 3, flexShrink: 0 }} />}{label}
                  {count > 0 && <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 9 }}>{count}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              className={`lib-sort-btn${sort !== 'date' ? ' active' : ''}`}
              onClick={onToggleSortMenu}
            >
              <ArrowUpDown size={12} style={{ flexShrink: 0 }} /> {sort !== 'date' ? SORT_OPTS.find(o => o.key === sort)?.label.split(' ')[0] : 'Sort'}
            </button>
            {showSortMenu && (
              <div className="lib-sort-menu">
                {SORT_OPTS.map(opt => (
                  <button
                    key={opt.key}
                    className={`lib-sort-item${sort === opt.key ? ' sel' : ''}`}
                    onClick={() => onSortChange(opt.key)}
                  >
                    {opt.label}
                    {sort === opt.key && <Check size={10} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tag filter pills (only shown when the current page has tagged jobs) ── */}
      {!jobsLoading && !jobsError && pageTags.length > 0 && (
        <div className="lib-tag-filters" aria-label="Filter by tag">
          {tagFilter && (
            <button
              className="lib-tag-filter-pill active"
              onClick={() => onTagFilterChange('')}
              title="Clear tag filter"
            >
              <X size={9} /> Clear filter
            </button>
          )}
          {pageTags.map(t => (
            <button
              key={t}
              className={`lib-tag-filter-pill${tagFilter === t ? ' active' : ''}`}
              onClick={() => onTagFilterChange(tagFilter === t ? '' : t)}
            >
              <Tag size={9} />{t}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
