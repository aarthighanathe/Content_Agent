import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { socialTokens } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { encryptTokenOptional, decryptTokenOptional } from '../lib/tokenEncryption.js';
import { parseBody, postSocialSchema, scheduleSocialSchema } from '../schemas/index.js';
import { env } from '../config.js';
import { socialRateLimit } from '../middleware/rateLimit.js';
import { publishToSocialPlatform } from '../lib/socialPublish.js';

// ── OAuth state HMAC signing ───────────────────────────────────────────────────

// SECURITY: config.ts provides a default for local dev, but in production this
// must be set to a strong random value. Without it, OAuth state tokens can be
// forged, enabling CSRF-style account linking attacks.
const OAUTH_STATE_SECRET = env.OAUTH_STATE_SECRET;

function signOAuthState(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = createHmac('sha256', OAUTH_STATE_SECRET)
    .update(b64)
    .digest('base64url');
  return `${b64}.${sig}`;
}

function verifyOAuthState(state: string): Record<string, unknown> | null {
  const dotIdx = state.lastIndexOf('.');
  if (dotIdx === -1) return null;
  const b64 = state.slice(0, dotIdx);
  const sig = state.slice(dotIdx + 1);
  if (!b64 || !sig) return null;
  const expected = createHmac('sha256', OAUTH_STATE_SECRET)
    .update(b64)
    .digest('base64url');
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, sigBuf)) return null;
  try {
    return JSON.parse(Buffer.from(b64, 'base64url').toString()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const router = Router();

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

// WHY these interfaces: each covers only the fields this file actually reads off
// the corresponding OAuth provider's JSON response — not the full response shape
// (both LinkedIn and Twitter return considerably more than this), matching the
// same "type what you use" scope as the rest of this pass's response schemas.
interface LinkedInTokenResponse {
  access_token?: string;
  expires_in?: number;
}
interface LinkedInProfileResponse {
  id?: string;
  localizedFirstName?: string;
  localizedLastName?: string;
}
interface TwitterTokenResponse {
  access_token?: string;
  refresh_token?: string;
}
interface TwitterProfileResponse {
  data?: { username?: string };
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

// ── DB helpers ─────────────────────────────────────────────────────────────────

async function dbGetTokens(userId: string): Promise<Record<string, SocialTokenData>> {
  if (!db) return fbGet(userId);
  try {
    const rows = await db.select().from(socialTokens).where(eq(socialTokens.userId, userId));
    const map: Record<string, SocialTokenData> = {};
    for (const row of rows) {
      map[row.platform] = {
        accessToken: decryptTokenOptional(row.accessToken) ?? row.accessToken,
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

async function dbUpsertToken(
  userId: string,
  platform: string,
  data: { accessToken: string; refreshToken?: string; expiresAt?: number; displayName?: string; platformUserId?: string },
): Promise<void> {
  if (!db) {
    fbGet(userId)[platform] = data;
    return;
  }
  try {
    // Check if record exists
    const [existing] = await db.select().from(socialTokens)
      .where(and(eq(socialTokens.userId, userId), eq(socialTokens.platform, platform)));

    const encryptedData = {
      ...data,
      accessToken: encryptTokenOptional(data.accessToken) ?? data.accessToken,
      refreshToken: encryptTokenOptional(data.refreshToken),
    };
    if (existing) {
      await db.update(socialTokens)
        .set({ ...encryptedData, updatedAt: new Date() })
        .where(and(eq(socialTokens.userId, userId), eq(socialTokens.platform, platform)));
    } else {
      await db.insert(socialTokens).values({ userId, platform, ...encryptedData });
    }
  } catch (err) {
    console.error('[social] DB upsert failed, writing to memory fallback:', err);
    fbGet(userId)[platform] = data;
  }
}

async function dbDeleteToken(userId: string, platform: string): Promise<void> {
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

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/social/connections
router.get('/connections', async (req: AuthRequest, res: Response) => {
  const userId = req.dbUserId || req.userId || 'demo';
  const tokens = await dbGetTokens(userId);
  const connections = Object.entries(tokens).map(([platform, data]) => ({
    platform,
    label: PLATFORM_LABELS[platform] || platform,
    connected: !!data.accessToken,
    displayName: data.displayName || null,
  }));
  res.json({ connections });
});

// GET /api/social/connect/:platform — initiate OAuth
// WHY rate-limited here, not at the /api/social router mount: the callback
// route calls external LinkedIn/Twitter token + profile APIs and needs
// backpressure, but /connections (a frequent read-only DB lookup, no external
// call) and /post/schedule shouldn't share that same tight OAuth-dance budget.
router.get('/connect/:platform', socialRateLimit, (req: AuthRequest, res: Response) => {
  const platform = req.params.platform as string;
  const userId = req.dbUserId || req.userId || 'demo';
  const callbackUrl = `${env.APP_URL}/api/social/callback/${platform}`;

  if (platform === 'linkedin') {
    const clientId = env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      res.status(501).json({ error: 'LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID in .env', code: 'NOT_CONFIGURED' });
      return;
    }
    const scopes = ['r_liteprofile', 'r_emailaddress', 'w_member_social'].join('%20');
    const state = signOAuthState({ userId, platform, nonce: crypto.randomUUID() });
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scopes}&state=${state}`;
    res.redirect(url);
    return;
  }

  if (platform === 'twitter') {
    const clientId = env.TWITTER_CLIENT_ID;
    if (!clientId) {
      res.status(501).json({ error: 'Twitter OAuth not configured. Set TWITTER_CLIENT_ID in .env', code: 'NOT_CONFIGURED' });
      return;
    }
    const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join('%20');
    // SECURITY: code_challenge_method=plain requires code_verifier === code_challenge
    // at token exchange. The verifier must be generated once here and carried through
    // to the callback verbatim (via the signed state param) — recomputing it at
    // callback time with a fresh value would never match.
    const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    const state = signOAuthState({ userId, platform, nonce: crypto.randomUUID(), codeVerifier });
    const url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scopes}&state=${state}&code_challenge=${codeVerifier}&code_challenge_method=plain`;
    res.redirect(url);
    return;
  }

  res.status(400).json({ error: `Unsupported platform: ${platform}` });
});

// GET /api/social/callback/:platform — OAuth callback
router.get('/callback/:platform', socialRateLimit, async (req: Request, res: Response) => {
  const platform = req.params.platform as string;
  const { code, state, error: oauthError } = req.query as Record<string, string>;
  const frontendUrl = env.FRONTEND_URL;

  if (oauthError) {
    res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent(oauthError)}`);
    return;
  }

  const decoded = verifyOAuthState(state);
  if (!decoded) {
    // Invalid or tampered OAuth state — reject the callback and do not process tokens
    res.status(400).send('Invalid OAuth state');
    return;
  }
  const userId = (decoded.userId as string) || 'demo';

  const callbackUrl = `${env.APP_URL}/api/social/callback/${platform}`;

  try {
    if (platform === 'linkedin') {
      const clientId = env.LINKEDIN_CLIENT_ID!;
      const clientSecret = env.LINKEDIN_CLIENT_SECRET!;
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl, client_id: clientId, client_secret: clientSecret }).toString(),
      });
      const tokenData = await tokenRes.json() as LinkedInTokenResponse;
      if (!tokenData.access_token) throw new Error('No access token');

      let displayName = 'LinkedIn User';
      try {
        const profileRes = await fetch('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const profile = await profileRes.json() as LinkedInProfileResponse;
        displayName = `${profile.localizedFirstName || ''} ${profile.localizedLastName || ''}`.trim() || displayName;
      } catch { /* ignore */ }

      await dbUpsertToken(userId, platform, {
        accessToken: tokenData.access_token,
        displayName,
        expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      });
    }

    if (platform === 'twitter') {
      const clientId = env.TWITTER_CLIENT_ID!;
      const clientSecret = env.TWITTER_CLIENT_SECRET || '';
      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(clientSecret ? { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` } : {}),
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl, code_verifier: (decoded.codeVerifier as string) || '' }).toString(),
      });
      const tokenData = await tokenRes.json() as TwitterTokenResponse;
      if (!tokenData.access_token) throw new Error('No access token');

      let displayName = 'Twitter User';
      try {
        const profileRes = await fetch('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const profile = await profileRes.json() as TwitterProfileResponse;
        displayName = profile.data?.username ? `@${profile.data.username}` : displayName;
      } catch { /* ignore */ }

      await dbUpsertToken(userId, platform, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        displayName,
      });
    }

    res.redirect(`${frontendUrl}/brand?social_connected=${platform}`);
  } catch (err: unknown) {
    console.error(`OAuth callback failed for ${platform}:`, err instanceof Error ? err.message : String(err));
    res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('Connection failed — please try again')}`);
  }
});

// DELETE /api/social/disconnect/:platform
router.delete('/disconnect/:platform', async (req: AuthRequest, res: Response) => {
  const platform = req.params.platform as string;
  const userId = req.dbUserId || req.userId || 'demo';
  await dbDeleteToken(userId, platform);
  res.json({ ok: true });
});

// POST /api/social/post — post content to a connected platform
// WHY rate-limited: calls external LinkedIn/Twitter APIs via publishToSocialPlatform.
// Without rate limiting, a user could script repeated posts and risk the OAuth app
// being rate-limited/banned by the platform. This complies with CLAUDE.md's rule
// that any endpoint calling external APIs must have a rate limiter.
router.post('/post', socialRateLimit, async (req: AuthRequest, res: Response) => {
  const body = parseBody(postSocialSchema, req.body, res);
  if (!body) return;
  const { platform, content } = body;
  const userId = req.dbUserId || req.userId || 'demo';
  const conn = await dbGetToken(userId, platform);

  if (!conn?.accessToken) {
    res.status(401).json({ error: `Not connected to ${PLATFORM_LABELS[platform] || platform}. Connect your account first.`, code: 'NOT_CONNECTED' });
    return;
  }

  try {
    const { postId, postUrl } = await publishToSocialPlatform(platform, content, conn);
    res.json({ ok: true, postId, postUrl, platform });
  } catch (err: unknown) {
    console.error(`[social] Failed to post to ${platform}:`, err);
    res.status(500).json({ error: 'Failed to post content', code: 'POST_FAILED', retryable: true });
  }
});

// POST /api/social/schedule — store a scheduled post intent
// Currently saves to an in-memory schedule (BullMQ delayed jobs can be wired
// here once a scheduler table exists; for now the client shows scheduled state).
// WHY content: unknown: mirrors postSocialSchema's own validated shape
// (record|array|string — content varies by platform, same reasoning as
// schemas/jobs.ts's patchContentSchema) — this map only stores and later
// forwards it, never reads a key off it directly.
//
// WHY this is a SEPARATE concept from routes/scheduledPosts.ts's DB-backed
// scheduled_posts table, not the same thing under two names: this Map tracks
// a platform+exact-datetime+content publish intent (no date-precision
// requirement, no jobId requirement); scheduledPosts.ts's table tracks a
// calendar date-placement tied to a jobId (no platform/content/time — the
// platform and content already live on the referenced contentJobs row). A
// user can place the same job on the Calendar (scheduledPosts.ts) AND queue a
// social-schedule intent for it here independently — nothing currently
// cross-checks the two. CLAUDE.md §9 "Known Limitations" describes the
// eventual real auto-publish feature as unifying this Map with that table
// into one concept once a real delivery worker exists; until then, treat
// them as two separate, uncoordinated reminder mechanisms, not duplicates of
// each other.
// WHY renamed from scheduledPosts to socialScheduleIntents: the old name
// shadowed the DB table name from db/schema.ts, making it easy to confuse
// the two systems. The new name makes the distinction explicit in the type
// system, not just in comments.
const socialScheduleIntents = new Map<string, { userId: string; platform: string; scheduledAt: string; content: unknown; jobId?: string; createdAt: string }>();

router.post('/schedule', async (req: AuthRequest, res: Response) => {
  const body = parseBody(scheduleSocialSchema, req.body, res);
  if (!body) return;
  const { platform, content, jobId, scheduledAt } = body;
  const userId = req.dbUserId || req.userId || 'demo';

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    res.status(400).json({ error: 'scheduledAt must be a future date', code: 'VALIDATION_ERROR' });
    return;
  }

  const conn = await dbGetToken(userId, platform);
  if (!conn?.accessToken) {
    res.status(401).json({ error: `Not connected to ${PLATFORM_LABELS[platform] || platform}. Connect your account first.`, code: 'NOT_CONNECTED' });
    return;
  }

  const scheduleId = `${userId}:${platform}:${Date.now()}`;
  socialScheduleIntents.set(scheduleId, {
    userId, platform, scheduledAt, content, jobId,
    createdAt: new Date().toISOString(),
  });

  // Auto-evict after scheduled time + 1 hour
  const msUntil = scheduledDate.getTime() - Date.now() + 60 * 60 * 1000;
  setTimeout(() => socialScheduleIntents.delete(scheduleId), msUntil);

  res.json({ ok: true, scheduleId, scheduledAt, platform });
});

export default router;
