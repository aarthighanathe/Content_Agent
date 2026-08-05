import React from 'react';
import { Instagram, Linkedin, XTwitter } from '../../../components/BrandIcons';
import { Sparkles, ChevronDown, Check, AlertTriangle, Undo2, ExternalLink, RefreshCw } from 'lucide-react';
import type { MultiplyEntry } from '../hooks/useMultiplier';
import type { ContentJob } from '../../../types/job';

const platforms = [
  { id: 'instagram_carousel', label: 'Instagram Carousel', short: 'Carousel', color: '#ec4899', Icon: Instagram  },
  { id: 'linkedin_post',      label: 'LinkedIn Post',      short: 'LinkedIn', color: '#60a5fa', Icon: Linkedin   },
  { id: 'twitter_thread',     label: 'Twitter Thread',     short: 'Twitter',  color: '#22d3ee', Icon: XTwitter  },
  { id: 'instagram_caption',  label: 'Instagram Caption',  short: 'Caption',  color: '#a78bfa', Icon: Instagram  },
];

interface Props {
  jobData:          ContentJob | null;
  multiplyJobs:     Record<string, MultiplyEntry>;
  onMultiply:       (platform: string) => void;
  show:             boolean;
  onToggle:         () => void;
}

export function ContentMultiplier({ jobData, multiplyJobs, onMultiply, show, onToggle }: Props) {
  const filtered = platforms.filter((p) => p.id !== jobData?.platform);
  const doneCount = Object.values(multiplyJobs).filter((j) => j.status === 'done').length;

  return (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 18, marginTop: 4 }}>
      <button onClick={onToggle} className="rp-mult-banner" style={{ width: '100%', border: 'none', marginBottom: show ? 16 : 0, textAlign: 'left' }}>
        <div className="rp-mult-banner-icon"><Sparkles size={14} /></div>
        <div className="rp-mult-banner-text">
          <div className="rp-mult-banner-label">Content Multiplier</div>
          <div className="rp-mult-banner-sub">
            Adapt to {filtered.length} other platforms · reuses research
            {doneCount > 0 && <span style={{ color: 'var(--color-success)', marginLeft: 8 }}>· {doneCount} ready</span>}
          </div>
        </div>
        <ChevronDown size={14} className={`rp-mult-banner-chevron${show ? ' open' : ''}`} />
      </button>

      {show && (
        <div className="rp-mult-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(224px,1fr))' }}>
          {filtered.map((p) => {
            const mj       = multiplyJobs[p.id];
            const isSource = p.id === jobData?.sourcePlatform && !!jobData?.sourceJobId;
            const isDone   = mj?.status === 'done';
            const isProc   = mj?.status === 'processing';
            const isFailed = mj?.status === 'failed';
            const preview  = isDone && mj.content
              ? (Array.isArray(mj.content) ? mj.content[0]?.headline : mj.content.hook || mj.content.tweets?.[0]?.text || mj.content.caption || '')
              : '';

            return (
              <div key={p.id} style={{ background: 'var(--bg-raised)', border: `1px solid ${isSource ? `${p.color}22` : isDone ? `${p.color}30` : isProc ? `${p.color}18` : `${p.color}15`}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color .25s', boxShadow: isDone ? `0 0 20px ${p.color}0A` : 'none' }}>
                <div style={{ height: 2.5, background: isSource ? `linear-gradient(90deg,${p.color}50,${p.color}20)` : isDone ? `linear-gradient(90deg,${p.color},${p.color}50)` : isProc ? `linear-gradient(90deg,${p.color}60,transparent)` : `${p.color}25`, transition: 'background .3s' }} />
                <div style={{ padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {/* Platform header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: isSource ? `${p.color}12` : isDone ? `${p.color}18` : `${p.color}0C`, border: `1px solid ${isSource ? `${p.color}25` : isDone ? `${p.color}30` : `${p.color}20`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s' }}>
                      <p.Icon size={15} color={isSource || isDone ? p.color : `${p.color}A0`} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: isSource || isDone ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.label}</div>
                      <div style={{ fontSize: 9.5, color: isSource ? `${p.color}90` : 'var(--text-muted)', fontFamily: "var(--font-mono)" }}>
                        {isSource ? 'Source content' : isDone ? 'Ready to view' : isProc ? 'Generating…' : 'Cached research'}
                      </div>
                    </div>
                    {isDone && !isSource && <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: `${p.color}18`, border: `1px solid ${p.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.color }}><Check size={9} /></div>}
                    {isSource && <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, background: `${p.color}12`, border: `1px solid ${p.color}30`, color: p.color, fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20 }}>origin</div>}
                  </div>

                  {/* Progress bar */}
                  {isProc && (
                    <div>
                      <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: `linear-gradient(90deg,${p.color},${p.color}60)`, borderRadius: 2, width: `${mj.progress || 15}%`, transition: 'width .6s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Adapting content…</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: p.color }}>{mj.progress || 15}%</span>
                      </div>
                    </div>
                  )}

                  {/* Preview snippet */}
                  {isDone && preview && (
                    <div style={{ background: `${p.color}08`, border: `1px solid ${p.color}18`, borderRadius: 8, padding: '9px 11px', overflow: 'hidden' }}>
                      <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{preview}</p>
                    </div>
                  )}

                  {/* Failed */}
                  {isFailed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(239,68,68,0.7)', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, padding: '7px 10px' }}>
                      <AlertTriangle size={12} /> Generation failed
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => isSource ? window.open(`/result/${jobData.sourceJobId}`, '_blank') : isDone && mj.jobId ? window.open(`/result/${mj.jobId}`, '_blank') : onMultiply(p.id)}
                    disabled={isProc}
                    style={{ background: isSource ? `${p.color}10` : isDone ? `${p.color}15` : isFailed ? 'var(--bg-raised)' : `${p.color}0C`, border: `1px solid ${isSource ? `${p.color}28` : isDone ? `${p.color}35` : `${p.color}22`}`, borderRadius: 8, padding: '8px 12px', cursor: isProc ? 'not-allowed' : 'pointer', fontSize: 12, color: p.color, transition: 'all .18s', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontWeight: isSource || isDone ? 600 : 400, marginTop: 'auto' }}
                  >
                    {isProc
                      ? <><span style={{ display: 'inline-block', width: 10, height: 10, border: `1.5px solid ${p.color}40`, borderTopColor: p.color, borderRadius: '50%', animation: 'rp-spin .7s linear infinite' }} /> Generating…</>
                      : isSource ? <><Undo2 size={11} /> View Original {p.short}</>
                      : isDone   ? <><ExternalLink size={11} /> Open {p.short}</>
                      : <>{isFailed ? <><RefreshCw size={11} /> Retry</> : <><Sparkles size={11} /> Adapt to {p.short}</>}</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
