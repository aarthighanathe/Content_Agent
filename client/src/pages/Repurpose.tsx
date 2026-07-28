import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Link2, Loader2, Sparkles, Newspaper, Video, Mail, CheckCircle2 } from 'lucide-react';
import { Instagram, Linkedin, XTwitter } from '../components/BrandIcons';
import { repurposeUrl } from '../api';

const platforms = [
  { id: 'instagram_carousel', label: 'Instagram Carousel', Icon: Instagram, gradient: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', accent: '#ec4899' },
  { id: 'linkedin_post',      label: 'LinkedIn Post',      Icon: Linkedin,  gradient: 'linear-gradient(135deg,#0077B5,#00a0dc)',                            accent: '#60a5fa' },
  { id: 'twitter_thread',     label: 'Twitter Thread',     Icon: XTwitter,  gradient: 'linear-gradient(135deg,#1DA1F2,#0d8ecf)',                            accent: '#22d3ee' },
  { id: 'instagram_caption',  label: 'Instagram Caption',  Icon: Instagram, gradient: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',                   accent: '#a78bfa' },
];

const tones = ['professional', 'casual', 'witty', 'educational', 'inspirational'];

// WHY: mirrors Create.tsx AUDIENCE_DEFAULTS so Repurpose has the same optional-audience behaviour
const AUDIENCE_DEFAULTS: Record<string, string> = {
  instagram_carousel: 'content creators and marketers',
  linkedin_post:      'founders and business professionals',
  twitter_thread:     'tech enthusiasts and entrepreneurs',
  instagram_caption:  'lifestyle and brand followers',
  video_script:       'short-form video viewers aged 18-35',
};

const supportedSources = [
  { Icon: Newspaper, title: 'Blog Posts',     desc: 'Medium, Substack, WordPress, Ghost' },
  { Icon: Video,     title: 'YouTube Videos', desc: 'Auto-captions extracted automatically' },
  { Icon: Mail,      title: 'Newsletters',    desc: 'Beehiiv, ConvertKit, Email archives' },
];

const howItWorks = [
  'Paste any public URL from a supported source',
  'AI extracts the key insights and research',
  'Content is rewritten for your chosen platform and brand voice',
];

export default function RepurposePage() {
  const navigate = useNavigate();
  const [url, setUrl]           = useState('');
  const [platform, setPlatform] = useState('linkedin_post');
  const [tone, setTone]         = useState('professional');
  const [audience, setAudience] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const effectiveAudience = audience.trim() || AUDIENCE_DEFAULTS[platform] || 'general audience';
  const isValid = url.trim() && platform && tone;

  // WHY a single "Processing…" state, not a two-phase "fetching then generating" one:
  // the server's POST /content/repurpose route does URL-fetch + job creation in one
  // synchronous request/response (server/src/routes/content.ts) — there's no SSE/progress
  // signal to distinguish those two steps client-side. A fabricated setTimeout used to
  // fake that distinction, contradicting Result's own LoadingView comment about never
  // showing invented progress (audit #32). One honest state instead.
  async function handleRepurpose() {
    if (!isValid || loading) return;
    setLoading(true);
    setError('');

    try {
      const { jobId } = await repurposeUrl({ url: url.trim(), platform, tone, targetAudience: effectiveAudience });
      navigate(`/result/${jobId}`);
    } catch (err: unknown) {
      // WHY axios.isAxiosError: narrows `unknown` to AxiosError before reading the
      // server's { error: string } response body, instead of trusting an `any` catch.
      const msg = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(msg || 'Failed to process the URL — please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(139,92,246,0.18))',
            border: '1px solid rgba(34,211,238,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Link2 size={18} color="#22D3EE" />
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: '#fff', margin: 0 }}>
            Repurpose Anything
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, margin: 0 }}>
          Paste a blog post, article, or YouTube link — the AI extracts the key insights and rewrites them
          as platform-native content in your brand voice.
        </p>
      </div>

      {/* Two-column layout — stacks on tablet via .grid-repurpose */}
      <div className="grid-repurpose" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* ── Left: Form ── */}
        <div style={{
          background: '#08081A', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '28px 28px',
        }}>

          {/* URL Input */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Source URL
            </label>
            <div style={{ position: 'relative' }}>
              <Link2 size={15} color="rgba(255,255,255,0.25)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="url"
                placeholder="https://example.com/article-or-blog-post"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 11, padding: '12px 14px 12px 40px',
                  color: 'var(--color-text-primary)', fontSize: 14,
                  outline: 'none', transition: 'border-color .2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(34,211,238,0.35)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.25)' }}>
              Supports: blog posts, Medium articles, newsletters, YouTube (auto-captions)
            </p>
          </div>

          {/* Platform */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Target Platform
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {platforms.map((p) => {
                const active = platform === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    disabled={loading}
                    aria-pressed={active}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px',
                      background: active ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.02)',
                      border: active ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 11, cursor: 'pointer', transition: 'all .18s',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: p.gradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <p.Icon size={13} color="#fff" />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: active ? '#fff' : 'var(--color-text-secondary)' }}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Tone
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tones.map((t) => {
                const active = tone === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    disabled={loading}
                    aria-pressed={active}
                    style={{
                      padding: '7px 14px', borderRadius: 20,
                      background: active ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      color: active ? '#A78BFA' : 'rgba(255,255,255,0.5)',
                      fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all .18s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Audience */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Target Audience <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. B2B marketers, startup founders, freelance designers"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={loading}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 11, padding: '12px 14px',
                color: 'var(--color-text-primary)', fontSize: 14,
                outline: 'none', transition: 'border-color .2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.35)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 10, padding: '12px 16px', color: 'var(--color-error)',
              fontSize: 13, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div style={{
              background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.18)',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            }}>
              <Loader2 size={14} color="#22D3EE" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#22D3EE' }}>Processing…</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleRepurpose}
            disabled={!isValid || loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: 15 }}
          >
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
              : <><Sparkles size={16} /> Repurpose &amp; Generate</>
            }
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* ── Right: Info sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Supported sources */}
          <div style={{
            background: '#08081A', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '20px',
          }}>
            <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Supported Sources
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {supportedSources.map((item) => (
                <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <item.Icon size={15} color="#22D3EE" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{
            background: '#08081A', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '20px',
          }}>
            <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>
              How It Works
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {howItWorks.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={14} color="rgba(139,92,246,0.6)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tip box */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(139,92,246,0.06))',
            border: '1px solid rgba(34,211,238,0.15)',
            borderRadius: 16, padding: '16px 18px',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'rgba(34,211,238,0.7)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Pro Tip
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>
              Set up your Brand Voice first — the AI will automatically match your tone, vocabulary, and style when repurposing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
