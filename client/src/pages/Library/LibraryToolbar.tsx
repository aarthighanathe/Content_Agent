import { Search, X, CheckSquare, Square, Download, Trash2, ArrowUpDown, Check } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import type { Tab, SortKey } from './libraryHelpers';
import { SORT_OPTS } from './libraryHelpers';

interface LibraryToolbarProps {
  activeTab: Tab;
  search: string;
  onSearchChange: (value: string) => void;
  manageMode: boolean;
  selectedCount: number;
  activeListLength: number;
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
}

export function LibraryToolbar({
  activeTab, search, onSearchChange, manageMode, selectedCount, activeListLength,
  onSelectAll, selectingAll, onExportCSV, exporting, onBulkDelete, jobsLoading, jobsError,
  platformFilters, platformFilter, onPlatformFilterChange, platformCounts, total,
  sort, onSortChange, showSortMenu, onToggleSortMenu,
}: LibraryToolbarProps) {
  return (
    <>
      {/* ── Search ── */}
      <div className="lib-search-wrap">
        <Search size={14} style={{ color: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
        <input
          placeholder={activeTab === 'content' ? 'Search by topic...' : 'Search templates...'}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        {search && (
          <button onClick={() => onSearchChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', padding: 0, display: 'flex', alignItems: 'center' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Manage Mode Bar ── */}
      {manageMode && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 11, padding: '10px 16px', animation: 'lib-up .18s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onSelectAll}
              disabled={selectingAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: selectingAll ? 'default' : 'pointer', color: 'var(--color-text-secondary)', fontSize: 12, padding: 0, opacity: selectingAll ? 0.6 : 1 }}
            >
              {(activeTab === 'content' ? selectedCount > 0 : selectedCount === activeListLength && activeListLength > 0)
                ? <CheckSquare size={14} color="#F59E0B" />
                : <Square size={14} />}
              {selectingAll ? 'Selecting…' : (activeTab === 'content' ? 'Select all matching' : 'Select all')}
            </button>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', fontFamily: "var(--font-mono)" }}>
              {selectedCount} selected
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeTab === 'content' && (
              <button
                onClick={onExportCSV}
                disabled={exporting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, cursor: exporting ? 'default' : 'pointer', color: 'var(--color-success)', fontSize: 12, fontWeight: 500, opacity: exporting ? 0.6 : 1 }}
              >
                <Download size={13} /> {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            )}
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

      {/* ── Content Tab: Platform filters + sort ── */}
      {activeTab === 'content' && !jobsLoading && !jobsError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="lib-filters" style={{ flex: 1 }}>
            {platformFilters.map(f => {
              const meta  = platformMeta[f];
              const label = f === 'all' ? 'All' : (meta?.label || f);
              const color = meta?.color || '#F59E0B';
              const active = platformFilter === f;
              const count  = f === 'all' ? total : (platformCounts[f] || 0);
              return (
                <button
                  key={f}
                  className="lib-pill"
                  onClick={() => onPlatformFilterChange(f)}
                  style={{
                    borderColor: active ? (f === 'all' ? 'rgba(245,158,11,0.4)' : `${color}45`) : 'rgba(255,255,255,0.08)',
                    background:  active ? (f === 'all' ? 'rgba(245,158,11,0.1)' : `${color}12`) : 'transparent',
                    color:       active ? (f === 'all' ? '#F59E0B' : color) : 'var(--color-text-muted)',
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
    </>
  );
}
