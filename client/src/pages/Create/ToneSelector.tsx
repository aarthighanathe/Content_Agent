import { Briefcase, MessageCircle, Flame, Smile, Minus, Sparkles, GraduationCap, Star, ArrowRight } from 'lucide-react';

// WHY all 9, matching VALID_TONES exactly (server/src/schemas/jobs.ts): this
// previously only exposed 5 of the 9 tones the backend/zod schema accept —
// witty/educational/inspirational/direct were silently unreachable from the UI
// even though the server has always validated them.
const tones = [
  { id: 'professional', label: 'Professional', Icon: Briefcase     },
  { id: 'casual',       label: 'Casual',       Icon: MessageCircle },
  { id: 'witty',        label: 'Witty',        Icon: Sparkles      },
  { id: 'educational',  label: 'Educational',  Icon: GraduationCap },
  { id: 'inspirational',label: 'Inspirational',Icon: Star          },
  { id: 'bold',         label: 'Bold',         Icon: Flame         },
  { id: 'playful',      label: 'Playful',      Icon: Smile         },
  { id: 'minimal',      label: 'Minimal',      Icon: Minus         },
  { id: 'direct',       label: 'Direct',       Icon: ArrowRight    },
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
              background: sel ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-raised)',
              border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--rule)'}`,
              color: sel ? 'var(--accent)' : 'var(--text-muted)',
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
              boxShadow: sel ? '0 0 12px color-mix(in srgb, var(--accent) 12%, transparent)' : 'none',
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
