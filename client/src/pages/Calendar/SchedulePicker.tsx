import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { DAY_LABELS, MONTH_NAMES } from './calendarHelpers';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface SchedulePickerProps {
  /** The job being scheduled. */
  jobId: string;
  /** The month/year to display (from the calendar's current viewDate). */
  viewYear: number;
  viewMonth: number; // 0-indexed
  /** Days that already have content (highlight, but still allow). */
  scheduledDays?: Set<string>;
  /** Called when the user picks a date. */
  onPick: (dateKey: string) => void;
  /** Called when the picker should be dismissed without scheduling. */
  onClose: () => void;
}

// WHY a flat mini-grid instead of a full ARIA datepicker widget (#12): ARIA datepicker
// (role="grid" + roving tabindex) is the gold standard but adds significant complexity
// for modest a11y gain on a non-form context. A simple tab-through-days approach with
// arrow-key navigation is sufficient here: every day button is naturally focusable, arrow
// keys move between them, Enter/Space selects, Escape closes. This covers keyboard-only
// and switch-device users end-to-end without a framework dependency.
export function SchedulePicker({
  viewYear, viewMonth, scheduledDays, onPick, onClose,
}: SchedulePickerProps) {
  const today = new Date();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  // Focus the first available day button when the picker opens.
  const gridRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(pickerRef, true);

  useEffect(() => {
    const firstBtn = gridRef.current?.querySelector<HTMLButtonElement>('button[data-day]');
    firstBtn?.focus();
  }, []);

  // Arrow-key navigation within the grid.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const buttons = Array.from(gridRef.current?.querySelectorAll<HTMLButtonElement>('button[data-day]') ?? []);
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? 7 : -7;
    const next = buttons[idx + delta];
    if (next) next.focus();
  }

  return (
    <div
      ref={pickerRef}
      className="sc-picker"
      role="dialog"
      aria-modal="true"
      aria-label={`Pick a date in ${MONTH_NAMES[viewMonth]} ${viewYear}`}
    >
      {/* Header */}
      <div className="sc-picker-hd">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: '#F59E0B' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          className="sc-btn-ghost"
          onClick={onClose}
          aria-label="Close date picker"
          style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="sc-picker-grid" ref={gridRef} onKeyDown={handleKeyDown}>
        {DAY_LABELS.map(d => (
          <div key={d} className="sc-picker-lbl">{d[0]}</div>
        ))}
        {Array.from({ length: totalCells }).map((_, cellIdx) => {
          const dayNum = cellIdx - firstDayOfWeek + 1;
          if (dayNum < 1 || dayNum > daysInMonth) return <div key={cellIdx} />;

          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === dayNum;
          const isPast = new Date(viewYear, viewMonth, dayNum) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const hasContent = scheduledDays?.has(dateKey);

          return (
            <button
              key={cellIdx}
              data-day={dayNum}
              className={`sc-picker-day${isToday ? ' is-today' : ''}${hasContent ? ' has-content' : ''}${isPast ? ' is-past' : ''}`}
              onClick={() => { onPick(dateKey); onClose(); }}
              aria-label={`Schedule on ${new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${hasContent ? ' — already has content' : ''}`}
              aria-pressed={false}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
        ↑↓←→ navigate · Enter select · Esc close
      </div>
    </div>
  );
}
