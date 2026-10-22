import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { Send, Clock, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { scheduleJob } from '../../../../api';
import { flattenContentToPreview } from '../../../../lib/contentFlattener.js';
import type { SocialConnection } from '../../../../types/api';
import type { ContentJob } from '../../../../types/job';
import type { PublishPlatform } from '../../../../types/scheduledPost';
import type { ResultContent } from '../ContentColumn';

interface Props {
  connections:  SocialConnection[];
  content:      ResultContent | undefined;
  jobId?:       string;
  jobData?:     ContentJob | null;
  postingTo:    string | null;
  postResult:   Record<string, 'ok' | 'error'>;
  postLinks?:   Record<string, string>;
  onPost:       (platform: string) => void;
  onClose:      () => void;
}

// Brand SVG icons (lucide-react doesn't export social brand icons)
function LinkedInIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
    </svg>
  );
}
function TwitterIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function InstagramIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

type PlatIconProps = { size?: number; style?: React.CSSProperties };
const PLATFORM_ICON_COMPONENTS: Record<string, React.ComponentType<PlatIconProps>> = {
  linkedin:  LinkedInIcon,
  twitter:   TwitterIcon,
  instagram: InstagramIcon,
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin:  '#0A66C2',
  twitter:   '#1DA1F2',
  instagram: '#E1306C',
};

const SCHEDULE_SUPPORTED = ['linkedin', 'twitter'];

function getMinDateTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5);
  return d.toISOString().slice(0, 16);
}

