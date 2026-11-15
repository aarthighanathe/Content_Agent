import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { NewTemplateId } from '../Result/constants';
import { getTemplate, getPalette, isTemplateId } from '../../lib/templateSystem';
import { CAROUSEL_TEMPLATE_KEY, CAROUSEL_PALETTE_KEY } from '../../lib/carouselStorageKeys';
import { safeGetItem, safeSetItem } from '../../lib/safeLocalStorage';
import { migrateLegacyKey, userScopedKey } from '../../lib/userScopedStorage';

// WHY: extracted from Create.tsx: Create.tsx exceeded the 400-line file-size cap
// (436 lines) with several distinct concerns folded into one component — this
// pulls out the carousel template/palette selection state, mirroring the
// Create/useDraft.ts precedent for splitting page-specific state into its own
// hook rather than a shared/generic one.
//
// Selection lives in component state (not just localStorage) so it can be sent
// explicitly with the job-creation request. localStorage still seeds the
// initial value for a nicer returning-user default.

function readScopedTemplateId(userId: string | null | undefined): NewTemplateId {
  migrateLegacyKey(localStorage, CAROUSEL_TEMPLATE_KEY, userId);
  const stored = safeGetItem(userScopedKey(CAROUSEL_TEMPLATE_KEY, userId));
  // WHY: isTemplateId, not a bare `as NewTemplateId` cast: a stale value from a
  // legacy key, manual localStorage tampering, or a future template removal
  // would otherwise flow straight into createJob() as an unvalidated id.
  return stored && isTemplateId(stored) ? stored : 'modern-minimal';
}

function readScopedPaletteId(
  userId: string | null | undefined,
  templateId: NewTemplateId,
): string {
  migrateLegacyKey(localStorage, CAROUSEL_PALETTE_KEY, userId);
  const template = getTemplate(templateId);
  // WHY: validated against the resolved template, not trusted as-is: a stored
  // palette id may belong to a *different* template than the one just resolved
  // above (e.g. the user previously picked a palette on template A, then
  // template B became the default) — getPalette() returns undefined for a
  // mismatch, so falling through to the template's own default keeps the two
  // always in sync rather than sending a palette id the template doesn't own.
  const stored = safeGetItem(userScopedKey(CAROUSEL_PALETTE_KEY, userId));
  if (stored && getPalette(templateId, stored)) return stored;
  return template?.colorPalettes[template.defaultPaletteIndex]?.id || '';
}

export function useCarouselTemplateSelection() {
  const { userId } = useAuth();
  const [templateId, setTemplateId] = useState<NewTemplateId>(() =>
    readScopedTemplateId(userId),
  );
  const [paletteId, setPaletteId] = useState<string>(() =>
    readScopedPaletteId(userId, readScopedTemplateId(userId)),
  );

  // WHY: re-seed when Clerk userId hydrates or the account switches — unscoped
  // keys previously leaked User A's template pick into User B's Create form.
  useEffect(() => {
    const nextTemplate = readScopedTemplateId(userId);
    setTemplateId(nextTemplate);
    setPaletteId(readScopedPaletteId(userId, nextTemplate));
  }, [userId]);

  function handleTemplateChange(id: NewTemplateId): void {
    setTemplateId(id);
    safeSetItem(userScopedKey(CAROUSEL_TEMPLATE_KEY, userId), id);
    const template = getTemplate(id);
    const defaultPaletteId = template?.colorPalettes[template.defaultPaletteIndex]?.id;
    if (defaultPaletteId) {
      setPaletteId(defaultPaletteId);
      safeSetItem(userScopedKey(CAROUSEL_PALETTE_KEY, userId), defaultPaletteId);
    }
  }

  function handlePaletteChange(id: string): void {
    setPaletteId(id);
    safeSetItem(userScopedKey(CAROUSEL_PALETTE_KEY, userId), id);
  }

  return { templateId, paletteId, handleTemplateChange, handlePaletteChange };
}
