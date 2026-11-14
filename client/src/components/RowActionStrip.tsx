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

// WHY: inline strip (not kebab + dropdown): row actions stay visible on touch/narrow layouts.
// Callers pass only the actions that page supports — no fixed action set here.
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
