// lib/sanitizeSearchText.ts — prompt-injection neutralization for untrusted
// web text (Tavily search results, scraped articles) before it reaches a Gemini
// prompt. Extracted from competitor.ts/ideate.ts's previously-duplicated inline
// copies so every untrusted-text consumer shares one implementation.
//
// SECURITY: patterns come from lib/injectionPatterns.ts — the same list
// middleware/rateLimit.ts uses to reject user-typed fields. rateLimit rejects;
// this module redacts the same shapes inside fetched/third-party text that
// cannot be rejected wholesale without dropping the whole research result.

import { getInjectionReplacements } from './injectionPatterns.js';

const INJECTION_REPLACEMENTS = getInjectionReplacements();

export function sanitizeSearchText(value: string): string {
  let out = value;
  for (const { pattern, replacement } of INJECTION_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Escape text before interpolating into XML-delimited prompt sections. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
