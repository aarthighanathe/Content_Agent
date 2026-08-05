import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { analyzeCompetitor, getCompetitorHistory, getProfile } from '../api';
import { navigateToCreate } from '../lib/utils';
import type { AnalyzeCompetitorResponse, CompetitorAnalysisHistoryItem } from '../types/social';
import { Search, TrendingUp, Target, Lightbulb, AlertCircle, Sparkles } from 'lucide-react';
import { BenchmarkCard } from './Competitor/BenchmarkCard';
import { HistoryDropdown } from './Competitor/HistoryDropdown';

// WHY no postingFrequency/avgEngagementTier: the prompt (server/src/routes/content/competitor.ts)
// explicitly refuses to fabricate exact posting-frequency or engagement-rate numbers, since
// they can't be reliably determined without live platform API access — the UI previously
// rendered stat boxes for these anyway, which were always blank (FUNCTIONAL_AUDIT_2026-07.md
// finding #6). Response shape comes from AnalyzeCompetitorResponse in types/social.ts.

const engagementColor = {
  high:   'var(--color-success)',
  medium: 'var(--accent)',
  low:    'var(--color-error)',
};

export default function CompetitorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [handle, setHandle]       = useState('');
  const [industry, setIndustry]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState<AnalyzeCompetitorResponse | null>(null);

  // WHY the same ['dashboard', 'profile'] key Dashboard.tsx/Brand.tsx use: this page
  // only needs a read-only slice of the same getProfile() response (avgScore,
  // dimensionAverages) to power the "How You Compare" card below — sharing the query
  // key means visiting Dashboard or Brand first (the common path) makes this page's
  // fetch a cache hit instead of a redundant network call.
  const profileQuery = useQuery({ queryKey: ['dashboard', 'profile'], queryFn: getProfile });

  // WHY React Query for history: per task guidance for client-side server-state fetches.
  // Selecting a past entry reloads it client-side (setResult directly) without
  // re-calling the analyze endpoint.
  const historyQuery = useQuery({ queryKey: ['competitor', 'history'], queryFn: getCompetitorHistory });

  function handleSelectHistory(item: CompetitorAnalysisHistoryItem) {
    setHandle(item.handle);
    setIndustry(item.industry || '');
    setError('');
    setResult({ handle: item.handle, analysis: item.analysis, analysisId: item.id });
  }

  async function handleAnalyze() {
    if (loading) return;
    const trimmed = handle.trim().replace(/^@/, '');
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await analyzeCompetitor({ handle: trimmed, industry: industry.trim() || undefined });
      setResult(res);
      // WHY invalidate (not a manual cache write): the persisted row's exact
      // createdAt/id come from the server's best-effort insert, which this
      // response only partially mirrors (analysisId, no createdAt) — a
      // refetch is simpler and cheap (capped-at-20, indexed query) versus
      // reconstructing a matching history row shape by hand.
      queryClient.invalidateQueries({ queryKey: ['competitor', 'history'] });
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
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)' }}>
            Competitor Content Lens
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Analyze any creator or brand's content strategy — find gaps and opportunities.
          </p>
        </div>
        <HistoryDropdown
          isLoading={historyQuery.isLoading}
          items={historyQuery.data?.analyses || []}
          onSelect={handleSelectHistory}
        />
      </div>

      {/* Input card */}
      <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="comp-form-grid">
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
              Handle / Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>@</span>
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
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5 }}>LinkedIn, Twitter/X, Instagram handle</p>
          </div>
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
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
          className="btn-primary"
          onClick={handleAnalyze}
          disabled={!handle.trim() || loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {loading ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--on-accent)', borderRadius: '50%', animation: 'comp-spin 1s linear infinite' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ position: 'relative', width: 52, height: 52 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid color-mix(in srgb, var(--accent) 12%, transparent)', borderTopColor: 'var(--accent)', animation: 'comp-spin .9s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', border: '1.5px solid color-mix(in srgb, var(--accent-2) 12%, transparent)', borderBottomColor: 'color-mix(in srgb, var(--accent-2) 45%, transparent)', animation: 'comp-spinR .65s linear infinite' }} />
          </div>
          <p style={{ fontSize: 13, margin: 0 }}>Analyzing @{handle.replace(/^@/, '')} content patterns…</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>This may take 10–20 seconds</p>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'comp-fadeUp .3s ease both' }}>
          {/* Brand header */}
          <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4 }}>@{result?.handle}</div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{analysis.brandName}</h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>{analysis.estimatedNiche}</p>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: 0, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
              {analysis.keyTakeaway}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="comp-grid">
            {/* Top Themes */}
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <TrendingUp size={14} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Top Content Themes</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(analysis.topThemes || []).map((t, i) => {
                  const engagementLevel = t.engagementLevel || 'medium';
                  const color = engagementColor[engagementLevel] || 'var(--accent)';
                  return (
                    <div key={`${i}-${t.theme}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.theme}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", marginTop: 1 }}>{t.frequency}</div>
                      </div>
                      <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, padding: '2px 8px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {engagementLevel}
                      </span>
                    </div>
                  );
                })}
                {(!analysis.topThemes || analysis.topThemes.length === 0) && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No theme data available</div>
                )}
              </div>
            </div>

            {/* Content Patterns */}
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {/* WHY var(--accent-2): decorative card-icon color for visual distinction between
                    the Top Themes / Content Patterns cards — not a platform brand, status color,
                    or the badge-purple category-tag system, so it follows the active theme. */}
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'color-mix(in srgb, var(--accent-2) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)' }}>
                  <Target size={14} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Content Patterns</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analysis.contentPatterns ? [
                  { label: 'Format', val: analysis.contentPatterns.formatPreference },
                  { label: 'Hook style', val: analysis.contentPatterns.hookStyle },
                  { label: 'CTA pattern', val: analysis.contentPatterns.ctaPattern },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: "var(--font-mono)", fontSize: 10, minWidth: 80, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                    <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{val}</span>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No pattern data available</div>
                )}
              </div>
            </div>

            {/* How You Compare — benchmarks the user's own avg quality score/hook
                strength (from GET /api/users/me, same aggregation Dashboard/Brand
                use) against this competitor's analysis. */}
            <BenchmarkCard
              isLoading={profileQuery.isLoading}
              isError={profileQuery.isError}
              totalPosts={profileQuery.data?.stats?.totalPosts}
              avgScore={profileQuery.data?.stats?.avgScore}
              dimensionAverages={profileQuery.data?.stats?.dimensionAverages}
              analysis={analysis}
            />
          </div>

          {/* Content Gaps */}
          <div style={{ background: 'var(--bg-raised)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                <AlertCircle size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Content Gaps — Your Opportunity</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(analysis.contentGaps || []).map((g, i) => (
                <div key={`${i}-${g.gap}`} style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)', marginBottom: 4 }}>{g.gap}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 10 }}>{g.opportunity}</div>
                  <button
                    onClick={() => navigateToCreate(navigate, {
                      topic: g.opportunity || g.gap || '',
                      industry: industry.trim() || undefined,
                      competitorContext: [g.gap, g.opportunity].filter(Boolean).join(': '),
                      competitorAnalysisId: result?.analysisId,
                    })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 7, padding: '5px 11px', color: 'var(--color-success)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.18)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.1)'; }}
                  >
                    <Sparkles size={11} /> Create content →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Angles */}
          {/* WHY var(--accent-2): same decorative-card-accent reasoning as "Content Patterns"
              above — violet here was chosen for visual variety between cards, not because
              this represents the badge-purple hashtag/category system or a platform brand. */}
          <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent-2) 18%, transparent)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'color-mix(in srgb, var(--accent-2) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)' }}>
                <Lightbulb size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Content Angles to Beat Them</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="comp-angles-grid">
              {(analysis.suggestedAngles || []).map((a, i) => (
                <div key={`${i}-${a.angle}`} style={{ background: 'color-mix(in srgb, var(--accent-2) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 15%, transparent)', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{a.angle}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>{a.rationale}</div>
                  <button
                    onClick={() => navigateToCreate(navigate, {
                      topic: a.angle || '',
                      industry: industry.trim() || undefined,
                      competitorContext: [a.angle, a.rationale].filter(Boolean).join(': '),
                      competitorAnalysisId: result?.analysisId,
                    })}
                    style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'color-mix(in srgb, var(--accent-2) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 25%, transparent)', borderRadius: 7, padding: '5px 11px', color: 'var(--accent-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent-2) 20%, transparent)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent-2) 12%, transparent)'; }}
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 12, color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 4, opacity: 0.6 }}><Search size={40} /></div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Enter a competitor handle to analyze</p>
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
        @media (max-width:375px) {
          .comp-form-grid { gap:12px !important; }
          .comp-grid      { gap:8px !important; }
        }
      `}</style>
    </div>
  );
}
