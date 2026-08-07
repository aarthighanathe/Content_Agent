import { useState } from 'react';
import type { NewTemplateId } from '../Result/constants';
import { getTemplate, getPalette, isTemplateId } from '../../lib/templateSystem';
import { CAROUSEL_TEMPLATE_KEY, CAROUSEL_PALETTE_KEY } from '../../lib/carouselStorageKeys';

// WHY extracted from Create.tsx: Create.tsx exceeded the 400-line file-size cap
// (436 lines) with several distinct concerns folded into one component — this
// pulls out the carousel template/palette selection state, mirroring the
// Create/useDraft.ts precedent for splitting page-specific state into its own
// hook rather than a shared/generic one.
//
// Selection lives in component state (not just localStorage) so it can be sent
// explicitly with the job-creation request. localStorage still seeds the
// initial value for a nicer returning-user default.
export function useCarouselTemplateSelection() {
  const [templateId, setTemplateId] = useState<NewTemplateId>(() => {
    try {
      const stored = localStorage.getItem(CAROUSEL_TEMPLATE_KEY);
      // WHY isTemplateId, not a bare `as NewTemplateId` cast: a stale value from a
      // legacy key, manual localStorage tampering, or a future template removal
      // would otherwise flow straight into createJob() as an unvalidated id.
      return stored && isTemplateId(stored) ? stored : 'modern-minimal';
    } catch { return 'modern-minimal'; }
  });
  const [paletteId, setPaletteId] = useState<string>(() => {
    // WHY validated against the resolved template, not trusted as-is: a stored
    // palette id may belong to a *different* template than the one just resolved
    // above (e.g. the user previously picked a palette on template A, then
    // template B became the default) — getPalette() returns undefined for a
    // mismatch, so falling through to the template's own default keeps the two
    // always in sync rather than sending a palette id the template doesn't own.
    const template = getTemplate(templateId);
    try {
      const stored = localStorage.getItem(CAROUSEL_PALETTE_KEY);
      if (stored && getPalette(templateId, stored)) return stored;
    } catch { /* ignore */ }
    return template?.colorPalettes[template.defaultPaletteIndex]?.id || '';
  });

  function handleTemplateChange(id: NewTemplateId): void {
    setTemplateId(id);
    try { localStorage.setItem(CAROUSEL_TEMPLATE_KEY, id); } catch { /* ignore */ }
    const template = getTemplate(id);
    const defaultPaletteId = template?.colorPalettes[template.defaultPaletteIndex]?.id;
    if (defaultPaletteId) {
      setPaletteId(defaultPaletteId);
      try { localStorage.setItem(CAROUSEL_PALETTE_KEY, defaultPaletteId); } catch { /* ignore */ }
    }
  }

  function handlePaletteChange(id: string): void {
    setPaletteId(id);
    try { localStorage.setItem(CAROUSEL_PALETTE_KEY, id); } catch { /* ignore */ }
  }

  return { templateId, paletteId, handleTemplateChange, handlePaletteChange };
}
