import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../middleware/auth.js';
import { sseManager } from '../../lib/sse.js';
import { setJobInStore } from '../../workers/contentWorker.js';
import { addJobToQueue } from '../../lib/queue.js';
import { getUserProfile } from '../users.js';
import { db } from '../../db/index.js';
import { contentJobs, contentOutputs, scheduledPosts, jobOutputVersions } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { jobsMemory, requireJobOwnership } from './ownership.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import { runPipelineDirect } from './create.js';
import { runAndPersistPipeline } from '../../lib/pipeline.js';
import type { ResearchResult } from '../../agents/researcher.js';
import type { OrchestratorResult } from '../../agents/orchestrator.js';
import { parseBody, regenerateJobSchema, multiplyJobSchema, patchContentSchema, tagJobSchema, setCarouselTemplateSchema } from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';
import { readOutputs, sanitizeContentDeep } from '../content/shared.js';

const router = Router({ mergeParams: true });

// WHY a shared cache-aside helper: the "DB write first, jobsMemory only on confirmed
// success" invariant is repeated at 3 call sites (DELETE /:jobId, PATCH /:jobId/tag,
// PATCH /:jobId/content). Extracting it here enforces the ordering via function
// signature instead of duplicated comments, preventing future edits from
// accidentally reordering writes and reintroducing the Neon cold-start-stall bug.
async function updateJobWithCacheAside(
  jobId: string,
  dbUpdate: (db: any) => Promise<void>,
  memoryUpdate: (job: PipelineJob) => void
): Promise<void> {
  if (db) {
    await dbUpdate(db);
  }

  const memJob = jobsMemory.get(jobId);
  if (memJob) {
    memoryUpdate(memJob);
    jobsMemory.set(jobId, memJob);
    setJobInStore(jobId, memJob);
  }
}

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

