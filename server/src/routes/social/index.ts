// WHY split 2026-08-14: this file grew past the 400-line cap (CLAUDE.md "Code
// Style Rules" / "Never Do These"). The OAuth state-signing + /connect +
// /callback flow (the largest, most self-contained chunk) moved to
// oauth.ts; the token storage layer (DB + in-memory fallback) moved to
// lib/socialTokens.ts since workers/publishWorker.ts and lib/socialPublish.ts
// need it without pulling in Express route handlers. This file keeps the
// remaining CRUD-shaped routes: connections list, disconnect, post, schedule.
import { Router, Response } from 'express';
import type { NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { parseBody, postSocialSchema, scheduleSocialSchema } from '../../schemas/index.js';
import { socialRateLimit } from '../../middleware/rateLimit.js';
import { publishToSocialPlatform } from '../../lib/socialPublish.js';
import { dbGetTokens, dbDeleteToken, dbGetToken, ensureFreshSocialToken, PLATFORM_LABELS } from '../../lib/socialTokens.js';
import oauthRoutes from './oauth.js';

const router = Router();

router.use(oauthRoutes);

// GET /api/social/connections
router.get('/connections', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.dbUserId || req.userId || 'demo';
    const tokens = await dbGetTokens(userId);
    const connections = Object.entries(tokens).map(([platform, data]) => ({
      platform,
      label: PLATFORM_LABELS[platform] || platform,
      connected: !!data.accessToken,
      displayName: data.displayName || null,
      expiresAt: data.expiresAt || null,
    }));
    return res.json({ connections });
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
    const userId = req.dbUserId || req.userId || 'demo';
    await dbDeleteToken(userId, platform);
    return res.json({ ok: true });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/social/post — post content to a connected platform
// WHY rate-limited: calls external LinkedIn/Twitter APIs via publishToSocialPlatform.
// Without rate limiting, a user could script repeated posts and risk the OAuth app
// being rate-limited/banned by the platform. This complies with CLAUDE.md's rule
// that any endpoint calling external APIs must have a rate limiter.
router.post('/post', socialRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = parseBody(postSocialSchema, req.body, res);
    if (!body) return;
    const { platform, content } = body;
    const userId = req.dbUserId || req.userId || 'demo';
    const conn = await dbGetToken(userId, platform);

    if (!conn?.accessToken) {
      res.status(401).json({ error: `Not connected to ${PLATFORM_LABELS[platform] || platform}. Connect your account first.`, code: 'NOT_CONNECTED', retryable: false });
      return;
    }

    try {
      const freshConn = await ensureFreshSocialToken(userId, platform, conn);
      const { postId, postUrl } = await publishToSocialPlatform(platform, content, freshConn);
      res.json({ ok: true, postId, postUrl, platform });
      return;
    } catch (err: unknown) {
      console.error(`[social] Failed to post to ${platform}:`, err);
      res.status(500).json({ error: 'Failed to post content', code: 'POST_FAILED', retryable: true });
      return;
    }
  } catch (error) {
    next(error);
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

router.post('/schedule', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = parseBody(scheduleSocialSchema, req.body, res);
    if (!body) return;
    const { platform, content, jobId, scheduledAt } = body;
    const userId = req.dbUserId || req.userId || 'demo';

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'scheduledAt must be a future date', code: 'VALIDATION_ERROR', retryable: false });
    }

    const conn = await dbGetToken(userId, platform);
    if (!conn?.accessToken) {
      return res.status(401).json({ error: `Not connected to ${PLATFORM_LABELS[platform] || platform}. Connect your account first.`, code: 'NOT_CONNECTED', retryable: false });
    }

    const scheduleId = `${userId}:${platform}:${Date.now()}`;
    socialScheduleIntents.set(scheduleId, {
      userId, platform, scheduledAt, content, jobId,
      createdAt: new Date().toISOString(),
    });

    // Auto-evict after scheduled time + 1 hour
    const msUntil = scheduledDate.getTime() - Date.now() + 60 * 60 * 1000;
    setTimeout(() => socialScheduleIntents.delete(scheduleId), msUntil);

    return res.json({ ok: true, scheduleId, scheduledAt, platform });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
