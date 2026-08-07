// routes/feedMonitors.ts — CRUD for RSS/Atom feed monitor subscriptions.
// Implements FUTURE_FEATURES.md §Repurpose "No RSS/feed monitoring" item.
//
// Routes:
//   GET    /api/feed-monitors          — list this user's monitors
//   POST   /api/feed-monitors          — create a new monitor
//   PATCH  /api/feed-monitors/:id      — toggle active / update fields
//   DELETE /api/feed-monitors/:id      — remove a monitor
//   POST   /api/feed-monitors/:id/check — run an immediate manual check
import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';
import { feedMonitors } from '../db/schema.js';
import { db } from '../db/index.js';
import { parseBody, feedMonitorSchema, feedMonitorUpdateSchema } from '../schemas/index.js';
import { checkFeedMonitor } from '../workers/feedMonitorWorker.js';
import { contentRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../lib/logger.js';

const router = Router();

// WHY userId is derived from req.dbUserId (the DB uuid row), not req.userId
// (the Clerk ID): feedMonitors.userId stores the DB uuid (same convention as
// contentJobs.userId, collections.userId, etc.) so joins and worker lookups
// use one consistent key.
function requireUserId(req: AuthRequest, res: Response): string | null {
  const uid = req.dbUserId;
  if (!uid) {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED', retryable: false });
    return null;
  }
  return uid;
}

// GET /api/feed-monitors
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId || !db) return;
  try {
    const rows = await db.select().from(feedMonitors).where(eq(feedMonitors.userId, userId));
    return res.json({ monitors: rows });
  } catch (err) {
    logger.error('[FeedMonitors] Failed to list monitors', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Failed to fetch feed monitors', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /api/feed-monitors
router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId || !db) return;
  const body = parseBody(feedMonitorSchema, req.body, res);
  if (!body) return;

  try {
    const [row] = await db.insert(feedMonitors).values({
      userId,
      feedUrl: body.feedUrl,
      platform: body.platform,
      tone: body.tone,
      targetAudience: body.targetAudience,
      active: true,
    }).returning();
    return res.status(201).json({ monitor: row });
  } catch (err) {
    logger.error('[FeedMonitors] Failed to create monitor', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Failed to create feed monitor', code: 'SERVER_ERROR', retryable: true });
  }
});

// PATCH /api/feed-monitors/:id — partial update: active toggle + any editable fields
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId || !db) return;
  const id = String(req.params['id'] ?? '');

  // WHY zod validation: prevents mass-assignment and ensures platform/tone are
  // validated against VALID_PLATFORMS/VALID_TONES enums, and targetAudience
  // has a length cap. Without this, invalid values can be written directly to
  // the DB and cause downstream issues when checkFeedMonitor constructs jobs.
  const body = parseBody(feedMonitorUpdateSchema, req.body, res);
  if (!body) return;

  const update: Record<string, unknown> = {};
  if (body.active !== undefined) update.active = body.active;
  if (body.platform !== undefined) update.platform = body.platform;
  if (body.tone !== undefined) update.tone = body.tone;
  if (body.targetAudience !== undefined) update.targetAudience = body.targetAudience;

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided', code: 'VALIDATION_ERROR', retryable: false });
  }

  try {
    const [row] = await db.update(feedMonitors)
      .set(update)
      .where(and(eq(feedMonitors.id, id), eq(feedMonitors.userId, userId)))
      .returning();
    if (!row) return res.status(404).json({ error: 'Monitor not found', code: 'NOT_FOUND', retryable: false });
    return res.json({ monitor: row });
  } catch (err) {
    logger.error('[FeedMonitors] Failed to update monitor', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Failed to update feed monitor', code: 'SERVER_ERROR', retryable: true });
  }
});

// DELETE /api/feed-monitors/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId || !db) return;
  const id = String(req.params['id'] ?? '');
  try {
    const [row] = await db.delete(feedMonitors)
      .where(and(eq(feedMonitors.id, id), eq(feedMonitors.userId, userId)))
      .returning();
    if (!row) return res.status(404).json({ error: 'Monitor not found', code: 'NOT_FOUND', retryable: false });
    return res.json({ success: true });
  } catch (err) {
    logger.error('[FeedMonitors] Failed to delete monitor', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Failed to delete feed monitor', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /api/feed-monitors/:id/check — immediate manual check
// WHY a dedicated route (not a PATCH side-effect): triggering a check is an
// action, not a state update — cleaner than overloading PATCH with a
// hidden trigger flag, and lets the client confirm the check fired without
// polling lastCheckedAt.
// SECURITY: this fires the same Gemini-summarization + 5-agent pipeline as
// /api/content/repurpose, so it needs the same contentRateLimit guard —
// without it, a user could script repeated calls (or create many monitors
// and check them all in a loop) to burn unbounded Gemini/Tavily quota,
// bypassing every other route's rate limit.
router.post('/:id/check', contentRateLimit, async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId || !db) return;
  const id = String(req.params['id'] ?? '');

  try {
    const [row] = await db.select().from(feedMonitors)
      .where(and(eq(feedMonitors.id, id), eq(feedMonitors.userId, userId)))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'Monitor not found', code: 'NOT_FOUND', retryable: false });

    // WHY fire-and-forget with a 202: the feed fetch + AI extraction can take
    // 5–15 s (same latency as a single-URL repurpose) — returning 202
    // immediately matches how the regular repurpose route works (client
    // navigates to /result/:jobId to watch progress) rather than hanging the
    // request for the full pipeline round-trip.
    checkFeedMonitor(row, userId).catch((err: unknown) => {
      logger.error('[FeedMonitors] Manual check failed', { monitorId: id, error: err instanceof Error ? err.message : String(err) });
    });

    return res.status(202).json({ message: 'Check started' });
  } catch (err) {
    logger.error('[FeedMonitors] Failed to trigger manual check', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Failed to trigger check', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