// POST /:jobId/regenerate
router.post('/:jobId/regenerate', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(regenerateJobSchema, req.body, res);
    if (!body) return;
    const { feedback } = body;
    const userId = req.dbUserId || req.userId || 'demo';

    const existingJob = await requireJobOwnership(jobId, userId, res);
    if (!existingJob) return;

    // WHY snapshot here, not in persistJobToDB: persistJobToDB unconditionally
    // deletes+re-inserts contentOutputs on every persist (every job
    // completion, not just regenerates) — changing that shared path is a much
    // larger blast radius than needed just to keep regenerate history. This is
    // the one call site that actually destroys a previous result the user
    // might want back, so the snapshot lives here, immediately before the
    // in-memory job (and eventually its DB row) gets overwritten by the new run.
    // WHY best-effort, not blocking regenerate on failure: losing the ability
    // to look back at a previous version is worse UX than blocking a
    // regeneration the user explicitly asked for — same "don't fail the whole
    // request over a non-critical side write" stance as the scheduled_posts
    // cleanup in DELETE /:jobId above.
    if (db) {
      const existingOutputs = readOutputs(existingJob);
      const finalOutput = existingOutputs.find((o) => o.outputType === 'final');
      if (finalOutput) {
        const critique = existingOutputs.find((o) => o.outputType === 'critique');
        const score = typeof critique?.qualityScore === 'number' ? critique.qualityScore : null;
        try {
          await db.insert(jobOutputVersions).values({
            jobId,
            content: finalOutput.content,
            qualityScore: score,
            label: feedback ? `Before regenerate: ${feedback.slice(0, 80)}` : 'Before regenerate',
          });
        } catch (dbErr) {
          logger.error('[DB] Failed to snapshot version before regenerate', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
          Sentry.captureException(dbErr, { tags: { route: 'POST /:jobId/regenerate', action: 'version-snapshot' } });
        }
      }
    }

    const regenProfile = await getUserProfile(userId);
    // WHY no outputs/logs/criticResult here: those only exist on the terminal
    // PersistedJobResult shape (status 'done'|'failed'); a fresh regenerate is
    // PipelineJob-shaped with status 'pending' — nothing reads those fields
    // until runAndPersistPipeline replaces this Map entry with the real result.
    const job: PipelineJob = {
      id: jobId, userId, topic: existingJob.topic, platform: existingJob.platform,
      tone: existingJob.tone ?? undefined, targetAudience: existingJob.targetAudience ?? undefined,
      brandVoice: regenProfile.brandVoice || existingJob.brandVoice || 'professional',
      phrasesUse: regenProfile.phrasesUse || existingJob.phrasesUse || '',
      phrasesAvoid: regenProfile.phrasesAvoid || existingJob.phrasesAvoid || '',
      contentDna: regenProfile.contentDna || existingJob.contentDna || null,
      status: 'pending', retryCount: 0,
      createdAt: typeof existingJob.createdAt === 'string' ? existingJob.createdAt : existingJob.createdAt?.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    jobsMemory.set(jobId, job);
    setJobInStore(jobId, job);

    sseManager.sendEvent(jobId, { type: 'progress', stage: 'planning', progress: 2, agent: 'system', message: 'Regeneration started…' });

    const queued = await addJobToQueue(jobId, { ...job, initialFeedback: feedback });
    if (!queued) {
      // WHY .catch(): guards against unhandled rejection if acquirePipelineSlot()
      // or the pipeline throws before its internal try/finally captures the error
      // (matches the multiply handler's pattern below and create.ts's own WHY comment).
      runPipelineDirect(jobId, { ...job, initialFeedback: feedback }).catch((err: unknown) => {
        logger.error('Regenerate pipeline failed', { jobId, error: err instanceof Error ? err.message : String(err) });
      });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to regenerate' });
  }
});

// POST /:jobId/multiply — adapt content to another platform using cached research
router.post('/:jobId/multiply', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(multiplyJobSchema, req.body, res);
    if (!body) return;
    const { targetPlatform } = body;
    const userId = req.dbUserId || req.userId || 'demo';

    const sourceJob = await requireJobOwnership(jobId, userId, res);
    if (!sourceJob) return;

    const sourceOutputs = readOutputs(sourceJob);
    const cachedResearch = sourceOutputs.find((o) => o.agentName === 'researcher' && o.outputType === 'research')
      ?.content as ResearchResult | undefined;
    const cachedOrchestrator = sourceOutputs.find((o) => o.agentName === 'orchestrator')
      ?.content as OrchestratorResult | undefined;

    if (!cachedResearch) {
      return res.status(400).json({ error: 'No cached research found on source job' });
    }

    const newJobId = uuidv4();
    const userProfile = await getUserProfile(userId);
    const newJob: PipelineJob = {
      id: newJobId, userId, topic: sourceJob.topic, platform: targetPlatform,
      tone: sourceJob.tone ?? undefined, targetAudience: sourceJob.targetAudience ?? undefined,
      brandVoice: userProfile.brandVoice || sourceJob.brandVoice || 'professional',
      phrasesUse: userProfile.phrasesUse || sourceJob.phrasesUse || '',
      phrasesAvoid: userProfile.phrasesAvoid || sourceJob.phrasesAvoid || '',
      contentDna: userProfile.contentDna || sourceJob.contentDna || null,
      sourceJobId: jobId, sourcePlatform: sourceJob.platform,
      status: 'pending', retryCount: 0, deleted: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    jobsMemory.set(newJobId, newJob);

    // FLOW: Content Multiplier skips orchestrator+researcher — it reuses the
    // source job's cached research/task-plan/platform-rules and starts
    // runContentPipeline directly at the Writer stage (see pipeline.ts's
    // `skipResearch` option). runAndPersistPipeline still owns the retry
    // loop, isSoftDeleted() guard, progress emission, and predictor stage, so
    // multiply can no longer drift from the canonical pipeline.
    // WHY .catch(): fire-and-forget background run — the 201 response below
    // returns immediately so the client can subscribe to SSE; errors inside
    // are already caught, persisted, and SSE'd by runAndPersistPipeline
    // itself, so this only guards against an unhandled rejection escaping
    // (matches routes/jobs/create.ts's runPipelineDirect fire-and-forget
    // pattern).
    runAndPersistPipeline(
      newJob,
      (stage, progress, agent, message, durationMs) => {
        const current = jobsMemory.get(newJobId);
        if (current) { current.status = stage === 'done' ? 'done' : 'processing'; current.stage = stage; current.progress = progress; jobsMemory.set(newJobId, current); }
        sseManager.sendEvent(newJobId, { type: 'progress', stage, progress, agent, message, durationMs });
      },
      {
        set: (id, data) => { jobsMemory.set(id, data); setJobInStore(id, data); },
        evict: (id) => { jobsMemory.delete(id); setJobInStore(id, undefined); },
      },
      {
        skipResearch: {
          researchResult: cachedResearch,
          taskPlan: cachedOrchestrator?.taskPlan || `Create engaging ${targetPlatform.replace(/_/g, ' ')} content about: ${sourceJob.topic}`,
          platformRules: cachedOrchestrator?.platformRules || {},
        },
      },
    ).catch((err: unknown) => {
      logger.error('Multiply pipeline failed', { jobId: newJobId, error: err instanceof Error ? err.message : String(err) });
    });

    return res.status(201).json({ jobId: newJobId });
  } catch (error: unknown) {
    console.error('Failed to multiply job:', error);
    Sentry.captureException(error, { tags: { route: 'POST /:jobId/multiply' } });
    return res.status(500).json({ error: 'Failed to multiply content' });
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
    return res.status(500).json({ error: 'Failed to update tag', code: 'SERVER_ERROR', retryable: false });
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
    return res.status(500).json({ error: 'Failed to update template', code: 'SERVER_ERROR', retryable: false });
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
    return res.status(500).json({ error: 'Failed to update content' });
  }
});

export default router;
