import { Newspaper, Video, Mail, CheckCircle2 } from 'lucide-react';

const supportedSources = [
  { Icon: Newspaper, title: 'Blog Posts',     desc: 'Medium, Substack, WordPress, Ghost' },
  { Icon: Video,     title: 'YouTube Videos', desc: 'Auto-captions extracted automatically' },
  { Icon: Mail,      title: 'Newsletters',    desc: 'Beehiiv, ConvertKit, Email archives' },
];

const howItWorks = [
  'Paste any public URL from a supported source',
  'AI extracts the key insights and research',
  'Content is rewritten for your chosen platform and brand voice',
];

// WHY extracted from Repurpose.tsx: this static informational content (no
// state, no props) was pushing the page component past the 400-line split
// threshold once the recent-attempts history feature was added — same
// rationale as Dashboard/Brand/Create's own thin-orchestrator-plus-cards split.
export function InfoSidebar() {
  return (
    <>
      {/* Supported sources */}
      <div style={{
        background: 'var(--bg-raised)', border: '1px solid var(--rule)',
        borderRadius: 16, padding: '20px',
      }}>
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Supported Sources
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {supportedSources.map((item) => (
            <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 14%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <item.Icon size={15} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{
        background: 'var(--bg-raised)', border: '1px solid var(--rule)',
        borderRadius: 16, padding: '20px',
      }}>
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          How It Works
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {howItWorks.map((step) => (
            <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle2 size={14} color="color-mix(in srgb, var(--accent-2) 60%, transparent)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tip box */}
      <div style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 6%, transparent), color-mix(in srgb, var(--accent-2) 6%, transparent))',
        border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)',
        borderRadius: 16, padding: '16px 18px',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'color-mix(in srgb, var(--accent) 70%, transparent)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Pro Tip
        </p>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Set up your Brand Voice first — the AI will automatically match your tone, vocabulary, and style when repurposing.
        </p>
      </div>
    </>
  );
}
