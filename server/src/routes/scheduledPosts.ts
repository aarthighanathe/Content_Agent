// WHY: DB-backed calendar placements (survive a cleared browser and sync
// across devices). publishPlatform set → BullMQ delayed job
// (publishQueue → publishWorker → socialPublish). Omitted on update keeps
// the stored platform; explicit null stays reminder-only and skips the worker.
import { Router, Response, NextFunction } from 'express';
import { and, asc, eq, gte, lt, ne } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';
import { jobMutationRateLimit } from '../middleware/rateLimit.js';
import { db } from '../db/index.js';
import { scheduledPosts, contentJobs } from '../db/schema.js';
import { requireJobOwnership, requireDbUser } from './jobs/ownership.js';
import { parseBody, createScheduledPostSchema, listScheduledPostsQuerySchema } from '../schemas/index.js';
import { isValidUUID } from '../lib/uuid.js';
import { queuePublishJob, cancelPublishJob } from '../lib/publishQueue.js';
import { DEFAULT_PUBLISH_HOUR, publishDelayMs } from '../lib/publishDelay.js';
import {
  sendPublishConflict,
  isPartialThreadPosted,
  isPostedUnverified,
  firstDayOfNextMonth,
  currentUtcMonth,
} from '../lib/scheduledPostGuards.js';

export { publishDelayMs };

// WHY: hard cap even inside a month window — a month of personal calendar
// rows should be tiny; this bounds a pathological / crafted query.
const LIST_MAX_ROWS = 200;

const router = Router();

