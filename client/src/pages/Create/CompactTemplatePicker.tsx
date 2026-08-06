import { Check } from 'lucide-react';
import type { NewTemplateId } from '../Result/constants';
import { TEMPLATES, getTemplate, getDefaultPalette } from '../../lib/templateSystem';

interface CompactTemplatePickerProps {
  templateId: NewTemplateId;
  onTemplateChange: (id: NewTemplateId) => void;
  paletteId: string;
  onPaletteChange: (id: string) => void;
}

// WHY a compact pill-chip row instead of a big-card gallery with mock slide
// previews: on the Create form's single-screen quick-entry flow, a large grid
// dominated the layout with little payoff (every card showed the same generic
// 3-lines-and-a-box shape, not the template's real design). This renders
// template/palette selection as one compact, scannable row — matching
// ToneSelector.tsx's existing visual language on this same form — with a
// small color-dot preview per chip instead of a large mock card. Also reused
// by CarouselTemplateSwitcher.tsx on the Result page (inside a collapsible
// banner) so both entry points share one visual language.
export function CompactTemplatePicker({
  templateId,
  onTemplateChange,
  paletteId,
  onPaletteChange,
}: CompactTemplatePickerProps) {
  const templates = Object.values(TEMPLATES);
  const selectedTemplate = getTemplate(templateId);
  const palettes = selectedTemplate?.colorPalettes ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Template chips */}
      <div
        role="group"
        aria-label="Carousel template"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {templates.map((t) => {
          const sel = t.id === templateId;
          const swatch = getDefaultPalette(t.id)?.colors.primary || 'var(--accent)';
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={sel}
              title={t.description}
              onClick={() => onTemplateChange(t.id)}
              style={{
                background: sel ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-raised)',
                border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--rule)'}`,
                color: sel ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 'clamp(11px,2vw,13px)',
                padding: '7px 14px',
                borderRadius: 24,
                cursor: 'pointer',
                transition: 'all .18s',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                whiteSpace: 'nowrap',
                fontWeight: sel ? 600 : 400,
                boxShadow: sel ? '0 0 12px color-mix(in srgb, var(--accent) 12%, transparent)' : 'none',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: swatch,
                  flexShrink: 0,
                  border: '1px solid rgba(0,0,0,0.15)',
                }}
              />
              {t.name}
              {sel && <Check size={11} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Palette dots for the selected template */}
      {palettes.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            Colors
          </span>
          {palettes.map((p) => {
            const sel = p.id === paletteId;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={sel}
                title={p.name}
                onClick={() => onPaletteChange(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: sel ? 'color-mix(in srgb, var(--text-primary) 5%, transparent)' : 'transparent',
                  border: `1px solid ${sel ? p.colors.primary : 'var(--rule)'}`,
                  borderRadius: 16,
                  padding: '4px 9px 4px 4px',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'flex',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.15)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ flex: 1, background: p.colors.primary }} />
                  <span style={{ flex: 1, background: p.colors.accent }} />
                </span>
                <span style={{ fontSize: 10.5, color: sel ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: sel ? 600 : 400 }}>
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
