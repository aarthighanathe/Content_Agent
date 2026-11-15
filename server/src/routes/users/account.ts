import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
// WHY: jobStore, not jobs/index — importing the jobs router pulled create/
// regenerate into the users tree (madge circular). Memory map lives in lib.
import { jobsMemory } from '../../lib/jobStore.js';
import { db } from '../../db/index.js';
import {
  users,
  userOnboarding,
  contentJobs,
  contentOutputs,
  agentLogs,
  socialTokens,
  scheduledPosts,
  collectionJobs,
  collections,
  competitorAnalyses,
  jobOutputVersions,
  feedMonitors,
} from '../../db/schema.js';
import { and, eq, inArray, desc, ne, sql } from 'drizzle-orm';
import { invalidateUserProfileCache } from './profileStore.js';
import { invalidateAuthCache } from '../../middleware/auth.js';
import { cancelContentJob } from '../../lib/queue.js';
import { cancelPublishJob } from '../../lib/publishQueue.js';
import { logger } from '../../lib/logger.js';
import { PublishInProgressError } from '../../lib/jobSoftDelete.js';

const router = Router();

// WHY: hard cap — unbounded findMany of jobs+outputs+logs OOMs / stalls Neon
// for power users; GDPR export still returns the most recent work + a warning.
const EXPORT_JOB_CAP = 100;

// GET /api/users/me/export — full data export (GDPR-style "download my data")
router.get('/me/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUserId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false });
      return;
    }
    if (!db) {
      res.status(503).json({
        error: 'Export unavailable — database not configured',
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
      return;
    }

    // WHY: allSettled, not all — a "download my data" export should return
    // whatever succeeded rather than failing entirely because one of five
    // independent per-user queries had a transient error.
    const [userResult, jobCountResult, jobsResult, tokensResult, onboardingResult, scheduledResult] =
      await Promise.allSettled([
        db.query.users.findFirst({ where: (u, { eq: ueq }) => ueq(u.id, userId) }),
        db
          .select({ total: sql<number>`cast(count(*) as int)` })
          .from(contentJobs)
          .where(eq(contentJobs.userId, userId)),
        // WHY: cap + no agentLogs — logs are bulky stage traces; outputs carry
        // the portable content. Truncation is surfaced via `truncated` below.
        db.query.contentJobs.findMany({
          where: (j, { eq: jeq }) => jeq(j.userId, userId),
          orderBy: [desc(contentJobs.createdAt)],
          limit: EXPORT_JOB_CAP,
          with: { outputs: true },
        }),
        // SECURITY: access/refresh tokens are encrypted at rest and excluded from the
        // export — only metadata about which platforms are connected is included.
        db.select({
          id: socialTokens.id,
          platform: socialTokens.platform,
          displayName: socialTokens.displayName,
          createdAt: socialTokens.createdAt,
        }).from(socialTokens).where(eq(socialTokens.userId, userId)),
        db.query.userOnboarding.findFirst({ where: (t, { eq: teq }) => teq(t.userId, userId) }),
        db.select().from(scheduledPosts).where(eq(scheduledPosts.userId, userId)),
      ]);

    const user = userResult.status === 'fulfilled' ? userResult.value : null;
    const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value : [];
    const tokens = tokensResult.status === 'fulfilled' ? tokensResult.value : [];
    const onboarding = onboardingResult.status === 'fulfilled' ? onboardingResult.value : null;
    const scheduled = scheduledResult.status === 'fulfilled' ? scheduledResult.value : [];
    const jobTotal =
      jobCountResult.status === 'fulfilled' && jobCountResult.value[0]
        ? jobCountResult.value[0].total
        : jobs.length;
    const truncated = jobTotal > EXPORT_JOB_CAP;

    const partialFailures = [
      userResult,
      jobCountResult,
      jobsResult,
      tokensResult,
      onboardingResult,
      scheduledResult,
    ].filter((r) => r.status === 'rejected').length;
    if (partialFailures > 0) {
      Sentry.captureMessage('GET /me/export: partial data export', {
        tags: { route: 'GET /me/export' },
        extra: { partialFailures },
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="pensieve-export-${userId}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      partial: partialFailures > 0,
      truncated,
      ...(truncated
        ? {
            warning:
              `Export includes the ${EXPORT_JOB_CAP} most recent content jobs ` +
              `(${jobTotal} total). Agent logs omitted to keep the download bounded.`,
          }
        : {
            warning: 'Agent logs omitted from export to keep the download bounded.',
          }),
      jobTotal,
      jobExportLimit: EXPORT_JOB_CAP,
      user: user
        ? {
            id: user.id,
            email: user.email,
            brandName: user.brandName,
            brandVoice: user.brandVoice,
            phrasesUse: user.phrasesUse,
            phrasesAvoid: user.phrasesAvoid,
            createdAt: user.createdAt,
          }
        : null,
      contentJobs: jobs,
      connectedSocialAccounts: tokens,
      onboarding: onboarding || null,
      scheduledPosts: scheduled,
    });
    return;
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /me/export' } });
    res.status(500).json({ error: 'Failed to export data', code: 'SERVER_ERROR', retryable: true });
    return;
  }
});

