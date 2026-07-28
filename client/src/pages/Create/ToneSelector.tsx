import { Briefcase, MessageCircle, Flame, Smile, Minus } from 'lucide-react';

const tones = [
  { id: 'professional', label: 'Professional', Icon: Briefcase    },
  { id: 'casual',       label: 'Casual',       Icon: MessageCircle },
  { id: 'bold',         label: 'Bold',         Icon: Flame         },
  { id: 'playful',      label: 'Playful',      Icon: Smile         },
  { id: 'minimal',      label: 'Minimal',      Icon: Minus         },
];

interface ToneSelectorProps {
  value: string;
  onChange: (tone: string) => void;
}

// WHY clicking the already-selected pill clears it: tone is explicitly labeled
// "optional" next to this control, but before this fix there was no way back to
// the "no tone chosen" state once any pill was clicked — a genuinely optional
// field that became sticky the instant it was touched.
export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div role="group" aria-label="Select a tone (optional)" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {tones.map((t) => {
        const sel = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className="selectable-tile"
            data-selected={sel}
            aria-pressed={sel}
            onClick={() => onChange(sel ? '' : t.id)}
            style={{
              background: sel ? 'rgba(245,158,11,0.1)' : '#08081A',
              border: `1.5px solid ${sel ? '#F59E0B' : 'rgba(255,255,255,0.07)'}`,
              color: sel ? '#F59E0B' : 'rgba(255,255,255,0.45)',
              fontSize: 'clamp(11px,2vw,13px)',
              padding: '8px 16px',
              borderRadius: 24,
              cursor: 'pointer',
              transition: 'all .18s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              fontWeight: sel ? 600 : 400,
              boxShadow: sel ? '0 0 12px rgba(245,158,11,0.12)' : 'none',
            }}
          >
            <t.Icon size={13} style={{ flexShrink: 0 }} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
