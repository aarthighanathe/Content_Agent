import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { socialTokens } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { encryptTokenOptional, decryptTokenOptional } from '../lib/tokenEncryption.js';
import { parseBody, postSocialSchema, scheduleSocialSchema } from '../schemas/index.js';
import { env } from '../config.js';

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

// Fallback in-memory store used only when DB is unavailable
const _fallback = new Map<string, Record<string, any>>();
function fbGet(uid: string) {
  if (!_fallback.has(uid)) _fallback.set(uid, {});
  return _fallback.get(uid)!;
}

const PLATFORM_LABELS: Record<string, string> = {
  linkedin:  'LinkedIn',
  twitter:   'Twitter / X',
  instagram: 'Instagram',
};

// ── DB helpers ─────────────────────────────────────────────────────────────────

async function dbGetTokens(userId: string): Promise<Record<string, any>> {
  if (!db) return fbGet(userId);
  try {
    const rows = await db.select().from(socialTokens).where(eq(socialTokens.userId, userId));
    const map: Record<string, any> = {};
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

async function dbGetToken(userId: string, platform: string): Promise<any | null> {
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
    connected: !!(data as any).accessToken,
    displayName: (data as any).displayName || null,
  }));
  res.json({ connections });
});

// GET /api/social/connect/:platform — initiate OAuth
router.get('/connect/:platform', (req: AuthRequest, res: Response) => {
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
    const state = signOAuthState({ userId, platform, nonce: crypto.randomUUID() });
    const challenge = Buffer.from(`${userId}-${Date.now()}`).toString('base64url');
    const url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scopes}&state=${state}&code_challenge=${challenge}&code_challenge_method=plain`;
    res.redirect(url);
    return;
  }

  res.status(400).json({ error: `Unsupported platform: ${platform}` });
});

// GET /api/social/callback/:platform — OAuth callback
router.get('/callback/:platform', async (req: Request, res: Response) => {
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
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) throw new Error('No access token');

      let displayName = 'LinkedIn User';
      try {
        const profileRes = await fetch('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const profile = await profileRes.json() as any;
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
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl, code_verifier: Buffer.from(`${userId}-${Date.now()}`).toString('base64url') }).toString(),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) throw new Error('No access token');

      let displayName = 'Twitter User';
      try {
        const profileRes = await fetch('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const profile = await profileRes.json() as any;
        displayName = profile.data?.username ? `@${profile.data.username}` : displayName;
      } catch { /* ignore */ }

      await dbUpsertToken(userId, platform, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        displayName,
      });
    }

    res.redirect(`${frontendUrl}/brand?social_connected=${platform}`);
  } catch (err: any) {
    console.error(`OAuth callback failed for ${platform}:`, err.message);
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
router.post('/post', async (req: AuthRequest, res: Response) => {
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
    // SECURITY: content is validated by postSocialSchema as record|array|string,
    // but we narrow to a record for property access below.
    const c = (typeof content === 'object' && !Array.isArray(content)) ? content as Record<string, unknown> : null;

    if (platform === 'linkedin') {
      let text = '';
      if (c?.hook) text = `${c.hook}\n\n${c.body || ''}\n\n${c.cta || ''}\n\n${(c.hashtags as string[] || []).join(' ')}`;
      else if (c?.caption) text = `${c.caption}\n\n${(c.hashtags as string[] || []).join(' ')}`;
      else if (c?.tweets) text = ((c.tweets as Array<Record<string, unknown>>)[0]?.text as string) || '';
      else if (Array.isArray(content)) text = `${content[0]?.headline}\n${content[0]?.body}`;

      const meRes = await fetch('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${conn.accessToken}` } });
      const me = await meRes.json() as any;
      const authorUrn = `urn:li:person:${me.id}`;

      const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify({ author: authorUrn, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: text.slice(0, 3000) }, shareMediaCategory: 'NONE' } }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } }),
      });
      const postData = await postRes.json() as any;
      const linkedinPostId: string | undefined = postData.id || postData.value?.id;
      if (linkedinPostId) {
        // WHY build the URL server-side: FUNCTIONAL_AUDIT_2026-07.md finding #10 —
        // the client used to receive a raw postId (an opaque URN, not a browsable
        // link) and never turned it into anything, so "View post" never rendered.
        // LinkedIn's share/update URNs resolve directly at this path.
        const postUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(linkedinPostId)}/`;
        res.json({ ok: true, postId: linkedinPostId, postUrl, platform });
        return;
      }
      throw new Error(JSON.stringify(postData));
    }

    if (platform === 'twitter') {
      let text = '';
      if (c?.hook) text = `${c.hook}\n\n${c.cta || ''}`.slice(0, 280);
      else if (c?.caption) text = (c.caption as string).slice(0, 280);
      else if (c?.tweets) text = ((c.tweets as Array<Record<string, unknown>>)[0]?.text as string) || '';
      else if (Array.isArray(content)) text = `${content[0]?.headline}\n${content[0]?.body}`.slice(0, 280);

      const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const tweetData = await tweetRes.json() as any;
      if (tweetData.data?.id) {
        // WHY conn.displayName here: stored as "@username" when the account was
        // connected (see the /callback/twitter handler below) — needed because
        // Twitter's status URL requires a handle, not just the tweet ID. Falls
        // back to the generic "i" path (still resolves, just via a redirect)
        // if displayName is somehow missing.
        const handle = conn.displayName?.replace(/^@/, '') || 'i';
        const postUrl = `https://twitter.com/${encodeURIComponent(handle)}/status/${encodeURIComponent(tweetData.data.id)}`;
        res.json({ ok: true, postId: tweetData.data.id, postUrl, platform });
        return;
      }
      throw new Error(JSON.stringify(tweetData));
    }

    res.status(400).json({ error: `Posting to ${platform} is not yet supported.` });
  } catch (err: any) {
    console.error(`[social] Failed to post to ${platform}:`, err);
    res.status(500).json({ error: 'Failed to post content', code: 'POST_FAILED', retryable: true });
  }
});

// POST /api/social/schedule — store a scheduled post intent
// Currently saves to an in-memory schedule (BullMQ delayed jobs can be wired
// here once a scheduler table exists; for now the client shows scheduled state).
const scheduledPosts = new Map<string, { userId: string; platform: string; scheduledAt: string; content: any; jobId?: string; createdAt: string }>();

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
  scheduledPosts.set(scheduleId, {
    userId, platform, scheduledAt, content, jobId,
    createdAt: new Date().toISOString(),
  });

  // Auto-evict after scheduled time + 1 hour
  const msUntil = scheduledDate.getTime() - Date.now() + 60 * 60 * 1000;
  setTimeout(() => scheduledPosts.delete(scheduleId), msUntil);

  res.json({ ok: true, scheduleId, scheduledAt, platform });
});

export default router;
