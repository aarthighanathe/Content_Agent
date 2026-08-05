import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

export interface HeroProps {
  isSignedIn: boolean | undefined;
}

const pipelineAgents = [
  { name: 'Orchestrator', color: 'var(--accent)' },
  { name: 'Researcher', color: 'var(--accent-2)' },
  { name: 'Writer', color: 'var(--accent)' },
  { name: 'Formatter', color: 'var(--color-success)' },
  { name: 'Critic', color: 'var(--color-error)' },
];

const qualityMiniBars = [
  { l: 'Hook', v: 18, c: 'var(--accent)' },
  { l: 'Platform', v: 16, c: 'var(--accent-2)' },
  { l: 'Voice', v: 17, c: 'var(--accent-2)' },
];

export function Hero({ isSignedIn }: HeroProps) {
  return (
    <>
      {/* ══════════ HERO ══════════ */}
      <section
        className="hero-section"
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '130px 72px 88px', position: 'relative', overflow: 'hidden' }}
      >
        <div className="aurora-orb orb-float-a" style={{ width: '750px', height: '750px', background: 'radial-gradient(circle,color-mix(in srgb, var(--accent-2) 16%, transparent) 0%,transparent 70%)', top: '-250px', left: '-200px' }} />
        <div className="aurora-orb orb-float-b" style={{ width: '580px', height: '580px', background: 'radial-gradient(circle,color-mix(in srgb, var(--accent) 10%, transparent) 0%,transparent 70%)', top: '3%', right: '-120px' }} />
        <div className="aurora-orb orb-float-c" style={{ width: '480px', height: '480px', background: 'radial-gradient(circle,color-mix(in srgb, var(--accent) 7%, transparent) 0%,transparent 70%)', bottom: '-60px', left: '38%', transform: 'translateX(-50%)' }} />
        <div className="hero-grid" />
        <div className="hero-dots" />

        {/* Eyebrow */}
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          5 AI agents — live now
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(44px,7.5vw,94px)',
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: -3,
            marginBottom: 28,
            animation: 'fadeUp .8s .1s ease both',
            maxWidth: 900,
          }}
        >
          AI agents that research,<br />
          <em className="hero-shimmer">write, score,</em>{' '}
          <span style={{ WebkitTextStroke: '1.5px color-mix(in srgb, var(--text-primary) 18%, transparent)', color: 'transparent' }}>
            and ship.
          </span>
        </h1>

        {/* Sub */}
        <p
          style={{
            fontSize: 17,
            fontWeight: 300,
            color: 'var(--text-muted)',
            maxWidth: 530,
            lineHeight: 1.78,
            marginBottom: 48,
            animation: 'fadeUp .8s .22s ease both',
          }}
        >
          Five specialised AI agents —{' '}
          <strong style={{ color: 'color-mix(in srgb, var(--accent) 82%, transparent)', fontWeight: 500 }}>Orchestrator, Researcher, Writer, Formatter, Critic</strong>{' '}
          — working in sequence to produce quality-gated, platform-optimised content automatically.
        </p>

        {/* CTAs */}
        <div className="hero-actions" style={{ display: 'flex', gap: 14, alignItems: 'center', animation: 'fadeUp .8s .34s ease both' }}>
          <Link
            to={isSignedIn ? '/dashboard' : '/sign-up'}
            style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: 'var(--on-accent)', fontWeight: 700, fontSize: 15, padding: '17px 40px', borderRadius: 11, letterSpacing: 0.2, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 9, boxShadow: '0 6px 32px var(--accent-glow)', transition: 'transform .2s,box-shadow .2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 40px var(--accent-glow)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 32px var(--accent-glow)'; }}
          >
            Get started <ArrowRight size={15} />
          </Link>
          <a
            href="#how"
            style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', color: 'var(--text-muted)', fontSize: 15, fontWeight: 500, padding: '17px 34px', border: '1px solid var(--rule)', borderRadius: 11, textDecoration: 'none', transition: 'all .2s', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--text-primary) 7%, transparent)'; e.currentTarget.style.color = 'color-mix(in srgb, var(--text-primary) 82%, transparent)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--text-primary) 14%, transparent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--text-primary) 4%, transparent)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--rule)'; }}
          >
            See how it works
          </a>
        </div>

        {/* Trust stats strip */}
        <div className="hero-stats">
          <div className="hero-stat-item">
            <span className="hero-stat-live" />
            Live now
          </div>
          <div className="hero-stat-item">5 AI agents</div>
          <div className="hero-stat-item">Quality-gated at 70/100</div>
          <div className="hero-stat-item">Engagement forecast per post</div>
        </div>
      </section>

      {/* ══════════ MOCKUP ══════════ */}
      <div className="rv mockup-section" style={{ maxWidth: 980, margin: '72px auto', width: '100%', padding: '0 72px' }}>
        <div style={{ background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--accent-2) 22%, transparent)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 48px 96px rgba(0,0,0,0.65), 0 0 0 1px color-mix(in srgb, var(--accent-2) 8%, transparent)' }}>
          {/* Browser chrome */}
          <div style={{ background: 'var(--bg-base)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid color-mix(in srgb, var(--accent-2) 12%, transparent)' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
                <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{ flex: 1, background: 'color-mix(in srgb, var(--accent-2) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 14%, transparent)', borderRadius: 6, padding: '4px 14px', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'color-mix(in srgb, var(--text-primary) 22%, transparent)', textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
              app.contentagent.ai/result/…
            </div>
          </div>

          {/* 3-column mockup */}
          <div className="mockup-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'color-mix(in srgb, var(--accent-2) 7%, transparent)' }}>
            {/* Card 1: Content */}
            <div style={{ background: 'var(--bg-raised)', padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
                Instagram Carousel · 1/5
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'color-mix(in srgb, var(--text-primary) 90%, transparent)', lineHeight: 1.3 }}>
                The algorithm rewards consistency over virality
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
                {[80, 65, 90, 55].map((w, i) => (
                  <div key={w} style={{ height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: i === 0 ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'color-mix(in srgb, var(--text-primary) 7%, transparent)', width: `${w}%`, borderRadius: 2 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {['← ●●●●● →', 'Edit', 'Copy'].map((t) => (
                  <div key={t} style={{ background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', border: '1px solid var(--rule)', borderRadius: 5, padding: '3px 8px', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'color-mix(in srgb, var(--text-primary) 28%, transparent)', whiteSpace: 'nowrap' }}>{t}</div>
                ))}
              </div>
            </div>

            {/* Card 2: Quality */}
            <div style={{ background: 'var(--bg-raised)', padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2 }}>Quality Score</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>87</div>
                <div>
                  <div style={{ fontSize: 9, color: 'color-mix(in srgb, var(--text-primary) 26%, transparent)', fontFamily: 'var(--font-mono)' }}>/ 100</div>
                  <div style={{ fontSize: 9, color: '#34D399', fontFamily: 'var(--font-mono)', marginTop: 1 }}>Approved</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qualityMiniBars.map((b) => (
                  <div key={b.l}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 3 }}>
                      <span style={{ color: 'color-mix(in srgb, var(--text-primary) 30%, transparent)', fontFamily: 'var(--font-mono)' }}>{b.l}</span>
                      <span style={{ color: b.c, fontFamily: 'var(--font-mono)' }}>{b.v}/20</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2 }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg,${b.c},color-mix(in srgb, ${b.c} 55%, transparent))`, width: `${(b.v / 20) * 100}%`, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 4, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.16)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'color-mix(in srgb, var(--text-primary) 26%, transparent)', marginBottom: 4 }}>PERFORMANCE FORECAST (SAMPLE)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 8, background: 'rgba(16,185,129,0.15)', color: '#34D399', borderRadius: 4, padding: '2px 6px', fontFamily: 'var(--font-mono)' }}>▲ HIGH</span>
                  <span style={{ fontSize: 9, color: '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>2.4× avg</span>
                  <span style={{ fontSize: 8, color: 'color-mix(in srgb, var(--text-primary) 18%, transparent)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>91% conf.</span>
                </div>
              </div>
            </div>

            {/* Card 3: Pipeline */}
            <div className="mockup-card-hide-sm" style={{ background: 'var(--bg-raised)', padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)' }}>Pipeline</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)' }}>100%</div>
              </div>
              <div style={{ height: 2, background: 'var(--rule)', borderRadius: 1, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,var(--accent-2),var(--accent))', width: '100%', borderRadius: 1 }} />
              </div>
              {pipelineAgents.map((a) => (
                <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 17, height: 17, borderRadius: '50%', border: `1.5px solid ${a.color}`, background: `color-mix(in srgb, ${a.color} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 }}>
                    <Check size={9} />
                  </div>
                  <div style={{ fontSize: 10.5, color: 'color-mix(in srgb, var(--text-primary) 72%, transparent)' }}>{a.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
