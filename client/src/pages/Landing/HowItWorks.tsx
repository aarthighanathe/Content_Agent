import { SectionDivider } from './SectionDivider';

interface Step {
  num: string;
  accent: string;
  title: string;
  desc: string;
}

const steps: Step[] = [
  { num: '01', accent: 'var(--accent)', title: 'Enter your topic', desc: 'Choose platform, tone, audience — describe your topic in plain language.' },
  { num: '02', accent: 'var(--accent-2)', title: 'Agents research', desc: 'AI searches real-time trends, hashtags, and competitor content automatically.' },
  { num: '03', accent: 'var(--accent)', title: 'Write & critique', desc: 'Writer drafts, Critic scores across five dimensions — loop repeats until approved.' },
  { num: '04', accent: 'var(--color-success)', title: 'Predict engagement', desc: 'Performance Predictor forecasts reach tier and gives one actionable tip.' },
  { num: '05', accent: 'var(--accent-2)', title: 'Multiply & ship', desc: 'Adapt to every platform with one click, then export PDF or copy text.' },
];

export function HowItWorks() {
  return (
    <>
      <SectionDivider label="The process" />

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="section" id="how" style={{ padding: '100px 72px' }}>
        <div className="rv" style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 22, height: 1, background: 'linear-gradient(90deg,var(--accent),transparent)', display: 'inline-block' }} />
            How it works
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(32px,4.5vw,54px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.2 }}>
            Five steps to <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>great content</em>
          </h2>
        </div>

        <div className="steps-row rv" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.num} className="rv step-item" style={{ padding: '0 24px', borderLeft: i === 0 ? 'none' : '1px solid var(--rule)', paddingLeft: i === 0 ? 0 : 24 }}>
              <div className="step-badge-wrap">
                <div className="step-num-badge" style={{ background: `color-mix(in srgb, ${s.accent} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${s.accent} 42%, transparent)`, color: s.accent }}>
                  {s.num}
                </div>
              </div>
              <div className="step-item-content">
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 15.5, fontWeight: 700, marginBottom: 10, lineHeight: 1.25, color: 'color-mix(in srgb, var(--text-primary) 90%, transparent)' }}>
                  {s.title}
                </h4>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.72 }}>
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
