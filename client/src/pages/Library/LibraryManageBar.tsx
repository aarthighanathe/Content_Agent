import { CheckSquare, Square, Download, Trash2, X } from 'lucide-react';

interface LibraryManageBarProps {
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
}

function selectionSummary(
  selectedCount: number,
  pageFullySelected: boolean,
  allMatchingSelected: boolean,
  matchingCount: number,
  hasActiveFilter: boolean,
): string {
  if (selectedCount === 0) {
    return 'Tap cards to select, or select this page';
  }
  if (allMatchingSelected) {
    return hasActiveFilter
      ? `All ${matchingCount} matching selected`
      : `All ${matchingCount} pieces selected`;
  }
  if (pageFullySelected) {
    return `${selectedCount} selected on this page`;
  }
  return `${selectedCount} selected`;
}

export function LibraryManageBar({
  selectedCount,
  pageJobCount,
  matchingCount,
  pageFullySelected,
  allMatchingSelected,
  hasActiveFilter,
  onSelectPage,
  onSelectAllMatching,
  onClearSelection,
  onExportCSV,
  exporting,
  onBulkDelete,
}: LibraryManageBarProps): React.JSX.Element {
  const canSelectMore = pageFullySelected
    && !allMatchingSelected
    && matchingCount > pageJobCount;
  const selectAllLabel = hasActiveFilter
    ? `Select all ${matchingCount} matching`
    : `Select all ${matchingCount} in library`;

  return (
    <div className="lib-manage-bar" role="region" aria-label="Bulk manage">
      <div className="lib-manage-left">
        {selectedCount === 0 ? (
          <button
            type="button"
            className="lib-manage-select"
            onClick={onSelectPage}
            disabled={pageJobCount === 0}
          >
            <Square size={14} />
            Select this page
          </button>
        ) : (
          <button
            type="button"
            className="lib-manage-select"
            onClick={onClearSelection}
          >
            <X size={14} />
            Clear
          </button>
        )}

        {!pageFullySelected && selectedCount > 0 && pageJobCount > 0 && (
          <button
            type="button"
            className="lib-manage-select subtle"
            onClick={onSelectPage}
          >
            <CheckSquare size={13} />
            Select page
          </button>
        )}

        {canSelectMore && (
          <button
            type="button"
            className="lib-manage-select-all"
            onClick={onSelectAllMatching}
          >
            {selectAllLabel}
          </button>
        )}

        <span className="lib-manage-count">
          {selectionSummary(
            selectedCount,
            pageFullySelected,
            allMatchingSelected,
            matchingCount,
            hasActiveFilter,
          )}
        </span>
      </div>

      <div className="lib-manage-actions">
        <button
          type="button"
          className="lib-manage-export"
          onClick={onExportCSV}
          disabled={exporting}
          title={
            selectedCount > 0
              ? `Export ${selectedCount} selected piece${selectedCount === 1 ? '' : 's'}`
              : hasActiveFilter
                ? `Export all ${matchingCount} matching pieces`
                : `Export all ${matchingCount} pieces in your library`
          }
        >
          <Download size={13} />
          {exporting
            ? 'Exporting…'
            : selectedCount > 0
              ? `Export ${selectedCount}`
              : 'Export CSV'}
        </button>
        {selectedCount > 0 && (
          <button type="button" className="lib-manage-delete" onClick={onBulkDelete}>
            <Trash2 size={13} /> Delete {selectedCount}
          </button>
        )}
      </div>
    </div>
  );
}
