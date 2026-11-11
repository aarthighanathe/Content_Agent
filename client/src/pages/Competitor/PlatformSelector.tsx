import { COMPETITOR_PLATFORM_OPTIONS } from './platforms';
import type { CompetitorPlatform } from '../../types/social';

interface PlatformSelectorProps {
  value: CompetitorPlatform | '';
  onChange: (platform: CompetitorPlatform) => void;
  disabled?: boolean;
}

// WHY required single-select (not deselectable like ToneSelector): the server
// refuses analysis without a platform — clearing the pill would only re-disable
// Analyze with no benefit, and a missing platform was the root cause of
// wrong-person matches for ambiguous handles.
export function PlatformSelector({ value, onChange, disabled = false }: PlatformSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Platform" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {COMPETITOR_PLATFORM_OPTIONS.map((p) => {
        const sel = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={sel}
            disabled={disabled}
            onClick={() => onChange(p.id)}
            className="selectable-tile"
            data-selected={sel}
            style={{
              background: sel ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-raised)',
              border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--rule)'}`,
              color: sel ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 'clamp(11px,2vw,13px)',
              padding: '10px 14px',
              minHeight: 40,
              borderRadius: 24,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'all .18s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              fontWeight: sel ? 600 : 400,
              boxShadow: sel ? '0 0 12px color-mix(in srgb, var(--accent) 12%, transparent)' : 'none',
            }}
          >
            <p.Icon size={13} style={{ flexShrink: 0 }} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
