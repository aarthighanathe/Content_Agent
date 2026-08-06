import { Palette } from 'lucide-react';
import { SectionLabel } from './SectionLabel';
import { CompactTemplatePicker } from './CompactTemplatePicker';
import type { NewTemplateId } from '../Result/constants';

interface AdvancedOptionsProps {
  platform: string;
  templateId: NewTemplateId;
  onTemplateChange: (id: NewTemplateId) => void;
  paletteId: string;
  onPaletteChange: (id: string) => void;
}

// WHY no expand/collapse: this used to be a generic "Advanced" panel gating a
// single carousel-theme picker behind a toggle. Since it only ever holds one
// thing, and only for one platform, the toggle just cost an extra click for no
// grouping benefit — it's shown directly (and only) when relevant instead.
// NOTE: Carousel themes only apply to Instagram Carousels; component returns null for other platforms.
// WHY controlled, not self-owned state: this used to keep its own
// localStorage-backed useState for templateId/paletteId, which meant the
// selection never reached the job-creation payload — see
// CAROUSEL_TEMPLATE_PLAN.md §2.1/§2.2. Create.tsx now owns the selection and
// sends it explicitly with the job.
export function AdvancedOptions({
  platform,
  templateId,
  onTemplateChange,
  paletteId,
  onPaletteChange,
}: AdvancedOptionsProps) {
  if (platform !== 'instagram_carousel') return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel
        icon={<Palette size={13} style={{ flexShrink: 0 }} />}
        trailing={<span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "var(--font-mono)" }}>optional</span>}
      >
        Carousel template
      </SectionLabel>

      <CompactTemplatePicker
        templateId={templateId}
        onTemplateChange={onTemplateChange}
        paletteId={paletteId}
        onPaletteChange={onPaletteChange}
      />
    </div>
  );
}
