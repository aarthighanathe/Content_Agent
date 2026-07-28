import { Palette } from 'lucide-react';
import { SectionLabel } from './SectionLabel';

const carouselThemes = [
  { id: 0, name: 'Aurora',   desc: 'Cyan · Modern',        color: '#00D4FF' },
  { id: 1, name: 'Magazine', desc: 'Gold · Editorial',     color: '#D4A017' },
  { id: 2, name: 'Split',    desc: 'Orange · Energetic',   color: '#FF6B35' },
  { id: 3, name: 'Bold',     desc: 'Copper · Luxury',      color: '#C9A84C' },
  { id: 4, name: 'Minimal',  desc: 'Indigo · Clean',       color: '#6366F1' },
  { id: 5, name: 'Neon',     desc: 'Mint · Cyber',         color: '#00FF94' },
  { id: 6, name: 'Violet',   desc: 'Purple · Luxe',        color: '#A855F7' },
  { id: 7, name: 'Crimson',  desc: 'Red · Dramatic',       color: '#FF2D55' },
  { id: 8, name: 'Rose',     desc: 'Magenta · Vibrant',    color: '#FF3CAC' },
];

interface AdvancedOptionsProps {
  platform: string;
  carouselTheme: number;
  onCarouselThemeChange: (themeId: number) => void;
}

// WHY no expand/collapse: this used to be a generic "Advanced" panel gating a
// single carousel-theme picker behind a toggle. Since it only ever holds one
// thing, and only for one platform, the toggle just cost an extra click for no
// grouping benefit — it's shown directly (and only) when relevant instead.
export function AdvancedOptions({ platform, carouselTheme, onCarouselThemeChange }: AdvancedOptionsProps) {
  if (platform !== 'instagram_carousel') return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel
        icon={<Palette size={13} style={{ flexShrink: 0 }} />}
        trailing={<span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: "var(--font-mono)" }}>sets slide color palette</span>}
      >
        Carousel theme
      </SectionLabel>
      <div
        role="group"
        aria-label="Carousel theme"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 6 }}
      >
        {carouselThemes.map((t) => {
          const sel = carouselTheme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className="selectable-tile"
              data-selected={sel}
              aria-pressed={sel}
              onClick={() => onCarouselThemeChange(t.id)}
              title={t.desc}
              style={{
                background: sel ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${sel ? t.color : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'all .15s', textAlign: 'left', minWidth: 0,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: sel ? 600 : 500, color: sel ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.name}</span>
              {sel && (
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><polyline points="1.5 5.5 4 8 8.5 2" stroke={t.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
