import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { setJobInStore, getJobFromStore, jobsMemory } from '../../lib/jobStore.js';
import { db } from '../../db/index.js';
import { contentJobs, contentOutputs } from '../../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { requireJobOwnership, requireAuthUserId, toClientJob } from './ownership.js';
import { isValidUUID } from '../../lib/uuid.js';
import type { MemoryJob } from '../../lib/jobStore.js';
import {
  parseBody,
  patchContentSchema,
  parseContentForPlatform,
  tagJobSchema,
  setCarouselTemplateSchema,
} from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';
import { cancelPublishJob } from '../../lib/publishQueue.js';
import { cancelContentJob } from '../../lib/queue.js';
import { readOutputs, sanitizeContentDeep } from '../content/shared.js';
import { getLatestQualityScore } from '../../lib/qualityScore.js';
import { isJobInFlightStatus } from '../../lib/jobInFlight.js';
import { clearJobStageThrottle } from '../../lib/persistJob.js';
import {
  softDeleteJobWithCleanup,
  PublishInProgressError,
} from '../../lib/jobSoftDelete.js';

const router = Router({ mergeParams: true });

// WHY: a shared cache-aside helper: the "DB write first, jobsMemory only on confirmed
// success" invariant is repeated at 3 call sites (DELETE /:jobId, PATCH /:jobId/tag,
// PATCH /:jobId/content). Extracting it here enforces the ordering via function
// signature instead of duplicated comments, preventing future edits from
// accidentally reordering writes and reintroducing the Neon cold-start-stall bug.
type Database = NonNullable<typeof db>;

async function updateJobWithCacheAside(
  jobId: string,
  dbUpdate: (database: Database) => Promise<void>,
  memoryUpdate: (job: MemoryJob) => void
): Promise<void> {
  if (db) {
    await dbUpdate(db);
  }

  // WHY: check jobStore too, not just jobsMemory: the BullMQ worker keeps its
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
// WHY: a dedicated slim endpoint instead of reusing GET /:jobId: the pollers only read
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
    // WHY: same 404 as requireJobOwnership — a non-UUID must not reach Postgres (22P02 → 503).
    if (!isValidUUID(jobId)) {
      return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
    }
    const userId = requireAuthUserId(req, res);
    if (!userId) return;

    // In-memory path first (in-flight or recently-finished) — cheap, no content columns.
    const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
    if (memJob) {
      if (memJob.userId !== userId || memJob.deleted === 1) {
        return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
      }
      const memOutputs = readOutputs(memJob);
      const score = getLatestQualityScore(memOutputs) ?? undefined;
      const memUpdatedAt = typeof memJob.updatedAt === 'string' && memJob.updatedAt
        ? memJob.updatedAt
        : undefined;
      return res.json({
        id: jobId,
        status: memJob.status,
        stage: memJob.stage,
        progress: typeof memJob.progress === 'number' ? memJob.progress : (memJob.status === 'done' ? 100 : 0),
        hasFinal: memOutputs.some((o) => o.outputType === 'final'),
        score,
        topic: memJob.topic,
        // WHY: Result poll ages "lost" from last activity, not createdAt (reload mid-regen).
        ...(memUpdatedAt ? { updatedAt: memUpdatedAt } : {}),
      });
    }

    // Memory miss — fall back to DB with a SELECT that excludes the heavy content jsonb.
    if (db) {
      try {
        const ownedCols = await db.query.contentJobs.findFirst({
          where: (j, { eq: jeq, and: jand }) =>
            jand(jeq(j.id, jobId), jeq(j.userId, userId), jeq(j.deleted, 0)),
          columns: { status: true, topic: true, updatedAt: true },
        });
        if (!ownedCols) {
          return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
        }
        // WHY: load final+critique scalars and run getLatestQualityScore — same
        // prefer-final-else-latest-critique contract as Result / Library (CORR-004).
        // A critique-only ORDER BY missed final.qualityScore after critic retries.
        const scoreRows = await db.query.contentOutputs.findMany({
          where: (o, { eq: jeq, and: jand, inArray: jin }) =>
            jand(jeq(o.jobId, jobId), jin(o.outputType, ['final', 'critique'])),
          orderBy: (o, { asc }) => [asc(o.createdAt)],
          columns: { outputType: true, qualityScore: true },
        });
        return res.json({
          id: jobId,
          status: ownedCols.status,
          stage: ownedCols.status,
          progress: ownedCols.status === 'done' ? 100 : 0,
          hasFinal: scoreRows.some((o) => o.outputType === 'final'),
          score: getLatestQualityScore(scoreRows) ?? undefined,
          topic: ownedCols.topic,
          updatedAt: ownedCols.updatedAt.toISOString(),
        });
      } catch (dbErr: unknown) {
        // WHY (B-M2): DB error is not a miss — retryable 503, not a permanent 404.
        logger.warn('[DB] GET /:jobId/status lookup failed', {
          jobId,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          code: 'DB_UNAVAILABLE',
          retryable: true,
        });
      }
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
    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;
    // SECURITY: strip source article / competitor prompt context (toClientJob).
    return res.json(toClientJob(job));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch job', code: 'SERVER_ERROR', retryable: true });
  }
});

