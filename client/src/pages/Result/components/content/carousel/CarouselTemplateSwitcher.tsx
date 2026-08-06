import { useState } from 'react';
import { LayoutTemplate, ChevronDown } from 'lucide-react';
import { CompactTemplatePicker } from '../../../../Create/CompactTemplatePicker';
import type { NewTemplateId } from '../../../constants';
import { getTemplate, isTemplateId } from '../../../../../lib/templateSystem';

interface Props {
  templateId?: string;
  paletteId?: string;
  onChange: (templateId: string, paletteId?: string) => void;
}

// WHY a standalone collapsible panel, not inline in ContentColumn: matches the
// existing ContentMultiplier banner pattern (collapsed by default, expands on
// click) and keeps ContentColumn.tsx from growing past a reasonable size.
// Lets a user change a carousel's look after generation without regenerating
// content — see CAROUSEL_TEMPLATE_PLAN.md §2.3.
export function CarouselTemplateSwitcher({ templateId, paletteId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  // WHY isTemplateId, not a bare `as NewTemplateId` cast: templateId arrives as
  // a plain string off job data, which may predate the template system or hold
  // a stale/legacy value — validate against the real catalog instead of
  // asserting the type, same pattern used at every other templateId boundary.
  const currentId: NewTemplateId = templateId && isTemplateId(templateId) ? templateId : 'modern-minimal';
  const currentTemplate = getTemplate(currentId);

  function handleTemplateSelect(id: NewTemplateId): void {
    const template = getTemplate(id);
    const defaultPaletteId = template?.colorPalettes[template.defaultPaletteIndex]?.id;
    onChange(id, defaultPaletteId);
  }

  function handlePaletteSelect(id: string): void {
    onChange(currentId, id);
  }

  return (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 18, marginTop: 18 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rp-mult-banner"
        style={{ width: '100%', border: 'none', marginBottom: open ? 16 : 0, textAlign: 'left' }}
      >
        <div className="rp-mult-banner-icon"><LayoutTemplate size={14} /></div>
        <div className="rp-mult-banner-text">
          <div className="rp-mult-banner-label">Carousel template</div>
          <div className="rp-mult-banner-sub">
            {currentTemplate?.name || 'Modern Minimal'} · change layout without regenerating
          </div>
        </div>
        <ChevronDown size={14} className={`rp-mult-banner-chevron${open ? ' open' : ''}`} />
      </button>

      {open && (
        <CompactTemplatePicker
          templateId={currentId}
          onTemplateChange={handleTemplateSelect}
          paletteId={paletteId || currentTemplate?.colorPalettes[currentTemplate.defaultPaletteIndex].id || ''}
          onPaletteChange={handlePaletteSelect}
        />
      )}
    </div>
  );
}
