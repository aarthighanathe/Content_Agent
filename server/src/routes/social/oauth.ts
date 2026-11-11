// WHY a separate sub-router, not inline in index.ts: extracted 2026-08-14 to
// keep routes/social/index.ts under the 400-line split threshold — same
// "split when it grows, mirror the routes/jobs/ sub-router pattern" convention
// as routes/jobs/render.ts/stream.ts/insights.ts/versions.ts. This module owns
// the full OAuth dance (state signing, /connect/:platform, /callback/:platform)
// since that's the single largest, most self-contained chunk of the original file.
import { Router, Request, Response } from 'express';
import type { NextFunction } from 'express';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { AuthRequest } from '../../middleware/auth.js';
import { env } from '../../config.js';
import { socialRateLimit } from '../../middleware/rateLimit.js';
import { dbUpsertToken } from '../../lib/socialTokens.js';
import { getRedisClient } from '../../lib/redisClient.js';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
// SECURITY: binds /callback to the same browser that started /connect (OAuth
// account-linking CSRF). Set on the API origin; required to match state.nonce.
const OAUTH_CSRF_COOKIE = 'pensieve_oauth_csrf';

function pkceS256Challenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function oauthCookieFlags(): string {
  // SECURITY: production frontend (Vercel) and API (Render) are different sites —
  // SameSite=None; Secure is required for the connect XHR to store the cookie
  // on the API origin. Local Vite→API is same-site-enough with Lax.
  if (env.NODE_ENV === 'production') return 'HttpOnly; Path=/; Max-Age=600; SameSite=None; Secure';
  return 'HttpOnly; Path=/; Max-Age=600; SameSite=Lax';
}

function setOAuthCsrfCookie(res: Response, nonce: string): void {
  res.append('Set-Cookie', `${OAUTH_CSRF_COOKIE}=${encodeURIComponent(nonce)}; ${oauthCookieFlags()}`);
}

function clearOAuthCsrfCookie(res: Response): void {
  const clearFlags = env.NODE_ENV === 'production'
    ? 'HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure'
    : 'HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
  res.append('Set-Cookie', `${OAUTH_CSRF_COOKIE}=; ${clearFlags}`);
}

function safeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

async function consumeOAuthNonce(nonce: string): Promise<boolean> {
  const client = getRedisClient();
  // SECURITY: without Redis, nonce replay is possible — fail closed in
  // production; local/dev without Redis still allows the flow.
  if (!client) return env.NODE_ENV !== 'production';
  try {
    const key = `oauth:nonce:${nonce}`;
    const set = await client.set(key, '1', 'EX', 600, 'NX');
    return set === 'OK';
  } catch {
    return env.NODE_ENV !== 'production';
  }
}

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
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString()) as Record<string, unknown>;
    const issuedAt = payload.issuedAt;
    if (typeof issuedAt !== 'number' || Date.now() - issuedAt > OAUTH_STATE_TTL_MS) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
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
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}
interface TwitterTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}
interface TwitterProfileResponse {
  data?: { username?: string };
}

const router = Router();

