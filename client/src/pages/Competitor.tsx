import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { analyzeCompetitor, getCompetitorHistory, getProfile } from '../api';
import type {
  AnalyzeCompetitorResponse,
  CompetitorAnalysisHistoryItem,
  CompetitorPlatform,
} from '../types/social';
import { Search, AlertCircle } from 'lucide-react';
import { CompetitorSkeleton } from './Competitor/CompetitorSkeleton';
import { CompetitorResults } from './Competitor/CompetitorResults';
import { HistoryDropdown } from './Competitor/HistoryDropdown';
import { PlatformSelector } from './Competitor/PlatformSelector';

// WHY: no postingFrequency/avgEngagementTier: the prompt (server/src/routes/content/competitor.ts)
// explicitly refuses to fabricate exact posting-frequency or engagement-rate numbers, since
// they can't be reliably determined without live platform API access — the UI previously
// rendered stat boxes for these anyway, which were always blank (FUNCTIONAL_AUDIT_2026-07.md
// finding #6). Response shape comes from AnalyzeCompetitorResponse in types/social.ts.

export default function CompetitorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [handle, setHandle]       = useState('');
  const [platform, setPlatform]   = useState<CompetitorPlatform | ''>('');
  const [industry, setIndustry]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState<AnalyzeCompetitorResponse | null>(null);

  // WHY: the same ['dashboard', 'profile'] key Dashboard.tsx/Brand.tsx use: this page
  // only needs a read-only slice of the same getProfile() response (avgScore,
  // dimensionAverages) to power the "How You Compare" card below — sharing the query
  // key means visiting Dashboard or Brand first (the common path) makes this page's
  // fetch a cache hit instead of a redundant network call.
  const profileQuery = useQuery({ queryKey: ['dashboard', 'profile'], queryFn: getProfile });

  // WHY: React Query for history: per task guidance for client-side server-state fetches.
  // Selecting a past entry reloads it client-side (setResult directly) without
  // re-calling the analyze endpoint.
  const historyQuery = useQuery({ queryKey: ['competitor', 'history'], queryFn: getCompetitorHistory });

  function handleSelectHistory(item: CompetitorAnalysisHistoryItem) {
    setHandle(item.handle);
    setPlatform(
      item.platform === 'linkedin' || item.platform === 'twitter' || item.platform === 'instagram'
        ? item.platform
        : '',
    );
    setIndustry(item.industry || '');
    setError('');
    setResult({
      handle: item.handle,
      platform: item.platform === 'linkedin' || item.platform === 'twitter' || item.platform === 'instagram'
        ? item.platform
        : undefined,
      analysis: item.analysis,
      analysisId: item.id,
    });
  }

  // WHY: ref + loading: loading alone races a second click before re-render
  // (same pattern as Create/Ideate/Repurpose).
  const submittingRef = useRef(false);

  async function handleAnalyze() {
    if (loading || submittingRef.current) return;
    const trimmed = handle.trim().replace(/^@/, '');
    if (!trimmed || !platform) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await analyzeCompetitor({
        handle: trimmed,
        platform,
        industry: industry.trim() || undefined,
      });
      setResult(res);
      // WHY: invalidate (not a manual cache write): the persisted row's exact
      // createdAt/id come from the server's best-effort insert, which this
      // response only partially mirrors (analysisId, no createdAt) — a
      // refetch is simpler and cheap (capped-at-20, indexed query) versus
      // reconstructing a matching history row shape by hand.
      queryClient.invalidateQueries({ queryKey: ['competitor', 'history'] });
    } catch (e: unknown) {
      // WHY: axios.isAxiosError: narrows `unknown` to AxiosError before reading the
      // server's { error: string } response body, instead of trusting an `any` catch.
      const message = axios.isAxiosError<{ error?: string }>(e) ? e.response?.data?.error : undefined;
      setError(message || 'Analysis failed. Please try again.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  const analysis = result?.analysis;

  return (
    <div>
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)' }}>
            Competitor Content Lens
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Analyze any creator or brand's content strategy — find gaps and opportunities.
          </p>
        </div>
        <HistoryDropdown
          isLoading={historyQuery.isLoading}
          items={historyQuery.data?.analyses || []}
          onSelect={handleSelectHistory}
        />
      </div>

      <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
            Platform
          </label>
          <PlatformSelector value={platform} onChange={setPlatform} disabled={loading} />
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6 }}>
            Pick where this handle lives so search doesn’t match the wrong person.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="comp-form-grid">
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
              Handle / Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>@</span>
              <input
                className="input"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyze(); }}
                placeholder={
                  platform === 'linkedin'
                    ? 'vanity-slug or linkedin.com/in/…'
                    : platform === 'twitter'
                      ? 'handle or x.com/…'
                      : platform === 'instagram'
                        ? 'handle or instagram.com/…'
                        : 'handle or profile URL'
                }
                style={{ paddingLeft: 28, width: '100%' }}
                disabled={loading}
              />
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5 }}>
              {platform === 'linkedin'
                ? 'Tip: paste your LinkedIn profile URL for the most reliable match'
                : 'Username or full profile URL'}
            </p>
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
              style={{ width: '100%' }}
            />
            {/* WHY: hidden spacer: mirrors the handle field's hint-text height so both
                inputs' bottom edges line up in this 2-col grid — without it, the
                industry column's input sits visually taller/misaligned since it has
                no hint paragraph of its own. */}
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5, visibility: 'hidden' }} aria-hidden="true">spacer</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={!handle.trim() || !platform || loading}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--color-error)' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>
      </div>

      {/* Loading→results transition announcement — scoped to a short status string
          rather than the (potentially long) results region itself. */}
      <div aria-live="polite" className="sr-only">
        {loading ? `Analyzing @${handle.replace(/^@/, '')}…` : analysis ? 'Analysis ready.' : ''}
      </div>

      {loading && <CompetitorSkeleton />}

      {analysis && !loading && result && (
        <CompetitorResults
          analysis={analysis}
          result={result}
          platform={platform}
          industry={industry}
          navigate={navigate}
          profileQuery={profileQuery}
        />
      )}

      {!result && !loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 12, color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 4, opacity: 0.6 }}><Search size={40} /></div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Pick a platform and handle to analyze</p>
          <p style={{ margin: 0, fontSize: 12 }}>Find their top themes, content gaps, and angles you can own.</p>
        </div>
      )}

      <style>{`
        @keyframes comp-spin  { to{transform:rotate(360deg)} }
        @keyframes comp-fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width:900px) {
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
