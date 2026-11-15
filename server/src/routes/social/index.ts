// WHY: split 2026-08-14: this file grew past the 400-line cap (CLAUDE.md "Code
// Style Rules" / "Never Do These"). The OAuth state-signing + /connect +
// /callback flow (the largest, most self-contained chunk) moved to
// oauth.ts; the token storage layer (DB + in-memory fallback) moved to
// lib/socialTokens.ts since workers/publishWorker.ts and lib/socialPublish.ts
// need it without pulling in Express route handlers. This file keeps the
// remaining CRUD-shaped routes: connections list, disconnect, post.
// NOTE: POST /social/schedule (in-memory Map) was removed 2026-11 — Calendar
// auto-publish lives in scheduled_posts + publishWorker; the Map never delivered.
import { Router, Response } from 'express';
import type { NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { requireAuthUserId } from '../jobs/ownership.js';
import { parseBody, postSocialSchema } from '../../schemas/index.js';
import { socialRateLimit } from '../../middleware/rateLimit.js';
import { publishToSocialPlatform, TwitterPartialThreadError } from '../../lib/socialPublish.js';
import {
  dbGetTokens,
  dbDeleteToken,
  dbGetToken,
  ensureFreshSocialToken,
  PLATFORM_LABELS,
  TwitterTokenPersistError,
} from '../../lib/socialTokens.js';
import { toClientPublishError } from '../../lib/clientErrors.js';
import { env } from '../../config.js';
import oauthRoutes from './oauth.js';

const router = Router();

router.use(oauthRoutes);

// GET /api/social/connections
router.get('/connections', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    const tokens = await dbGetTokens(userId);
    const connections = Object.entries(tokens).map(([platform, data]) => ({
      platform,
      label: PLATFORM_LABELS[platform] || platform,
      connected: !!data.accessToken,
      displayName: data.displayName || null,
      expiresAt: data.expiresAt || null,
    }));
    // WHY: oauthConfigured: Brand's Connect buttons looked enabled even when
    // LINKEDIN_/TWITTER_CLIENT_ID were empty — clicks only then failed with a
    // generic toast. Surfacing config up front lets the UI disable Connect
    // with a clear "Not configured" state instead of a dead-end click.
    return res.json({
      connections,
      oauthConfigured: {
        linkedin: Boolean(env.LINKEDIN_CLIENT_ID?.trim()),
        twitter: Boolean(env.TWITTER_CLIENT_ID?.trim()),
      },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// DELETE /api/social/disconnect/:platform
router.delete('/disconnect/:platform', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const platform = req.params.platform as string;
    if (platform !== 'linkedin' && platform !== 'twitter' && platform !== 'instagram') {
      return res.status(400).json({ error: `Unsupported platform: ${platform}`, code: 'VALIDATION_ERROR', retryable: false });
    }
    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    try {
      await dbDeleteToken(userId, platform);
    } catch {
      // NOTE: dbDeleteToken already logged the cause; never claim success if the token survived.
      return res.status(503).json({
        error: 'Could not disconnect right now. Please try again.',
        code: 'DISCONNECT_FAILED',
        retryable: true,
      });
    }
    return res.json({ ok: true });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/social/post — post content to a connected platform
// WHY: rate-limited: calls external LinkedIn/Twitter APIs via publishToSocialPlatform.
// Without rate limiting, a user could script repeated posts and risk the OAuth app
// being rate-limited/banned by the platform. This complies with CLAUDE.md's rule
// that any endpoint calling external APIs must have a rate limiter.
router.post('/post', socialRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = parseBody(postSocialSchema, req.body, res);
    if (!body) return;
    const { platform, content } = body;
    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    const conn = await dbGetToken(userId, platform);

    if (!conn?.accessToken) {
      res.status(409).json({ error: `Not connected to ${PLATFORM_LABELS[platform] || platform}. Connect your account first.`, code: 'NOT_CONNECTED', retryable: false });
      return;
    }

    try {
      const freshConn = await ensureFreshSocialToken(userId, platform, conn);
      const { postId, postUrl } = await publishToSocialPlatform(platform, content, freshConn);
      res.json({ ok: true, postId, postUrl, platform });
      return;
    } catch (err: unknown) {
      // WHY: tweets 1..K are already live; retryable:true made the client
      // republish the whole thread (Calendar publishWorker already treats this
      // as terminal posted — mirror that for manual POST /post).
      const partial = err instanceof TwitterPartialThreadError
        || (err instanceof Error && err.name === 'TwitterPartialThreadError')
        ? err as TwitterPartialThreadError
        : null;
      if (
        partial
        && typeof partial.postedCount === 'number'
        && typeof partial.totalCount === 'number'
        && typeof partial.rootId === 'string'
        && typeof partial.lastId === 'string'
        && typeof partial.postUrl === 'string'
      ) {
        return res.status(409).json({
          error:
            `Posted ${partial.postedCount} of ${partial.totalCount} tweets. `
            + 'Finish the thread manually — do not republish.',
          code: 'PARTIAL_THREAD_POSTED',
          retryable: false,
          postedCount: partial.postedCount,
          totalCount: partial.totalCount,
          rootId: partial.rootId,
          lastId: partial.lastId,
          postUrl: partial.postUrl,
        });
      }
      // WHY: refresh rotated tokens but DB upsert exhausted — retryable 500
      // would keep using a dead refresh token; Calendar maps via
      // toClientPublishError — mirror that for manual POST /post.
      const tokenPersist = err instanceof TwitterTokenPersistError
        || (err instanceof Error && err.name === 'TwitterTokenPersistError');
      if (tokenPersist && err instanceof Error) {
        return res.status(409).json({
          error: toClientPublishError(err.message),
          code: 'TWITTER_RECONNECT_REQUIRED',
          retryable: false,
        });
      }
      console.error(`[social] Failed to post to ${platform}:`, err);
      res.status(500).json({ error: 'Failed to post content', code: 'POST_FAILED', retryable: true });
      return;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
