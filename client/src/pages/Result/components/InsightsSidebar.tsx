// Sidebar defaults to open (see Result.tsx) so users see the AI Quality Analysis
// exists; user can collapse it via onToggle if they prefer it out of the way.
import type { ReactElement } from 'react';
import { Check, AlertTriangle, Sparkles, Zap } from 'lucide-react';
import { VisibleScroller } from '../../../components/VisibleScroller';
import type { CriticResult, CriticScores } from '../../../types/job';

interface Props {
  criticResult: CriticResult | null | undefined;
  className?:   string;
  onSteer?:     (prefill?: string) => void;
  collapsed?:   boolean;
  onToggle?:    () => void;
}

const scoreDims: { l: string; k: keyof CriticScores; c: string; tip: string }[] = [
  { l: 'Hook Strength',  k: 'hookStrength',       c: '#F59E0B', tip: 'Open with a bolder question or a shocking stat to grab attention faster.' },
  { l: 'Platform Fit',   k: 'platformCompliance',  c: '#8B5CF6', tip: "Adjust the structure to match this platform's native content expectations." },
  { l: 'Brand Voice',    k: 'brandVoiceMatch',     c: '#22D3EE', tip: 'Keep tone consistent throughout — use the Steer button to align the voice.' },
  { l: 'Value Delivery', k: 'valueDelivery',       c: 'var(--color-success)', tip: 'Add concrete examples, data points, or a clear takeaway for readers.' },
  { l: 'CTA Clarity',    k: 'ctaClarity',          c: '#EC4899', tip: 'Make your call-to-action more direct — tell readers exactly what to do next.' },
];

const RING_SIZE = 84;
const RING_R    = 32;
const RING_CIRC = 2 * Math.PI * RING_R;

