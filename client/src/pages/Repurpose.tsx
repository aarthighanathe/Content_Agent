import { Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { Instagram, Linkedin, XTwitter } from '../components/BrandIcons';
import { useRepurposeHistory } from './Repurpose/useRepurposeHistory';
import { useRepurposeSubmit } from './Repurpose/useRepurposeSubmit';
import { RepurposeHistoryList } from './Repurpose/RepurposeHistoryList';
import { InfoSidebar } from './Repurpose/InfoSidebar';
import { PlatformPicker } from './Repurpose/PlatformPicker';
import { UrlInput } from './Repurpose/UrlInput';
import { FeedMonitorPanel } from './Repurpose/FeedMonitorPanel';
import { SidebarScroller } from './Repurpose/SidebarScroller';

const platforms = [
  { id: 'instagram_carousel', label: 'Instagram Carousel', Icon: Instagram, gradient: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', accent: '#ec4899' },
  { id: 'linkedin_post',      label: 'LinkedIn Post',      Icon: Linkedin,  gradient: 'linear-gradient(135deg,#0077B5,#00a0dc)',                            accent: '#60a5fa' },
  { id: 'twitter_thread',     label: 'Twitter Thread',     Icon: XTwitter,  gradient: 'linear-gradient(135deg,#1DA1F2,#0d8ecf)',                            accent: '#22d3ee' },
  { id: 'instagram_caption',  label: 'Instagram Caption',  Icon: Instagram, gradient: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',                   accent: '#a78bfa' },
];

const tones = ['professional', 'casual', 'witty', 'educational', 'inspirational'];

export default function RepurposePage() {
  const { history, addEntry, removeEntry } = useRepurposeHistory();
  const {
    url, setUrl,
    platform, setPlatform,
    tone, setTone,
    audience, setAudience,
    loading,
    error,
    batchMode, setBatchMode,
    batchUrls, setBatchUrls,
    multiPlatform, setMultiPlatform,
    selectedPlatforms,
    togglePlatformSelection,
    parsedBatchUrls,
    isValid,
    handleRepurpose,
    handleClear,
    handleRetryFromHistory,
  } = useRepurposeSubmit({ platforms, addEntry });

  return (
    <div className="repurpose-page">
      <div className="repurpose-page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Repurpose Anything
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
          Paste a blog post, article, or YouTube link — the AI extracts the key insights and rewrites them
          as platform-native content in your brand voice.
        </p>
      </div>

      <div className="grid-repurpose" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 320px)', gap: 24 }}>
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
            scrollbar-width: none;
            flex: 1 1 auto;
            height: 100%;
            padding-right: 16px;
          }
          .repurpose-sidebar-col::-webkit-scrollbar { width: 0; height: 0; display: none; }
          .repurpose-sidebar-stack {
            display: flex;
            flex-direction: column;
            gap: 16px;
            flex-shrink: 0;
          }
          @media (max-width: 900px) {
            .repurpose-sidebar-wrap { height: auto; position: static; }
            .repurpose-sidebar-col {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              padding-right: 0;
            }
            .repurpose-sidebar-wrap .visible-scroll-track { display: none; }
          }
        `}</style>

        <div className="repurpose-form" style={{
          background: 'var(--bg-raised)', border: '1px solid var(--rule)',
          borderRadius: 16, padding: '28px 28px',
        }}>

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

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Target Audience <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}>(optional)</span>
            </label>
            <input
              className="raw-input-focus-visible"
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

          <div className="repurpose-run-note">
            <p className="repurpose-run-kicker">What happens next</p>
            <p>
              Reads the link, rewrites it in the tone you picked, and scores it before you see the result.
            </p>
          </div>

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

          <button
            onClick={handleRepurpose}
            disabled={!isValid || loading}
            className="btn-primary repurpose-submit"
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

        {/* ── Right: Info sidebar ── same height as the form. The scroller paints
            its own track when the cards run past that height. */}
        <SidebarScroller>
          <FeedMonitorPanel />
          <RepurposeHistoryList history={history} onRetry={handleRetryFromHistory} onRemove={removeEntry} />
          <InfoSidebar />
        </SidebarScroller>
      </div>
    </div>
  );
}