// GET /api/scheduled-posts?month=YYYY-MM — list this user's scheduled posts
// for one calendar month. Omitting `month` defaults to the current UTC month
// (never unbounded — M8).
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res, 'Scheduling');
    if (!userId) return;

    const query = parseBody(listScheduledPostsQuerySchema, req.query, res);
    if (!query) return;

    // WHY: default current UTC month when omitted — previously missing `month`
    // returned every row for the user (unbounded). Schema still allows omit
    // for older clients; the route always scopes to one month + LIST_MAX_ROWS.
    const month = query.month ?? currentUtcMonth();

    // WHY: string range, not a date-column BETWEEN: scheduledDate is stored
    // as a plain YYYY-MM-DD string (see schema.ts's WHY comment) — lexical
    // comparison on that format sorts identically to chronological order.
    // WHY: an exclusive next-month bound, not lte(`${month}-31`): a literal
    // `-31` upper bound only happens to work because every real day in a
    // month lexically falls within 01-31 — it silently stops being a valid
    // calendar day for February/30-day months if this were ever generalized
    // (e.g. to a query spanning a day range instead of a whole month).
    // Computing the real first-day-of-next-month bound removes that
    // coincidence dependency.
    const conditions = [
      eq(scheduledPosts.userId, userId),
      gte(scheduledPosts.scheduledDate, `${month}-01`),
      lt(scheduledPosts.scheduledDate, firstDayOfNextMonth(month)),
    ];

    // WHY: joining the job's topic/platform inline: NextScheduledCard.tsx
    // (Dashboard) only needs those two fields off the nearest upcoming row —
    // without this, it had to issue a second, sequential GET /jobs/:jobId
    // after this query resolved (a network waterfall on every Dashboard
    // mount) just to show a topic string. The scheduled_posts row count per
    // user is small and bounded (this is a personal planning view, not a
    // high-volume table), so the extra join column is cheap here.
    // SECURITY: drop schedules whose job is soft-deleted. Historical rows can
    // outlive a delete that failed before this cleanup was transactional.
    const rows = await db!
      .select({
        id: scheduledPosts.id,
        userId: scheduledPosts.userId,
        jobId: scheduledPosts.jobId,
        scheduledDate: scheduledPosts.scheduledDate,
        createdAt: scheduledPosts.createdAt,
        publishPlatform: scheduledPosts.publishPlatform,
        publishHour: scheduledPosts.publishHour,
        publishStatus: scheduledPosts.publishStatus,
        publishedAt: scheduledPosts.publishedAt,
        postUrl: scheduledPosts.postUrl,
        publishError: scheduledPosts.publishError,
        topic: contentJobs.topic,
        platform: contentJobs.platform,
      })
      .from(scheduledPosts)
      .innerJoin(contentJobs, and(
        eq(contentJobs.id, scheduledPosts.jobId),
        eq(contentJobs.userId, userId),
        eq(contentJobs.deleted, 0),
      ))
      .where(and(...conditions))
      .orderBy(asc(scheduledPosts.scheduledDate))
      .limit(LIST_MAX_ROWS);

    return res.json({
      scheduledPosts: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        jobId: row.jobId,
        scheduledDate: row.scheduledDate,
        createdAt: row.createdAt,
        publishPlatform: row.publishPlatform,
        publishHour: row.publishHour,
        publishStatus: row.publishStatus,
        publishedAt: row.publishedAt,
        postUrl: row.postUrl,
        publishError: row.publishError,
        job: { topic: row.topic, platform: row.platform },
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/scheduled-posts — create or move a scheduling (jobId + date) for
// the current user. Upserts on jobId (unique constraint) to preserve the
// one-job-one-date invariant that Calendar.tsx's allocate() already enforces
// client-side — moving a job to a new date is just re-POSTing it.
router.post('/', jobMutationRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res, 'Scheduling');
    if (!userId) return;

    const body = parseBody(createScheduledPostSchema, req.body, res);
    if (!body) return;

    // SECURITY: a user must own the job they're scheduling — requireJobOwnership
    // returns 404 (not 403) on mismatch to avoid confirming the job exists.
    const ownership = await requireJobOwnership(body.jobId, userId, res);
    if (!ownership) return;

    const [existing] = await db!
      .select()
      .from(scheduledPosts)
      .where(and(eq(scheduledPosts.jobId, body.jobId), eq(scheduledPosts.userId, userId)))
      .limit(1);
    // WHY: 409 while publishing: the worker already claimed this row and may be
    // mid-post; resetting to pending and re-queuing would double-post.
    if (existing?.publishStatus === 'publishing') {
      sendPublishConflict(
        res,
        'This post is being published right now — try again shortly',
        'PUBLISH_IN_PROGRESS',
      );
      return;
    }

    // WHY: omitted publishPlatform keeps the stored value on update. A drag of
    // a job that lives in another month used to omit it and the upsert wrote
    // null, cancelling auto-publish. Explicit null still clears.
    const preservedPlatform = existing?.publishPlatform === 'linkedin'
      || existing?.publishPlatform === 'twitter'
      ? existing.publishPlatform
      : null;
    const publishPlatform = body.publishPlatform !== undefined
      ? body.publishPlatform
      : preservedPlatform;
    const publishHour = body.publishHour ?? existing?.publishHour ?? DEFAULT_PUBLISH_HOUR;

    // WHY: a partially posted Twitter thread is already live; re-arming would
    // republish tweets 1..K as duplicates. Block until the user deletes the row.
    if (publishPlatform && isPartialThreadPosted(existing?.publishStatus, existing?.publishError)) {
      sendPublishConflict(
        res,
        'This Twitter thread was only partly posted — finish it manually instead of rescheduling',
        'PARTIAL_THREAD_POSTED',
      );
      return;
    }
    // WHY: LinkedIn accepted / sweep timed out after claim — post may be live.
    // Reject for any status (including failed) whenever the prefix is present.
    if (publishPlatform && isPostedUnverified(existing?.publishError)) {
      sendPublishConflict(
        res,
        'This post may already be live — check the account before scheduling again',
        'POSTED_UNVERIFIED',
      );
      return;
    }

    // WHY: reject past/current-hour schedules before insert: publishQueue used
    // to clamp a negative delay to 0 and fire immediately while the 201 body
    // still said publishStatus pending — so "schedule for 15:00" at 15:40
    // posted now. Require a future top-of-hour before accepting auto-publish.
    if (publishPlatform) {
      const delayMs = publishDelayMs(
        body.scheduledDate,
        body.timezoneOffsetMinutes,
        publishHour,
      );
      if (delayMs <= 0) {
        return res.status(400).json({
          error: 'That publish time is already past — pick a later hour',
          code: 'VALIDATION_ERROR',
          retryable: false,
        });
      }
    }

    // CORR-006: hour-only tweaks on an already-posted row must not re-arm
    // publishStatus→pending (that double-posted to LinkedIn/Twitter).
    if (
      existing
      && existing.publishStatus === 'posted'
      && existing.scheduledDate === body.scheduledDate
      && (existing.publishPlatform ?? null) === publishPlatform
    ) {
      const [row] = await db!
        .update(scheduledPosts)
        .set({ publishHour })
        .where(eq(scheduledPosts.id, existing.id))
        .returning();
      return res.status(200).json({ scheduledPost: row });
    }

    // WHY: reset publishStatus/publishedAt/postUrl/publishError to their
    // pending/null defaults on every upsert, not just on first insert: moving
    // an already-published or already-failed job to a new date (or changing
    // its platform) must re-arm it for a fresh publish attempt — otherwise a
    // rescheduled job would keep showing a stale "posted"/"failed" badge from
    // its previous date.
    // WHY: onConflict WHERE excludes publishing (R1): the select-then-upsert
    // gap lets publishWorker claim pending→publishing; an unconditional
    // set publishStatus:'pending' would re-arm mid-post and queuePublishJob
    // would double-post. Postgres skips the UPDATE when WHERE fails;
    // returning is empty → 409 below (compatible with worker's pending-only claim).
    const [row] = await db!
      .insert(scheduledPosts)
      .values({
        userId,
        jobId: body.jobId,
        scheduledDate: body.scheduledDate,
        publishPlatform,
        publishHour,
      })
      .onConflictDoUpdate({
        target: scheduledPosts.jobId,
        where: ne(scheduledPosts.publishStatus, 'publishing'),
        set: {
          scheduledDate: body.scheduledDate,
          publishPlatform,
          publishHour,
          publishStatus: 'pending',
          publishedAt: null,
          postUrl: null,
          publishError: null,
        },
      })
      .returning();

    // WHY: empty returning after conflict WHERE miss — worker claimed between
    // the publishing check above and this upsert; same 409 as the early guard.
    if (!row) {
      sendPublishConflict(
        res,
        'This post is being published right now — try again shortly',
        'PUBLISH_IN_PROGRESS',
      );
      return;
    }

    if (publishPlatform) {
      const delayMs = publishDelayMs(
        body.scheduledDate,
        body.timezoneOffsetMinutes,
        publishHour,
      );
      // WHY: await + fail the request: a swallowed Redis error left a pending
      // row that the calendar labeled "Will auto-publish" while nothing was
      // queued. Prefer 503 over a silent lie.
      const queued = await queuePublishJob(row.id, delayMs);
      if (!queued.ok) {
        // WHY: an active job may still post. Do not flip the row to failed.
        if (queued.reason === 'active') {
          sendPublishConflict(
            res,
            'This post is being published right now — try again shortly',
            'PUBLISH_IN_PROGRESS',
          );
          return;
        }
        // WHY: only pending. A worker may have claimed publishing between the
        // upsert and this update; wiping that row hides a post still going out.
        const downgraded = await db!
          .update(scheduledPosts)
          .set({
            publishPlatform: null,
            publishStatus: 'failed',
            publishError: 'Queue unavailable',
          })
          .where(and(
            eq(scheduledPosts.id, row.id),
            eq(scheduledPosts.publishStatus, 'pending'),
          ))
          .returning({ id: scheduledPosts.id });
        if (downgraded.length === 0) {
          sendPublishConflict(
            res,
            'This post is being published right now — try again shortly',
            'PUBLISH_IN_PROGRESS',
          );
          return;
        }
        return res.status(503).json({
          error: 'Could not queue auto-publish — try again in a moment',
          code: 'SERVICE_UNAVAILABLE',
          retryable: true,
        });
      }
    } else {
      // WHY: cancel unconditionally, not just when downgrading from a platform:
      // cheap and idempotent (cancelPublishJob no-ops if nothing is queued) —
      // simpler than tracking "did this upsert change from a platform to
      // none" separately.
      cancelPublishJob(row.id).catch(() => {});
    }

    return res.status(201).json({ scheduledPost: row });
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
    const userId = requireDbUser(req, res, 'Scheduling');
    if (!userId) return;

    const jobId = req.params.jobId as string;
    if (!isValidUUID(jobId)) {
      res.status(400).json({ error: 'Invalid jobId', code: 'VALIDATION_ERROR', retryable: false });
      return;
    }

    // SECURITY: scope the delete by userId too, not just jobId — otherwise a
    // user could delete another user's scheduling row by guessing/observing a
    // jobId (the row itself carries no ownership check besides this filter).
    // WHY: 409 while publishing (same as upsert) — deleting mid-post makes
    // markPosted update 0 rows and can hide a live post as a silent success.
    const [existing] = await db!
      .select({
        id: scheduledPosts.id,
        publishStatus: scheduledPosts.publishStatus,
      })
      .from(scheduledPosts)
      .where(and(eq(scheduledPosts.jobId, jobId), eq(scheduledPosts.userId, userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Scheduled post not found', code: 'NOT_FOUND', retryable: false });
      return;
    }
    if (existing.publishStatus === 'publishing') {
      sendPublishConflict(
        res,
        'This post is being published right now — try again shortly',
        'PUBLISH_IN_PROGRESS',
      );
      return;
    }

    const deleted = await db!
      .delete(scheduledPosts)
      .where(and(
        eq(scheduledPosts.jobId, jobId),
        eq(scheduledPosts.userId, userId),
        // WHY: race with claim — same 409 as the early guard if worker wins.
        ne(scheduledPosts.publishStatus, 'publishing'),
      ))
      .returning();

    if (deleted.length === 0) {
      sendPublishConflict(
        res,
        'This post is being published right now — try again shortly',
        'PUBLISH_IN_PROGRESS',
      );
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