export function InsightsSidebar({ criticResult, className, onSteer, collapsed = false, onToggle }: Props): ReactElement {
  // WHY one tree for open and closed: swapping to a separate 48px strip
  // unmounted the card mid-toggle, so the column snapped and the scores
  // repainted. The rail is always mounted; CSS fades it in over the same card.
  const shellClass = ['rp-sidebar', collapsed ? 'rp-sidebar-collapsed' : '', className]
    .filter(Boolean)
    .join(' ');

  // WHY an explanatory empty state, not `return null`: this used to render
  // nothing at all — no header, no message — whenever a job had no critic
  // result yet (e.g. still generating, or an older job predating the critic
  // stage). On mobile, where Insights is its own tab, that made the tab look
  // broken (a fully blank pane) rather than "there's genuinely nothing here
  // yet" — violates the AGENT RULES "never leave a user staring at nothing."
  if (!criticResult?.scores) {
    return (
      <div className={shellClass}>
        <div className="rp-sidebar-panel" inert={collapsed ? true : undefined} aria-hidden={collapsed || undefined}>
        <div className="card-glow" style={{ flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: 0 }}>
          {/* WHY padding on the scroller (card-glow is padding:0): keeps the
              painted track on the border while copy stays inset from the edge. */}
          <VisibleScroller style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)' }}>AI Quality Analysis</div>
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                title="Collapse insights"
                aria-expanded={!collapsed}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center', lineHeight: 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: '20px 10px' }}>
            <Sparkles size={22} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, maxWidth: 220 }}>
              No quality insights available for this content yet.
            </p>
          </div>
          </VisibleScroller>
        </div>
        </div>
        {onToggle && (
          <button
            type="button"
            className="rp-sidebar-rail"
            onClick={onToggle}
            title="Show AI Quality Analysis"
            aria-expanded={false}
            aria-hidden={!collapsed}
            tabIndex={collapsed ? 0 : -1}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="rp-sidebar-rail-label">AI Insights</span>
          </button>
        )}
      </div>
    );
  }

  const worst = scoreDims.reduce((a, d) =>
    (criticResult.scores[d.k] || 0) < (criticResult.scores[a.k] || 0) ? d : a,
    scoreDims[0]
  );

  const showTip = (criticResult.scores[worst.k] || 0) < 17;

  return (
    <div className={shellClass}>
      <div className="rp-sidebar-panel" inert={collapsed ? true : undefined} aria-hidden={collapsed || undefined}>
      {/* card-glow fills the sidebar; padding:0 (Result.css) so the painted
          track sits on the border. Content inset is on the scroller only. */}
      <div className="card-glow" style={{ flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: 0 }}>
      {/* WHY 20×22 (not compact 16): 16px left copy flush against the card
          border — critic quote marks and score % labels read as colliding. */}
      <VisibleScroller style={{ padding: '20px 22px' }}>

        {/* Section label + collapse toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)' }}>AI Quality Analysis</div>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              title="Collapse insights"
              aria-expanded={!collapsed}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center', lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Score ring + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
            <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="var(--rule)" strokeWidth="6" />
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="url(#qsGrad2)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC - (criticResult.totalScore / 100) * RING_CIRC}
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.16,1,.3,1)' }}
              />
              <defs>
                <linearGradient id="qsGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent-2)" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{criticResult.totalScore}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", marginTop: 2 }}>/ 100</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Quality Score</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: criticResult.approved ? 'rgba(16,185,129,0.08)' : 'color-mix(in srgb, var(--accent) 8%, transparent)', border: `1px solid ${criticResult.approved ? 'rgba(16,185,129,0.22)' : 'color-mix(in srgb, var(--accent) 22%, transparent)'}`, color: criticResult.approved ? '#34D399' : 'var(--accent)', fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20 }}>
              {criticResult.approved
                ? <><Check size={10} /> Approved</>
                : <><AlertTriangle size={10} /> Needs work</>}
            </div>
          </div>
        </div>

        {/* Score bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scoreDims.map(({ l, k, c }) => {
            const sc  = criticResult.scores[k] || 0;
            const pct = Math.round((sc / 20) * 100);
            return (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{l}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ color: c, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>{sc}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "var(--font-mono)" }}>/20</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", marginLeft: 3 }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 7, background: 'var(--rule)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: `linear-gradient(90deg,${c},${c}80)`, borderRadius: 4, width: `${pct}%`, transition: 'width 1.2s cubic-bezier(.16,1,.3,1)', boxShadow: pct > 75 ? `0 0 6px ${c}60` : 'none' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Critic feedback */}
        {criticResult.feedback && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--rule)' }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Critic Feedback</div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.65, margin: 0 }}>"{criticResult.feedback}"</p>
          </div>
        )}

        {/* Actionable tip for weakest dimension */}
        {showTip && (
          <div style={{ marginTop: 16, display: 'flex', gap: 9, background: 'color-mix(in srgb, var(--accent) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 10%, transparent)', borderRadius: 9, padding: '12px 13px' }}>
            <Sparkles size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: 'color-mix(in srgb, var(--accent) 55%, transparent)', marginBottom: 6 }}>Tip · {worst.l}</div>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{worst.tip}</p>
            </div>
          </div>
        )}

        {/* Fix with AI button */}
        {onSteer && showTip && (
          <button onClick={() => onSteer(worst.tip)} className="btn-ghost" style={{ width: '100%', marginTop: 12, fontSize: 12, padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Zap size={12} /> Fix with AI
          </button>
        )}
      </VisibleScroller>
      </div>
      </div>
      {onToggle && (
        <button
          type="button"
          className="rp-sidebar-rail"
          onClick={onToggle}
          title="Show AI Quality Analysis"
          aria-expanded={false}
          aria-hidden={!collapsed}
          tabIndex={collapsed ? 0 : -1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="rp-sidebar-rail-label">AI Insights</span>
          <span className="rp-sidebar-rail-score">{criticResult.totalScore}</span>
        </button>
      )}
    </div>
  );
}
