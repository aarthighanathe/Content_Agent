import { useState } from 'react';
import { GripVertical, CheckCircle2, Sparkles, Calendar } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { SkeletonBlock } from '../../components/SkeletonCard';
import type { CalendarJob } from './calendarHelpers';
import { getScore } from './calendarHelpers';
import { SchedulePicker } from './SchedulePicker';

interface CalendarSidebarProps {
  open: boolean;
  loading: boolean;
  isError: boolean;
  jobs: CalendarJob[];
  unscheduled: CalendarJob[];
  hitFetchCap: boolean;
  dragJobId: string | null;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  onCreateNew: () => void;
  /** Year/month of the calendar view, forwarded to SchedulePicker. */
  viewYear: number;
  viewMonth: number;
  /** Dates that already have scheduled content — used by picker to highlight days. */
  scheduledDays: Set<string>;
  /** Called with (dateKey, jobId) when user picks a date via the Schedule… button. */
  onSchedule: (dateKey: string, jobId: string) => void;
  /** Mobile-only: whether the drawer sheet is open on ≤640px. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function CalendarSidebar({
  open, loading, isError, jobs, unscheduled, hitFetchCap, dragJobId,
  onDragStart, onDragEnd, onCreateNew,
  viewYear, viewMonth, scheduledDays, onSchedule,
  mobileOpen, onMobileClose,
}: CalendarSidebarProps) {
  // WHY local state (#12): the "which card's picker is open" state belongs to the
  // sidebar because it's purely a UI concern — the parent only needs to know about
  // confirmed schedule allocations, not which picker is currently open.
  const [pickerJobId, setPickerJobId] = useState<string | null>(null);

  function handleSchedule(dateKey: string, jobId: string) {
    onSchedule(dateKey, jobId);
    setPickerJobId(null);
  }

  const inner = (
    <div className="sc-sidebar-inner">
      <div className="sc-sidebar-hd">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
          Content Library
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {loading ? '…' : `${unscheduled.length} unscheduled`}
        </div>
        {/* WHY updated hint (#12): old text said "Drag a card…" — now acknowledges both
            drag and the new click-to-schedule path so keyboard/touch users know they
            have an option. */}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Drag a card onto a date, or tap <strong style={{ color: 'var(--text-secondary)' }}>Schedule…</strong> to pick a date.
        </div>
        {!loading && !isError && hitFetchCap && (
          <div style={{ marginTop: 8, fontSize: 10.5, color: 'color-mix(in srgb, var(--accent) 55%, transparent)', lineHeight: 1.5 }}>
            Showing your most recent content only — older posts aren't in this list yet.
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} height={68} radius={10} delay={i * 0.1} style={{ border: '1px solid var(--rule)' }} />
        ))}
        {!loading && isError && (
          <div style={{ textAlign: 'center', padding: '32px 12px', color: 'color-mix(in srgb, var(--color-error) 70%, transparent)', fontSize: 12 }}>
            Couldn't load your content library.
          </div>
        )}
        {!loading && !isError && jobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
            No finished content yet — create something first.
          </div>
        )}
        {!loading && !isError && jobs.length > 0 && unscheduled.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
            <CheckCircle2 size={28} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            All content is scheduled!
          </div>
        )}

        {!loading && unscheduled.map(job => {
          const cfg = platformMeta[job.platform] || platformMeta['linkedin_post'];
          const score = getScore(job);
          const isPickerOpen = pickerJobId === job.id;
          return (
            <div key={job.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div
                className={`sc-card${dragJobId === job.id ? ' dragging' : ''}`}
                draggable
                onDragStart={() => onDragStart(job.id)}
                onDragEnd={onDragEnd}
                // WHY aria-label on the card (#12): screen readers need to announce
                // the card's purpose since its visual affordance is a grip icon.
                aria-label={`${job.topic} — ${cfg.label}. Draggable. Use the Schedule button to pick a date with keyboard.`}
              >
                <GripVertical size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} aria-hidden />
                {/* WHY a platform-colored thumbnail, not raw content text: GET /jobs
                    (the endpoint this sidebar's data comes from) intentionally omits
                    each output's `content` column to keep the list response light
                    (server/src/routes/jobs/manage.ts) — the topic string is the only
                    content-derived text already fetched here. This thumbnail gives the
                    card a stronger visual identity than the previous plain icon chip,
                    and title="" surfaces the full topic on hover since the line below
                    truncates with an ellipsis. */}
                <div
                  title={job.topic}
                  style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${cfg.bg}, ${cfg.color}22)`, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <cfg.Icon size={14} style={{ color: cfg.color }} aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div title={job.topic} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.topic}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {cfg.label}{job.tone ? ` · ${job.tone}` : ''}
                  </div>
                </div>
                {score != null && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--accent)' : 'var(--color-error)', flexShrink: 0 }}>
                    {score}
                  </div>
                )}
                {/* WHY this button is inside the draggable div (#12): placing it here keeps
                    the affordance visually co-located with its card, and its click event
                    doesn't bubble to drag handlers since drag events are separate. The
                    button stops the card from being the only scheduling path — keyboard and
                    touch users can now access scheduling without drag-and-drop. */}
                <button
                  className="sc-schedule-btn"
                  aria-label={`Schedule "${job.topic}" — pick a date`}
                  aria-expanded={isPickerOpen}
                  aria-haspopup="dialog"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPickerJobId(isPickerOpen ? null : job.id);
                  }}
                  title="Pick a date to schedule this"
                >
                  <Calendar size={11} aria-hidden />
                  <span>Schedule…</span>
                </button>
              </div>

              {/* Inline expanded picker below the card */}
              {isPickerOpen && (
                <SchedulePicker
                  jobId={job.id}
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  scheduledDays={scheduledDays}
                  onPick={(dateKey) => handleSchedule(dateKey, job.id)}
                  onClose={() => setPickerJobId(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--rule)' }}>
        <button
          className="btn-primary"
          onClick={onCreateNew}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 14px', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}
        >
          <Sparkles size={13} /> Create new content
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop/tablet sidebar (unchanged behaviour — slide in/out with sidebarOpen) */}
      <div className={`sc-sidebar${open ? '' : ' closed'}`}>
        {inner}
      </div>

      {/* Mobile bottom-sheet drawer (#12): on ≤640px the sidebar collapses to width:0
          unconditionally via CSS, making drag-and-drop (and the previous sidebar) entirely
          unreachable. Instead of fighting the CSS, we render a separate sheet element
          that slides up from the bottom of the screen when toggled, overlaying the
          calendar grid. This is the primary scheduling path on touch devices. */}
      <div
        className={`sc-mobile-sheet${mobileOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Content library — pick content to schedule"
      >
        <div className="sc-mobile-sheet-handle" />
        {/* Close button row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px', borderBottom: '1px solid var(--rule)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)' }}>
            Content Library
          </span>
          <button
            className="sc-btn-ghost"
            onClick={onMobileClose}
            aria-label="Close content library"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>
        {inner}
      </div>

      {/* Scrim behind mobile sheet */}
      {mobileOpen && (
        <div
          className="sc-mobile-scrim"
          onClick={onMobileClose}
          aria-hidden
        />
      )}
    </>
  );
}