// DELETE /:jobId
router.delete('/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    // WHY: one transaction so a cleanup failure rolls back the soft-delete.
    // Otherwise the API returned success while calendar rows and folder
    // memberships stayed behind. Redis cancels run after commit — a queue
    // remove cannot join the Postgres transaction.
    // WHY: 409 while publishing — see softDeleteJobWithCleanup.
    let publishIds: string[] = [];
    try {
      await updateJobWithCacheAside(
        jobId,
        async () => {
          publishIds = await softDeleteJobWithCleanup(jobId, userId);
        },
        (memJob) => { memJob.deleted = 1; },
      );
      // WHY: soft-delete ends mid-pipeline stage heartbeats — drop throttle so a
      // later recreate/regenerate of the same id (unlikely) starts clean.
      clearJobStageThrottle(jobId);
    } catch (dbErr) {
      if (dbErr instanceof PublishInProgressError) {
        return res.status(409).json({
          error: 'This post is being published right now — try again shortly',
          code: 'PUBLISH_IN_PROGRESS',
          retryable: true,
        });
      }
      logger.error('[DB] DELETE job failed', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
      Sentry.captureException(dbErr, { tags: { route: 'DELETE /:jobId', action: 'db-write' } });
      return res.status(500).json({ error: 'Failed to delete job — please try again', code: 'DB_WRITE_FAILED', retryable: true });
    }

    // COST: cancel waiting content-generation jobs so soft-delete stops spend.
    // Active jobs still abort via isSoftDeleted. Failure is logged only —
    // the durable row is already consistent.
    await cancelContentJob(jobId).catch((err: unknown) => {
      logger.warn('[Queue] cancelContentJob after delete failed', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    const cancelResults = await Promise.allSettled(publishIds.map((id) => cancelPublishJob(id)));
    for (let i = 0; i < cancelResults.length; i += 1) {
      const result = cancelResults[i];
      if (result?.status === 'rejected') {
        logger.warn('[Queue] cancelPublishJob after delete failed', {
          jobId,
          scheduledPostId: publishIds[i],
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
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
    const userId = requireAuthUserId(req, res);
    if (!userId) return;

    // WHY: 404 on mismatch instead of 403 — prevents enumeration of other users' job IDs
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    // WHY: cache-aside: enforced by updateJobWithCacheAside helper — DB write first,
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
    const userId = requireAuthUserId(req, res);
    if (!userId) return;

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
    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    // WHY: also block researching|writing|formatting|critiquing — updateJobStageInDb
    // writes those mid-pipeline; pending|processing alone missed live DB rows (R2).
    if (isJobInFlightStatus(job.status)) {
      return res.status(409).json({
        error: 'Job is still generating — try again when it finishes',
        code: 'JOB_IN_PROGRESS',
        retryable: true,
      });
    }

    const shaped = parseContentForPlatform(job.platform, body.content);
    if (!shaped.ok) {
      return res.status(400).json({
        error: shaped.error,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
    }

    // SECURITY: sanitize before either write path so the DB and in-memory
    // copies never diverge on which one saw the raw, unsanitized value —
    // see sanitizeContentDeep's own comment above for why this needs to walk
    // the whole structure rather than just the top-level-string case.
    const content = sanitizeContentDeep(shaped.content);

    // WHY: atomic terminal guard — regenerate claims done|failed→pending; a
    // TOCTOU edit after that check would silently lose to persistJob wipe.
    // UPDATE…RETURNING only matches still-terminal rows, then writes outputs.
    try {
      await updateJobWithCacheAside(
        jobId,
        async (database) => database.transaction(async (tx) => {
          const terminal = await tx.update(contentJobs)
            .set({ updatedAt: new Date() })
            .where(and(
              eq(contentJobs.id, jobId),
              eq(contentJobs.userId, userId),
              inArray(contentJobs.status, ['done', 'failed']),
              eq(contentJobs.deleted, 0),
            ))
            .returning({ id: contentJobs.id });
          if (terminal.length === 0) {
            throw new Error('JOB_IN_PROGRESS');
          }
          const existing = await tx.select({ id: contentOutputs.id })
            .from(contentOutputs)
            .where(and(eq(contentOutputs.jobId, jobId), eq(contentOutputs.outputType, 'final')))
            .limit(1);
          if (existing.length > 0 && existing[0]) {
            await tx.update(contentOutputs)
              .set({ content })
              .where(eq(contentOutputs.id, existing[0].id));
          } else {
            // WHY: insert-if-missing (mirror versions.ts restore) — a terminal
            // job with no final row used to return success with zero writes.
            await tx.insert(contentOutputs).values({
              jobId,
              agentName: 'writer',
              outputType: 'final',
              content,
            });
          }
        }),
        (memJob) => {
          if (isJobInFlightStatus(memJob.status)) return;
          const memOutputs = readOutputs(memJob);
          const finalOutput = memOutputs.find((o) => o.outputType === 'final');
          if (finalOutput) {
            finalOutput.content = content;
          } else if ('outputs' in memJob) {
            // WHY: push rather than skip — mirrors DB insert-if-missing above.
            // `'outputs' in` narrows MemoryJob to PersistedJobResult.
            memJob.outputs = [
              ...memOutputs,
              { agentName: 'writer', outputType: 'final', content },
            ];
          }
        },
      );
    } catch (dbErr) {
      if (dbErr instanceof Error && dbErr.message === 'JOB_IN_PROGRESS') {
        return res.status(409).json({
          error: 'Job is still generating — try again when it finishes',
          code: 'JOB_IN_PROGRESS',
          retryable: true,
        });
      }
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
