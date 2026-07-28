import { useState } from 'react';
import { X, CalendarDays, ExternalLink, Trash2, PlusCircle, ChevronDown } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import type { CalendarJob } from './calendarHelpers';
import { getScore } from './calendarHelpers';

interface DayDetailPanelProps {
  selectedDay: string;
  jobs: CalendarJob[];
  onClose: () => void;
  onViewResult: (jobId: string) => void;
  onRemove: (jobId: string) => void;
  /** Unscheduled items — used to offer "Add content" from the day panel (#12). */
  unscheduled: CalendarJob[];
  /** Called when user picks a piece of unscheduled content to add to this day. */
  onAddContent: (jobId: string) => void;
}

// WHY both directions are worth building (#12):
// - Card → day (sidebar Schedule… button): works well when the user is browsing their
//   content library and wants to place a specific piece. The sidebar is the natural
//   starting point on desktop.
// - Day → card (panel "Add content" picker): works well when the user thinks "what
//   should I post on Tuesday?" — they click the day first, then choose from unscheduled
//   content. This is the more natural flow on mobile where the calendar grid is
//   immediately visible but the sidebar is behind a drawer toggle. Both directions call
//   the same allocate() function via their respective callbacks so there is no parallel
//   scheduling code path.
export function DayDetailPanel({
  selectedDay, jobs, onClose, onViewResult, onRemove, unscheduled, onAddContent,
}: DayDetailPanelProps) {
  const [addPickerOpen, setAddPickerOpen] = useState(false);

  const formatted = new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="sc-detail">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(245,158,11,0.7)', marginBottom: 4 }}>
            {formatted}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {jobs.length === 0
              ? 'No content scheduled'
              : `${jobs.length} post${jobs.length !== 1 ? 's' : ''} scheduled`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* "Add content" button — shows when there's unscheduled content to pick from */}
          {unscheduled.length > 0 && (
            <button
              className="sc-add-btn"
              onClick={() => setAddPickerOpen(p => !p)}
              aria-expanded={addPickerOpen}
              aria-haspopup="listbox"
              aria-label="Add content to this day"
            >
              <PlusCircle size={13} aria-hidden />
              Add content
              <ChevronDown size={11} aria-hidden style={{ transform: addPickerOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
            </button>
          )}
          <button className="sc-btn-ghost" onClick={onClose} aria-label="Close day detail" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* "Add content" dropdown — lists unscheduled items to pick from */}
      {addPickerOpen && unscheduled.length > 0 && (
        <div
          className="sc-add-list"
          role="listbox"
          aria-label="Pick content to schedule on this day"
        >
          {unscheduled.map(job => {
            const cfg = platformMeta[job.platform] || platformMeta['linkedin_post'];
            return (
              <button
                key={job.id}
                role="option"
                aria-selected={false}
                className="sc-add-item"
                onClick={() => { onAddContent(job.id); setAddPickerOpen(false); }}
                aria-label={`Schedule "${job.topic}" (${cfg.label}) on ${formatted}`}
              >
                <div style={{ width: 26, height: 26, borderRadius: 7, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <cfg.Icon size={12} style={{ color: cfg.color }} aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.topic}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
                    {cfg.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {jobs.length === 0 && !addPickerOpen ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.18)' }}>
          <CalendarDays size={30} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} aria-hidden />
          <div style={{ fontSize: 12 }}>
            {unscheduled.length > 0
              ? 'No content here yet — use "Add content" above or drag from the sidebar.'
              : 'No content scheduled. Create new content to get started.'}
          </div>
        </div>
      ) : (
        jobs.map(job => {
          const cfg = platformMeta[job.platform] || platformMeta['linkedin_post'];
          const score = getScore(job);
          return (
            <div key={job.id} className="sc-detail-job">
              <div style={{ width: 38, height: 38, borderRadius: 9, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <cfg.Icon size={17} style={{ color: cfg.color }} aria-hidden />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.topic}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{cfg.label}{job.tone ? ` · ${job.tone}` : ''}</div>
              </div>
              {score != null && (
                <div style={{ flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: score >= 80 ? 'var(--color-success)' : score >= 60 ? '#F59E0B' : 'var(--color-error)', background: score >= 80 ? 'rgba(16,185,129,0.1)' : score >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${score >= 80 ? 'rgba(16,185,129,0.25)' : score >= 60 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 20, padding: '2px 8px' }}>
                  {score}
                </div>
              )}
              <button className="sc-btn-ghost" title="View result" onClick={() => onViewResult(job.id)} style={{ color: 'rgba(255,255,255,0.3)' }} aria-label={`View result for "${job.topic}"`}>
                <ExternalLink size={13} />
              </button>
              <button className="sc-btn-ghost" title="Remove from schedule" onClick={() => onRemove(job.id)} style={{ color: 'rgba(239,68,68,0.5)' }} aria-label={`Remove "${job.topic}" from this day`}>
                <Trash2 size={13} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
