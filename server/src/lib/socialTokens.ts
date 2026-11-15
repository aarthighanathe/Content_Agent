// WHY: extracted from routes/social.ts: that file grew past the 400-line cap
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
import { env } from '../config.js';
import { logger } from './logger.js';
import {
  tryAcquireSocialTokenLock,
  waitForSocialTokenLockRetry,
} from './socialTokenLock.js';

// WHY: this shape: mirrors exactly what dbUpsertToken already accepted as its
// `data` parameter before this fix — extracting it as a named type replaces the
// Record<string, any> the token map/fallback store used to carry.
// WHY: `| null` alongside `?:` on every optional field: dbGetTokens populates
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
function fbGet(uid: string): Record<string, SocialTokenData> {
  let entry = _fallback.get(uid);
  if (!entry) {
    entry = {};
    _fallback.set(uid, entry);
  }
  return entry;
}

// SECURITY: the fallback Map only ever holds ciphertext (written by dbUpsertToken),
// so reads must decrypt — otherwise callers would get encrypted blobs as bearer tokens.
function fbRead(uid: string): Record<string, SocialTokenData> {
  const out: Record<string, SocialTokenData> = {};
  for (const [platform, row] of Object.entries(fbGet(uid))) {
    const accessToken = decryptTokenOptional(row.accessToken);
    if (!accessToken) continue;
    out[platform] = { ...row, accessToken, refreshToken: decryptTokenOptional(row.refreshToken) };
  }
  return out;
}

export const PLATFORM_LABELS: Record<string, string> = {
  linkedin:  'LinkedIn',
  twitter:   'Twitter / X',
  instagram: 'Instagram',
};

export async function dbGetTokens(userId: string): Promise<Record<string, SocialTokenData>> {
  if (!db) return fbRead(userId);
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
    // WHY: overlay process-local tokens preserved after a successful Twitter
    // refresh whose DB upsert exhausted — DB may still hold the dead prior pair.
    for (const [platform, preserved] of Object.entries(fbRead(userId))) {
      map[platform] = preserved;
    }
    return map;
  } catch (err) {
    // WHY: an empty map reads as "Not connected"; publishWorker would then mark a
    // scheduled post failed forever on a transient Neon blip. Propagate so callers retry.
    console.error('[social] DB token read failed:', err);
    if (env.NODE_ENV === 'production') throw err;
    // NOTE: dev/test-only fallback to the in-memory map.
    return fbRead(userId);
  }
}

export async function dbUpsertToken(
  userId: string,
  platform: string,
  data: { accessToken: string; refreshToken?: string; expiresAt?: number; displayName?: string; platformUserId?: string },
): Promise<void> {
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
  if (!db) {
    fbGet(userId)[platform] = encryptedData;
    return;
  }
  try {
    // WHY: a single onConflictDoUpdate instead of select-then-insert/update:
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
    console.error('[social] DB upsert failed:', err);
    // SECURITY: never keep a token only in process memory in production — it would
    // silently vanish on restart while the user sees "connected"; fail the request instead.
    if (env.NODE_ENV === 'production') throw err;
    // NOTE: dev/test-only escape hatch; stores the ENCRYPTED payload (fbRead decrypts),
    // so plaintext access/refresh tokens never land in the Map.
    fbGet(userId)[platform] = encryptedData;
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
    // SECURITY: surface the failure — swallowing it made disconnect report success
    // while the encrypted OAuth token (write access to the user's account) remained.
    throw err;
  }
}

export async function dbGetToken(userId: string, platform: string): Promise<SocialTokenData | null> {
  const all = await dbGetTokens(userId);
  return all[platform] || null;
}

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

function tokenNeedsRefresh(conn: SocialTokenData): boolean {
  const expiresAt = conn.expiresAt ?? null;
  return expiresAt !== null && expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS;
}

function tokenStillUsable(conn: SocialTokenData): boolean {
  const expiresAt = conn.expiresAt ?? null;
  // WHY: absolute expiry — if another refresher already rotated, or the token
  // still has life left, prefer that over a second concurrent refresh.
  return expiresAt === null || expiresAt > Date.now();
}

// WHY: after a successful Twitter refresh, the old refresh token is dead.
// Losing the new pair (upsert fail → return null → caller keeps stale conn)
// permanently orphans write access until the user reconnects.
export class TwitterTokenPersistError extends Error {
  constructor(message = 'Twitter reconnect required — refreshed tokens could not be saved') {
    super(message);
    this.name = 'TwitterTokenPersistError';
  }
}

