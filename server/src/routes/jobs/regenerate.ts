// WHY a separate sub-router, not inline in manage.ts: extracted 2026-08-10 to
// keep manage.ts under the 400-line split threshold — same "split when it
// grows, mirror the routes/jobs/ sub-router pattern" convention as
// render.ts/stream.ts/insights.ts/versions.ts. manage.ts already went through
// this once (list.ts/versions.ts were extracted from it previously) and
// regrew past the cap; these two handlers were the heaviest remaining ones.
import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../middleware/auth.js';
import { sseManager } from '../../lib/sse.js';
import { setJobInStore } from '../../workers/contentWorker.js';
import { addJobToQueue } from '../../lib/queue.js';
import { getUserProfile } from '../users.js';
import { db } from '../../db/index.js';
import { jobOutputVersions } from '../../db/schema.js';
import { jobsMemory, requireJobOwnership } from './ownership.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import { runPipelineDirect } from './create.js';
import { runAndPersistPipeline } from '../../lib/pipeline.js';
import type { ResearchResult } from '../../agents/researcher.js';
import type { OrchestratorResult } from '../../agents/orchestrator.js';
import { parseBody, regenerateJobSchema, multiplyJobSchema } from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';
import { readOutputs } from '../content/shared.js';

const router = Router({ mergeParams: true });

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
    // cleanup in manage.ts's DELETE /:jobId.
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
    return res.status(500).json({ error: 'Failed to regenerate', code: 'SERVER_ERROR', retryable: true });
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
      return res.status(400).json({ error: 'No cached research found on source job', code: 'VALIDATION_ERROR', retryable: false });
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
    return res.status(500).json({ error: 'Failed to multiply content', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
