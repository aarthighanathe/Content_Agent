// lib/sanitizeSearchText.ts — prompt-injection neutralization for untrusted
// web text (Tavily search results, scraped articles) before it reaches a Gemini
// prompt. Extracted from competitor.ts/ideate.ts's previously-duplicated inline
// copies so every untrusted-text consumer shares one implementation.
//
// SECURITY: pattern list must stay in sync with middleware/rateLimit.ts's
// INJECTION_PATTERNS — rateLimit rejects user-typed fields; this module
// redacts the same shapes inside fetched/third-party text that cannot be
// rejected wholesale without dropping the whole research/repurpose result.

const INJECTION_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /ignore\s+(previous|all|prior|above)\s+instructions?/gi, replacement: '[content removed]' },
  { pattern: /disregard\s+(previous|all|prior|above)\s+instructions?/gi, replacement: '[content removed]' },
  { pattern: /you\s+are\s+now\s+/gi, replacement: '[content removed] ' },
  { pattern: /act\s+as\s+(if\s+you\s+are|a|an)\s+/gi, replacement: '[content removed] ' },
  { pattern: /new\s+role\s*:/gi, replacement: '[content removed]:' },
  { pattern: /system\s*:/gi, replacement: '[content removed]:' },
  { pattern: /\[SYSTEM\]/gi, replacement: '[content removed]' },
  { pattern: /override\s+(your\s+)?instructions?/gi, replacement: '[content removed]' },
  { pattern: /forget\s+(everything|all)\s+(you|your)/gi, replacement: '[content removed]' },
  { pattern: /jailbreak/gi, replacement: '[content removed]' },
  { pattern: /do\s+anything\s+now/gi, replacement: '[content removed]' },
  { pattern: /dan\s+mode/gi, replacement: '[content removed]' },
  { pattern: /system\s*(?:prompt|instructions?)/gi, replacement: '[content removed]' },
];

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
