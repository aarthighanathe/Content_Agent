import { Link } from 'react-router-dom';
import { Newspaper, Video, Mail, Sparkles, ArrowRight } from 'lucide-react';

const supportedSources = [
  { Icon: Newspaper, title: 'Blog Posts',     desc: 'Medium, Substack, WordPress, Ghost' },
  { Icon: Video,     title: 'YouTube Videos', desc: 'Auto-captions extracted automatically' },
  { Icon: Mail,      title: 'Newsletters',    desc: 'Beehiiv, ConvertKit, Email archives' },
];

const howItWorks = [
  { title: 'Paste a link', desc: 'Any public URL from a supported source' },
  { title: 'AI does the reading', desc: 'Key insights and research get extracted automatically' },
  { title: 'Get native content', desc: 'Rewritten for your chosen platform and brand voice' },
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
        borderRadius: 16, padding: '18px 18px 6px',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
          Supported Sources
        </p>
        <div>
          {supportedSources.map((item, i) => (
            <div
              key={item.title}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0',
                borderTop: i > 0 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent-2) 10%, transparent))',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <item.Icon size={16} color="var(--accent)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{item.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{
        background: 'var(--bg-raised)', border: '1px solid var(--rule)',
        borderRadius: 16, padding: '18px',
      }}>
        <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
          How It Works
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {howItWorks.map((step, i) => (
            <div key={step.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: 'color-mix(in srgb, var(--accent-2) 14%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-2) 35%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--accent-2)',
                }}>
                  {i + 1}
                </div>
                {i < howItWorks.length - 1 && (
                  <div style={{ width: 1, flex: 1, minHeight: 22, background: 'var(--rule)', margin: '4px 0' }} />
                )}
              </div>
              <div style={{ paddingBottom: i < howItWorks.length - 1 ? 16 : 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{step.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tip box */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent-2) 8%, transparent))',
        border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
        borderRadius: 16, padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <Sparkles size={13} color="var(--accent)" />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
            Pro Tip
          </p>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Set up your Brand Voice first — the AI will automatically match your tone, vocabulary, and style when repurposing.
        </p>
        <Link
          to="/brand"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
          }}
        >
          Set up Brand Voice <ArrowRight size={12} />
        </Link>
      </div>
    </>
  );
}
