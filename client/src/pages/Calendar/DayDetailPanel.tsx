import { useEffect, useRef, useState } from 'react';
import { X, CalendarDays, ExternalLink, Trash2, PlusCircle, ChevronDown, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { platformMeta } from '../../lib/platformMeta';
import { getSocialConnections } from '../../api';
import type { CalendarJob } from './calendarHelpers';
import { getScore } from './calendarHelpers';
import type { PublishPlatform, ScheduledPost } from '../../types/scheduledPost';

interface DayDetailPanelProps {
  selectedDay: string;
  jobs: CalendarJob[];
  /** jobId → its scheduled_posts row, for reading publishPlatform/publishStatus. */
  postsByJobId: Record<string, ScheduledPost>;
  onClose: () => void;
  onViewResult: (jobId: string) => void;
  onRemove: (jobId: string) => void;
  /** Unscheduled items — used to offer "Add content" from the day panel (#12). */
  unscheduled: CalendarJob[];
  /** Called when user picks a piece of unscheduled content to add to this day. */
  onAddContent: (jobId: string) => void;
  /** Called when user sets/changes/clears which platform to auto-publish this job to. */
  onSetPublishPlatform: (jobId: string, platform: PublishPlatform | undefined) => void;
}

const PUBLISH_PLATFORM_LABELS: Record<PublishPlatform, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
};

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
  selectedDay, jobs, postsByJobId, onClose, onViewResult, onRemove, unscheduled, onAddContent, onSetPublishPlatform,
}: DayDetailPanelProps) {
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [platformMenuJobId, setPlatformMenuJobId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // WHY: this panel renders below the grid inside the same scrollable .sc-cal column,
  // so on any viewport where the grid + header already fill the visible area, opening
  // a day silently appends content off-screen with no visual cue it exists — the user
  // has to already know to scroll. Auto-scrolling it into view on selection closes that
  // gap without needing to relocate the panel (which would break the click-day-to-expand
  // mental model). Re-fires on selectedDay change (new day picked while one is already
  // open), not just mount.
  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedDay]);

  // WHY fetched here, not passed as a prop from Calendar.tsx: only this panel
  // needs the connected-accounts list (to populate the publish-platform
  // picker) — staleTime matches ResultHeader/PostPanel's own profile-style
  // queries elsewhere in this codebase (a 5-minute-stale connections list is
  // an acceptable staleness for a picker menu, not data driving a decision).
  const { data: connectionsData } = useQuery({
    queryKey: ['social', 'connections'],
    queryFn: getSocialConnections,
    staleTime: 5 * 60 * 1000,
  });
  const connectedPlatforms = (connectionsData?.connections || [])
    .filter((c) => c.connected && (c.platform === 'linkedin' || c.platform === 'twitter'))
    .map((c) => c.platform as PublishPlatform);

  const formatted = new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="sc-detail" ref={panelRef}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'color-mix(in srgb, var(--accent) 70%, transparent)', marginBottom: 4 }}>
            {formatted}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
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
          <button className="sc-btn-ghost" onClick={onClose} aria-label="Close day detail" style={{ color: 'var(--text-muted)' }}>
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
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.topic}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {cfg.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {jobs.length === 0 && !addPickerOpen ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
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
          const post = postsByJobId[job.id];
          const isPlatformMenuOpen = platformMenuJobId === job.id;
          return (
            <div key={job.id} className="sc-detail-job-wrap">
              <div className="sc-detail-job">
                <div style={{ width: 38, height: 38, borderRadius: 9, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <cfg.Icon size={17} style={{ color: cfg.color }} aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.topic}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{cfg.label}{job.tone ? ` · ${job.tone}` : ''}</div>
                </div>
                {score != null && (
                  <div style={{ flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--accent)' : 'var(--color-error)', background: score >= 80 ? 'color-mix(in srgb, var(--color-success) 10%, transparent)' : score >= 60 ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'color-mix(in srgb, var(--color-error) 10%, transparent)', border: `1px solid ${score >= 80 ? 'color-mix(in srgb, var(--color-success) 25%, transparent)' : score >= 60 ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'color-mix(in srgb, var(--color-error) 25%, transparent)'}`, borderRadius: 20, padding: '2px 8px' }}>
                    {score}
                  </div>
                )}
                <button className="sc-btn-ghost" title="View result" onClick={() => onViewResult(job.id)} style={{ color: 'var(--text-muted)' }} aria-label={`View result for "${job.topic}"`}>
                  <ExternalLink size={13} />
                </button>
                <button className="sc-btn-ghost" title="Remove from schedule" onClick={() => onRemove(job.id)} style={{ color: 'color-mix(in srgb, var(--color-error) 50%, transparent)' }} aria-label={`Remove "${job.topic}" from this day`}>
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Publish platform control + status badge — reminder-only (post === undefined
                  or post.publishPlatform === null) shows just the "Set publish platform"
                  affordance; once a platform is chosen this also shows pending/posted/failed. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px 10px 60px', flexWrap: 'wrap' }}>
                {post?.publishPlatform ? (
                  <>
                    {post.publishStatus === 'pending' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        <Loader2 size={10} style={{ animation: 'sc-spin .8s linear infinite' }} />
                        Will auto-publish to {PUBLISH_PLATFORM_LABELS[post.publishPlatform]}
                      </span>
                    )}
                    {post.publishStatus === 'posted' && (
                      <a
                        href={post.postUrl ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-success)', textDecoration: 'none' }}
                      >
                        <CheckCircle2 size={10} />
                        Posted to {PUBLISH_PLATFORM_LABELS[post.publishPlatform]}
                      </a>
                    )}
                    {post.publishStatus === 'failed' && (
                      <span title={post.publishError ?? undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-error)' }}>
                        <AlertCircle size={10} />
                        Failed to publish to {PUBLISH_PLATFORM_LABELS[post.publishPlatform]}
                      </span>
                    )}
                    <button
                      className="sc-btn-ghost"
                      onClick={() => onSetPublishPlatform(job.id, undefined)}
                      style={{ color: 'var(--text-muted)', fontSize: 10, padding: '2px 6px' }}
                      title="Stop auto-publishing this post"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <button
                      className="sc-btn-ghost"
                      onClick={() => setPlatformMenuJobId(isPlatformMenuOpen ? null : job.id)}
                      disabled={connectedPlatforms.length === 0}
                      title={connectedPlatforms.length === 0 ? 'Connect a social account in Brand settings to enable auto-publish' : 'Auto-publish this post'}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: connectedPlatforms.length === 0 ? 'var(--text-muted)' : 'var(--accent)', opacity: connectedPlatforms.length === 0 ? 0.5 : 1 }}
                    >
                      <Send size={10} /> Auto-publish…
                    </button>
                    {isPlatformMenuOpen && connectedPlatforms.length > 0 && (
                      <div className="sc-publish-menu">
                        {connectedPlatforms.map((p) => (
                          <button
                            key={p}
                            className="sc-publish-menu-item"
                            onClick={() => { onSetPublishPlatform(job.id, p); setPlatformMenuJobId(null); }}
                          >
                            {PUBLISH_PLATFORM_LABELS[p]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
