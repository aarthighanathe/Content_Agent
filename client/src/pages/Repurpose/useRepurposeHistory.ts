import { useState } from 'react';

export interface RepurposeHistoryEntry {
  id: string;
  url: string;
  platform: string;
  outcome: 'success' | 'failed';
  // WHY only set on success: a failed attempt never reaches job creation, so
  // there's nothing to link to — retrying re-fills the form instead (see
  // Repurpose.tsx's onSelect handler).
  jobId?: string;
  errorMessage?: string;
  createdAt: string;
}

const HISTORY_KEY = 'ca_repurpose_history';
const MAX_ENTRIES = 15;

// WHY localStorage, not sessionStorage like Create/useDraft.ts: a repurpose
// attempt (especially a failed one worth retrying later, or a successful one
// worth revisiting) is meaningful across days, not just the current tab
// session — closer to Ideate's saved-ideas persistence (store.ts) than
// Create's in-progress-form draft.
function readHistory(): RepurposeHistoryEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: RepurposeHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // storage unavailable (private mode, quota) — history just won't persist
    // for this attempt; not surfaced as an error since it's a convenience
    // feature, not something the user is actively waiting on.
  }
}

export function useRepurposeHistory() {
  const [history, setHistory] = useState<RepurposeHistoryEntry[]>(readHistory);

  // WHY prepend + cap, not append: most-recent-first matches how the list is
  // displayed, and capping at MAX_ENTRIES keeps localStorage from growing
  // unbounded for a user who repurposes frequently.
  function addEntry(entry: Omit<RepurposeHistoryEntry, 'id' | 'createdAt'>): void {
    setHistory((prev) => {
      const next = [
        { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX_ENTRIES);
      writeHistory(next);
      return next;
    });
  }

  function removeEntry(id: string): void {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeHistory(next);
      return next;
    });
  }

  function clearHistory(): void {
    writeHistory([]);
    setHistory([]);
  }

  return { history, addEntry, removeEntry, clearHistory };
}
