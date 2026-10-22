import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon, Sparkles, Video } from 'lucide-react';
import { Instagram, Linkedin, XTwitter } from '../../components/BrandIcons';
import { SectionDivider } from './SectionDivider';
import { SkeletonCard } from '../../components/SkeletonCard';

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

// WHY a lightweight guard, not full nested validation: this only confirms the
// top-level shape (platform/topic are strings, preview is present as an array
// or object) — server/src/routes/demo.ts's own comment already notes the demo
// route never validates the LLM's JSON shape server-side either, and every
// downstream read of preview.hook/tweets/segments is already optional-chained,
// so a mismatched nested shape degrades gracefully rather than crashing.
// Mirrors the isCriticResult/isFormatterResponse guard pattern used elsewhere
// in this codebase for the same class of "trust but verify the outer shape" check.
function isDemoResult(value: unknown): value is DemoResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.platform === 'string' &&
    typeof v.topic === 'string' &&
    (Array.isArray(v.preview) || (typeof v.preview === 'object' && v.preview !== null))
  );
}

export function LiveDemo() {
  const [demoTopic, setDemoTopic] = useState('');
  const [demoPlatform, setDemoPlatform] = useState('instagram_carousel');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [demoError, setDemoError] = useState('');
  const [showSignUpCta, setShowSignUpCta] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  async function runDemo(): Promise<void> {
    if (!demoTopic.trim() || demoLoading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setDemoLoading(true);
    setDemoError('');
    setShowSignUpCta(false);
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
        signal: controller.signal,
      });
      // WHY unknown then guard: fetch's .json() is typed `any` by lib.dom.d.ts; treat the
      // response as unknown and confirm shape before trusting it as DemoResult or an error
      // envelope, since it's server data the client doesn't compile-time verify.
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message = (typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string')
          ? (data as { error: string }).error
          : 'Failed to generate sample';
        const retryAfterMs = (typeof data === 'object' && data !== null
          && typeof (data as { retryAfterMs?: unknown }).retryAfterMs === 'number')
          ? (data as { retryAfterMs: number }).retryAfterMs
          : undefined;
        if (res.status === 429) {
          const wait = retryAfterMs ? ` Try again in ${Math.ceil(retryAfterMs / 1000)}s.` : '';
          setDemoError(`${message}${wait}`);
          setShowSignUpCta(true);
          return;
        }
        setDemoError(message);
        // WHY not every error: network/provider glitches shouldn't always push Sign up —
        // that CTA is for hitting the free demo wall (rate limit / auth).
        setShowSignUpCta(res.status === 401 || res.status === 403);
        return;
      }
      if (!isDemoResult(data)) {
        setDemoError('Malformed demo response');
        return;
      }
      setDemoResult(data);
      // WHY localStorage (F6): Clerk sign-up can leave this tab; sessionStorage
      // draft alone may not survive. Create reads ca_demo_handoff when empty.
      try {
        localStorage.setItem(
          'ca_demo_handoff',
          JSON.stringify({
            topic: demoTopic.trim(),
            platform: data.platform || demoPlatform,
            savedAt: Date.now(),
          }),
        );
      } catch { /* private mode — Create just won't prefill */ }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const message = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      const isNetwork = message.toLowerCase().includes('failed to fetch')
        || message.toLowerCase().includes('network');
      setDemoError(isNetwork ? 'Network error — check your connection and try again.' : message);
      setShowSignUpCta(false);
    } finally {
      if (!controller.signal.aborted) setDemoLoading(false);
    }
  }

  return (
    <>
      <SectionDivider label="See it live" />

      {/* ══════════ LIVE DEMO ══════════ */}
      <section id="demo" className="rv demo-section" style={{ padding: '80px 32px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div className="eyebrow" style={{ margin: '0 auto 24px' }}>
            <span className="eyebrow-dot" />
            Try it — no account needed
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px,4.5vw,46px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: -1, marginBottom: 14 }}>
            See the AI in <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>action</em>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 38, lineHeight: 1.72 }}>
            Type any topic, pick a platform, and get a real sample instantly — without creating an account.
          </p>

          <div className="demo-box" style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent-2) 22%, transparent)', borderRadius: 18, padding: '26px 30px', textAlign: 'left', marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="demo-topic-input" className="sr-only">
                Topic for your content sample
              </label>
              <input
                id="demo-topic-input"
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
            <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'color-mix(in srgb, var(--text-primary) 32%, transparent)', lineHeight: 1.5, margin: '0 0 20px' }}>
              Carousel = 5 Instagram slides · LinkedIn = long-form post · Twitter = thread · Caption = short + hashtags · Video = scripted segments
            </p>
            <button
              onClick={runDemo}
              disabled={!demoTopic.trim() || demoLoading}
              style={{
                background: demoTopic.trim() && !demoLoading ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : 'color-mix(in srgb, var(--accent) 18%, transparent)',
                color: demoTopic.trim() && !demoLoading ? 'var(--on-accent)' : 'color-mix(in srgb, var(--accent) 38%, transparent)',
                border: 'none', borderRadius: 10, padding: '13px 28px',
                fontWeight: 700, fontSize: 14, cursor: demoTopic.trim() && !demoLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s',
                boxShadow: demoTopic.trim() && !demoLoading ? '0 4px 22px var(--accent-glow)' : 'none',
                width: '100%', justifyContent: 'center',
              }}
            >
              {demoLoading
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--on-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Generating…</>
                : <><Sparkles size={15} /> Generate sample</>}
            </button>
          </div>

          <div aria-live="polite" aria-atomic="true">
          {demoError && (
            <div role="alert" style={{ padding: '11px 16px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, fontSize: 12.5, color: 'var(--color-error)', marginBottom: 16 }}>
              {demoError}
            </div>
          )}

          {showSignUpCta && (
            <div style={{ marginBottom: 16 }}>
              <Link
                to="/sign-up"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
                  color: 'var(--on-accent)', fontWeight: 700, fontSize: 13,
                  padding: '11px 18px', borderRadius: 10, textDecoration: 'none',
                }}
              >
                Sign up free for more <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Loading skeleton for slow networks */}
          {demoLoading && (
            <div style={{ animation: 'demo-fadeUp .38s ease both', textAlign: 'left' }}>
              <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent-2) 22%, transparent)', borderRadius: 15, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ height: 3, background: 'linear-gradient(90deg,var(--accent-2),var(--accent))' }} />
                <div style={{ padding: '22px 24px' }}>
                  <SkeletonCard size="lines" />
                </div>
              </div>
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
              <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent-2) 22%, transparent)', borderRadius: 15, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ height: 3, background: 'linear-gradient(90deg,var(--accent-2),var(--accent))' }} />
                <div style={{ padding: '22px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 16 }}>
                    {demoPlatforms.find((p) => p.id === demoResult.platform)?.icon}{' '}
                    {demoPlatforms.find((p) => p.id === demoResult.platform)?.label} · Preview
                  </div>

                  {isSlides && preview.map((slide, i) => (
                    <div key={slide.slideNumber ?? i} style={{ marginBottom: 13, paddingBottom: 13, borderBottom: i < preview.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'color-mix(in srgb, var(--accent) 55%, transparent)', marginBottom: 5 }}>Slide {slide.slideNumber}</div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'color-mix(in srgb, var(--text-primary) 90%, transparent)', lineHeight: 1.3, marginBottom: 5 }}>{slide.headline}</div>
                      <div style={{ fontSize: 12.5, color: 'color-mix(in srgb, var(--text-primary) 48%, transparent)', lineHeight: 1.65 }}>{slide.body}</div>
                    </div>
                  ))}

                  {isStandard && !isSlides && (
                    <div>
                      <div style={{ fontSize: 15.5, fontWeight: 700, color: 'color-mix(in srgb, var(--text-primary) 92%, transparent)', lineHeight: 1.5, marginBottom: 11 }}>{(preview as DemoPreview).hook}</div>
                      <div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--text-primary) 48%, transparent)', lineHeight: 1.68 }}>{(preview as DemoPreview).body}</div>
                    </div>
                  )}

                  {isTweets && !isSlides && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {((preview as DemoPreview).tweets ?? []).map((tw, i) => (
                        <div key={tw.number ?? i} style={{ padding: '11px 13px', background: 'color-mix(in srgb, var(--accent-2) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 12%, transparent)', borderRadius: 9 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'color-mix(in srgb, var(--accent-2) 55%, transparent)', marginBottom: 4 }}>Tweet {tw.number}</div>
                          <div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--text-primary) 80%, transparent)', lineHeight: 1.58 }}>{tw.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isCaption && !isSlides && (
                    <div>
                      <div style={{ fontSize: 13.5, color: 'color-mix(in srgb, var(--text-primary) 80%, transparent)', lineHeight: 1.72, marginBottom: 11 }}>{(preview as DemoPreview).caption}</div>
                      {(preview as DemoPreview).hashtags && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {((preview as DemoPreview).hashtags ?? []).map((tag) => (
                            <span key={tag} style={{ fontSize: 11, padding: '3px 9px', background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRadius: 20, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {isVideo && !isSlides && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ padding: '11px 13px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.16)', borderRadius: 9 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-error)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Hook — {(preview as DemoVideoPreview).hook?.duration}</div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'color-mix(in srgb, var(--text-primary) 90%, transparent)', lineHeight: 1.5 }}>{(preview as DemoVideoPreview).hook?.text}</div>
                      </div>
                      {((preview as DemoVideoPreview).segments ?? []).map((seg, i) => (
                        <div key={seg.number ?? i} style={{ padding: '10px 13px', background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)', border: '1px solid var(--rule)', borderRadius: 9 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'color-mix(in srgb, var(--text-primary) 26%, transparent)', marginBottom: 4 }}>Segment {seg.number} — {seg.duration}</div>
                          <div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--text-primary) 70%, transparent)', lineHeight: 1.62 }}>{seg.script}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="demo-result-footer" style={{ padding: '16px 24px', background: 'color-mix(in srgb, var(--accent-2) 4%, transparent)', borderTop: '1px solid color-mix(in srgb, var(--accent-2) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 12, color: 'color-mix(in srgb, var(--text-primary) 32%, transparent)', margin: 0, lineHeight: 1.45 }}>
                    Preview only — full version includes quality scoring, platform optimisation, and more.
                  </p>
                  <Link
                    to="/sign-up"
                    style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: 'var(--on-accent)', fontWeight: 700, fontSize: 12, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    Get the full result <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
            );
          })()}
          </div>
        </div>
      </section>
    </>
  );
}
