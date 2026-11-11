// WHY shared with Brand.tsx hydrate/save: VoiceCard pills are Title Case labels, but
// onboarding + profileStore defaults store lowercase ids (`professional`). A case-
// sensitive includes() left every pill deselected after load/reset (QA-BRAND-001).

export const VOICE_OPTIONS = [
  'Professional',
  'Casual',
  'Witty',
  'Educational',
  'Direct',
  'Inspirational',
] as const;

export type VoiceOption = (typeof VOICE_OPTIONS)[number];

const VOICE_BY_LOWER = new Map<string, VoiceOption>(
  VOICE_OPTIONS.map((v) => [v.toLowerCase(), v]),
);

/** Map a stored brandVoice string to Title-Case pill labels; unknown tokens dropped. */
export function normalizeBrandVoices(raw: string | null | undefined): VoiceOption[] {
  if (!raw || !raw.trim()) return ['Professional'];
  const seen = new Set<VoiceOption>();
  const out: VoiceOption[] = [];
  for (const part of raw.split(',')) {
    const key = part.trim().toLowerCase();
    if (!key) continue;
    const match = VOICE_BY_LOWER.get(key);
    if (match && !seen.has(match)) {
      seen.add(match);
      out.push(match);
    }
  }
  return out.length > 0 ? out : ['Professional'];
}
