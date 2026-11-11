import { Search, X, ArrowUpDown, Check, Tag } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import type { SortKey } from './libraryHelpers';
import { SORT_OPTS } from './libraryHelpers';
import { CollectionsPanel } from './CollectionsPanel';
import { LibraryManageBar } from './LibraryManageBar';
import type { Collection } from '../../types/collection';

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  manageMode: boolean;
  selectedCount: number;
  pageJobCount: number;
  matchingCount: number;
  pageFullySelected: boolean;
  allMatchingSelected: boolean;
  hasActiveFilter: boolean;
  onSelectPage: () => void;
  onSelectAllMatching: () => void;
  onClearSelection: () => void;
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
  pageTags: string[];
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: (name: string) => void;
  creatingCollection: boolean;
  onRequestDeleteCollection: (id: string, name: string) => void;
  deletingCollectionId: string | null;
  collectionsLoading: boolean;
}

export function LibraryToolbar({
  search, onSearchChange, manageMode, selectedCount,
  pageJobCount, matchingCount, pageFullySelected, allMatchingSelected, hasActiveFilter,
  onSelectPage, onSelectAllMatching, onClearSelection,
  onExportCSV, exporting, onBulkDelete, jobsLoading, jobsError,
  platformFilters, platformFilter, onPlatformFilterChange, platformCounts, total,
  sort, onSortChange, showSortMenu, onToggleSortMenu,
  pageTags, tagFilter, onTagFilterChange,
  collections, activeCollectionId, onSelectCollection, onCreateCollection,
  creatingCollection, onRequestDeleteCollection, deletingCollectionId, collectionsLoading,
}: LibraryToolbarProps): React.JSX.Element {
  return (
    <div className="lib-controls">
      <div className="lib-controls-top">
        <div className="lib-search-wrap">
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            placeholder="Search by topic…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search library by topic"
          />
          {search && (
            <button
              type="button"
              className="lib-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {!jobsError && (
          <div className="lib-filter-tools">
            <CollectionsPanel
              collections={collections}
              activeCollectionId={activeCollectionId}
              onSelectCollection={onSelectCollection}
              onCreateCollection={onCreateCollection}
              creating={creatingCollection}
              onRequestDeleteCollection={onRequestDeleteCollection}
              deletingId={deletingCollectionId}
              loading={collectionsLoading}
            />
            <div className="lib-sort-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`lib-sort-btn${sort !== 'date' ? ' active' : ''}`}
                onClick={onToggleSortMenu}
              >
                <ArrowUpDown size={12} style={{ flexShrink: 0 }} />
                {sort !== 'date' ? SORT_OPTS.find((o) => o.key === sort)?.label.split(' ')[0] : 'Sort'}
              </button>
              {showSortMenu && (
                <div className="lib-sort-menu">
                  {SORT_OPTS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
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
      </div>

      {manageMode && (
        <LibraryManageBar
          selectedCount={selectedCount}
          pageJobCount={pageJobCount}
          matchingCount={matchingCount}
          pageFullySelected={pageFullySelected}
          allMatchingSelected={allMatchingSelected}
          hasActiveFilter={hasActiveFilter}
          onSelectPage={onSelectPage}
          onSelectAllMatching={onSelectAllMatching}
          onClearSelection={onClearSelection}
          onExportCSV={onExportCSV}
          exporting={exporting}
          onBulkDelete={onBulkDelete}
        />
      )}

      {!jobsError && (
        <div className="lib-filter-row">
          <div className="lib-filters" role="group" aria-label="Filter by platform">
            {platformFilters.map((f) => {
              const meta = platformMeta[f];
              const label = f === 'all' ? 'All' : (meta?.label || f);
              const color = meta?.color || 'var(--accent)';
              const active = platformFilter === f;
              const count = f === 'all' ? total : (platformCounts[f] || 0);
              return (
                <button
                  key={f}
                  type="button"
                  className={`lib-pill${active ? ' on' : ''}`}
                  onClick={() => onPlatformFilterChange(f)}
                  style={{
                    borderColor: active
                      ? (f === 'all'
                        ? 'color-mix(in srgb, var(--accent) 40%, transparent)'
                        : (meta?.border ?? `${color}45`))
                      : undefined,
                    background: active
                      ? (f === 'all'
                        ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                        : (meta?.bg ?? `${color}14`))
                      : undefined,
                    color: active ? (f === 'all' ? 'var(--accent)' : color) : undefined,
                  }}
                >
                  {f !== 'all' && meta && <meta.Icon size={12} style={{ flexShrink: 0 }} />}
                  {label}
                  {count > 0 && <span className="lib-pill-count">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!jobsLoading && !jobsError && pageTags.length > 0 && (
        <div className="lib-tag-filters" aria-label="Filter by tag">
          {tagFilter && (
            <button
              type="button"
              className="lib-tag-filter-pill active"
              onClick={() => onTagFilterChange('')}
              title="Clear tag filter"
            >
              <X size={9} /> Clear
            </button>
          )}
          {pageTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`lib-tag-filter-pill${tagFilter === t ? ' active' : ''}`}
              onClick={() => onTagFilterChange(tagFilter === t ? '' : t)}
            >
              <Tag size={9} />{t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
