// WHY a separate sub-router, not inline in index.ts: extracted 2026-08-14 to
// keep routes/social/index.ts under the 400-line split threshold — same
// "split when it grows, mirror the routes/jobs/ sub-router pattern" convention
// as routes/jobs/render.ts/stream.ts/insights.ts/versions.ts. This module owns
// the full OAuth dance (state signing, /connect/:platform, /callback/:platform)
// since that's the single largest, most self-contained chunk of the original file.
import { Router, Request, Response } from 'express';
import type { NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthRequest } from '../../middleware/auth.js';
import { env } from '../../config.js';
import { socialRateLimit } from '../../middleware/rateLimit.js';
import { dbUpsertToken } from '../../lib/socialTokens.js';

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

const router = Router();

// GET /api/social/connect/:platform — initiate OAuth
// WHY rate-limited here, not at the /api/social router mount: the callback
// route calls external LinkedIn/Twitter token + profile APIs and needs
// backpressure, but /connections (a frequent read-only DB lookup, no external
// call) and /post/schedule shouldn't share that same tight OAuth-dance budget.
router.get('/connect/:platform', socialRateLimit, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const platform = req.params.platform as string;
    const userId = req.dbUserId || req.userId || 'demo';
    const callbackUrl = `${env.APP_URL}/api/social/callback/${platform}`;

    if (platform === 'linkedin') {
      const clientId = env.LINKEDIN_CLIENT_ID;
      if (!clientId) {
        res.status(501).json({ error: 'LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID in .env', code: 'NOT_CONFIGURED', retryable: false });
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
        res.status(501).json({ error: 'Twitter OAuth not configured. Set TWITTER_CLIENT_ID in .env', code: 'NOT_CONFIGURED', retryable: false });
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
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent(oauthError)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('Missing or malformed OAuth callback parameters')}`);
      return;
    }

    const decoded = verifyOAuthState(state);
    if (!decoded) {
      // Invalid or tampered OAuth state — reject the callback and redirect to Brand page with error
      res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('Invalid OAuth state')}`);
      return;
    }
    // SECURITY: verifyOAuthState() returns Record<string, unknown> | null —
    // narrow decoded.userId with a typeof check rather than a bare `as
    // string` cast before use, per CLAUDE.md's cast rule. The only producer
    // of this payload is signOAuthState() below, which always sets a real
    // userId string, so this typeof check is a defensive backstop against a
    // future call-site change that omits it, not a currently-reachable gap.
    const userId = typeof decoded.userId === 'string' ? decoded.userId : 'demo';

    const callbackUrl = `${env.APP_URL}/api/social/callback/${platform}`;

    if (platform === 'linkedin') {
      const clientId = env.LINKEDIN_CLIENT_ID;
      const clientSecret = env.LINKEDIN_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('LinkedIn OAuth is not configured')}`);
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
      const clientId = env.TWITTER_CLIENT_ID;
      if (!clientId) {
        res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('Twitter OAuth is not configured')}`);
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
      });
    }

    return res.redirect(`${frontendUrl}/brand?social_connected=${platform}`);
  } catch (err: unknown) {
    console.error(`OAuth callback failed for ${platform}:`, err instanceof Error ? err.message : String(err));
    return res.redirect(`${frontendUrl}/brand?social_error=${encodeURIComponent('Connection failed — please try again')}`);
  }
});

export default router;
