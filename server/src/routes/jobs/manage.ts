import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { setJobInStore, getJobFromStore } from '../../workers/contentWorker.js';
import { db } from '../../db/index.js';
import { contentJobs, contentOutputs, scheduledPosts } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { jobsMemory, requireJobOwnership } from './ownership.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import { parseBody, patchContentSchema, tagJobSchema, setCarouselTemplateSchema } from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';
import { readOutputs, sanitizeContentDeep } from '../content/shared.js';

const router = Router({ mergeParams: true });

// WHY a shared cache-aside helper: the "DB write first, jobsMemory only on confirmed
// success" invariant is repeated at 3 call sites (DELETE /:jobId, PATCH /:jobId/tag,
// PATCH /:jobId/content). Extracting it here enforces the ordering via function
// signature instead of duplicated comments, preventing future edits from
// accidentally reordering writes and reintroducing the Neon cold-start-stall bug.
type Database = NonNullable<typeof db>;

async function updateJobWithCacheAside(
  jobId: string,
  dbUpdate: (database: Database) => Promise<void>,
  memoryUpdate: (job: PipelineJob) => void
): Promise<void> {
  if (db) {
    await dbUpdate(db);
  }

  // WHY check jobStore too, not just jobsMemory: the BullMQ worker keeps its
  // own in-memory copy (jobStore, via getJobFromStore/setJobInStore) separate
  // from the direct-pipeline-fallback jobsMemory Map — an in-flight job
  // running through the queue lives in jobStore, not jobsMemory. Missing this
  // meant DELETE/PATCH here could write the DB successfully but silently miss
  // updating the in-memory copy a client is actively polling, until the
  // 10-minute eviction TTL passed. Matches versions.ts's restore-route
  // pattern (and this file's own GET /:jobId/status handler) exactly.
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  if (memJob) {
    memoryUpdate(memJob);
    jobsMemory.set(jobId, memJob);
    setJobInStore(jobId, memJob);
  }
}

// GET /:jobId/status — lightweight status for pollers (Batch poll, Content Multiplier).
// WHY a dedicated slim endpoint instead of reusing GET /:jobId: the pollers only read
// status/progress/hasFinal/score/topic, but GET /:jobId returns every contentOutputs row
// including the full `content` JSON (research report, entire carousel slide array). With
// several jobs polling every 2.5s, that re-downloaded megabytes of unchanged payload per
// tick — the single largest network waste found in the perf audit. This endpoint selects
// only the scalar columns the pollers actually consume.
// SECURITY: same 404-not-403 ownership semantics as requireJobOwnership — never confirm a
// jobId exists for another user.
router.get('/:jobId/status', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.dbUserId || req.userId || 'demo';

    // In-memory path first (in-flight or recently-finished) — cheap, no content columns.
    const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
    if (memJob) {
      if (memJob.userId !== userId || memJob.deleted === 1) {
        return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
      }
      const memOutputs = readOutputs(memJob);
      const crit = memOutputs.find((o) => o.outputType === 'critique');
      const score = typeof crit?.qualityScore === 'number' ? crit.qualityScore : undefined;
      return res.json({
        id: jobId,
        status: memJob.status,
        stage: memJob.stage,
        progress: typeof memJob.progress === 'number' ? memJob.progress : (memJob.status === 'done' ? 100 : 0),
        hasFinal: memOutputs.some((o) => o.outputType === 'final'),
        score,
        topic: memJob.topic,
      });
    }

    // Memory miss — fall back to DB with a SELECT that excludes the heavy content jsonb.
    if (db) {
      try {
        const ownedCols = await db.query.contentJobs.findFirst({
          where: (j, { eq: jeq, and: jand }) =>
            jand(jeq(j.id, jobId), jeq(j.userId, userId), jeq(j.deleted, 0)),
          columns: { status: true, topic: true },
        });
        if (!ownedCols) {
          return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
        }
        const hasFinal = await db.query.contentOutputs.findFirst({
          where: (o, { eq: jeq, and: jand }) => jand(jeq(o.jobId, jobId), jeq(o.outputType, 'final')),
          columns: { id: true },
        });
        const lastCrit = await db.query.contentOutputs.findFirst({
          where: (o, { eq: jeq, and: jand }) => jand(jeq(o.jobId, jobId), jeq(o.outputType, 'critique')),
          orderBy: (o, { desc }) => [desc(o.createdAt)],
          columns: { qualityScore: true },
        });
        return res.json({
          id: jobId,
          status: ownedCols.status,
          stage: ownedCols.status,
          progress: ownedCols.status === 'done' ? 100 : 0,
          hasFinal: !!hasFinal,
          score: typeof lastCrit?.qualityScore === 'number' ? lastCrit.qualityScore : undefined,
          topic: ownedCols.topic,
        });
      } catch { /* fall through to 404 */ }
    }

    return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
  } catch (error) {
    logger.error('[DB] GET /:jobId/status failed', { jobId: req.params.jobId, error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: 'Failed to fetch job status', code: 'SERVER_ERROR', retryable: true });
  }
});

