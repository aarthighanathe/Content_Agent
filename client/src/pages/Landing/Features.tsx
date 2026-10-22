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
  /** WHY: Critic + Multiplier lead the grid — they are the clearest differentiators. */
  core?: boolean;
}

const features: Feature[] = [
  {
    num: '01',
    icon: <RefreshCw size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent-2) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent-2) 22%, transparent)',
    title: 'Self-improving critic',
    desc: 'Scores every draft on hook, platform fit, brand voice, value, and CTA. Under 70/100 goes back for a rewrite — up to two times.',
    accent: 'var(--accent-2)',
    core: true,
  },
  {
    num: '02',
    icon: <Zap size={17} />,
    iconBg: 'rgba(16,185,129,0.10)',
    iconBorder: 'rgba(16,185,129,0.22)',
    title: 'Content Multiplier',
    desc: 'Adapt one finished piece into a carousel, LinkedIn post, thread, or caption. New drafts reuse the original research.',
    accent: 'var(--color-success)',
    core: true,
  },
  {
    num: '03',
    icon: <Search size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent-2) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent-2) 22%, transparent)',
    title: 'Research-powered',
    desc: 'Agents search the live web for trends, facts, and angles before a single word is written.',
    accent: 'var(--accent-2)',
  },
  {
    num: '04',
    icon: <Target size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    title: 'Platform-optimised',
    desc: 'Rules for Instagram carousels, LinkedIn posts, Twitter threads, captions, and video scripts — hooks, length, hashtags.',
    accent: 'var(--accent)',
  },
  {
    num: '05',
    icon: <BarChart2 size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    title: 'Performance Predictor',
    desc: 'Forecasts an engagement tier with a confidence score and one concrete tip before you post.',
    accent: 'var(--accent)',
  },
  {
    num: '06',
    icon: <Network size={17} />,
    iconBg: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    title: 'Brand DNA',
    desc: 'Paste sample posts; Pensieve extracts sentence length, vocabulary, hooks, and structure, then writes in that fingerprint.',
    accent: 'var(--accent)',
  },
];

export function Features() {
  return (
    <>
      <SectionDivider label="Why Pensieve" />

      <section className="section" id="features" style={{ padding: '100px 32px' }}>
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
            <div
              key={f.num}
              className="feat-new rv"
              style={f.core ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${f.accent} 28%, transparent)` } : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
                <div className="feat-icon-badge" style={{ background: f.iconBg, border: `1px solid ${f.iconBorder}`, color: f.accent, marginBottom: 0 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 700, lineHeight: 1.2, color: 'var(--text-primary)', margin: 0 }}>
                  {f.title}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: `color-mix(in srgb, ${f.accent} 40%, transparent)`, letterSpacing: 2 }}>
                  {f.num} —
                </span>
                {f.core && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: 1.2, textTransform: 'uppercase', color: f.accent, background: `color-mix(in srgb, ${f.accent} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${f.accent} 28%, transparent)`, borderRadius: 4, padding: '2px 7px' }}>
                    Core
                  </span>
                )}
              </div>
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
