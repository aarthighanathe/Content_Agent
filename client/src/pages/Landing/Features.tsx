import type { ReactNode } from 'react';
import { BarChart2, Network, RefreshCw, Search, Target, Zap } from 'lucide-react';
import { SectionDivider } from './SectionDivider';

interface Feature {
  num: string;
  icon: ReactNode;
  iconBg: string;
  iconBorder: string;
  title: string;
  desc: string;
  accent: string;
}

const features: Feature[] = [
  {
    num: '01',
    icon: <Search size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent-2) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent-2) 22%, transparent)',
    title: 'Research-powered',
    desc: "Agents search real trends, competitor content, and live data before writing a single word. Every piece is grounded in what's actually working right now.",
    accent: 'var(--accent-2)',
  },
  {
    num: '02',
    icon: <Target size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    title: 'Platform-optimised',
    desc: 'Knows the exact rules for Instagram carousels, LinkedIn posts, Twitter threads, captions, and video scripts — slide counts, hooks, hashtag strategies and more.',
    accent: 'var(--accent)',
  },
  {
    num: '03',
    icon: <RefreshCw size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent-2) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent-2) 22%, transparent)',
    title: 'Self-improving',
    desc: 'A critic agent scores every output across five dimensions and rewrites until quality clears 70/100. You only ever see the polished result.',
    accent: 'var(--accent-2)',
  },
  {
    num: '04',
    icon: <Zap size={17} />,
    iconBg: 'rgba(16,185,129,0.10)',
    iconBorder: 'rgba(16,185,129,0.22)',
    title: 'Content Multiplier',
    desc: 'Create once, publish everywhere. Adapt any piece to all platforms instantly using the same cached research — no extra cost.',
    accent: 'var(--color-success)',
  },
  {
    num: '05',
    icon: <BarChart2 size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    title: 'Performance Predictor',
    desc: 'Know before you post. An AI agent forecasts engagement tier with a confidence score and a specific, actionable improvement tip.',
    accent: 'var(--accent)',
  },
  {
    num: '06',
    icon: <Network size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    title: 'Brand DNA',
    desc: 'Paste your best posts and ContentAgent extracts your writing fingerprint — tone, rhythm, vocabulary — then writes every piece in your voice.',
    accent: 'var(--accent)',
  },
];

export function Features() {
  return (
    <>
      <SectionDivider label="Why ContentAgent" />

      {/* ══════════ FEATURES ══════════ */}
      <section className="section" id="features" style={{ padding: '100px 72px' }}>
        <div className="rv" style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 22, height: 1, background: 'linear-gradient(90deg,var(--accent),transparent)', display: 'inline-block' }} />
            The system
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(32px,4.5vw,54px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.2, maxWidth: 640 }}>
            Not just another AI writer.<br />
            <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>A complete production system.</em>
          </h2>
        </div>

        <div
          className="features-grid rv"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'color-mix(in srgb, var(--accent-2) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 8%, transparent)', borderRadius: 2, overflow: 'hidden' }}
        >
          {features.map((f) => (
            <div key={f.num} className="feat-new rv">
              {/* Icon + title on the same row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
                <div className="feat-icon-badge" style={{ background: f.iconBg, border: `1px solid ${f.iconBorder}`, color: f.accent, marginBottom: 0 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 700, lineHeight: 1.2, color: 'var(--text-primary)', margin: 0 }}>
                  {f.title}
                </h3>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: `color-mix(in srgb, ${f.accent} 40%, transparent)`, letterSpacing: 2, marginBottom: 12 }}>{f.num} —</div>
              {/* WHY opacity 0.55 (#42): feature descriptions were at 0.45 which can fall below
                  WCAG AA 4.5:1 contrast on the near-black section background. 0.55 clears the
                  threshold while keeping the deliberately muted "supporting text" hierarchy. */}
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.78 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
