import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { jobsMemory } from '../jobs/index.js';
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
import { eq, inArray } from 'drizzle-orm';
import { userProfiles } from './profileStore.js';
import { invalidateAuthCache } from '../../middleware/auth.js';

const router = Router();

// GET /api/users/me/export — full data export (GDPR-style "download my data")
router.get('/me/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUserId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false });
      return;
    }
    if (!db) {
      res.status(503).json({ error: 'Export unavailable — database not configured', code: 'SERVICE_UNAVAILABLE', retryable: true });
      return;
    }

    // WHY: allSettled, not all — a "download my data" export should return
    // whatever succeeded rather than failing entirely because one of five
    // independent per-user queries had a transient error.
    const [userResult, jobsResult, tokensResult, onboardingResult, scheduledResult] =
      await Promise.allSettled([
        db.query.users.findFirst({ where: (u, { eq: ueq }) => ueq(u.id, userId) }),
        db.query.contentJobs.findMany({
          where: (j, { eq: jeq }) => jeq(j.userId, userId),
          with: { outputs: true, logs: true },
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

    const partialFailures = [userResult, jobsResult, tokensResult, onboardingResult, scheduledResult]
      .filter((r) => r.status === 'rejected').length;
    if (partialFailures > 0) {
      Sentry.captureMessage('GET /me/export: partial data export', {
        tags: { route: 'GET /me/export' },
        extra: { partialFailures },
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="contentagent-export-${userId}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      partial: partialFailures > 0,
      user: user ? {
        id: user.id,
        email: user.email,
        brandName: user.brandName,
        brandVoice: user.brandVoice,
        phrasesUse: user.phrasesUse,
        phrasesAvoid: user.phrasesAvoid,
        createdAt: user.createdAt,
      } : null,
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
      res.status(503).json({ error: 'Account deletion unavailable — database not configured', code: 'SERVICE_UNAVAILABLE', retryable: true });
      return;
    }

    // WHY: wrap every table's deletion in one transaction — a partial failure
    // (e.g. jobs deleted but outputs/logs left behind due to a mid-way error)
    // would orphan rows referencing a userId that no longer exists.
    await db.transaction(async (tx) => {
      const jobRows = await tx.select({ id: contentJobs.id }).from(contentJobs).where(eq(contentJobs.userId, userId));
      const jobIds = jobRows.map((j) => j.id);

      // WHY: scheduled_posts.job_id/user_id are FKs with ON DELETE no action —
      // must be deleted before contentJobs/users or the transaction aborts.
      await tx.delete(scheduledPosts).where(eq(scheduledPosts.userId, userId));

      // WHY explicit, not automatic: feed_monitors.userId has NO FK constraint
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
      await tx.delete(competitorAnalyses).where(eq(competitorAnalyses.userId, userId));
      await tx.delete(collections).where(eq(collections.userId, userId));

      if (jobIds.length > 0) {
        await tx.delete(collectionJobs).where(inArray(collectionJobs.jobId, jobIds));
        await tx.delete(jobOutputVersions).where(inArray(jobOutputVersions.jobId, jobIds));
        await tx.delete(agentLogs).where(inArray(agentLogs.jobId, jobIds));
        await tx.delete(contentOutputs).where(inArray(contentOutputs.jobId, jobIds));
        await tx.delete(contentJobs).where(eq(contentJobs.userId, userId));
      }

      await tx.delete(socialTokens).where(eq(socialTokens.userId, userId));
      await tx.delete(userOnboarding).where(eq(userOnboarding.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    // Clear in-memory state so a re-signup with the same Clerk identity
    // doesn't inherit stale brand-voice data from before the deletion.
    userProfiles.delete(userId);
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
    Sentry.captureException(error, { tags: { route: 'DELETE /me' } });
    res.status(500).json({ error: 'Failed to delete account', code: 'SERVER_ERROR', retryable: true });
    return;
  }
});

export default router;
