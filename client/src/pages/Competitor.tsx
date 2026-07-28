import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../api';
import { navigateToCreate } from '../lib/utils';
import { Search, TrendingUp, Target, Lightbulb, AlertCircle, Sparkles } from 'lucide-react';

interface AnalysisResult {
  brandName: string;
  estimatedNiche: string;
  topThemes: { theme: string; frequency: string; engagementLevel: 'high' | 'medium' | 'low' }[];
  // WHY no postingFrequency/avgEngagementTier: the prompt (server/src/routes/content.ts)
  // explicitly refuses to fabricate exact posting-frequency or engagement-rate numbers,
  // since they can't be reliably determined without live platform API access — the UI
  // previously rendered stat boxes for these anyway, which were always blank
  // (FUNCTIONAL_AUDIT_2026-07.md finding #6).
  contentPatterns: {
    formatPreference: string;
    hookStyle: string;
    ctaPattern: string;
  };
  contentGaps: { gap: string; opportunity: string }[];
  suggestedAngles: { angle: string; rationale: string }[];
  keyTakeaway: string;
}

const engagementColor = {
  high:   'var(--color-success)',
  medium: '#F59E0B',
  low:    'var(--color-error)',
};

export default function CompetitorPage() {
  const navigate = useNavigate();
  const [handle, setHandle]       = useState('');
  const [industry, setIndustry]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState<{ handle: string; analysis: AnalysisResult } | null>(null);

  async function handleAnalyze() {
    if (loading) return;
    const trimmed = handle.trim().replace(/^@/, '');
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post<{ handle: string; analysis: AnalysisResult }>(
        '/content/competitor',
        { handle: trimmed, industry: industry.trim() || undefined },
      );
      setResult(res.data);
    } catch (e: unknown) {
      // WHY axios.isAxiosError: narrows `unknown` to AxiosError before reading the
      // server's { error: string } response body, instead of trusting an `any` catch.
      const message = axios.isAxiosError<{ error?: string }>(e) ? e.response?.data?.error : undefined;
      setError(message || 'Analysis failed. Please try again.');
    }
    setLoading(false);
  }

  const analysis = result?.analysis;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#F59E0B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 18, height: 1, background: 'linear-gradient(90deg,#F59E0B,transparent)', display: 'inline-block' }} />
          Competitive Intelligence
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'rgba(255,255,255,0.92)' }}>
          Competitor Content Lens
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Analyze any creator or brand's content strategy — find gaps and opportunities.
        </p>
      </div>

      {/* Input card */}
      <div style={{ background: '#08081A', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="comp-form-grid">
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#F59E0B', display: 'block', marginBottom: 8 }}>
              Handle / Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>@</span>
              <input
                className="input"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyze(); }}
                placeholder="garyvee, hubspot, naval…"
                style={{ paddingLeft: 28 }}
                disabled={loading}
              />
            </div>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', marginTop: 5 }}>LinkedIn, Twitter/X, Instagram handle</p>
          </div>
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#F59E0B', display: 'block', marginBottom: 8 }}>
              Industry (optional)
            </label>
            <input
              className="input"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., SaaS, marketing, fitness…"
              disabled={loading}
            />
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!handle.trim() || loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: handle.trim() && !loading ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : 'rgba(245,158,11,0.2)',
            color: handle.trim() && !loading ? '#050509' : 'rgba(245,158,11,0.4)',
            border: 'none', borderRadius: 10, padding: '12px 24px',
            fontWeight: 700, fontSize: 14, cursor: handle.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'all .2s',
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#050509', borderRadius: '50%', animation: 'comp-spin 1s linear infinite' }} />
              Analyzing…
            </>
          ) : (
            <><Search size={15} /> Analyze Competitor</>
          )}
        </button>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--color-error)' }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </div>

      {/* Loading→results transition announcement — scoped to a short status string
          rather than the (potentially long) results region itself. */}
      <div aria-live="polite" className="sr-only">
        {loading ? `Analyzing @${handle.replace(/^@/, '')}…` : analysis ? 'Analysis ready.' : ''}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 0', color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ position: 'relative', width: 52, height: 52 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.12)', borderTopColor: '#F59E0B', animation: 'comp-spin .9s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', border: '1.5px solid rgba(139,92,246,0.12)', borderBottomColor: 'rgba(139,92,246,0.45)', animation: 'comp-spinR .65s linear infinite' }} />
          </div>
          <p style={{ fontSize: 13, margin: 0 }}>Analyzing @{handle.replace(/^@/, '')} content patterns…</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0 }}>This may take 10–20 seconds</p>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'comp-fadeUp .3s ease both' }}>
          {/* Brand header */}
          <div style={{ background: '#08081A', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 4 }}>@{result?.handle}</div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0 }}>{analysis.brandName}</h2>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>{analysis.estimatedNiche}</p>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: 0, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {analysis.keyTakeaway}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="comp-grid">
            {/* Top Themes */}
            <div style={{ background: '#08081A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                  <TrendingUp size={14} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Top Content Themes</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(analysis.topThemes || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: engagementColor[t.engagementLevel] || '#F59E0B', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.theme}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: "var(--font-mono)", marginTop: 1 }}>{t.frequency}</div>
                    </div>
                    <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: engagementColor[t.engagementLevel] || '#F59E0B', background: `${engagementColor[t.engagementLevel]}15`, border: `1px solid ${engagementColor[t.engagementLevel]}30`, borderRadius: 20, padding: '2px 8px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {t.engagementLevel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Patterns */}
            <div style={{ background: '#08081A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
                  <Target size={14} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Content Patterns</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Format', val: analysis.contentPatterns.formatPreference },
                  { label: 'Hook style', val: analysis.contentPatterns.hookStyle },
                  { label: 'CTA pattern', val: analysis.contentPatterns.ctaPattern },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "var(--font-mono)", fontSize: 10, minWidth: 80, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Gaps */}
          <div style={{ background: '#08081A', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                <AlertCircle size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Content Gaps — Your Opportunity</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(analysis.contentGaps || []).map((g, i) => (
                <div key={i} style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)', marginBottom: 4 }}>{g.gap}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>{g.opportunity}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Angles */}
          <div style={{ background: '#08081A', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
                <Lightbulb size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Content Angles to Beat Them</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="comp-angles-grid">
              {(analysis.suggestedAngles || []).map((a, i) => (
                <div key={i} style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{a.angle}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>{a.rationale}</div>
                  <button
                    onClick={() => navigateToCreate(navigate, { topic: a.angle })}
                    style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 7, padding: '5px 11px', color: '#A78BFA', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.12)'; }}
                  >
                    <Sparkles size={11} /> Create content →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 12, color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ marginBottom: 4, opacity: 0.6 }}><Search size={40} /></div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>Enter a competitor handle to analyze</p>
          <p style={{ margin: 0, fontSize: 12 }}>Find their top themes, content gaps, and angles you can own.</p>
        </div>
      )}

      <style>{`
        @keyframes comp-spin  { to{transform:rotate(360deg)} }
        @keyframes comp-spinR { to{transform:rotate(-360deg)} }
        @keyframes comp-fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width:768px) {
          .comp-form-grid { grid-template-columns:1fr !important; }
          .comp-grid      { grid-template-columns:1fr !important; }
          .comp-angles-grid { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}
