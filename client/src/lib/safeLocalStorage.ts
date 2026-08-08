// WHY this file exists: the `try { localStorage.getItem/setItem(...) } catch { fallback }`
// shape was independently duplicated across the codebase (Create.tsx, Result.tsx,
// store.ts, Brand/dnaHistory.ts, Repurpose/useRepurposeHistory.ts,
// Result/hooks/useCarouselDesignSeed.ts, Create/useCarouselTemplateSelection.ts) —
// localStorage throws in private-browsing/storage-disabled contexts, so every read/write
// needs the same guard. Starting here (the newest of those call sites) rather than
// sweeping every existing one, which would risk unrelated behavior changes across files
// this fix isn't otherwise touching.
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore — storage unavailable (private browsing, quota, etc.) */
  }
}
