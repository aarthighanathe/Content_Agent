import { SectionDivider } from './SectionDivider';

interface SampleCard {
  id: string;
  platform: string;
  accent: string;
  topic: string;
  lines: string[];
}

// WHY static, labeled examples — not testimonials: we have no customer quotes
// to show yet, and inventing them would undercut the honesty pass on this page.
// These are illustrative output shapes visitors can expect from the demo/pipeline.
const samples: SampleCard[] = [
  {
    id: 'carousel',
    platform: 'Carousel · slide 1',
    accent: 'var(--accent)',
    topic: 'Creator consistency',
    lines: [
      'Consistency beats virality',
      'Posting 3× a week for 90 days compounds faster than one lucky spike — here is the system.',
    ],
  },
  {
    id: 'linkedin',
    platform: 'LinkedIn · hook',
    accent: 'var(--accent-2)',
    topic: 'SaaS launch',
    lines: [
      'We launched to 47 users. Not 10,000.',
      'That constraint forced better onboarding copy — and a waitlist that actually converted.',
    ],
  },
  {
    id: 'thread',
    platform: 'Twitter · tweet 1',
    accent: 'var(--color-success)',
    topic: 'Study systems',
    lines: [
      'Stop rereading. Start retrieving.',
      'The SSS method (spaced, self-test, summarize) cut my revision time in half. Thread:',
    ],
  },
];

export function SocialProof() {
  return (
    <>
      <SectionDivider label="Sample output" />

      <section className="section" id="samples" style={{ padding: '80px 32px' }}>
        <div className="rv" style={{ marginBottom: 40, textAlign: 'center', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>
            What it looks like
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 700, lineHeight: 1.12, letterSpacing: -0.8, marginBottom: 12 }}>
            Short samples, real formats
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
            Illustrative snippets — try the live demo above for a fresh sample on your topic.
          </p>
        </div>

        <div
          className="samples-grid rv"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}
        >
          {samples.map((s) => (
            <article
              key={s.id}
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid color-mix(in srgb, var(--accent-2) 16%, transparent)',
                borderRadius: 14,
                padding: '22px 22px 20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: s.accent }}>
                  {s.platform}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'color-mix(in srgb, var(--text-primary) 28%, transparent)' }}>
                  {s.topic}
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, margin: 0 }}>
                {s.lines[0]}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                {s.lines[1]}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