function preserveTwitterTokenInFallback(userId: string, data: SocialTokenData): void {
  // SECURITY: store ciphertext only (same contract as dbUpsertToken's Map path).
  fbGet(userId).twitter = {
    accessToken: encryptTokenOptional(data.accessToken) ?? data.accessToken,
    refreshToken: encryptTokenOptional(data.refreshToken ?? undefined),
    expiresAt: data.expiresAt ?? null,
    displayName: data.displayName ?? null,
    platformUserId: data.platformUserId ?? null,
  };
}

async function upsertTwitterTokenHard(
  userId: string,
  refreshed: SocialTokenData,
): Promise<void> {
  const payload = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? undefined,
    expiresAt: refreshed.expiresAt ?? undefined,
    displayName: refreshed.displayName ?? undefined,
    platformUserId: refreshed.platformUserId ?? undefined,
  };
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: sequential retries with backoff
      await dbUpsertToken(userId, 'twitter', payload);
      // WHY: a prior exhausted upsert may have left a preserved copy — drop it
      // once durable save succeeds so DB remains the source of truth.
      delete fbGet(userId).twitter;
      return;
    } catch (err: unknown) {
      lastErr = err;
      logger.warn('Twitter token upsert after refresh failed', {
        userId,
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
      // eslint-disable-next-line no-await-in-loop -- WHY: backoff between upsert retries
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  // WHY: never discard the rotated refresh token — keep until a later save.
  preserveTwitterTokenInFallback(userId, refreshed);
  logger.error('Twitter refresh succeeded but DB upsert exhausted — tokens preserved in memory', {
    userId,
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  });
  throw new TwitterTokenPersistError();
}

async function refreshTwitterToken(userId: string, conn: SocialTokenData): Promise<SocialTokenData | null> {
  if (!conn.refreshToken) return null;
  const clientId = env.TWITTER_CLIENT_ID;
  if (!clientId) return null;
  const clientSecret = env.TWITTER_CLIENT_SECRET || '';
  try {
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(clientSecret
          ? {
              Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            }
          : {}),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: conn.refreshToken,
        client_id: clientId,
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tokenData.access_token) return null;
    const refreshed: SocialTokenData = {
      ...conn,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? conn.refreshToken,
      expiresAt: tokenData.expires_in
        ? Date.now() + tokenData.expires_in * 1000
        : conn.expiresAt,
    };
    // WHY: upsert is outside the generic catch — persist failure must not look
    // like a failed refresh and silently fall back to the dead prior tokens.
    await upsertTwitterTokenHard(userId, refreshed);
    return refreshed;
  } catch (err: unknown) {
    if (err instanceof TwitterTokenPersistError) throw err;
    logger.warn('Twitter token refresh failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Returns a connection with a fresh access token when refresh is supported and expiry is near. */
export async function ensureFreshSocialToken(
  userId: string,
  platform: string,
  conn: SocialTokenData,
): Promise<SocialTokenData> {
  if (!tokenNeedsRefresh(conn)) return conn;
  if (platform !== 'twitter') return conn;

  // SECURITY: serialize Twitter refresh (refresh tokens are typically single-use).
  const acquired = await tryAcquireSocialTokenLock(userId, platform);
  if (acquired.status !== 'acquired') {
    // WHY: held and Redis-unavailable both skip refresh. Wait, re-read what
    // another instance may have stored, and return that. Refreshing without
    // the lock invalidates Twitter's single-use refresh token.
    return rereadTokenWithoutRefresh(userId, platform, conn);
  }

  try {
    // WHY: re-read under the lock — a prior holder may have already refreshed.
    const latest = await dbGetToken(userId, platform);
    const base = latest ?? conn;
    if (!tokenNeedsRefresh(base)) return base;
    const refreshed = await refreshTwitterToken(userId, base);
    return refreshed ?? base;
  } finally {
    await acquired.lock.release();
  }
}

async function rereadTokenWithoutRefresh(
  userId: string,
  platform: string,
  conn: SocialTokenData,
): Promise<SocialTokenData> {
  let latest = conn;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop -- WHY: wait for the other refresher, then re-read
    await waitForSocialTokenLockRetry();
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: re-read only after the wait
      const fresh = await dbGetToken(userId, platform);
      if (fresh) latest = fresh;
      if (fresh && !tokenNeedsRefresh(fresh)) return fresh;
      if (fresh && tokenStillUsable(fresh)) return fresh;
    } catch (err: unknown) {
      logger.warn('[socialTokens] Re-read after lock miss failed', {
        userId,
        platform,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (tokenStillUsable(conn)) return conn;
  }
  return latest;
}
