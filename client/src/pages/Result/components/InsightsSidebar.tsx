// Sidebar defaults to open (see Result.tsx) so users see the AI Quality Analysis
// exists; user can collapse it via onToggle if they prefer it out of the way.
import { Check, AlertTriangle, Sparkles, Zap } from 'lucide-react';
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

const RING_SIZE = 112;
const RING_R    = 44;
const RING_CIRC = 2 * Math.PI * RING_R;

export function InsightsSidebar({ criticResult, className, onSteer, collapsed = false, onToggle }: Props) {
  if (!criticResult?.scores) return null;

  // Collapsed: thin strip showing score + toggle
  if (collapsed) {
    return (
      <div
        className={['rp-sidebar', className].filter(Boolean).join(' ')}
        style={{ width: 48 }}
      >
        <div
          className="card-glow"
          role="button"
          tabIndex={0}
          style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, flex: 1, cursor: 'pointer', userSelect: 'none' }}
          onClick={onToggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } }}
          title="Show AI insights"
        >
          {/* Chevron pointing left (expand) */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {/* Rotated label */}
          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
            AI Insights
          </div>
          {/* Score pill */}
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>
            {criticResult.totalScore}
          </div>
        </div>
      </div>
    );
  }

  const worst = scoreDims.reduce((a, d) =>
    (criticResult.scores[d.k] || 0) < (criticResult.scores[a.k] || 0) ? d : a,
    scoreDims[0]
  );

  const showTip = (criticResult.scores[worst.k] || 0) < 17;

  return (
    <div className={['rp-sidebar', className].filter(Boolean).join(' ')}>
      {/* card-glow fills the full sidebar height via flex:1; scrolls internally
          (see .rp-sidebar > .card-glow in Result.css) so the scrollbar sits inside
          the card's own border/padding instead of on the outer sidebar wrapper. */}
      <div className="card-glow" style={{ padding: '22px 22px', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: 0 }}>

        {/* Section label + collapse toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>AI Quality Analysis</div>
          {onToggle && (
            <button
              onClick={onToggle}
              title="Collapse insights"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center', lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Score ring + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
            <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="url(#qsGrad2)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC - (criticResult.totalScore / 100) * RING_CIRC}
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.16,1,.3,1)' }}
              />
              <defs>
                <linearGradient id="qsGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: '#F59E0B', lineHeight: 1 }}>{criticResult.totalScore}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontFamily: "var(--font-mono)", marginTop: 2 }}>/ 100</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Quality Score</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: criticResult.approved ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${criticResult.approved ? 'rgba(16,185,129,0.22)' : 'rgba(245,158,11,0.22)'}`, color: criticResult.approved ? '#34D399' : '#F59E0B', fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20 }}>
              {criticResult.approved
                ? <><Check size={10} /> Approved</>
                : <><AlertTriangle size={10} /> Needs work</>}
            </div>
          </div>
        </div>

        {/* Score bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {scoreDims.map(({ l, k, c }) => {
            const sc  = criticResult.scores[k] || 0;
            const pct = Math.round((sc / 20) * 100);
            return (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{l}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ color: c, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>{sc}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontFamily: "var(--font-mono)" }}>/20</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "var(--font-mono)", marginLeft: 3 }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: `linear-gradient(90deg,${c},${c}80)`, borderRadius: 4, width: `${pct}%`, transition: 'width 1.2s cubic-bezier(.16,1,.3,1)', boxShadow: pct > 75 ? `0 0 6px ${c}60` : 'none' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Critic feedback */}
        {criticResult.feedback && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 8 }}>Critic Feedback</div>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.65, margin: 0 }}>"{criticResult.feedback}"</p>
          </div>
        )}

        {/* Spacer pushes tip + button to bottom when card is stretched */}
        <div style={{ flex: 1 }} />

        {/* Actionable tip for weakest dimension */}
        {showTip && (
          <div style={{ marginTop: 16, display: 'flex', gap: 9, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: 9, padding: '12px 13px' }}>
            <Sparkles size={13} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(245,158,11,0.55)', marginBottom: 6 }}>Tip · {worst.l}</div>
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, margin: 0 }}>{worst.tip}</p>
            </div>
          </div>
        )}

        {/* Fix with AI button */}
        {onSteer && showTip && (
          <button onClick={() => onSteer(worst.tip)} className="btn-ghost" style={{ width: '100%', marginTop: 12, fontSize: 12, padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Zap size={12} /> Fix with AI
          </button>
        )}
      </div>
    </div>
  );
}
