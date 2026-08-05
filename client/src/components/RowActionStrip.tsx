import type { LucideIcon } from 'lucide-react';

export interface RowAction {
  key:      string;
  Icon:     LucideIcon;
  label:    string;
  onClick:  () => void;
  danger?:  boolean;
}

interface RowActionStripProps {
  actions: RowAction[];
}

// WHY inline action strip: replaces the kebab-menu + floating-dropdown pattern per
// REVIEW_FINDINGS.md §4.4 ("Retire the kebab-menu + dropdown pattern on job rows for a
// swipeable/expandable row"). Renders every action the caller passes — this component
// makes no assumption about which actions exist on a given page; callers pass only the
// actions that page's kebab menu already offered.
export function RowActionStrip({ actions }: RowActionStripProps) {
  return (
    <div
      className="row-action-strip"
      role="group"
      aria-label="Row actions"
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className="row-action-btn"
          style={{ color: action.danger ? 'var(--color-error)' : 'var(--text-secondary)' }}
          onClick={(e) => { e.stopPropagation(); action.onClick(); }}
        >
          <action.Icon size={13} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
