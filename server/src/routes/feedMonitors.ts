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
import { eq, and, sql } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';
import { feedMonitors, users } from '../db/schema.js';
import { db } from '../db/index.js';
import { parseBody, feedMonitorSchema, feedMonitorUpdateSchema } from '../schemas/index.js';
import { checkFeedMonitor } from '../workers/feedMonitorWorker.js';
import { probeFeedUrl } from '../lib/feedFetch.js';
import { isRetryableFetchFailure, toClientFetchFailureMessage } from '../lib/ssrfGuard.js';
import { contentRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../lib/logger.js';
import { requireDbUser, isValidUUID } from './jobs/ownership.js';

const router = Router();
const MAX_FEED_MONITORS_PER_USER = 5;

// WHY: explicit columns (not select *): list/get only need the fields the UI
// and check path consume — avoids accidentally leaking future sensitive columns.
const FEED_MONITOR_COLUMNS = {
  id: feedMonitors.id,
  userId: feedMonitors.userId,
  feedUrl: feedMonitors.feedUrl,
  platform: feedMonitors.platform,
  tone: feedMonitors.tone,
  targetAudience: feedMonitors.targetAudience,
  active: feedMonitors.active,
  lastCheckedAt: feedMonitors.lastCheckedAt,
  lastItemGuid: feedMonitors.lastItemGuid,
  lastError: feedMonitors.lastError,
  createdAt: feedMonitors.createdAt,
} as const;

// GET /api/feed-monitors
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = requireDbUser(req, res, 'Feed monitors');
  if (!userId) return;
  try {
    const rows = await db!
      .select(FEED_MONITOR_COLUMNS)
      .from(feedMonitors)
      .where(eq(feedMonitors.userId, userId));
    return res.json({ monitors: rows });
  } catch (err) {
    logger.error('[FeedMonitors] Failed to list monitors', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Failed to fetch feed monitors', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /api/feed-monitors
// SECURITY: probeFeedUrl hits an arbitrary user-supplied URL (SSRF-guarded) —
// without a rate limiter a scripted create loop burns outbound fetch quota even
// when inserts fail validation. Same contentRateLimit as /check (external I/O).
router.post('/', contentRateLimit, async (req: AuthRequest, res: Response) => {
  const userId = requireDbUser(req, res, 'Feed monitors');
  if (!userId) return;
  const body = parseBody(feedMonitorSchema, req.body, res);
  if (!body) return;

  try {
    // WHY: probe before insert (QA-FEED-001): subscribe used to succeed for any
    // well-formed URL, then Check now / cron silently wrote lastError. Failing
    // here keeps the UI honest and surfaces SSRF / dead-host / non-feed bodies
    // at the moment the user is still looking at the form. Kept outside the
    // serialize transaction so we never hold a row lock across outbound I/O.
    const probe = await probeFeedUrl(body.feedUrl);
    if (!probe.ok) {
      // SECURITY: probe.reason may include undici cause chains — log it, return
      // a stable client message (SEC-002).
      logger.warn('[FeedMonitors] Feed probe failed', { feedUrl: body.feedUrl, reason: probe.reason });
      return res.status(400).json({
        error: `Could not read that feed — ${toClientFetchFailureMessage(probe.reason)}`,
        code: 'VALIDATION_ERROR',
        retryable: isRetryableFetchFailure(probe.reason),
      });
    }

    // WHY: parent-row FOR UPDATE + count inside one txn — check-then-insert
    // outside a lock raced two concurrent creates past the max-5 cap when the
    // user had fewer than 5 rows (FOR UPDATE on feed_monitors alone locks
    // nothing when the count is 0).
    const created = await db!.transaction(async (tx) => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      const [{ total }] = await tx
        .select({ total: sql<number>`cast(count(*) as int)` })
        .from(feedMonitors)
        .where(eq(feedMonitors.userId, userId));

      if (total >= MAX_FEED_MONITORS_PER_USER) {
        return null;
      }

      const [row] = await tx.insert(feedMonitors).values({
        userId,
        feedUrl: body.feedUrl,
        platform: body.platform,
        tone: body.tone,
        targetAudience: body.targetAudience,
        active: true,
      }).returning(FEED_MONITOR_COLUMNS);
      return row;
    });

    if (!created) {
      return res.status(409).json({
        error: `You can subscribe to at most ${MAX_FEED_MONITORS_PER_USER} feed monitors`,
        code: 'FEED_MONITOR_LIMIT',
        retryable: false,
      });
    }
    return res.status(201).json({ monitor: created });
  } catch (err) {
    // WHY: unique (user_id, feed_url) index — a concurrent/duplicate subscribe is a conflict, not a 500.
    const pgCode = (err as { code?: unknown } | null)?.code
      ?? (err as { cause?: { code?: unknown } } | null)?.cause?.code;
    if (pgCode === '23505') {
      return res.status(409).json({ error: 'You already subscribe to this feed', code: 'DUPLICATE_FEED', retryable: false });
    }
    logger.error('[FeedMonitors] Failed to create monitor', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Failed to create feed monitor', code: 'SERVER_ERROR', retryable: true });
  }
});

// PATCH /api/feed-monitors/:id — partial update: active toggle + any editable fields
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const userId = requireDbUser(req, res, 'Feed monitors');
  if (!userId) return;
  const id = String(req.params['id'] ?? '');
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid monitor id', code: 'VALIDATION_ERROR', retryable: false });
  }

  // WHY: zod validation: prevents mass-assignment and ensures platform/tone are
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
    const [row] = await db!.update(feedMonitors)
      .set(update)
      .where(and(eq(feedMonitors.id, id), eq(feedMonitors.userId, userId)))
      .returning(FEED_MONITOR_COLUMNS);
    if (!row) return res.status(404).json({ error: 'Monitor not found', code: 'NOT_FOUND', retryable: false });
    return res.json({ monitor: row });
  } catch (err) {
    logger.error('[FeedMonitors] Failed to update monitor', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Failed to update feed monitor', code: 'SERVER_ERROR', retryable: true });
  }
});

