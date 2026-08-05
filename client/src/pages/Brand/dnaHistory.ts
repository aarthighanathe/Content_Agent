// WHY localStorage, not a new DB column/table: DNA history is display-only
// metadata — the user can see and compare their last few fingerprints, but
// there's no server-side "revert to v2" operation. localStorage persists it
// across sessions without a migration, and a 3-version limit keeps the
// storage impact negligible (each ContentDna object is < 1 KB).
//
// WHY stored under userId: a shared device scenario where two Clerk accounts
// use the same browser won't mix their DNA histories.

import type { ContentDna } from '../../types/api';

const MAX_HISTORY = 3;

function historyKey(userId: string): string {
  return `dna_history_${userId}`;
}

export interface DnaHistoryEntry {
  dna: ContentDna;
  analyzedAt: string; // ISO string
}

export function loadDnaHistory(userId: string): DnaHistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DnaHistoryEntry[];
  } catch {
    return [];
  }
}

export function saveDnaHistory(userId: string, newDna: ContentDna): DnaHistoryEntry[] {
  const existing = loadDnaHistory(userId);
  const entry: DnaHistoryEntry = { dna: newDna, analyzedAt: new Date().toISOString() };
  // Prepend newest, keep last MAX_HISTORY
  const updated = [entry, ...existing].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(historyKey(userId), JSON.stringify(updated));
  } catch {
    // Storage quota exhaustion — silently skip persisting
  }
  return updated;
}
