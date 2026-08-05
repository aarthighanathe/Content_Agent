import type { ComponentType } from 'react';

export interface RepurposePlatformOption {
  id: string;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  gradient: string;
  accent: string;
}

interface PlatformPickerProps {
  platforms: RepurposePlatformOption[];
  multiPlatform: boolean;
  onToggleMultiPlatform: () => void;
  platform: string;
  onPlatformChange: (id: string) => void;
  selectedPlatforms: Set<string>;
  onTogglePlatformSelection: (id: string) => void;
  loading: boolean;
}

// WHY extracted from Repurpose.tsx: the multi-platform toggle (added
// alongside item 5's server-side fan-out) pushed the page to 401 lines, one
// over the 400-line split threshold — this block has its own clear
// props/state boundary (platform selection only), making it the natural
// piece to pull out, same rationale as InfoSidebar's earlier extraction.
export function PlatformPicker({
  platforms, multiPlatform, onToggleMultiPlatform,
  platform, onPlatformChange, selectedPlatforms, onTogglePlatformSelection, loading,
}: PlatformPickerProps) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {multiPlatform ? 'Target Platforms' : 'Target Platform'}
        </label>
        {/* WHY a toggle, not a permanent checkbox mode: multi-platform fans
            one fetch out to several jobs (a different request shape) — an
            explicit opt-in keeps the common single-platform path exactly as
            it always was, rather than silently turning every pill click
            into a multi-select the moment a second one is clicked. */}
        <button
          type="button"
          onClick={onToggleMultiPlatform}
          disabled={loading}
          style={{
            fontSize: 11, fontWeight: 600, background: 'transparent', border: 'none',
            color: 'var(--accent)', cursor: 'pointer', padding: 0,
          }}
        >
          {multiPlatform ? 'Switch to single platform' : 'Repurpose to multiple platforms'}
        </button>
      </div>
      <div className="repurpose-platform-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {platforms.map((p) => {
          const active = multiPlatform ? selectedPlatforms.has(p.id) : platform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => (multiPlatform ? onTogglePlatformSelection(p.id) : onPlatformChange(p.id))}
              disabled={loading}
              aria-pressed={active}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px',
                background: active ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                border: active ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' : '1px solid var(--rule)',
                borderRadius: 11, cursor: 'pointer', transition: 'all .18s',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: p.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <p.Icon size={13} color="#fff" />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: active ? '#fff' : 'var(--color-text-secondary)' }}>
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
