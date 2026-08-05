import { Check, ChevronDown } from 'lucide-react';
import { platforms, findPlatform } from './platforms';

interface PlatformSelectorProps {
  value: string;
  onChange: (platform: string) => void;
  onSelect?: (platform: string) => void;
}

// Full card grid — used on first arrival (no platform chosen yet) and when the
// user asks to change platform via the compact summary row below.
export function PlatformSelector({ value, onChange, onSelect }: PlatformSelectorProps) {
  const handleClick = (id: string) => {
    onChange(id);
    onSelect?.(id);
  };

  return (
    <>
      <style>{`
        @media (max-width: 375px) {
          .platform-grid-375-fix {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div
        className="platform-grid-375-fix"
        role="group"
        aria-label="Choose a platform"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}
      >
      {platforms.map((p) => {
        const sel = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className="selectable-tile"
            data-selected={sel}
            aria-pressed={sel}
            onClick={() => handleClick(p.id)}
            style={{
              background: sel ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'var(--bg-raised)',
              border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--rule)'}`,
              borderRadius: 11,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 14,
              cursor: 'pointer',
              transition: 'all .18s',
              boxShadow: sel ? '0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent), 0 4px 20px color-mix(in srgb, var(--accent) 10%, transparent)' : 'none',
              textAlign: 'left',
              position: 'relative',
            }}
          >
            {/* Icon and header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: sel ? `0 0 16px ${p.accent}40` : 'none' }}>
                <p.Icon size={24} color="#fff" strokeWidth={1.75} />
              </div>
              {sel && (
                <div style={{ width: 20, height: 20, minWidth: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontWeight: 700 }}><Check size={11} /></div>
              )}
            </div>

            {/* Label and description */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'clamp(13px,2vw,15px)', fontWeight: 600, color: sel ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 4 }}>
                {p.label}
              </div>
              <div style={{ fontSize: 'clamp(11px,1.5vw,12px)', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {p.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
    </>
  );
}

interface PlatformSummaryProps {
  platform: string;
  onChangeClick: () => void;
}

// Compact "you picked X — change?" row, shown once a platform is selected so the
// full grid doesn't have to stay on screen permanently now that platform + topic
// live on one page instead of two wizard steps.
export function PlatformSummary({ platform, onChangeClick }: PlatformSummaryProps) {
  const p = findPlatform(platform);
  if (!p) return null;
  return (
    <button
      type="button"
      onClick={onChangeClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        background: 'var(--bg-raised)', border: '1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
        borderRadius: 11, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
        transition: 'border-color .18s',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 9, background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <p.Icon size={18} color="#fff" strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'color-mix(in srgb, var(--accent) 65%, transparent)', fontFamily: "var(--font-mono)", flexShrink: 0 }}>
        Change <ChevronDown size={12} />
      </span>
    </button>
  );
}
