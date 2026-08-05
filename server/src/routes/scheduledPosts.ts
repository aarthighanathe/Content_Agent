// WHY this route exists: replaces the 100%-client-side localStorage calendar
// schedule (client/src/pages/Calendar/calendarHelpers.ts's old SCHEDULE_KEY)
// with a real DB-backed table so scheduled placements survive a cleared
// browser and sync across devices.
//
// WHY this table is a SEPARATE concept from social.ts's in-memory
// scheduledPosts Map, not the same thing under two names: this table tracks
// a calendar date-placement tied to a jobId (platform is optional — only set
// when the user wants real auto-publish, see below); social.ts's Map tracks a
// platform+exact-datetime+arbitrary-content publish intent with no jobId
// requirement (e.g. posting ad-hoc text unrelated to any generated job). A
// user can place the same job on the Calendar here AND separately queue a
// social-schedule intent for it via PostPanel.tsx — nothing currently
// cross-checks the two, so they can go out of sync with no error surfaced.
// See social.ts's own scheduledPosts Map comment for the mirrored
// cross-reference.
//
// WHY added 2026-08-05 (real auto-publish, `publishPlatform` on
// createScheduledPostSchema): previously this table was purely a planning
// aid — placing a job on a date never actually posted anything anywhere,
// same disclosed scope as social.ts's reminder-only POST /api/social/schedule
// (see CLAUDE.md §9 "Known Limitations", now updated). POST / here now
// optionally queues a BullMQ delayed job (lib/publishQueue.ts) that fires at
// a fixed daily hour on the scheduled date and calls the real platform post
// API (workers/publishWorker.ts, sharing lib/socialPublish.ts's posting logic
// with social.ts's own interactive POST /api/social/post route). Scheduling
// with no publishPlatform stays exactly the old reminder-only behavior.
import { Router, Response, NextFunction } from 'express';
import { and, eq, gte, lt } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { scheduledPosts } from '../db/schema.js';
import { requireJobOwnership } from './jobs/ownership.js';
import { parseBody, createScheduledPostSchema, listScheduledPostsQuerySchema } from '../schemas/index.js';
import { isValidUUID } from '../lib/uuid.js';
import { queuePublishJob, cancelPublishJob } from '../lib/publishQueue.js';

// WHY a fixed daily hour, not a user-chosen time-of-day: scheduledDate is a
// date-only string (see schema.ts's WHY) — adding real time-of-day control
// would mean a DB column type change and a new SchedulePicker.tsx UI control,
// a larger change than this pass scopes to (see CHANGELOG's dated entry).
// 9am UTC is an arbitrary but reasonable "morning" publish slot.
const PUBLISH_HOUR_UTC = 9;

function publishDelayMs(scheduledDate: string): number {
  const [y, m, d] = scheduledDate.split('-').map(Number);
  const publishAt = Date.UTC(y, m - 1, d, PUBLISH_HOUR_UTC, 0, 0);
  return publishAt - Date.now();
}

const router = Router();

// WHY a shared guard, not inline checks per route: every route below needs
// both a reachable DB and a real UUID dbUserId (Clerk-only/demo users with no
// DB row can't own a foreign-key row in scheduled_posts). Returns the
// resolved userId on success, or writes the error response and returns null.
// WHY computed, not a hardcoded "-31": query.month is validated YYYY-MM by
// listScheduledPostsQuerySchema, so this always receives a real "YYYY-MM"
// pair — returns the first day of the following month as "YYYY-MM-DD" for
// use as an exclusive upper bound (see the GET / route's WHY above).
function firstDayOfNextMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year, mon, 1)); // mon is 1-indexed input; JS Date month is 0-indexed, so this already lands on next month
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

function requireDbUser(req: AuthRequest, res: Response): string | null {
  const userId = req.dbUserId;
  if (!db || !userId || !isValidUUID(userId)) {
    res.status(503).json({
      error: 'Scheduling requires a database connection',
      code: 'DB_UNAVAILABLE',
      retryable: true,
    });
    return null;
  }
  return userId;
}

