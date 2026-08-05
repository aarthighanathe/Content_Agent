import { SectionDivider } from './SectionDivider';

interface QualityBar {
  label: string;
  val: number;
  color: string;
}

const qualityBars: QualityBar[] = [
  { label: 'Hook strength', val: 92, color: 'var(--accent)' },
  { label: 'Platform fit', val: 78, color: 'var(--accent-2)' },
  { label: 'Brand voice', val: 88, color: 'var(--accent)' },
  { label: 'Value delivered', val: 85, color: 'var(--color-success)' },
  { label: 'CTA clarity', val: 81, color: 'var(--accent-2)' },
];

export function QualityDemo() {
  return (
    <>
      <SectionDivider label="Quality standard" />

      {/* ══════════ QUALITY ══════════ */}
      <section className="section" id="quality" style={{ padding: '100px 72px' }}>
        <div className="quality-wrap rv" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent-2) 22%, transparent)', borderRadius: 18, padding: 56, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '340px', height: '340px', background: 'radial-gradient(circle,color-mix(in srgb, var(--accent-2) 8%, transparent),transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '280px', height: '280px', background: 'radial-gradient(circle,color-mix(in srgb, var(--accent) 5%, transparent),transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-block', background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', padding: '7px 16px', borderRadius: 7, marginBottom: 24 }}>
              Critic-reviewed
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(30px,3.5vw,44px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 18, color: 'color-mix(in srgb, var(--text-primary) 92%, transparent)' }}>
              Approved<br /><em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>every time.</em>
            </h2>
            <p style={{ fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.78, marginBottom: 22 }}>
              Every piece passes through a dedicated critic agent that scores it across five dimensions. Content only ships when it clears the threshold.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)', borderRadius: 10, padding: '14px 22px', marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>70</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.45 }}>/ 100<br />minimum score</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'color-mix(in srgb, var(--text-primary) 30%, transparent)', lineHeight: 1.68 }}>
              After approval, the <strong style={{ color: 'color-mix(in srgb, var(--text-primary) 52%, transparent)', fontWeight: 500 }}>Performance Predictor</strong> forecasts engagement tier and gives one actionable improvement tip.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
            {qualityBars.map((b) => (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
                  <span style={{ color: 'color-mix(in srgb, var(--text-primary) 48%, transparent)', fontWeight: 500 }}>{b.label}</span>
                  <span style={{ color: b.color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{b.val}</span>
                </div>
                <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2 }}>
                  <div className="q-bar-fill" style={{ width: `${b.val}%`, color: b.color, background: `linear-gradient(90deg,${b.color},color-mix(in srgb, ${b.color} 55%, transparent))` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