// GET /api/social/connect/:platform — initiate OAuth
// WHY JSON { authorizeUrl } instead of a 302: the Brand page must call this
// through the authenticated axios client (Bearer + credentials) so (a) Clerk
// auth reaches the API on Vercel→Render and (b) the CSRF cookie is set on the
// API origin before the browser navigates to LinkedIn/Twitter.
// WHY rate-limited here, not at the /api/social router mount: the callback
// route calls external LinkedIn/Twitter token + profile APIs and needs
// backpressure, but /connections (a frequent read-only DB lookup, no external
// call) and /post/schedule shouldn't share that same tight OAuth-dance budget.
router.get('/connect/:platform', socialRateLimit, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const platform = req.params.platform as string;
    // SECURITY (SEC-020): never mint OAuth state for a shared 'demo' identity —
    // authMiddleware already guarantees dbUserId on this route.
    if (!req.dbUserId) {
      res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING', retryable: false });
      return;
    }
    const userId = req.dbUserId;
    const callbackUrl = `${env.APP_URL}/api/social/callback/${platform}`;
    const nonce = crypto.randomUUID();

    if (platform === 'linkedin') {
      const clientId = env.LINKEDIN_CLIENT_ID;
      if (!clientId) {
        res.status(501).json({ error: 'LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID in .env', code: 'NOT_CONFIGURED', retryable: false });
        return;
      }
      const scopes = ['openid', 'profile', 'email', 'w_member_social'].join('%20');
      const state = signOAuthState({ userId, platform, nonce, issuedAt: Date.now() });
      const authorizeUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scopes}&state=${state}`;
      setOAuthCsrfCookie(res, nonce);
      res.json({ authorizeUrl });
      return;
    }

    if (platform === 'twitter') {
      const clientId = env.TWITTER_CLIENT_ID;
      if (!clientId) {
        res.status(501).json({ error: 'Twitter OAuth not configured. Set TWITTER_CLIENT_ID in .env', code: 'NOT_CONFIGURED', retryable: false });
        return;
      }
      const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join('%20');
      // SECURITY: S256 PKCE — verifier is generated once here and carried through
      // to the callback via the signed state param.
      const codeVerifier = randomBytes(32).toString('base64url');
      const codeChallenge = pkceS256Challenge(codeVerifier);
      const state = signOAuthState({
        userId, platform, nonce, codeVerifier, issuedAt: Date.now(),
      });
      const authorizeUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scopes}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      setOAuthCsrfCookie(res, nonce);
      res.json({ authorizeUrl });
      return;
    }

    res.status(400).json({ error: `Unsupported platform: ${platform}`, code: 'VALIDATION_ERROR', retryable: false });
  } catch (error) {
    next(error);
  }
});

// GET /api/social/callback/:platform — OAuth callback
// WHY no next(error) anywhere in this handler: an OAuth callback is a top-level
// browser redirect the user is mid-flow on, not an API call with a JSON error
// consumer — every failure path (bad state, missing token, upstream API error)
// redirects back to the Brand page with a social_error query param instead of
// falling through to the generic error middleware, which would show the user a
// raw JSON/HTML error page in the middle of an OAuth redirect chain.
router.get('/callback/:platform', socialRateLimit, async (req: Request, res: Response) => {
  const platform = req.params.platform as string;
  // SECURITY: req.query values can legitimately be string | string[] |
  // ParsedQs | ParsedQs[] | undefined (e.g. a repeated `?code=a&code=b` or
  // `?code[]=a` param yields an array) — narrow each to a plain string
  // explicitly instead of force-casting the whole object, so an
  // array-shaped param fails the callback cleanly instead of reaching
  // URLSearchParams/fetch() as a coerced, malformed string.
  const codeRaw = req.query.code;
  const stateRaw = req.query.state;
  const errorRaw = req.query.error;
  const code = typeof codeRaw === 'string' ? codeRaw : undefined;
  const state = typeof stateRaw === 'string' ? stateRaw : undefined;
  const oauthError = typeof errorRaw === 'string' ? errorRaw : undefined;
  const frontendUrl = env.FRONTEND_URL;

  try {
    if (oauthError) {
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent(oauthError === 'access_denied' ? 'provider_denied' : 'connection_failed')}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('missing_params')}`);
      return;
    }

    const decoded = verifyOAuthState(state);
    if (!decoded) {
      clearOAuthCsrfCookie(res);
      // Invalid or tampered OAuth state — reject the callback and redirect to Brand page with error
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('invalid_state')}`);
      return;
    }
    // SECURITY (SEC-020): reject malformed state rather than falling back to
    // a shared 'demo' userId, and bind state.platform to the URL platform so a
    // LinkedIn code cannot be stored under /callback/twitter.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const userId = typeof decoded.userId === 'string' ? decoded.userId : '';
    const statePlatform = typeof decoded.platform === 'string' ? decoded.platform : '';
    if (!UUID_RE.test(userId) || statePlatform !== platform) {
      clearOAuthCsrfCookie(res);
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('invalid_state')}`);
      return;
    }
    const nonce = typeof decoded.nonce === 'string' ? decoded.nonce : '';
    const cookies = parseCookieHeader(req.headers.cookie);
    const cookieNonce = cookies[OAUTH_CSRF_COOKIE] ?? '';
    clearOAuthCsrfCookie(res);
    // SECURITY: cookie must match state.nonce — proves the same browser that
    // started /connect is finishing /callback (blocks classic OAuth CSRF
    // account-linking where a victim completes an attacker-started URL).
    if (!nonce || !cookieNonce || !safeEqualString(cookieNonce, nonce)) {
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('csrf_mismatch')}`);
      return;
    }
    if (!(await consumeOAuthNonce(nonce))) {
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('session_expired')}`);
      return;
    }

    const callbackUrl = `${env.APP_URL}/api/social/callback/${platform}`;

    if (platform === 'linkedin') {
      const clientId = env.LINKEDIN_CLIENT_ID;
      const clientSecret = env.LINKEDIN_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('linkedin_not_configured')}`);
        return;
      }
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl, client_id: clientId, client_secret: clientSecret }).toString(),
      });
      const tokenData = await tokenRes.json() as LinkedInTokenResponse;
      if (!tokenData.access_token) throw new Error('No access token');

      let displayName = 'LinkedIn User';
      let platformUserId: string | undefined;
      try {
        const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const profile = await profileRes.json() as LinkedInProfileResponse;
        platformUserId = profile.sub || profile.id;
        displayName = profile.name?.trim()
          || `${profile.given_name || ''} ${profile.family_name || ''}`.trim()
          || displayName;
      } catch { /* ignore */ }

      await dbUpsertToken(userId, platform, {
        accessToken: tokenData.access_token,
        displayName,
        platformUserId,
        expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      });
    }

    if (platform === 'twitter') {
      const clientId = env.TWITTER_CLIENT_ID;
      if (!clientId) {
        res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('twitter_not_configured')}`);
        return;
      }
      const clientSecret = env.TWITTER_CLIENT_SECRET || '';
      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(clientSecret ? { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` } : {}),
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl, code_verifier: typeof decoded.codeVerifier === 'string' ? decoded.codeVerifier : '' }).toString(),
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
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : Date.now() + 7200 * 1000,
      });
    }

    return res.redirect(`${frontendUrl}/brand?social_connected=${platform}`);
  } catch (err: unknown) {
    console.error(`OAuth callback failed for ${platform}:`, err instanceof Error ? err.message : String(err));
    return res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('connection_failed')}`);
  }
});

export default router;
