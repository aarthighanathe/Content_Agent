import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon, Sparkles, Video } from 'lucide-react';
import { Instagram, Linkedin, XTwitter } from '../../components/BrandIcons';
import { SectionDivider } from './SectionDivider';

interface DemoPlatform {
  id: string;
  label: string;
  icon: ReactNode;
}

const demoPlatforms: DemoPlatform[] = [
  { id: 'instagram_carousel', label: 'Carousel', icon: <Instagram size={13} /> },
  { id: 'linkedin_post', label: 'LinkedIn', icon: <Linkedin size={13} /> },
  { id: 'twitter_thread', label: 'Twitter', icon: <XTwitter size={13} /> },
  { id: 'instagram_caption', label: 'Caption', icon: <ImageIcon size={13} /> },
  { id: 'video_script', label: 'Video', icon: <Video size={13} /> },
];

// WHY this shape: mirrors server/src/routes/demo.ts's platformPrompts exactly — a
// truncated preview (3 carousel slides / 3 tweets / short caption / hook+1 segment)
// per platform, returned as `preview: parsed` straight from the LLM with no
// post-processing. All fields optional since only the fields for the requested
// platform are ever present.
interface DemoSlide {
  slideNumber?: number;
  headline?: string;
  body?: string;
}

interface DemoPreview {
  hook?: string;
  body?: string;
  tweets?: { number?: number; text?: string }[];
  caption?: string;
  hashtags?: string[];
  segments?: { number?: number; script?: string; duration?: string }[];
}

// WHY separate from DemoPreview: the video_script demo prompt shapes `hook` as
// { text, duration } (an object), not a string like every other platform's `hook`.
interface DemoVideoPreview {
  hook?: { text?: string; duration?: string };
  segments?: { number?: number; script?: string; duration?: string }[];
}

interface DemoResult {
  platform: string;
  topic: string;
  preview: DemoSlide[] | DemoPreview | DemoVideoPreview;
  truncated: boolean;
}