export function PostPanel({ connections, content, jobId, jobData: _jobData, postingTo, postResult, postLinks = {}, onPost, onClose }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(connections[0]?.platform || '');
  const [view, setView] = useState<'select' | 'preview' | 'schedule' | 'done'>('select');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<{ ok: boolean; scheduledAt?: string } | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const selected = connections.find((c) => c.platform === selectedPlatform);
  const preview = useMemo(() => flattenContentToPreview(content, selectedPlatform), [content, selectedPlatform]);
  const canSchedule = SCHEDULE_SUPPORTED.includes(selectedPlatform);
  const result = postResult[selectedPlatform];
  const isPosting = postingTo === selectedPlatform;
  const postLink = postLinks[selectedPlatform];

  const PlatIcon = PLATFORM_ICON_COMPONENTS[selectedPlatform] || null;
  const platColor = PLATFORM_COLORS[selectedPlatform] || '#60a5fa';

  async function handleSchedule() {
    if (!scheduleDate || !selectedPlatform || !jobId) return;
    if (selectedPlatform !== 'linkedin' && selectedPlatform !== 'twitter') {
      setScheduleError('Auto-publish is only available for LinkedIn and Twitter');
      return;
    }
    setScheduling(true);
    setScheduleError(null);
    try {
      // WHY Calendar scheduledPosts + publish worker, not social/schedule Map:
      // the in-memory reminder path never delivered posts and was lost on restart.
      // jobId is required here so we can upsert into the real scheduled_posts table
      // with optional auto-publish on the chosen platform (fires ~9am user TZ).
      const local = new Date(scheduleDate);
      const yyyy = local.getFullYear();
      const mm = String(local.getMonth() + 1).padStart(2, '0');
      const dd = String(local.getDate()).padStart(2, '0');
      const scheduledDateKey = `${yyyy}-${mm}-${dd}`;
      // WHY hour from datetime-local (L10/F12): Calendar publish worker fires at
      // a whole hour in the user's TZ — minutes are floored to the selected hour.
      const publishHour = local.getHours();
      const res = await scheduleJob({
        jobId,
        scheduledDate: scheduledDateKey,
        publishPlatform: selectedPlatform as PublishPlatform,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        publishHour,
      });
      setScheduleResult({
        ok: true,
        scheduledAt: res.scheduledPost.scheduledDate,
      });
      setView('done');
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setScheduleError(message || 'Failed to schedule post');
    } finally {
      setScheduling(false);
    }
  }

  // Platform selection step
  if (view === 'select') {
    return (
      <div className="rp-post-select">
        {connections.map((conn) => {
          const PIcon = PLATFORM_ICON_COMPONENTS[conn.platform];
          const color = PLATFORM_COLORS[conn.platform] || '#60a5fa';
          return (
            <button
              key={conn.platform}
              type="button"
              className="rp-post-account"
              onClick={() => { setSelectedPlatform(conn.platform); setView('preview'); }}
              style={{
                borderColor: 'var(--rule)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.background =
                  `rgba(${hexToRgb(color)},0.08)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--rule)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              <div
                className="rp-post-account-icon"
                style={{ background: `rgba(${hexToRgb(color)},0.15)`, color }}
              >
                {PIcon ? <PIcon size={18} /> : <Send size={16} />}
              </div>
              <div className="rp-post-account-copy">
                <div className="rp-post-account-name">{conn.label}</div>
                {conn.displayName && (
                  <div className="rp-post-account-handle">{conn.displayName}</div>
                )}
              </div>
              <ChevronRight size={14} className="rp-post-account-chevron" aria-hidden />
            </button>
          );
        })}
        {connections.length === 0 && (
          <div className="rp-panel-empty">
            <p className="rp-panel-empty-title">No connected accounts</p>
            <p className="rp-panel-empty-blurb">
              <a href="/brand" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Connect LinkedIn or X in Brand settings →
              </a>
            </p>
          </div>
        )}
      </div>
    );
  }

  // Content preview step
  if (view === 'preview') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => setView('select')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: 0, alignSelf: 'flex-start' }}>
          <ChevronLeft size={12} /> Back
        </button>

        {/* Platform badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `rgba(${hexToRgb(platColor)},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: platColor }}>
            {PlatIcon ? <PlatIcon size={14} /> : <Send size={13} />}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{selected?.label}</div>
            {selected?.displayName && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{selected.displayName}</div>}
          </div>
        </div>

        {/* Content preview */}
        <div style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)', border: '1px solid var(--rule)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "var(--font-mono)", marginBottom: 6 }}>Preview</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>
            {preview || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No preview available for this platform</span>}
          </div>
          {preview.length >= 297 && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>…truncated for preview</div>
          )}
        </div>

        {/* Error state */}
        {result === 'error' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px' }}>
            <AlertCircle size={14} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-error)' }}>Post failed</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>There was an error posting to {selected?.label}. Check your connection and try again.</div>
            </div>
          </div>
        )}

        {/* Success state */}
        {result === 'ok' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '10px 12px' }}>
            <CheckCircle size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)' }}>Posted successfully!</div>
              {postLink && (
                <a href={postLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                  View post <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* CTAs */}
        {result !== 'ok' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onPost(selectedPlatform)}
              disabled={!!postingTo}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: `rgba(${hexToRgb(platColor)},0.15)`, border: `1px solid rgba(${hexToRgb(platColor)},0.4)`,
                color: platColor, borderRadius: 9, padding: '10px 0', cursor: postingTo ? 'wait' : 'pointer',
                fontSize: 12.5, fontWeight: 600, transition: 'all .18s',
              }}
            >
              {isPosting
                ? <><Spinner /> Posting…</>
                : result === 'error'
                ? <><RefreshCw size={12} /> Retry</>
                : <><Send size={12} /> Post Now</>}
            </button>

            {canSchedule && (
              <button
                onClick={() => setView('schedule')}
                disabled={!!postingTo}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', border: '1px solid var(--rule)',
                  color: 'var(--text-secondary)', borderRadius: 9, padding: '10px 0',
                  cursor: 'pointer', fontSize: 12.5, fontWeight: 500, transition: 'all .18s',
                }}
              >
                <Calendar size={12} /> Schedule
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Schedule picker step
  if (view === 'schedule') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={() => setView('preview')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: 0, alignSelf: 'flex-start' }}>
          <ChevronLeft size={12} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} style={{ color: platColor }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Schedule for {selected?.label}</span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Date and time
          </label>
          <input
            className="raw-input-focus-visible"
            type="datetime-local"
            min={getMinDateTime()}
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'color-mix(in srgb, var(--text-primary) 5%, transparent)', border: '1px solid var(--rule)',
              borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13,
              outline: 'none', colorScheme: 'dark',
            }}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
            Minimum 5 minutes from now
          </div>
        </div>

        {/* WHY Calendar scheduled_posts: Result schedule upserts the same table
            Calendar uses; publishHour comes from the datetime-local control. */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRadius: 8, padding: '9px 12px', fontSize: 11.5, color: 'color-mix(in srgb, var(--accent) 85%, transparent)', lineHeight: 1.5 }}>
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Saves to your Calendar and queues auto-publish for this platform at the selected hour in your timezone. You can also manage it from Calendar.</span>
        </div>

        {scheduleError && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--color-error)' }}>
            <AlertCircle size={12} /> {scheduleError}
          </div>
        )}

        <button
          onClick={handleSchedule}
          disabled={!scheduleDate || scheduling}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: scheduleDate && !scheduling ? `rgba(${hexToRgb(platColor)},0.15)` : 'color-mix(in srgb, var(--text-primary) 5%, transparent)',
            border: `1px solid ${scheduleDate && !scheduling ? `rgba(${hexToRgb(platColor)},0.4)` : 'var(--rule)'}`,
            color: scheduleDate && !scheduling ? platColor : 'var(--text-muted)',
            borderRadius: 9, padding: '11px 0', cursor: scheduleDate && !scheduling ? 'pointer' : 'default',
            fontSize: 13, fontWeight: 600, transition: 'all .18s',
          }}
        >
          {scheduling ? <><Spinner /> Scheduling…</> : <><Calendar size={12} /> Schedule Post</>}
        </button>
      </div>
    );
  }

  // Done state (after schedule or after post)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle size={22} style={{ color: 'var(--color-success)' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {scheduleResult ? 'Scheduled!' : 'Posted!'}
        </div>
        {scheduleResult?.scheduledAt && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 260 }}>
            {/* WHY not “around 9:00”: schedule now sends publishHour from the
                datetime-local control (L10/F12), so the copy must match. */}
            Added to Calendar for {scheduleResult.scheduledAt}
            {scheduleDate
              ? ` · auto-publish around ${new Date(scheduleDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} in your timezone.`
              : ' — auto-publish runs at the hour you selected.'}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Close
      </button>
    </div>
  );
}

// Helpers

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255,255,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

function Spinner() {
  return (
    <div style={{ width: 11, height: 11, border: '1.5px solid var(--rule)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'rp-spin .7s linear infinite', flexShrink: 0 }} />
  );
}
