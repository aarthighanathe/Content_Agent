import { Router, Response } from 'express';
import { and, eq, desc } from 'drizzle-orm';
import { AuthRequest } from '../../middleware/auth.js';
import { db } from '../../db/index.js';
import { contentJobs } from '../../db/schema.js';
import { isValidUUID } from '../../lib/uuid.js';
import { VALID_PLATFORMS } from '../../schemas/index.js';

const router = Router();

// WHY a fixed recency window (last 40 completed jobs), not all-time: a user's
// audience can legitimately shift over months (a pivot, a new product line) —
// weighting toward recent jobs means the learned default tracks that instead
// of being dominated by whatever they wrote the most of a year ago. 40 is
// generous enough to have several jobs per platform for most active users
// without scanning a user's entire history on every Create page load.
const RECENCY_WINDOW = 40;

// GET /api/jobs/audience-defaults — the most common `targetAudience` string
// this user has actually used per platform, from their recent completed jobs.
// WHY most-frequent, not most-recent: a one-off job with an unusual audience
// (e.g. multiplied content aimed at a different platform's typical reader)
// shouldn't override what the user overwhelmingly types for that platform —
// frequency is a steadier signal than recency alone for a "default" value.
router.get('/audience-defaults', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUserId;
    // WHY 200 + empty object, not an error: a missing DB or a non-UUID
    // identity (demo mode) simply means no learned defaults exist yet — the
    // client already falls back to its static AUDIENCE_DEFAULTS map in that
    // case, so this is a read-only convenience, not a hard dependency.
    if (!db || !userId || !isValidUUID(userId)) {
      return res.json({ audienceDefaults: {} });
    }

    const jobs = await db.query.contentJobs.findMany({
      where: and(eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0), eq(contentJobs.status, 'done')),
      columns: { platform: true, targetAudience: true },
      orderBy: desc(contentJobs.createdAt),
      limit: RECENCY_WINDOW,
    });

    const countsByPlatform: Partial<Record<(typeof VALID_PLATFORMS)[number], Record<string, number>>> = {};
    for (const job of jobs) {
      const audience = job.targetAudience?.trim();
      if (!audience) continue;
      const platformCounts = (countsByPlatform[job.platform] ??= {});
      platformCounts[audience] = (platformCounts[audience] || 0) + 1;
    }

    const audienceDefaults: Partial<Record<(typeof VALID_PLATFORMS)[number], string>> = {};
    for (const platform of VALID_PLATFORMS) {
      const counts = countsByPlatform[platform];
      if (!counts) continue;
      const [topAudience] = Object.entries(counts).sort(([, a], [, b]) => b - a)[0] || [];
      if (topAudience) audienceDefaults[platform] = topAudience;
    }

    return res.json({ audienceDefaults });
  } catch (error) {
    console.error('[jobs/audience-defaults] Failed to compute learned defaults:', error);
    return res.status(500).json({ error: 'Failed to load audience defaults', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
