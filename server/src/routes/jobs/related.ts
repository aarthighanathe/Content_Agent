// WHY a separate sub-router: GET /:jobId/related is Adapt-family lineage —
// ContentMultiplier needs every sibling/ancestor for the same research tree so
// Open works after navigating between adapted results (session-only multiplyJobs
// used to lose those links). Kept out of manage.ts to stay under the 400-line cap.
import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
import { AuthRequest } from '../../middleware/auth.js';
import { db } from '../../db/index.js';
import { contentJobs } from '../../db/schema.js';
import { requireJobOwnership } from './ownership.js';
import type { AssembledJob, MemoryJob } from './ownership.js';
import { logger } from '../../lib/logger.js';

const router = Router({ mergeParams: true });

export interface RelatedVariant {
  jobId: string;
  platform: string;
  status: string;
  sourceJobId: string | null;
  isCurrent: boolean;
  isRoot: boolean;
}

function jobSourceId(job: MemoryJob | AssembledJob | { sourceJobId?: string | null }): string | null {
  return typeof job.sourceJobId === 'string' ? job.sourceJobId : null;
}

/**
 * Walk sourceJobId up to the original Create/Repurpose job, then BFS every
 * Adapt descendant. Used by GET /related and by multiply (reuse existing
 * sibling for the same platform instead of spawning a duplicate).
 */
export async function collectRelatedVariants(
  startJob: MemoryJob | AssembledJob,
  userId: string,
  res: Response,
): Promise<{ rootJobId: string; variants: RelatedVariant[] } | null> {
  const visitedUp = new Set<string>([startJob.id]);
  let root: MemoryJob | AssembledJob = startJob;
  let nextUp = jobSourceId(startJob);

  for (let depth = 0; depth < 5 && nextUp; depth++) {
    if (visitedUp.has(nextUp)) break;
    visitedUp.add(nextUp);
    // SECURITY: ownership on every hop — never follow a forged sourceJobId
    // into another user's job (404, same as any :jobId route).
    const ancestor = await requireJobOwnership(nextUp, userId, res);
    if (!ancestor) return null;
    root = ancestor;
    nextUp = jobSourceId(ancestor);
  }

  const byId = new Map<string, RelatedVariant>();
  const add = (id: string, platform: string, status: string, sourceJobId: string | null): void => {
    const prev = byId.get(id);
    if (prev) return;
    byId.set(id, {
      jobId: id,
      platform,
      status,
      sourceJobId,
      isCurrent: id === startJob.id,
      isRoot: id === root.id,
    });
  };

  add(root.id, root.platform, root.status, jobSourceId(root));

  // BFS descendants via source_job_id (Adapt trees are shallow — typically 1–3 hops).
  if (db) {
    try {
      let frontier = [root.id];
      for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
        const children = await db
          .select({
            id: contentJobs.id,
            platform: contentJobs.platform,
            status: contentJobs.status,
            sourceJobId: contentJobs.sourceJobId,
          })
          .from(contentJobs)
          .where(
            and(
              eq(contentJobs.userId, userId),
              eq(contentJobs.deleted, 0),
              inArray(contentJobs.sourceJobId, frontier),
            ),
          );

        const nextFrontier: string[] = [];
        for (const child of children) {
          if (byId.has(child.id)) continue;
          add(child.id, child.platform, child.status, child.sourceJobId);
          nextFrontier.push(child.id);
        }
        frontier = nextFrontier;
      }
    } catch (err: unknown) {
      logger.error('collectRelatedVariants DB walk failed', {
        rootId: root.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Include the start job even if it was only in memory and not yet under root
  // in the DB (in-flight Adapt) — ownership already confirmed.
  add(startJob.id, startJob.platform, startJob.status, jobSourceId(startJob));

  return { rootJobId: root.id, variants: Array.from(byId.values()) };
}

/** Prefer a done sibling for `platform`; otherwise the newest row for that platform. */
export function pickVariantForPlatform(
  variants: RelatedVariant[],
  platform: string,
  excludeJobId?: string,
): RelatedVariant | undefined {
  const matches = variants
    .filter((v) => v.platform === platform && v.jobId !== excludeJobId)
    .sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return -1;
      if (b.status === 'done' && a.status !== 'done') return 1;
      return 0;
    });
  return matches[0];
}

// GET /:jobId/related — Adapt family for Content Multiplier Open links
router.get('/:jobId/related', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.dbUserId || req.userId || 'demo';

    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    const family = await collectRelatedVariants(job, userId, res);
    if (res.headersSent) return;
    if (!family) {
      return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
    }

    return res.json({
      rootJobId: family.rootJobId,
      currentJobId: jobId,
      variants: family.variants,
    });
  } catch (error: unknown) {
    console.error('Failed to load related jobs:', error);
    Sentry.captureException(error, { tags: { route: 'GET /:jobId/related' } });
    return res.status(500).json({
      error: 'Failed to load related jobs',
      code: 'SERVER_ERROR',
      retryable: true,
    });
  }
});

export default router;
