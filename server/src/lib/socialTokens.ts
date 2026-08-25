// WHY extracted from routes/social.ts: that file grew past the 400-line cap
// (CLAUDE.md "Code Style Rules" / "Never Do These"). This module owns the
// social-token storage layer (DB + in-memory fallback) shared by
// routes/social.ts's handlers, workers/publishWorker.ts, and
// lib/socialPublish.ts's type — none of which need the OAuth HTTP routes
// themselves, so splitting storage from routing removes a needless import of
// Express route handlers into a worker/lib context.
import { db } from '../db/index.js';
import { socialTokens } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { encryptTokenOptional, decryptTokenOptional } from './tokenEncryption.js';

// WHY this shape: mirrors exactly what dbUpsertToken already accepted as its
// `data` parameter before this fix — extracting it as a named type replaces the
// Record<string, any> the token map/fallback store used to carry.
// WHY `| null` alongside `?:` on every optional field: dbGetTokens populates
// this straight from Drizzle's nullable columns (`T | null`, not `T | undefined`)
// — both mean "absent" here, so this accepts either rather than forcing an
// unnecessary `?? undefined` coercion at every read site.
export interface SocialTokenData {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  displayName?: string | null;
  platformUserId?: string | null;
}

// Fallback in-memory store used only when DB is unavailable
const _fallback = new Map<string, Record<string, SocialTokenData>>();
function fbGet(uid: string) {
  if (!_fallback.has(uid)) _fallback.set(uid, {});
  return _fallback.get(uid)!;
}

export const PLATFORM_LABELS: Record<string, string> = {
  linkedin:  'LinkedIn',
  twitter:   'Twitter / X',
  instagram: 'Instagram',
};

export async function dbGetTokens(userId: string): Promise<Record<string, SocialTokenData>> {
  if (!db) return fbGet(userId);
  try {
    const rows = await db.select().from(socialTokens).where(eq(socialTokens.userId, userId));
    const map: Record<string, SocialTokenData> = {};
    for (const row of rows) {
      // SECURITY: a decrypt failure (key rotation, corrupted ciphertext) must
      // never fall back to the raw ciphertext as if it were a real token —
      // that would report `connected: true` for an account whose token can
      // never work, and could send the encrypted blob to LinkedIn/Twitter as
      // a Bearer token. Skip the row entirely so it reads as disconnected.
      const accessToken = decryptTokenOptional(row.accessToken);
      if (!accessToken) continue;
      map[row.platform] = {
        accessToken,
        refreshToken: decryptTokenOptional(row.refreshToken),
        expiresAt: row.expiresAt,
        displayName: row.displayName,
        platformUserId: row.platformUserId,
      };
    }
    return map;
  } catch {
    return fbGet(userId);
  }
}

export async function dbUpsertToken(
  userId: string,
  platform: string,
  data: { accessToken: string; refreshToken?: string; expiresAt?: number; displayName?: string; platformUserId?: string },
): Promise<void> {
  if (!db) {
    fbGet(userId)[platform] = data;
    return;
  }
  // SECURITY: encryption must happen outside the DB try/catch below — if it
  // throws (a malformed TOKEN_ENCRYPTION_KEY), that error must propagate and
  // fail the connect request, never be swallowed into the "DB unavailable,
  // fall back to memory" path, which would otherwise silently store the
  // plaintext access/refresh token instead.
  const encryptedData = {
    ...data,
    accessToken: encryptTokenOptional(data.accessToken) ?? data.accessToken,
    refreshToken: encryptTokenOptional(data.refreshToken),
  };
  try {
    // WHY a single onConflictDoUpdate instead of select-then-insert/update:
    // the previous select-then-branch shape raced two concurrent upserts for
    // the same (userId, platform) — e.g. a double-clicked "Connect LinkedIn",
    // or an OAuth callback retry — both could see no existing row and both
    // INSERT, creating silent duplicate token rows (idx_social_tokens_user_platform
    // is now a unique index specifically so Postgres can detect and resolve
    // this conflict atomically instead).
    await db.insert(socialTokens)
      .values({ userId, platform, ...encryptedData })
      .onConflictDoUpdate({
        target: [socialTokens.userId, socialTokens.platform],
        set: { ...encryptedData, updatedAt: new Date() },
      });
  } catch (err) {
    console.error('[social] DB upsert failed, writing to memory fallback:', err);
    // NOTE: stores the raw (unencrypted) `data` here, matching dbGetTokens'
    // fallback branch which returns fbGet() rows without ever decrypting them
    // — the in-memory Map is only ever a same-process DB-outage escape hatch,
    // never persisted to disk, so this is the existing accepted risk for that
    // specific failure mode (unlike an encryption-key failure, which now
    // throws before reaching this catch instead of landing here).
    fbGet(userId)[platform] = data;
  }
}

export async function dbDeleteToken(userId: string, platform: string): Promise<void> {
  if (!db) {
    delete fbGet(userId)[platform];
    return;
  }
  try {
    await db.delete(socialTokens)
      .where(and(eq(socialTokens.userId, userId), eq(socialTokens.platform, platform)));
  } catch (err) {
    console.error('[social] DB delete failed:', err);
    delete fbGet(userId)[platform];
  }
}

export async function dbGetToken(userId: string, platform: string): Promise<SocialTokenData | null> {
  const all = await dbGetTokens(userId);
  return all[platform] || null;
}