// GET /:jobId
router.get('/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.dbUserId || req.userId || 'demo';
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;
    return res.json(job);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch job', code: 'SERVER_ERROR', retryable: true });
  }
});

// DELETE /:jobId
router.delete('/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.dbUserId || req.userId || 'demo';
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    // WHY cache-aside (DB write first, jobsMemory updated only on confirmed
    // success): enforced by updateJobWithCacheAside helper — see that function's
    // WHY comment for the full rationale (Neon cold-start-stall bug).
    try {
      await updateJobWithCacheAside(
        jobId,
        async (db) => {
          await db.update(contentJobs).set({ deleted: 1 })
            .where(and(eq(contentJobs.id, jobId), eq(contentJobs.userId, userId)));
        },
        (memJob) => { memJob.deleted = 1; },
      );
    } catch (dbErr) {
      logger.error('[DB] DELETE job failed', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
      Sentry.captureException(dbErr, { tags: { route: 'DELETE /:jobId', action: 'db-write' } });
      return res.status(500).json({ error: 'Failed to delete job — please try again', code: 'DB_WRITE_FAILED', retryable: true });
    }

    // WHY best-effort, not part of the same failure path above: a job is
    // already soft-deleted at this point (the DB write above succeeded) —
    // an orphaned scheduled_posts row is a display-only annoyance (Calendar
    // already tolerates it, filtering client-side), not corruption worth
    // failing the whole delete request over. Logged so a persistent
    // failure here is still visible, without blocking the user's delete.
    if (db) {
      try {
        await db.delete(scheduledPosts)
          .where(and(eq(scheduledPosts.jobId, jobId), eq(scheduledPosts.userId, userId)));
      } catch (dbErr) {
        logger.error('[DB] Failed to clean up scheduled_posts on job delete', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
        Sentry.captureException(dbErr, { tags: { route: 'DELETE /:jobId', action: 'scheduled-posts-cleanup' } });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete job', code: 'SERVER_ERROR', retryable: true });
  }
});

// PATCH /:jobId/tag — attach a short label to a job
router.patch('/:jobId/tag', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(tagJobSchema, req.body, res);
    if (!body) return;
    const { tag } = body;
    const userId = req.dbUserId || req.userId || 'demo';

    // WHY: 404 on mismatch instead of 403 — prevents enumeration of other users' job IDs
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    // WHY cache-aside: enforced by updateJobWithCacheAside helper — DB write first,
    // jobsMemory only updated once the write is confirmed durable.
    try {
      await updateJobWithCacheAside(
        jobId,
        async (db) => {
          // SECURITY: filter by both jobId and userId — defense-in-depth beyond the ownership check
          await db.update(contentJobs)
            .set({ tag })
            .where(and(eq(contentJobs.id, jobId), eq(contentJobs.userId, userId)));
        },
        (memJob) => { memJob.tag = tag; },
      );
    } catch (dbErr) {
      logger.error('[DB] PATCH tag failed', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
      Sentry.captureException(dbErr, { tags: { route: 'PATCH /:jobId/tag', action: 'db-write' } });
      return res.status(500).json({ error: 'Failed to update tag — please try again', code: 'DB_WRITE_FAILED', retryable: true });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update tag', code: 'SERVER_ERROR', retryable: true });
  }
});

// PATCH /:jobId/carousel-template — switch a carousel's template/palette after
// generation (CAROUSEL_TEMPLATE_PLAN.md §2.3). Content is unchanged — this only
// updates presentational metadata so Result.tsx's preview and future PNG
// exports pick up the new choice, and it survives a page reload.
router.patch('/:jobId/carousel-template', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(setCarouselTemplateSchema, req.body, res);
    if (!body) return;
    const { templateId, paletteId } = body;
    const userId = req.dbUserId || req.userId || 'demo';

    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;
    if (job.platform !== 'instagram_carousel') {
      return res.status(400).json({ error: 'Not a carousel job', code: 'INVALID_PLATFORM', retryable: false });
    }

    try {
      await updateJobWithCacheAside(
        jobId,
        async (db) => {
          // SECURITY: filter by both jobId and userId — defense-in-depth beyond the ownership check
          await db.update(contentJobs)
            .set({ templateId, paletteId: paletteId ?? null })
            .where(and(eq(contentJobs.id, jobId), eq(contentJobs.userId, userId)));
        },
        (memJob) => { memJob.templateId = templateId; memJob.paletteId = paletteId ?? null; },
      );
    } catch (dbErr) {
      logger.error('[DB] PATCH carousel-template failed', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
      Sentry.captureException(dbErr, { tags: { route: 'PATCH /:jobId/carousel-template', action: 'db-write' } });
      return res.status(500).json({ error: 'Failed to update template — please try again', code: 'DB_WRITE_FAILED', retryable: true });
    }

    return res.json({ success: true, templateId, paletteId: paletteId ?? null });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update template', code: 'SERVER_ERROR', retryable: true });
  }
});

// PATCH /:jobId/content
router.patch('/:jobId/content', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(patchContentSchema, req.body, res);
    if (!body) return;
    const userId = req.dbUserId || req.userId || 'demo';
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    // SECURITY: sanitize before either write path so the DB and in-memory
    // copies never diverge on which one saw the raw, unsanitized value —
    // see sanitizeContentDeep's own comment above for why this needs to walk
    // the whole structure rather than just the top-level-string case.
    const content = sanitizeContentDeep(body.content);

    // WHY cache-aside: enforced by updateJobWithCacheAside helper — DB write first,
    // jobsMemory only mutated once the write is confirmed durable. A missing DB row
    // here (existing.length === 0) means the job's final output hasn't been
    // persisted yet (still in-flight — see lib/persistJob.ts), not a failure, so
    // it's not gated the same as a thrown error: the in-memory copy is still the
    // correct place to apply the edit in that case.
    try {
      await updateJobWithCacheAside(
        jobId,
        async (db) => {
          const existing = await db.select({ id: contentOutputs.id })
            .from(contentOutputs)
            .where(and(eq(contentOutputs.jobId, jobId), eq(contentOutputs.outputType, 'final')))
            .limit(1);
          if (existing.length > 0) {
            await db.update(contentOutputs).set({ content }).where(eq(contentOutputs.id, existing[0].id));
          }
        },
        (memJob) => {
          const finalOutput = readOutputs(memJob).find((o) => o.outputType === 'final');
          if (finalOutput) { finalOutput.content = content; }
        },
      );
    } catch (dbErr) {
      logger.error('[DB] PATCH content failed', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
      Sentry.captureException(dbErr, { tags: { route: 'PATCH /:jobId/content', action: 'db-write' } });
      return res.status(500).json({ error: 'Failed to save changes — please try again', code: 'DB_WRITE_FAILED', retryable: true });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update content', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
