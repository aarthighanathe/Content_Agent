import { useState } from 'react';
import { History, ChevronDown, Trash2 } from 'lucide-react';
import type { CompetitorAnalysisHistoryItem } from '../../types/social';
import { timeAgo } from '../../lib/utils';
import { deleteCompetitorAnalysis } from '../../api';
import { useQueryClient } from '@tanstack/react-query';
import { competitorPlatformLabel } from './platforms';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const queryClient = useQueryClient();

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(id);
    setDeleteError('');
    try {
      await deleteCompetitorAnalysis(id);
      queryClient.invalidateQueries({ queryKey: ['competitor', 'history'] });
    } catch {
      setDeleteError('Could not delete — try again.');
    } finally {
      setDeletingId(null);
    }
  }

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
              minWidth: 280, maxHeight: 320, overflowY: 'auto',
              background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 6,
            }}
          >
            {deleteError && (
              <p style={{ fontSize: 11, color: 'var(--color-error)', margin: '4px 8px 8px' }}>
                {deleteError}
              </p>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                role="option"
                aria-selected={false}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', borderRadius: 7, padding: '4px 4px 4px 10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => { onSelect(item); setOpen(false); }}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                    textAlign: 'left', background: 'transparent', border: 'none',
                    borderRadius: 7, padding: '6px 4px', cursor: 'pointer', minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>@{item.handle}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {[competitorPlatformLabel(item.platform), item.industry, timeAgo(item.createdAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  disabled={deletingId === item.id}
                  aria-label={`Delete analysis for @${item.handle}`}
                  style={{
                    flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: 6, borderRadius: 4, color: 'var(--text-muted)',
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