// DELETE /api/feed-monitors/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = requireDbUser(req, res, 'Feed monitors');
  if (!userId) return;
  const id = String(req.params['id'] ?? '');
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid monitor id', code: 'VALIDATION_ERROR', retryable: false });
  }
  try {
    const [row] = await db!.delete(feedMonitors)
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
// WHY: a dedicated route (not a PATCH side-effect): triggering a check is an
// action, not a state update — cleaner than overloading PATCH with a
// hidden trigger flag, and lets the client confirm the check fired without
// polling lastCheckedAt.
// SECURITY: this fires the same Gemini-summarization + 5-agent pipeline as
// /api/content/repurpose, so it needs the same contentRateLimit guard —
// without it, a user could script repeated calls (or create many monitors
// and check them all in a loop) to burn unbounded Gemini/Tavily quota,
// bypassing every other route's rate limit.
router.post('/:id/check', contentRateLimit, async (req: AuthRequest, res: Response) => {
  const userId = requireDbUser(req, res, 'Feed monitors');
  if (!userId) return;
  const id = String(req.params['id'] ?? '');
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid monitor id', code: 'VALIDATION_ERROR', retryable: false });
  }

  try {
    const [row] = await db!.select(FEED_MONITOR_COLUMNS).from(feedMonitors)
      .where(and(eq(feedMonitors.id, id), eq(feedMonitors.userId, userId)))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'Monitor not found', code: 'NOT_FOUND', retryable: false });
    if (!row.active) {
      return res.status(400).json({ error: 'Monitor is paused — re-enable it before running a check', code: 'VALIDATION_ERROR', retryable: false });
    }

    // WHY: fire-and-forget with a 202: the feed fetch + AI extraction can take
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
