import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { migrateLegacyKey, userScopedKey } from '../../lib/userScopedStorage';

export interface RepurposeHistoryEntry {
  id: string;
  url: string;
  platform: string;
  outcome: 'success' | 'failed';
  // WHY: only set on success: a failed attempt never reaches job creation, so
  // there's nothing to link to — retrying re-fills the form instead (see
  // Repurpose.tsx's onSelect handler).
  jobId?: string;
  errorMessage?: string;
  createdAt: string;
}

const HISTORY_KEY = 'ca_repurpose_history';
const MAX_ENTRIES = 15;

// WHY: localStorage, not sessionStorage like Create/useDraft.ts: a repurpose
// attempt (especially a failed one worth retrying later, or a successful one
// worth revisiting) is meaningful across days, not just the current tab
// session — closer to Ideate's saved-ideas persistence (store.ts) than
// Create's in-progress-form draft.
// SECURITY: history holds URLs and job ids, so it is keyed per user.
function readHistory(userId: string | null): RepurposeHistoryEntry[] {
  try {
    migrateLegacyKey(localStorage, HISTORY_KEY, userId);
    const raw: unknown = JSON.parse(localStorage.getItem(userScopedKey(HISTORY_KEY, userId)) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (e): e is RepurposeHistoryEntry =>
        typeof e === 'object' && e !== null &&
        typeof (e as Record<string, unknown>).id === 'string' &&
        typeof (e as Record<string, unknown>).url === 'string',
    );
  } catch {
    return [];
  }
}

function writeHistory(userId: string | null, entries: RepurposeHistoryEntry[]): void {
  try {
    localStorage.setItem(userScopedKey(HISTORY_KEY, userId), JSON.stringify(entries));
  } catch {
    // storage unavailable — history just won't persist; it's a convenience feature
  }
}

export function useRepurposeHistory(): {
  history: RepurposeHistoryEntry[];
  addEntry: (entry: Omit<RepurposeHistoryEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
} {
  const { userId } = useAuth();
  const scopeId = userId ?? null;
  const [history, setHistory] = useState<RepurposeHistoryEntry[]>(() => readHistory(scopeId));
  const loadedFor = useRef<string | null>(scopeId);

  // WHY: reload when the signed-in user changes so the previous user's list never lingers
  useEffect(() => {
    if (loadedFor.current === scopeId) return;
    loadedFor.current = scopeId;
    setHistory(readHistory(scopeId));
  }, [scopeId]);

  // WHY: prepend + cap, not append: most-recent-first matches how the list is
  // displayed, and capping at MAX_ENTRIES keeps localStorage from growing
  // unbounded for a user who repurposes frequently.
  function addEntry(entry: Omit<RepurposeHistoryEntry, 'id' | 'createdAt'>): void {
    setHistory((prev) => {
      const next = [
        { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX_ENTRIES);
      writeHistory(scopeId, next);
      return next;
    });
  }

  function removeEntry(id: string): void {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeHistory(scopeId, next);
      return next;
    });
  }

  function clearHistory(): void {
    writeHistory(scopeId, []);
    setHistory([]);
  }

  return { history, addEntry, removeEntry, clearHistory };
}