// GET /api/scheduled-posts?month=YYYY-MM — list this user's scheduled posts.
// Omitting `month` returns all of the user's scheduled posts (used by the
// Dashboard "next scheduled post" card to look past the current month).
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const query = parseBody(listScheduledPostsQuerySchema, req.query, res);
    if (!query) return;

    const conditions = [eq(scheduledPosts.userId, userId)];
    if (query.month) {
      // WHY string range, not a date-column BETWEEN: scheduledDate is stored
      // as a plain YYYY-MM-DD string (see schema.ts's WHY comment) — lexical
      // comparison on that format sorts identically to chronological order.
      // WHY an exclusive next-month bound, not lte(`${month}-31`): a literal
      // `-31` upper bound only happens to work because every real day in a
      // month lexically falls within 01-31 — it silently stops being a valid
      // calendar day for February/30-day months if this were ever generalized
      // (e.g. to a query spanning a day range instead of a whole month).
      // Computing the real first-day-of-next-month bound removes that
      // coincidence dependency.
      conditions.push(gte(scheduledPosts.scheduledDate, `${query.month}-01`));
      conditions.push(lt(scheduledPosts.scheduledDate, firstDayOfNextMonth(query.month)));
    }

    // WHY joining the job's topic/platform inline: NextScheduledCard.tsx
    // (Dashboard) only needs those two fields off the nearest upcoming row —
    // without this, it had to issue a second, sequential GET /jobs/:jobId
    // after this query resolved (a network waterfall on every Dashboard
    // mount) just to show a topic string. The scheduled_posts row count per
    // user is small and bounded (this is a personal planning view, not a
    // high-volume table), so the extra join column is cheap here.
    const rows = await db!.query.scheduledPosts.findMany({
      where: and(...conditions),
      orderBy: (sp, { asc }) => [asc(sp.scheduledDate)],
      with: { job: { columns: { topic: true, platform: true } } },
    });

    res.json({
      scheduledPosts: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        jobId: row.jobId,
        scheduledDate: row.scheduledDate,
        createdAt: row.createdAt,
        publishPlatform: row.publishPlatform,
        publishStatus: row.publishStatus,
        publishedAt: row.publishedAt,
        postUrl: row.postUrl,
        publishError: row.publishError,
        job: row.job ? { topic: row.job.topic, platform: row.job.platform } : undefined,
      })),
    });
    return;
  } catch (error) {
    next(error);
  }
});

// POST /api/scheduled-posts — create or move a scheduling (jobId + date) for
// the current user. Upserts on jobId (unique constraint) to preserve the
// one-job-one-date invariant that Calendar.tsx's allocate() already enforces
// client-side — moving a job to a new date is just re-POSTing it.
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const body = parseBody(createScheduledPostSchema, req.body, res);
    if (!body) return;

    // SECURITY: a user must own the job they're scheduling — requireJobOwnership
    // returns 404 (not 403) on mismatch to avoid confirming the job exists.
    const ownership = await requireJobOwnership(body.jobId, userId, res);
    if (!ownership) return;

    // WHY reset publishStatus/publishedAt/postUrl/publishError to their
    // pending/null defaults on every upsert, not just on first insert: moving
    // an already-published or already-failed job to a new date (or changing
    // its platform) must re-arm it for a fresh publish attempt — otherwise a
    // rescheduled job would keep showing a stale "posted"/"failed" badge from
    // its previous date.
    const [row] = await db!
      .insert(scheduledPosts)
      .values({ userId, jobId: body.jobId, scheduledDate: body.scheduledDate, publishPlatform: body.publishPlatform ?? null })
      .onConflictDoUpdate({
        target: scheduledPosts.jobId,
        set: {
          scheduledDate: body.scheduledDate,
          publishPlatform: body.publishPlatform ?? null,
          publishStatus: 'pending',
          publishedAt: null,
          postUrl: null,
          publishError: null,
        },
      })
      .returning();

    if (body.publishPlatform) {
      queuePublishJob(row.id, publishDelayMs(body.scheduledDate)).catch(() => {});
    } else {
      // WHY cancel unconditionally, not just when downgrading from a platform:
      // cheap and idempotent (cancelPublishJob no-ops if nothing is queued) —
      // simpler than tracking "did this upsert change from a platform to
      // none" separately.
      cancelPublishJob(row.id).catch(() => {});
    }

    res.status(201).json({ scheduledPost: row });
    return;
  } catch (error) {
    next(error);
  }
});

// DELETE /api/scheduled-posts/:jobId — remove a job's scheduling. Keyed by
// jobId (not the row id) since that's what the client already tracks
// per-card (Calendar.tsx's removeFromSchedule(jobId)) and the unique
// constraint on jobId makes it an equally unambiguous lookup key.
router.delete('/:jobId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const jobId = req.params.jobId as string;
    if (!isValidUUID(jobId)) {
      res.status(400).json({ error: 'Invalid jobId', code: 'VALIDATION_ERROR', retryable: false });
      return;
    }

    // SECURITY: scope the delete by userId too, not just jobId — otherwise a
    // user could delete another user's scheduling row by guessing/observing a
    // jobId (the row itself carries no ownership check besides this filter).
    const deleted = await db!
      .delete(scheduledPosts)
      .where(and(eq(scheduledPosts.jobId, jobId), eq(scheduledPosts.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Scheduled post not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    cancelPublishJob(deleted[0].id).catch(() => {});

    res.json({ success: true });
    return;
  } catch (error) {
    next(error);
  }
});

export default router;
