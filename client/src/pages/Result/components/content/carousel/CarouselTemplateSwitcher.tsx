import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import {
  TEMPLATES, getTemplate, getDefaultPalette, isTemplateId,
} from '../../../../../lib/templateSystem';
import type { NewTemplateId } from '../../../constants';

interface Props {
  templateId?: string;
  paletteId?: string;
  onChange: (templateId: string, paletteId?: string) => void;
}

// WHY a column of rows, not the Create form's wrapping pills: this control
// sits in a narrow column beside the slide. Wide chips wrapped into a tall,
// uneven stack and hid the color choice.
export function CarouselTemplateSwitcher({ templateId, paletteId, onChange }: Props) {
  const currentId: NewTemplateId = templateId && isTemplateId(templateId) ? templateId : 'modern-minimal';
  const currentTemplate = getTemplate(currentId);
  const palettes = currentTemplate?.colorPalettes ?? [];
  const activePalette = paletteId || palettes[currentTemplate?.defaultPaletteIndex ?? 0]?.id || '';

  const listRef = useRef<HTMLDivElement>(null);

  function handleTemplateSelect(id: NewTemplateId): void {
    const template = getTemplate(id);
    const defaultPaletteId = template?.colorPalettes[template.defaultPaletteIndex]?.id;
    onChange(id, defaultPaletteId);
  }

  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!list || !row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [currentId]);

  return (
    <section className="rp-side-card" aria-label="Carousel template">
      <div className="rp-side-kicker">Template</div>
      <p className="rp-side-help">Changes the look. Your words stay the same.</p>
      <div className="rp-template-list" ref={listRef} role="group" aria-label="Templates">
        {Object.values(TEMPLATES).map((template) => {
          const selected = template.id === currentId;
          const swatch = getDefaultPalette(template.id)?.colors.primary || 'var(--accent)';
          return (
            <button
              key={template.id}
              type="button"
              className="rp-template-row"
              aria-pressed={selected}
              title={template.description}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <span className="rp-template-dot" style={{ background: swatch }} />
              <span style={{ flex: 1, minWidth: 0 }}>{template.name}</span>
              {selected && <Check size={14} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {palettes.length > 0 && (
        <div className="rp-color-row" role="group" aria-label="Colors">
          {palettes.map((palette) => {
            const selected = palette.id === activePalette;
            return (
              <button
                key={palette.id}
                type="button"
                className="rp-color-dot"
                aria-pressed={selected}
                aria-label={palette.name}
                title={palette.name}
                onClick={() => onChange(currentId, palette.id)}
              >
                <span style={{ flex: 1, background: palette.colors.primary }} />
                <span style={{ flex: 1, background: palette.colors.accent }} />
              </button>
            );
          })}
          <span className="rp-adapt-state">
            {palettes.find((palette) => palette.id === activePalette)?.name ?? 'Color'}
          </span>
        </div>
      )}
    </section>
  );
}
