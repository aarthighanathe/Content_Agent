import { useState } from 'react';
import { History, ChevronDown } from 'lucide-react';
import type { CompetitorAnalysisHistoryItem } from '../../types/social';
import { timeAgo } from '../../lib/utils';

interface HistoryDropdownProps {
  isLoading: boolean;
  items: CompetitorAnalysisHistoryItem[];
  onSelect: (item: CompetitorAnalysisHistoryItem) => void;
}

// WHY a small self-contained dropdown, not a modal/drawer: the task calls for
// keeping this addition small and consistent with the existing page's card
// styling — a modal would be a heavier UI commitment than "click a past
// handle to reload it client-side" warrants. Matches the existing page's
// var(--accent)/var(--bg-raised) CSS-variable convention throughout
// Competitor.tsx rather than introducing new hardcoded colors.
export function HistoryDropdown({ isLoading, items, onSelect }: HistoryDropdownProps) {
  const [open, setOpen] = useState(false);

  // WHY hidden entirely (not shown-empty): a user with no past analyses yet
  // has nothing meaningful to browse — an empty dropdown trigger would just
  // be visual noise on first use.
  if (!isLoading && items.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: '1px solid var(--rule)', borderRadius: 8,
          padding: '7px 12px', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1,
        }}
      >
        <History size={13} /> Past analyses
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <>
          {/* WHY a full-viewport click-catcher, not onBlur: onBlur on the
              trigger button fires before the option's onClick registers,
              closing the dropdown before the selection is read. */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
          <div
            role="listbox"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 11,
              minWidth: 260, maxHeight: 320, overflowY: 'auto',
              background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 6,
            }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => { onSelect(item); setOpen(false); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                  width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                  borderRadius: 7, padding: '8px 10px', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent) 8%, transparent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>@{item.handle}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  {item.industry ? `${item.industry} · ` : ''}{timeAgo(item.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