export function LiveDemo() {
  const [demoTopic, setDemoTopic] = useState('');
  const [demoPlatform, setDemoPlatform] = useState('instagram_carousel');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [demoError, setDemoError] = useState('');

  async function runDemo(): Promise<void> {
    if (!demoTopic.trim() || demoLoading) return;
    setDemoLoading(true);
    setDemoError('');
    setDemoResult(null);
    try {
      // WHY raw fetch() instead of the shared api.ts axios instance: the demo endpoint
      // (POST /api/demo/generate) is intentionally unauthenticated — the server mounts
      // it without requireAuth middleware so any visitor can try the demo without an
      // account. The shared `api` instance unconditionally attaches a Clerk Bearer token
      // via its request interceptor; using it here would send auth headers to a public
      // route and would break for unauthenticated visitors who have no Clerk session.
      // See server/src/routes/demo.ts: "no auth required, returns a truncated sample".
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/demo/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: demoTopic.trim(), platform: demoPlatform }),
      });
      // WHY unknown then guard: fetch's .json() is typed `any` by lib.dom.d.ts; treat the
      // response as unknown and confirm shape before trusting it as DemoResult or an error
      // envelope, since it's server data the client doesn't compile-time verify.
      const data: unknown = await res.json();
      if (!res.ok) {
        const message = (typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string')
          ? (data as { error: string }).error
          : 'Failed';
        throw new Error(message);
      }
      if (typeof data !== 'object' || data === null || !('preview' in data)) {
        throw new Error('Malformed demo response');
      }
      setDemoResult(data as DemoResult);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setDemoError(message);
    }
    setDemoLoading(false);
  }

  return (
    <>
      <SectionDivider label="See it live" />

      {/* ══════════ LIVE DEMO ══════════ */}
      <section id="demo" className="rv demo-section" style={{ padding: '80px 72px', background: 'rgba(7,7,28,0.5)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div className="eyebrow" style={{ margin: '0 auto 24px' }}>
            <span className="eyebrow-dot" />
            Try it — no account needed
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px,4.5vw,46px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: -1, marginBottom: 14 }}>
            See the AI in <em style={{ color: '#F59E0B', fontStyle: 'italic' }}>action</em>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 38, lineHeight: 1.72 }}>
            Type any topic, pick a platform, and get a real sample instantly — without creating an account.
          </p>

          <div className="demo-box" style={{ background: 'rgba(7,7,28,0.98)', border: '1px solid rgba(124,58,237,0.22)', borderRadius: 18, padding: '26px 30px', textAlign: 'left', marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <input
                className="demo-input"
                placeholder="e.g., 5 habits that doubled my productivity…"
                value={demoTopic}
                onChange={(e) => setDemoTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runDemo(); }}
                maxLength={200}
              />
            </div>
            <div className="demo-platforms" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {demoPlatforms.map((p) => (
                <button key={p.id} className={`demo-plat-btn${demoPlatform === p.id ? ' active' : ''}`} onClick={() => setDemoPlatform(p.id)} aria-pressed={demoPlatform === p.id}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
            {/* WHY single line (#43): visitors saw 5 platform pills with zero context for
                what each produces. A one-line summary uses muted mono styling to stay quiet
                without cluttering the demo CTA. Tooltip was considered but added interaction
                cost for content that's simple enough to inline. */}
            <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.32)', lineHeight: 1.5, margin: '0 0 20px' }}>
              Carousel = 5 Instagram slides · LinkedIn = long-form post · Twitter = thread · Caption = short + hashtags · Video = scripted segments
            </p>
            <button
              onClick={runDemo}
              disabled={!demoTopic.trim() || demoLoading}
              style={{
                background: demoTopic.trim() && !demoLoading ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : 'rgba(245,158,11,0.18)',
                color: demoTopic.trim() && !demoLoading ? '#030310' : 'rgba(245,158,11,0.38)',
                border: 'none', borderRadius: 10, padding: '13px 28px',
                fontWeight: 700, fontSize: 14, cursor: demoTopic.trim() && !demoLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s',
                boxShadow: demoTopic.trim() && !demoLoading ? '0 4px 22px rgba(245,158,11,0.32)' : 'none',
                width: '100%', justifyContent: 'center',
              }}
            >
              {demoLoading
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#030310', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Generating…</>
                : <><Sparkles size={15} /> Generate sample</>}
            </button>
          </div>

          {demoError && (
            <div style={{ padding: '11px 16px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, fontSize: 12.5, color: 'var(--color-error)', marginBottom: 16 }}>
              {demoError}
            </div>
          )}

          {demoResult && !demoLoading && (() => {
            const preview = demoResult.preview;
            const isSlides = Array.isArray(preview);
            // WHY 'segments' discriminant: DemoVideoPreview is the only variant with a
            // segments field AND an object-shaped hook — same pattern ContentColumn.tsx
            // uses to tell VideoScriptContentData apart from PlatformContent.
            const isVideo = !isSlides && 'segments' in preview && !!preview.segments;
            const isTweets = !isSlides && !isVideo && 'tweets' in preview && !!preview.tweets;
            const isCaption = !isSlides && !isVideo && !isTweets && 'caption' in preview && !!preview.caption;
            const isStandard = !isSlides && !isVideo && !isTweets && !isCaption && 'hook' in preview && !!preview.hook;
            return (
            <div style={{ animation: 'demo-fadeUp .38s ease both', textAlign: 'left' }}>
              <div style={{ background: '#07071C', border: '1px solid rgba(124,58,237,0.22)', borderRadius: 15, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ height: 3, background: 'linear-gradient(90deg,#7C3AED,#F59E0B,#22D3EE)' }} />
                <div style={{ padding: '22px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: '#F59E0B', textTransform: 'uppercase', marginBottom: 16 }}>
                    {demoPlatforms.find((p) => p.id === demoResult.platform)?.icon}{' '}
                    {demoPlatforms.find((p) => p.id === demoResult.platform)?.label} · Preview
                  </div>

                  {isSlides && preview.map((slide, i) => (
                    <div key={slide.slideNumber ?? i} style={{ marginBottom: 13, paddingBottom: 13, borderBottom: i < preview.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(245,158,11,0.55)', marginBottom: 5 }}>Slide {slide.slideNumber}</div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, marginBottom: 5 }}>{slide.headline}</div>
                      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65 }}>{slide.body}</div>
                    </div>
                  ))}

                  {isStandard && !isSlides && (
                    <div>
                      <div style={{ fontSize: 15.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, marginBottom: 11 }}>{(preview as DemoPreview).hook}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.68 }}>{(preview as DemoPreview).body}</div>
                    </div>
                  )}

                  {isTweets && !isSlides && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {((preview as DemoPreview).tweets ?? []).map((tw, i) => (
                        <div key={tw.number ?? i} style={{ padding: '11px 13px', background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.12)', borderRadius: 9 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(34,211,238,0.55)', marginBottom: 4 }}>Tweet {tw.number}</div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.58 }}>{tw.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isCaption && !isSlides && (
                    <div>
                      <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.72, marginBottom: 11 }}>{(preview as DemoPreview).caption}</div>
                      {(preview as DemoPreview).hashtags && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {((preview as DemoPreview).hashtags ?? []).map((tag) => (
                            <span key={tag} style={{ fontSize: 11, padding: '3px 9px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, color: '#A78BFA', fontFamily: 'var(--font-mono)' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {isVideo && !isSlides && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ padding: '11px 13px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.16)', borderRadius: 9 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-error)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Hook — {(preview as DemoVideoPreview).hook?.duration}</div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>{(preview as DemoVideoPreview).hook?.text}</div>
                      </div>
                      {((preview as DemoVideoPreview).segments ?? []).map((seg, i) => (
                        <div key={seg.number ?? i} style={{ padding: '10px 13px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.26)', marginBottom: 4 }}>Segment {seg.number} — {seg.duration}</div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.62 }}>{seg.script}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="demo-result-footer" style={{ padding: '16px 24px', background: 'rgba(124,58,237,0.04)', borderTop: '1px solid rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', margin: 0, lineHeight: 1.45 }}>
                    Preview only — full version includes quality scoring, platform optimisation, and more.
                  </p>
                  <Link
                    to="/sign-up"
                    style={{ background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', color: '#030310', fontWeight: 700, fontSize: 12, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    Get the full result <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      </section>
    </>
  );
}
