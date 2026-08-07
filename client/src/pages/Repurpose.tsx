import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { Instagram, Linkedin, XTwitter } from '../components/BrandIcons';
import { repurposeUrl, repurposeBatchUrls } from '../api';
import { useRepurposeHistory, type RepurposeHistoryEntry } from './Repurpose/useRepurposeHistory';
import { RepurposeHistoryList } from './Repurpose/RepurposeHistoryList';
import { InfoSidebar } from './Repurpose/InfoSidebar';
import { PlatformPicker } from './Repurpose/PlatformPicker';
import { UrlInput } from './Repurpose/UrlInput';
import { FeedMonitorPanel } from './Repurpose/FeedMonitorPanel';

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

export default function RepurposePage() {
  const navigate = useNavigate();
  const [url, setUrl]           = useState('');
  const [platform, setPlatform] = useState('linkedin_post');
  const [tone, setTone]         = useState('professional');
  const [audience, setAudience] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  // Batch-URL mode state
  const [batchMode, setBatchMode]   = useState(false);
  const [batchUrls, setBatchUrls]   = useState('');
  const { history, addEntry, removeEntry } = useRepurposeHistory();

  // WHY measure the left form's rendered height in JS and use it as a hard cap on the right
  // column, rather than `position: sticky` + a viewport-relative `max-height` (tried first,
  // matching Result.css's `.rp-sidebar` pattern): this page's grid sits well below the top of
  // `.main-inner` (40px padding + the "Repurpose Anything" heading block), so a sticky box sized
  // off `100vh` was taller than the space actually left below it in its resting scroll position —
  // both its top and bottom content ended up clipped depending on scroll offset, never fully
  // reachable. Measuring the left form's actual height and capping the right column there (with
  // `overflowY: auto`) guarantees the box is never taller than what naturally fits, and every
  // pixel of it is reachable by scrolling within its own border. ResizeObserver keeps it in sync
  // as the form's height changes (tone pills wrapping, error/loading banners, batch mode, etc.).
  const leftColRef = useRef<HTMLDivElement>(null);
  const [leftColHeight, setLeftColHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setLeftColHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // WHY separate multi-select set instead of reusing `platform` as an array:
  // the single-platform picker (one selected pill) is the common path and
  // stays untouched — multi-platform is an opt-in toggle that fans one URL
  // fetch out to several jobs (routes/content/repurpose.ts), a genuinely
  // different request shape worth keeping visually distinct rather than
  // silently changing what clicking a platform pill does.
  const [multiPlatform, setMultiPlatform] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(() => new Set(['linkedin_post']));

  function togglePlatformSelection(id: string): void {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // WHY guard: at least one platform must stay selected
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const effectiveAudience = audience.trim() || AUDIENCE_DEFAULTS[platform] || 'general audience';

  // Parse batch textarea: one URL per non-empty line
  // Supports "platform|url" format for per-URL platform selection
  const parsedBatchUrls = batchUrls.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split('|');
    if (parts.length === 2) {
      const [platformPart, urlPart] = parts;
      const trimmedPlatform = platformPart.trim();
      const trimmedUrl = urlPart.trim();
      // Validate platform is one of the supported platforms
      const validPlatform = platforms.find(p => p.id === trimmedPlatform);
      if (validPlatform) {
        return { url: trimmedUrl, platform: validPlatform.id };
      }
    }
    // Default to the selected platform if no platform specified
    return { url: line, platform };
  });

  const isValid = batchMode
    ? parsedBatchUrls.length > 0 && tone && platform
    : multiPlatform
      ? url.trim() && selectedPlatforms.size > 0 && tone
      : url.trim() && platform && tone;

  // WHY validate with `new URL()` before ever hitting the network: the server's own
  // repurpose route does the identical `new URL(url)` try/catch (content/repurpose.ts)
  // and rejects malformed input with a 400 — previously the only client-side check was
  // the browser's built-in `type="url"`, which is easy to bypass (e.g. paste events,
  // some mobile keyboards) and still cost a full request/response round trip to fail.
  // This mirrors the server's exact validation logic (protocol must be http/https) so
  // the client-side and server-side rules can't silently drift apart.
  function validateUrl(value: string): string | null {
    const trimmed = value.trim();
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'Invalid URL — must start with http:// or https://';
      }
      return null;
    } catch {
      return 'That doesn\'t look like a valid URL — check for typos and try again.';
    }
  }

  // WHY a single "Processing…" state, not a two-phase "fetching then generating" one:
  // the server's POST /content/repurpose route does URL-fetch + job creation in one
  // synchronous request/response (server/src/routes/content.ts) — there's no SSE/progress
  // signal to distinguish those two steps client-side. A fabricated setTimeout used to
  // fake that distinction, contradicting Result's own LoadingView comment about never
  // showing invented progress (audit #32). One honest state instead.
  async function handleRepurpose() {
    if (!isValid || loading) return;

    // ── Batch-URL mode: N URLs → one job each ────────────────────────────────────
    if (batchMode) {
      const badUrls = parsedBatchUrls.filter((item) => { try { const p = new URL(item.url); return !['http:', 'https:'].includes(p.protocol); } catch { return true; } });
      if (badUrls.length > 0) {
        setError(`Invalid URL(s): ${badUrls.slice(0, 2).map((i) => i.url).join(', ')}${badUrls.length > 2 ? ' …' : ''}`);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const items = parsedBatchUrls.map((item) => ({
          url: item.url,
          platform: item.platform,
          tone,
          targetAudience: effectiveAudience,
        }));
        const { jobs, failedItems } = await repurposeBatchUrls(items);
        for (const j of jobs) addEntry({ url: j.topic, platform: j.platform, outcome: 'success', jobId: j.jobId });
        if (failedItems.length > 0) {
          setError(`${failedItems.length} URL(s) failed: ${failedItems.map((f) => f.error).slice(0, 2).join('; ')}`);
        }
        if (jobs.length > 0) {
          navigate('/batch-result', { state: { jobs } });
        }
      } catch (err: unknown) {
        const msg = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
        setError(msg || 'Batch failed — please try again.');
        setLoading(false);
      }
      return;
    }

    // ── Single-URL (or multi-platform) mode ───────────────────────────────────
    const clientError = validateUrl(url);
    if (clientError) {
      setError(clientError);
      return;
    }
    setLoading(true);
    setError('');

    const trimmedUrl = url.trim();
    const platformsToSubmit = multiPlatform ? Array.from(selectedPlatforms) : undefined;
    try {
      const { jobId, topic, jobs } = await repurposeUrl({
        url: trimmedUrl, platform, platforms: platformsToSubmit, tone, targetAudience: effectiveAudience,
      });
      if (multiPlatform && jobs && jobs.length > 1) {
        // WHY one history entry per platform, not one for the whole batch:
        // RepurposeHistoryList's retry/view-result actions are per-job (a
        // single jobId to link to) — recording per-platform keeps that
        // contract intact instead of teaching the history list a second,
        // batch-shaped entry type for this one case.
        for (const job of jobs) addEntry({ url: trimmedUrl, platform: job.platform, outcome: 'success', jobId: job.jobId });
        // WHY BatchResult, not /result/:jobId: N jobs from one submission is
        // exactly BatchResult.tsx's shape (built for Create's batch mode) —
        // reusing it here instead of building a second "N jobs, one submission"
        // results page, and it already polls/displays per-job status+score.
        navigate('/batch-result', { state: { jobs: jobs.map((j) => ({ ...j, topic })) } });
      } else {
        addEntry({ url: trimmedUrl, platform, outcome: 'success', jobId });
        navigate(`/result/${jobId}`);
      }
    } catch (err: unknown) {
      // WHY axios.isAxiosError: narrows `unknown` to AxiosError before reading the
      // server's { error: string } response body, instead of trusting an `any` catch.
      const msg = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      const errorMessage = msg || 'Failed to process the URL — please try again.';
      // WHY recorded here, not for a client-side validateUrl() rejection above:
      // this is a real attempt that reached the server (fetch failure,
      // insufficient content, etc.) — worth remembering so the user can retry
      // without re-finding the article. A malformed URL caught before the
      // network call isn't a meaningful "attempt" to look back on.
      addEntry({ url: trimmedUrl, platform, outcome: 'failed', errorMessage });
      setError(errorMessage);
      setLoading(false);
    }
  }

  // WHY a dedicated reset, not just "type over it": after a failed submit (bad URL,
  // fetch failure, insufficient content, etc.) the stale field values previously just
  // sat there with no easy way back to a clean slate — this clears everything back to
  // the form's initial defaults in one click.
  function handleClear() {
    setUrl('');
    setBatchMode(false);
    setBatchUrls('');
    setPlatform('linkedin_post');
    setSelectedPlatforms(new Set(['linkedin_post']));
    setTone('professional');
    setAudience('');
    setError('');
  }

  // WHY re-fill, not re-submit: a past failure might need the user to check
  // the URL still works, or the platform choice still makes sense — re-filling
  // the form and letting them hit "Repurpose & Generate" themselves matches
  // how every other retry affordance in this app works (e.g. Ideate's regenerate),
  // rather than silently re-firing the exact same request that just failed.
  function handleRetryFromHistory(entry: RepurposeHistoryEntry): void {
    setUrl(entry.url);
    setPlatform(entry.platform);
    setMultiPlatform(false);
    setSelectedPlatforms(new Set([entry.platform]));
    setError('');
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Repurpose Anything
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
          Paste a blog post, article, or YouTube link — the AI extracts the key insights and rewrites them
          as platform-native content in your brand voice.
        </p>
      </div>

      {/* Two-column layout — stacks on tablet via .grid-repurpose */}
      <div className="grid-repurpose" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        <style>{`
          @media (max-width: 375px) {
            .grid-repurpose {
              gap: 16px !important;
            }
            .repurpose-platform-grid {
              grid-template-columns: 1fr !important;
            }
          }
          .repurpose-sidebar-col {
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: thin;
            scrollbar-color: color-mix(in srgb, var(--accent) 18%, transparent) transparent;
          }
          .repurpose-sidebar-col::-webkit-scrollbar { width: 5px; }
          .repurpose-sidebar-col::-webkit-scrollbar-track { background: transparent; }
          .repurpose-sidebar-col::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--accent) 20%, transparent); border-radius: 3px; }
          @media (max-width: 900px) {
            .repurpose-sidebar-col {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }
          }
        `}</style>

        {/* ── Left: Form ── */}
        <div ref={leftColRef} style={{
          background: 'var(--bg-raised)', border: '1px solid var(--rule)',
          borderRadius: 16, padding: '28px 28px',
        }}>

          {/* URL Input (single or batch) */}
          <UrlInput
            url={url}
            onUrlChange={setUrl}
            batchMode={batchMode}
            onToggleBatchMode={() => {
              setBatchMode((v) => !v);
              // When switching to batch, disable multi-platform (different shapes)
              if (!batchMode) setMultiPlatform(false);
            }}
            batchUrls={batchUrls}
            onBatchUrlsChange={setBatchUrls}
            loading={loading}
          />

          <PlatformPicker
            platforms={platforms}
            multiPlatform={multiPlatform && !batchMode}
            onToggleMultiPlatform={() => {
              setMultiPlatform((v) => !v);
              // Cannot combine multi-platform with batch-URL mode
              if (batchMode) setBatchMode(false);
            }}
            platform={platform}
            onPlatformChange={setPlatform}
            selectedPlatforms={selectedPlatforms}
            onTogglePlatformSelection={togglePlatformSelection}
            loading={loading}
          />

          {/* Tone */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
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
                      background: active ? 'color-mix(in srgb, var(--accent-2) 14%, transparent)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                      border: active ? '1px solid color-mix(in srgb, var(--accent-2) 40%, transparent)' : '1px solid var(--rule)',
                      color: active ? 'var(--accent-2)' : 'var(--text-secondary)',
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
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
                background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)', border: '1px solid var(--rule)',
                borderRadius: 11, padding: '12px 14px',
                color: 'var(--color-text-primary)', fontSize: 14,
                outline: 'none', transition: 'border-color .2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'color-mix(in srgb, var(--accent-2) 35%, transparent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--rule)')}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 10, padding: '12px 16px', color: 'var(--color-error)',
              fontSize: 13, marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            }}>
              <span>{error}</span>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 7, padding: '5px 12px', color: 'var(--color-error)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={11} /> Clear
              </button>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div style={{
              background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            }}>
              <Loader2 size={14} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--accent)' }}>Processing…</span>
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
              : <><Sparkles size={16} />
                  {batchMode
                    ? `Repurpose ${parsedBatchUrls.length} URL${parsedBatchUrls.length !== 1 ? 's' : ''}`
                    : `Repurpose & Generate${multiPlatform && selectedPlatforms.size > 1 ? ` (${selectedPlatforms.size} platforms)` : ''}`}
                </>
            }
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* ── Right: Info sidebar ── height is capped to the left form's measured height
            (leftColHeight, see the ResizeObserver above) so every pixel of FeedMonitorPanel +
            history + InfoSidebar is reachable by scrolling within this box's own border,
            regardless of where the grid sits on the page. Falls back to normal document flow on
            tablet (.repurpose-sidebar-col media query above), where the columns stack. */}
        <div
          className="repurpose-sidebar-col"
          style={{
            display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4,
            height: leftColHeight ? `${leftColHeight}px` : undefined,
          }}
        >
          <FeedMonitorPanel />
          <RepurposeHistoryList history={history} onRetry={handleRetryFromHistory} onRemove={removeEntry} />
          <InfoSidebar />
        </div>
      </div>
    </div>
  );
}
