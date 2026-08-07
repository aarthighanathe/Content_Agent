// lib/sanitizeSearchText.ts — prompt-injection neutralization for untrusted
// web text (Tavily search results) before it reaches a Gemini prompt.
// Extracted from competitor.ts/ideate.ts's previously-duplicated inline copies
// so every Tavily consumer (including researcher.ts, which used to skip this
// pattern entirely) shares one implementation instead of drifting.
export function sanitizeSearchText(value: string): string {
  return value
    .replace(/ignore\s+(?:previous|all|prior)\s+instructions?/gi, '[content removed]')
    .replace(/system\s*(?:prompt|instructions?)/gi, '[content removed]');
}