// DELETE /api/users/me — permanently delete the account and all associated data
router.delete('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUserId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false });
      return;
    }
    if (!db) {
      res.status(503).json({
        error: 'Account deletion unavailable — database not configured',
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
      return;
    }

    // WHY: refuse while any scheduled_posts row is publishing — wiping that
    // row mid-post leaves a live social post with no durable Calendar row.
    // Early non-locking check; the FOR UPDATE inside the txn is the real guard.
    const publishingRows = await db
      .select({ id: scheduledPosts.id })
      .from(scheduledPosts)
      .where(and(
        eq(scheduledPosts.userId, userId),
        eq(scheduledPosts.publishStatus, 'publishing'),
      ));
    if (publishingRows.length > 0) {
      res.status(409).json({
        error: 'A post is being published right now — try again shortly',
        code: 'PUBLISH_IN_PROGRESS',
        retryable: true,
      });
      return;
    }

    // WHY: soft-delete + cancel MUST NOT run before the publishing lock.
    // Pre-txn soft-delete left deleted=1 (and cancelled queues) even when
    // FOR UPDATE later threw PublishInProgressError → irreversible library wipe
    // on a 409. Soft-delete lives inside the same txn after FOR UPDATE; cancel
    // + memory flags run only after commit.
    let ownedJobIds: string[] = [];
    let ownedPostIds: string[] = [];

    // WHY: wrap every table's deletion in one transaction — a partial failure
    // (e.g. jobs deleted but outputs/logs left behind due to a mid-way error)
    // would orphan rows referencing a userId that no longer exists.
    await db.transaction(async (tx) => {
      // WHY: FOR UPDATE + exclude-publishing delete — same TOCTOU fix as
      // softDeleteJobWithCleanup; early check above is not enough alone.
      const lockedPosts = await tx
        .select({
          id: scheduledPosts.id,
          publishStatus: scheduledPosts.publishStatus,
        })
        .from(scheduledPosts)
        .where(eq(scheduledPosts.userId, userId))
        .for('update');
      if (lockedPosts.some((row) => row.publishStatus === 'publishing')) {
        throw new PublishInProgressError();
      }

      // WHY: after lock succeeds — rolls back with the txn on PublishInProgressError
      // (leftover check below) so a 409 never leaves the library soft-deleted.
      await tx.update(contentJobs).set({ deleted: 1 }).where(eq(contentJobs.userId, userId));

      const jobRows = await tx.select({ id: contentJobs.id }).from(contentJobs).where(eq(contentJobs.userId, userId));
      const jobIds = jobRows.map((j) => j.id);
      ownedJobIds = jobIds;
      ownedPostIds = lockedPosts.map((p) => p.id);

      // WHY: scheduled_posts.job_id/user_id are FKs with ON DELETE no action —
      // must be deleted before contentJobs/users or the transaction aborts.
      // SECURITY: never delete publish_status='publishing' (live post in flight).
      await tx.delete(scheduledPosts).where(and(
        eq(scheduledPosts.userId, userId),
        ne(scheduledPosts.publishStatus, 'publishing'),
      ));
      const leftoverPublishing = await tx
        .select({ id: scheduledPosts.id })
        .from(scheduledPosts)
        .where(and(
          eq(scheduledPosts.userId, userId),
          eq(scheduledPosts.publishStatus, 'publishing'),
        ));
      if (leftoverPublishing.length > 0) {
        throw new PublishInProgressError();
      }

      // WHY: explicit, not automatic: feed_monitors.userId has NO FK constraint
      // at all (schema.ts's own WHY comment — the worker runs outside a
      // request context and re-resolves the user by clerkId rather than
      // joining). Without this, a deleted user's active monitor would keep
      // polling every 30 minutes forever, burning Gemini/Tavily quota on a
      // job insert that fails its contentJobs.userId FK check and lands in a
      // generic catch that still advances the cursor and repeats indefinitely
      // — a live, unbounded cost leak with zero visibility.
      await tx.delete(feedMonitors).where(eq(feedMonitors.userId, userId));

      // WHY: collectionJobs.jobId/collectionId, collections.userId, competitorAnalyses.userId,
      // and jobOutputVersions.jobId are FKs with ON DELETE no action — must be deleted
      // before contentJobs/users or the transaction aborts.
      // WHY: collection_jobs BEFORE collections: collection_jobs.collection_id
      // references collections with no ON DELETE CASCADE. Deleting collections
      // first aborted the whole transaction whenever the user had a job in a
      // Library folder, so DELETE /me returned 500 and the account stayed.
      await tx.delete(competitorAnalyses).where(eq(competitorAnalyses.userId, userId));
      const collectionRows = await tx
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.userId, userId));
      const collectionIds = collectionRows.map((c) => c.id);
      if (collectionIds.length > 0) {
        await tx.delete(collectionJobs).where(inArray(collectionJobs.collectionId, collectionIds));
      }
      if (jobIds.length > 0) {
        await tx.delete(collectionJobs).where(inArray(collectionJobs.jobId, jobIds));
      }
      await tx.delete(collections).where(eq(collections.userId, userId));

      if (jobIds.length > 0) {
        await tx.delete(jobOutputVersions).where(inArray(jobOutputVersions.jobId, jobIds));
        await tx.delete(agentLogs).where(inArray(agentLogs.jobId, jobIds));
        await tx.delete(contentOutputs).where(inArray(contentOutputs.jobId, jobIds));
        await tx.delete(contentJobs).where(eq(contentJobs.userId, userId));
      }

      await tx.delete(socialTokens).where(eq(socialTokens.userId, userId));
      await tx.delete(userOnboarding).where(eq(userOnboarding.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    // WHY: only after commit — a waiting BullMQ content/publish job must not
    // keep running for a deleted user; cancel was previously pre-txn and fired
    // even on PublishInProgressError 409.
    try {
      await Promise.allSettled([
        ...ownedJobIds.map((id) => cancelContentJob(id)),
        ...ownedPostIds.map((id) => cancelPublishJob(id)),
      ]);
    } catch (cancelErr) {
      logger.warn('[Account] Failed to cancel queued jobs after deletion', {
        userId,
        error: cancelErr instanceof Error ? cancelErr.message : String(cancelErr),
      });
    }

    // Clear in-memory state so a re-signup with the same Clerk identity
    // doesn't inherit stale brand-voice data from before the deletion.
    invalidateUserProfileCache(userId);
    for (const [jobId, job] of jobsMemory.entries()) {
      if (job.userId === userId) jobsMemory.delete(jobId);
    }

    // WHY: middleware/auth.ts's authCache maps Clerk ID → dbUserId with a
    // 5-minute TTL — without evicting it here, a request in the next 5
    // minutes bearing this now-deleted user's still-valid Clerk session
    // token would keep resolving to a dbUserId that no longer exists in the
    // users table, instead of failing auth cleanly. req.userId (not
    // req.dbUserId) is the cache key — see AuthRequest's own field comments.
    if (req.userId) invalidateAuthCache(req.userId);

    res.json({ success: true });
    return;
  } catch (error) {
    if (error instanceof PublishInProgressError) {
      res.status(409).json({
        error: 'A post is being published right now — try again shortly',
        code: 'PUBLISH_IN_PROGRESS',
        retryable: true,
      });
      return;
    }
    Sentry.captureException(error, { tags: { route: 'DELETE /me' } });
    res.status(500).json({ error: 'Failed to delete account', code: 'SERVER_ERROR', retryable: true });
    return;
  }
});

export default router;
