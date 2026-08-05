// WHY this route exists: implements FUTURE_FEATURES.md's Library "No
// collections/folders" item — jobs could already be tagged (a single
// free-text label per job, shipped 2026-08-04) but not grouped into named,
// persistent, many-to-many groupings a user creates and reuses. See
// db/schema.ts's WHY comment on the `collections`/`collectionJobs` tables for
// why this needed two new tables rather than reusing the tag column.
import { Router, Response, NextFunction } from 'express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { collections, collectionJobs, contentJobs } from '../db/schema.js';
import { requireJobOwnership } from './jobs/ownership.js';
import { parseBody, createCollectionSchema, addJobToCollectionSchema } from '../schemas/index.js';
import { isValidUUID } from '../lib/uuid.js';

const router = Router();

// WHY a shared guard, not inline checks per route: mirrors scheduledPosts.ts's
// requireDbUser — every route below needs both a reachable DB and a real UUID
// dbUserId (Clerk-only/demo users with no DB row can't own a foreign-key row
// in `collections`).
function requireDbUser(req: AuthRequest, res: Response): string | null {
  const userId = req.dbUserId;
  if (!db || !userId || !isValidUUID(userId)) {
    res.status(503).json({
      error: 'Collections require a database connection',
      code: 'DB_UNAVAILABLE',
      retryable: true,
    });
    return null;
  }
  return userId;
}

// GET /api/collections — list this user's collections with a job count each.
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const rows = await db!
      .select({
        id: collections.id,
        name: collections.name,
        createdAt: collections.createdAt,
        jobCount: sql<number>`cast(count(${collectionJobs.id}) as int)`,
      })
      .from(collections)
      .leftJoin(collectionJobs, eq(collectionJobs.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .groupBy(collections.id)
      .orderBy(collections.createdAt);

    res.json({ collections: rows });
    return;
  } catch (error) {
    next(error);
  }
});

// POST /api/collections — create a new named collection.
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const body = parseBody(createCollectionSchema, req.body, res);
    if (!body) return;

    const [row] = await db!
      .insert(collections)
      .values({ userId, name: body.name })
      .returning();

    res.status(201).json({ collection: { ...row, jobCount: 0 } });
    return;
  } catch (error) {
    next(error);
  }
});

// DELETE /api/collections/:id — delete a collection and its memberships.
// SECURITY: scoped by userId — a user can't delete another user's collection
// by guessing/observing its id.
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const collectionId = req.params.id as string;
    if (!isValidUUID(collectionId)) {
      res.status(400).json({ error: 'Invalid collection id', code: 'VALIDATION_ERROR', retryable: false });
      return;
    }

    const owned = await db!
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: 'Collection not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    // WHY delete memberships first: collection_jobs.collection_id has no
    // ON DELETE CASCADE (this schema declares FKs with no action throughout,
    // e.g. scheduled_posts → content_jobs), so an orphaned membership row
    // would otherwise be left behind.
    await db!.delete(collectionJobs).where(eq(collectionJobs.collectionId, collectionId));
    await db!.delete(collections).where(eq(collections.id, collectionId));

    res.json({ success: true });
    return;
  } catch (error) {
    next(error);
  }
});

// GET /api/collections/:id/jobs — list the jobs in a collection, same
// lightweight row shape as GET /api/jobs (topic/platform/status/score/tag/
// lineage), so the client can render them with the existing Library row UI.
router.get('/:id/jobs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const collectionId = req.params.id as string;
    if (!isValidUUID(collectionId)) {
      res.status(400).json({ error: 'Invalid collection id', code: 'VALIDATION_ERROR', retryable: false });
      return;
    }

    const owned = await db!
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: 'Collection not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    const memberships = await db!
      .select({ jobId: collectionJobs.jobId })
      .from(collectionJobs)
      .where(eq(collectionJobs.collectionId, collectionId));
    const jobIds = memberships.map((m) => m.jobId);

    if (jobIds.length === 0) {
      res.json({ jobs: [] });
      return;
    }

    const dbJobs = await db!.query.contentJobs.findMany({
      where: and(inArray(contentJobs.id, jobIds), eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0)),
      orderBy: (j, { desc }) => [desc(j.createdAt)],
      with: { outputs: { columns: { agentName: true, outputType: true, qualityScore: true, partial: true } } },
    });

    res.json({ jobs: dbJobs });
    return;
  } catch (error) {
    next(error);
  }
});

// POST /api/collections/:id/jobs — add a job to a collection.
router.post('/:id/jobs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const collectionId = req.params.id as string;
    if (!isValidUUID(collectionId)) {
      res.status(400).json({ error: 'Invalid collection id', code: 'VALIDATION_ERROR', retryable: false });
      return;
    }

    const body = parseBody(addJobToCollectionSchema, req.body, res);
    if (!body) return;

    const owned = await db!
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: 'Collection not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    // SECURITY: a user must own the job they're adding — requireJobOwnership
    // returns 404 (not 403) on mismatch to avoid confirming the job exists.
    const ownership = await requireJobOwnership(body.jobId, userId, res);
    if (!ownership) return;

    // WHY onConflictDoNothing: adding an already-present job is a no-op, not
    // an error — the unique index on (collectionId, jobId) is the DB-level
    // enforcement of that invariant.
    await db!
      .insert(collectionJobs)
      .values({ collectionId, jobId: body.jobId })
      .onConflictDoNothing();

    res.status(201).json({ success: true });
    return;
  } catch (error) {
    next(error);
  }
});

// DELETE /api/collections/:id/jobs/:jobId — remove a job from a collection.
router.delete('/:id/jobs/:jobId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = requireDbUser(req, res);
    if (!userId) return;

    const collectionId = req.params.id as string;
    const jobId = req.params.jobId as string;
    if (!isValidUUID(collectionId) || !isValidUUID(jobId)) {
      res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR', retryable: false });
      return;
    }

    const owned = await db!
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .limit(1);
    if (owned.length === 0) {
      res.status(404).json({ error: 'Collection not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    await db!
      .delete(collectionJobs)
      .where(and(eq(collectionJobs.collectionId, collectionId), eq(collectionJobs.jobId, jobId)));

    res.json({ success: true });
    return;
  } catch (error) {
    next(error);
  }
});

export default router;
