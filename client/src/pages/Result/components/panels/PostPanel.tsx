import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { Send, Clock, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { schedulePost } from '../../../../api';
import type { SocialConnection } from '../../../../types/api';
import type { ContentJob, PlatformContent } from '../../../../types/job';
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

function getContentPreview(content: ResultContent | undefined, platform: string): string {
  if (!content) return '';
  try {
    if (Array.isArray(content)) {
      // WHY optional-chained headline/body: could be a carousel SlideData[] OR (in theory)
      // a PlatformContent[] tweets-like array — SlideData is the only real array shape here,
      // matches the previous untyped behavior's `content[0]?.headline`.
      return `${content[0]?.headline ?? ''}\n${content[0]?.body ?? ''}`.slice(0, 300);
    }
    // WHY 'segments' exclusion: VideoScriptContentData.hook is an object, not a string —
    // posting a video script through this flat-text preview isn't supported (Post panel
    // targets LinkedIn/Twitter/Instagram, not a video platform), so fall through to ''.
    if ('segments' in content) return '';
    if (platform === 'linkedin') {
      if (content.hook) return `${content.hook}\n\n${content.body || ''}`.slice(0, 300);
      if (content.caption) return content.caption.slice(0, 300);
    }
    if (platform === 'twitter') {
      if (content.tweets?.length) return content.tweets.map((t) => t.text).join('\n—\n').slice(0, 300);
      if (content.hook) return content.hook.slice(0, 280);
    }
    if (platform === 'instagram' && content.caption) return content.caption.slice(0, 300);
    if (content.hook) return `${content.hook}\n\n${content.cta || ''}`.slice(0, 300);
    if (content.caption) return content.caption.slice(0, 300);
  } catch {
    // WHY: preview is best-effort display text — swallow malformed content shapes
    // rather than crashing the drawer.
  }
  return '';
}

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
  const preview = useMemo(() => getContentPreview(content, selectedPlatform), [content, selectedPlatform]);
  const canSchedule = SCHEDULE_SUPPORTED.includes(selectedPlatform);
  const result = postResult[selectedPlatform];
  const isPosting = postingTo === selectedPlatform;
  const postLink = postLinks[selectedPlatform];

  const PlatIcon = PLATFORM_ICON_COMPONENTS[selectedPlatform] || null;
  const platColor = PLATFORM_COLORS[selectedPlatform] || '#60a5fa';

  async function handleSchedule() {
    if (!scheduleDate || !selectedPlatform || !content) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      // WHY unknown->PlatformContent cast: SchedulePostInput's content type predates
      // carousel/video-script scheduling; the `!content` guard above already confirms a
      // real value is being sent, so this is a type-system technicality (same rationale
      // as useSocial.ts's identical cast for postToSocial).
      const scheduleContent = content as unknown as PlatformContent | PlatformContent[] | string;
      const res = await schedulePost({ platform: selectedPlatform, content: scheduleContent, scheduledAt: new Date(scheduleDate).toISOString(), jobId });
      setScheduleResult({ ok: true, scheduledAt: res.scheduledAt });
      setView('done');
    } catch (err: unknown) {
      // WHY axios.isAxiosError: narrows `unknown` to AxiosError before reading the
      // server's { error: string } response body, instead of trusting an `any` catch.
      const message = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setScheduleError(message || 'Failed to schedule post');
    } finally {
      setScheduling(false);
    }
  }

  // Platform selection step
  if (view === 'select') {
    return (
      <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: "var(--font-mono)", marginBottom: 4 }}>
          Select platform to publish
        </div>
        {connections.map((conn) => {
          const PIcon = PLATFORM_ICON_COMPONENTS[conn.platform];
          const color = PLATFORM_COLORS[conn.platform] || '#60a5fa';
          const isSelected = selectedPlatform === conn.platform;
          return (
            <button
              key={conn.platform}
              onClick={() => { setSelectedPlatform(conn.platform); setView('preview'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                background: isSelected ? `rgba(${hexToRgb(color)},0.12)` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .18s',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(${hexToRgb(color)},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
                {PIcon ? <PIcon size={18} /> : <Send size={16} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{conn.label}</div>
                {conn.displayName && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{conn.displayName}</div>}
              </div>
              <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            </button>
          );
        })}
        {connections.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '20px 0' }}>
            No connected accounts.<br />
            <a href="/brand" style={{ color: '#F59E0B', textDecoration: 'none' }}>Connect accounts in Brand settings →</a>
          </div>
        )}
      </div>
    );
  }

  // Content preview step
  if (view === 'preview') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => setView('select')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: 0, alignSelf: 'flex-start' }}>
          <ChevronLeft size={12} /> Back
        </button>

        {/* Platform badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `rgba(${hexToRgb(platColor)},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: platColor }}>
            {PlatIcon ? <PlatIcon size={14} /> : <Send size={13} />}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{selected?.label}</div>
            {selected?.displayName && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{selected.displayName}</div>}
          </div>
        </div>

        {/* Content preview */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: "var(--font-mono)", marginBottom: 6 }}>Preview</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>
            {preview || <span style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No preview available for this platform</span>}
          </div>
          {preview.length >= 297 && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>…truncated for preview</div>
          )}
        </div>

        {/* Error state */}
        {result === 'error' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px' }}>
            <AlertCircle size={14} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-error)' }}>Post failed</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>There was an error posting to {selected?.label}. Check your connection and try again.</div>
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
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)', borderRadius: 9, padding: '10px 0',
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
        <button onClick={() => setView('preview')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: 0, alignSelf: 'flex-start' }}>
          <ChevronLeft size={12} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} style={{ color: platColor }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Schedule for {selected?.label}</span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
            Date and time
          </label>
          <input
            type="datetime-local"
            min={getMinDateTime()}
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '9px 12px', color: 'rgba(255,255,255,0.85)', fontSize: 13,
              outline: 'none', colorScheme: 'dark',
            }}
          />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 5 }}>
            Minimum 5 minutes from now
          </div>
        </div>

        {/* WHY this note: scheduling currently only saves the reminder — there is
            no delivery worker wired up yet to actually publish at the scheduled
            time (FUNCTIONAL_AUDIT_2026-07.md finding #5). The old "Post scheduled!"
            confirmation implied automatic publishing, which never happens. */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '9px 12px', fontSize: 11.5, color: 'rgba(245,158,11,0.85)', lineHeight: 1.5 }}>
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>This saves a reminder only — auto-publishing isn't available yet. Come back at the scheduled time and post it yourself from here.</span>
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
            background: scheduleDate && !scheduling ? `rgba(${hexToRgb(platColor)},0.15)` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${scheduleDate && !scheduling ? `rgba(${hexToRgb(platColor)},0.4)` : 'rgba(255,255,255,0.08)'}`,
            color: scheduleDate && !scheduling ? platColor : 'rgba(255,255,255,0.3)',
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
        <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
          {scheduleResult ? 'Reminder saved!' : 'Posted!'}
        </div>
        {scheduleResult?.scheduledAt && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', maxWidth: 260 }}>
            We'll remind you on {formatScheduledDate(scheduleResult.scheduledAt)} — you'll need to come back and post it yourself.
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
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

function formatScheduledDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function Spinner() {
  return (
    <div style={{ width: 11, height: 11, border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'rp-spin .7s linear infinite', flexShrink: 0 }} />
  );
}
