// SECURITY: single source of truth for prompt-injection shapes.
// WHY: shared: middleware/rateLimit.ts (reject user-typed fields) and
// lib/sanitizeSearchText.ts (redact third-party/fetched text) previously each
// maintained a copy — the lists drifted (sanitize had an extra system-prompt
// pattern). One module keeps reject + redact in lockstep.

/** Raw pattern sources — compiled with different flags per consumer. */
export const INJECTION_PATTERN_SOURCES: readonly string[] = [
  String.raw`ignore\s+(previous|all|prior|above)\s+instructions?`,
  String.raw`disregard\s+(previous|all|prior|above)\s+instructions?`,
  String.raw`you\s+are\s+now\s+`,
  String.raw`act\s+as\s+(if\s+you\s+are|a|an)\s+`,
  String.raw`new\s+role\s*:`,
  String.raw`system\s*:`,
  String.raw`\[SYSTEM\]`,
  String.raw`override\s+(your\s+)?instructions?`,
  String.raw`forget\s+(everything|all)\s+(you|your)`,
  String.raw`jailbreak`,
  String.raw`do\s+anything\s+now`,
  String.raw`dan\s+mode`,
  // WHY: also here (was sanitize-only): "system prompt" / "system instructions"
  // injection variants that rateLimit previously missed.
  String.raw`system\s*(?:prompt|instructions?)`,
];

/** Case-insensitive matchers for short-circuit rejection (no /g — .test() safe). */
export function getInjectionTestPatterns(): RegExp[] {
  return INJECTION_PATTERN_SOURCES.map((source) => new RegExp(source, 'i'));
}

/** True when `value` matches any shared injection pattern (reject/neutralize path). */
export function containsInjection(value: string): boolean {
  return getInjectionTestPatterns().some((re) => re.test(value));
}

/**
 * Global, case-insensitive replacements for neutralizing the same shapes
 * inside untrusted fetched/third-party text that cannot be rejected wholesale.
 */
export function getInjectionReplacements(): Array<{ pattern: RegExp; replacement: string }> {
  return INJECTION_PATTERN_SOURCES.map((source) => {
    // WHY: trailing-space sources keep a trailing space in the replacement:
    // "you are now " / "act as a " sit mid-sentence — dropping the space
    // would glue [content removed] onto the next word.
    const needsTrailingSpace = source.endsWith(String.raw`\s+`);
    const needsColon = source.endsWith(':');
    let replacement = '[content removed]';
    if (needsTrailingSpace) replacement = '[content removed] ';
    else if (needsColon) replacement = '[content removed]:';
    return { pattern: new RegExp(source, 'gi'), replacement };
  });
}
