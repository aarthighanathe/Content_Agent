// WHY: this file exists: several browser-storage keys (ideas, drafts, repurpose
// history) were global, so on a shared device the next Clerk user saw the
// previous user's data. Same per-user-key idea as Brand/dnaHistory.ts.
import { safeGetItem } from './safeLocalStorage';

export function userScopedKey(baseKey: string, userId: string | null | undefined): string {
  // WHY: 'anon' bucket: signed-out/not-yet-loaded callers must never read a real user's data
  return `${baseKey}:${userId && userId.length > 0 ? userId : 'anon'}`;
}

// WHY: migrate-once-then-remove: legacy unscoped data belongs to whoever used the
// browser before scoping shipped; hand it to the first signed-in user and delete
// the global key so it can never leak to a second account.
export function migrateLegacyKey(
  storage: Storage,
  baseKey: string,
  userId: string | null | undefined,
): void {
  if (!userId) return;
  try {
    const legacy = storage.getItem(baseKey);
    if (legacy === null) return;
    const scoped = userScopedKey(baseKey, userId);
    if (storage.getItem(scoped) === null) storage.setItem(scoped, legacy);
    storage.removeItem(baseKey);
  } catch {
    // storage unavailable — nothing to migrate
  }
}

export function readScopedLocal(baseKey: string, userId: string | null | undefined): string | null {
  return safeGetItem(userScopedKey(baseKey, userId));
}
