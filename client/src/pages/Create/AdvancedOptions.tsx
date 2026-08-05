import { Palette } from 'lucide-react';
import { SectionLabel } from './SectionLabel';
import { CAROUSEL_THEMES, type TemplateId } from '../Result/constants';

// WHY sourced from CAROUSEL_THEMES, not a local copy: this picker's swatch
// colors must match what actually renders (CAROUSEL_THEMES drives both the
// live preview and the SSR export bundle — see CLAUDE.md §11, "defined in two
// places that must stay in sync"). A previous hardcoded copy here drifted from
// the canonical accents (e.g. split showed orange but rendered violet).
const THEME_ORDER: TemplateId[] = ['aurora', 'magazine', 'split', 'bold', 'minimal', 'neon', 'violet', 'crimson', 'rose'];
const carouselThemes = THEME_ORDER.map((key, id) => ({
  id,
  name: CAROUSEL_THEMES[key].name,
  desc: CAROUSEL_THEMES[key].name,
  color: CAROUSEL_THEMES[key].accent,
}));

interface AdvancedOptionsProps {
  platform: string;
  carouselTheme: number;
  onCarouselThemeChange: (themeId: number) => void;
}

// WHY no expand/collapse: this used to be a generic "Advanced" panel gating a
// single carousel-theme picker behind a toggle. Since it only ever holds one
// thing, and only for one platform, the toggle just cost an extra click for no
// grouping benefit — it's shown directly (and only) when relevant instead.
// NOTE: Carousel themes only apply to Instagram Carousels; component returns null for other platforms.
export function AdvancedOptions({ platform, carouselTheme, onCarouselThemeChange }: AdvancedOptionsProps) {
  if (platform !== 'instagram_carousel') return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel
        icon={<Palette size={13} style={{ flexShrink: 0 }} />}
        trailing={<span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "var(--font-mono)" }}>sets slide color palette</span>}
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
                background: sel ? 'color-mix(in srgb, var(--text-primary) 5%, transparent)' : 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                border: `1px solid ${sel ? t.color : 'var(--rule)'}`,
                borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'all .15s', textAlign: 'left', minWidth: 0,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: sel ? 600 : 500, color: sel ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.name}</span>
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
