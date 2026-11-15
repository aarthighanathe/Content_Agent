// WHY: a separate sub-router, not inline in manage.ts: extracted 2026-08-10 to
// keep manage.ts under the 400-line split threshold — same "split when it
// grows, mirror the routes/jobs/ sub-router pattern" convention as
// render.ts/stream.ts/insights.ts/versions.ts. manage.ts already went through
// this once (list.ts/versions.ts were extracted from it previously) and
// regrew past the cap; these two handlers were the heaviest remaining ones.
import * as Sentry from '@sentry/node';
import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { sseManager } from '../../lib/sse.js';
import { addJobToQueueDetailed } from '../../lib/queue.js';
import { getUserProfile } from '../users.js';
import { db } from '../../db/index.js';
import { jobOutputVersions } from '../../db/schema.js';
import { requireJobOwnership, lookupOwnedJob, setJobInStore, getJobFromStore, jobsMemory, requireAuthUserId } from './ownership.js';
import type { AssembledJob, MemoryJob } from './ownership.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import { runPipelineDirect } from './create.js';
import type { ResearchResult } from '../../agents/researcher.js';
import type { OrchestratorResult } from '../../agents/orchestrator.js';
import { z } from 'zod';
import { parseBody, regenerateJobSchema, multiplyJobSchema } from '../../schemas/index.js';
import { authJobRateLimit } from '../../middleware/rateLimit.js';
import { isValidTone } from '../../lib/persistJob.js';
import { cancelJobEviction } from '../../lib/jobEviction.js';
import { logger } from '../../lib/logger.js';
import { readOutputs } from '../content/shared.js';
import { getLatestQualityScore } from '../../lib/qualityScore.js';
import { claimJobForRegenerate, releaseRegenerateClaim } from '../../lib/regenerateClaim.js';
import { createMultiplyAdaptJob } from './multiplyAdapt.js';
import { pruneOldVersions } from './versions.js';

function isMemoryInProgress(jobId: string): boolean {
  const mem = getJobFromStore(jobId) || jobsMemory.get(jobId);
  if (!mem) return false;
  const status = mem.status;
  return status === 'pending' || status === 'processing'
    || status === 'researching' || status === 'writing'
    || status === 'formatting' || status === 'critiquing';
}

const router = Router({ mergeParams: true });

function applyGenerationRateLimit(req: AuthRequest, res: Response, next: NextFunction): void {
  const [failClosed, limiter] = authJobRateLimit;
  failClosed(req, res, (err?: unknown) => {
    if (err) return next(err);
    limiter(req, res, next);
  });
}

// WHY: shared by both /regenerate and /multiply: both carry a source job's
// tone/targetAudience straight into a fresh pipeline run with no schema
// re-check (the request-body schemas only validate their own new fields). A
// legacy row whose tone predates a VALID_TONES vocabulary change, or a null
// targetAudience from some other historical edge case, would otherwise run an
// entire 5-agent pipeline only to fail at persistJobToDB's own validation —
// wasting Gemini/Tavily quota and losing the result (see pipeline.ts's
// runAndPersistPipeline catch-block handling). Reuses persistJob.ts's
// isValidTone so this predicate can't drift from the one persistJobToDB
// itself enforces.
function hasStaleJobData(job: { tone?: string | null; targetAudience?: string | null }): boolean {
  return !job.tone || !isValidTone(job.tone) || !job.targetAudience;
}

const cachedResearchSchema = z.object({
  trendingAngles: z.array(z.string()),
  keyFacts: z.array(z.string()),
  suggestedHashtags: z.array(z.string()),
  competitorHooks: z.array(z.string()),
  sourceUrls: z.array(z.string()),
  // WHY: rawResults omitted from schema — historical rows may carry unsanitized
  // Tavily hits; we never rehydrate them (see parseCachedResearch).
});

interface CachedResearchBundle {
  research: ResearchResult;
  orchestrator: OrchestratorResult | undefined;
}

function parseCachedResearch(raw: unknown): ResearchResult | undefined {
  const parsed = cachedResearchSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  // WHY: always empty — same as contentJobPayload.parseSkipResearch. Pass-1
  // cleared new research, but Adapt still reads old DB rows; copying those
  // rawResults would re-persist unsanitized Tavily via skipResearch.
  return { ...parsed.data, rawResults: [] };
}

function isOrchestratorResult(value: unknown): value is OrchestratorResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.taskPlan === 'string' && typeof v.platformRules === 'object';
}

function readCachedFromOutputs(outputs: ReturnType<typeof readOutputs>): CachedResearchBundle | null {
  const research = parseCachedResearch(
    outputs.find((o) => o.agentName === 'researcher' && o.outputType === 'research')?.content,
  );
  if (!research) return null;
  const orchRaw = outputs.find((o) => o.agentName === 'orchestrator')?.content;
  return {
    research,
    orchestrator: isOrchestratorResult(orchRaw) ? orchRaw : undefined,
  };
}

function jobSourceId(job: MemoryJob | AssembledJob): string | null {
  return typeof job.sourceJobId === 'string' ? job.sourceJobId : null;
}

// WHY: walk sourceJobId: Adapt (multiply) jobs skip orchestrator+researcher and
// used to persist no research row — multiplying from an adapted LinkedIn/Twitter
// job then failed with "No cached research". Follow the lineage back to the
// original Create/Repurpose job that still has the researcher output (cap the
// walk so a corrupt cycle can't hang the request).
async function loadCachedResearchBundle(
  startJob: MemoryJob | AssembledJob,
  userId: string,
  _res: Response,
): Promise<CachedResearchBundle | null> {
  const visited = new Set<string>([startJob.id]);
  let outputs = readOutputs(startJob);
  let nextSourceId = jobSourceId(startJob);

  for (let depth = 0; depth < 5; depth++) {
    const found = readCachedFromOutputs(outputs);
    if (found) return found;
    if (!nextSourceId || visited.has(nextSourceId)) break;
    visited.add(nextSourceId);
    // SECURITY: never read another user's research via a forged sourceJobId
    // chain. WHY lookupOwnedJob: a deleted parent must stop the walk, not
    // 404 the Adapt child the user still owns (multiply would then look
    // like "Job not found" for a live LinkedIn sibling).
    const ancestor = await lookupOwnedJob(nextSourceId, userId);
    if (!ancestor) break;
    outputs = readOutputs(ancestor);
    nextSourceId = jobSourceId(ancestor);
  }
  return null;
}

function regenerateContextFields(
  job: MemoryJob | AssembledJob,
): { sourceMaterial?: string; competitorContext?: string } {
  const rec = job as unknown as Record<string, unknown>;
  const out: { sourceMaterial?: string; competitorContext?: string } = {};
  if (typeof rec.sourceMaterial === 'string' && rec.sourceMaterial) {
    out.sourceMaterial = rec.sourceMaterial.slice(0, 6000);
  }
  if (typeof rec.competitorContext === 'string' && rec.competitorContext) {
    out.competitorContext = rec.competitorContext.slice(0, 2000);
  }
  return out;
}

async function snapshotBeforeRegenerate(
  jobId: string,
  userId: string,
  existingJob: MemoryJob | AssembledJob,
  feedback: string | undefined,
): Promise<void> {
  if (!db) return;
  const existingOutputs = readOutputs(existingJob);
  const finalOutput = existingOutputs.find((o) => o.outputType === 'final');
  if (!finalOutput) return;
  // WHY: .find() took the first critique — retries append worse/older cards
  // first; prefer final.qualityScore / latest matching critique (CORR-004).
  const score = getLatestQualityScore(existingOutputs);
  try {
    await db.insert(jobOutputVersions).values({
      jobId,
      content: finalOutput.content,
      qualityScore: score,
      label: feedback ? `Before regenerate: ${feedback.slice(0, 80)}` : 'Before regenerate',
    });
    // WHY: prune is best-effort (swallows its own errors) so history stays bounded.
    await pruneOldVersions(jobId);
  } catch (dbErr) {
    logger.error('[DB] Failed to snapshot version before regenerate', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
    Sentry.captureException(dbErr, { tags: { route: 'POST /:jobId/regenerate', action: 'version-snapshot' } });
  }
}

// POST /:jobId/regenerate
router.post('/:jobId/regenerate', applyGenerationRateLimit, async (req: AuthRequest, res: Response) => {
  // WHY: claim may succeed then enqueue throw — catch must release pending claim
  // and restore jobsMemory (active-queue branch already does both).
  let claimedForRollback: {
    jobId: string;
    userId: string;
    priorStatus: 'done' | 'failed';
    priorMemory: MemoryJob;
  } | null = null;
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(regenerateJobSchema, req.body, res);
    if (!body) return;
    const { feedback } = body;
    const userId = requireAuthUserId(req, res);
    if (!userId) return;

    const existingJob = await requireJobOwnership(jobId, userId, res);
    if (!existingJob) return;

    if (hasStaleJobData(existingJob)) {
      return res.status(400).json({
        error: "This job's tone or audience data is no longer valid — please create a new job instead of regenerating.",
        code: 'STALE_JOB_DATA',
        retryable: false,
      });
    }

    const regenProfile = await getUserProfile(userId);
    // WHY: no outputs/logs/criticResult here: those only exist on the terminal
    // PersistedJobResult shape (status 'done'|'failed'); a fresh regenerate is
    // PipelineJob-shaped with status 'pending' — nothing reads those fields
    // until runAndPersistPipeline replaces this Map entry with the real result.
    // WHY: copy template/palette/source lineage: omitting them made Result fall
    // back to the legacy theme for 10 minutes (memory preferred over DB) and
    // a thin first insert permanently stored nulls on conflict.
    const job: PipelineJob = {
      id: jobId, userId, topic: existingJob.topic, platform: existingJob.platform,
      tone: existingJob.tone ?? undefined, targetAudience: existingJob.targetAudience ?? undefined,
      brandVoice: regenProfile.brandVoice || existingJob.brandVoice || 'professional',
      phrasesUse: regenProfile.phrasesUse || existingJob.phrasesUse || '',
      phrasesAvoid: regenProfile.phrasesAvoid || existingJob.phrasesAvoid || '',
      contentDna: regenProfile.contentDna || existingJob.contentDna || null,
      templateId: existingJob.templateId ?? null,
      paletteId: existingJob.paletteId ?? null,
      tag: existingJob.tag ?? null,
      sourceJobId: existingJob.sourceJobId ?? null,
      sourcePlatform: existingJob.sourcePlatform ?? undefined,
      sourceUrl: existingJob.sourceUrl ?? null,
      sourceCompetitorAnalysisId: existingJob.sourceCompetitorAnalysisId ?? null,
      // WHY: rehydrate durable create/repurpose context (memory copy, else DB column) —
      // omitting it regenerated Repurpose/Competitor-lens jobs without their source.
      // SECURITY: re-capped here; writer/orchestrator still XML-wrap both as data.
      ...regenerateContextFields(existingJob),
      status: 'pending', retryCount: 0,
      createdAt: typeof existingJob.createdAt === 'string' ? existingJob.createdAt : existingJob.createdAt?.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // WHY: memory check too (CORR-005): BullMQ 'active' only covers Redis mode —
    // no-Redis / Adapt direct pipelines never hit the queue and could start a
    // second run that wiped the in-flight UI.
    if (isMemoryInProgress(jobId)) {
      return res.status(409).json({
        error: 'This job is still generating — wait for it to finish before regenerating',
        code: 'JOB_IN_PROGRESS',
        retryable: true,
      });
    }

    // WHY: (R3): atomic claim before snapshot/wipe/enqueue — two concurrent
    // regenerates used to both pass TOCTOU checks, both wipe memory, and race
    // the pipeline. UPDATE…RETURNING claims only from terminal statuses.
    const claim = await claimJobForRegenerate(jobId, userId);
    if (claim === 'error') {
      Sentry.captureMessage('regenerate atomic claim failed', {
        tags: { route: 'POST /:jobId/regenerate', action: 'atomic-claim' },
        extra: { jobId, userId },
      });
      return res.status(500).json({
        error: 'Failed to regenerate',
        code: 'SERVER_ERROR',
        retryable: true,
      });
    }
    if (claim === 'no-db') {
      return res.status(503).json({
        error: 'Database unavailable — try again shortly',
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
    }
    if (claim === 'busy') {
      return res.status(409).json({
        error: 'This job is still generating — wait for it to finish before regenerating',
        code: 'JOB_IN_PROGRESS',
        retryable: true,
      });
    }

    const priorStatus = existingJob.status === 'failed' ? 'failed' : 'done';
    if (claim === 'claimed') {
      claimedForRollback = {
        jobId,
        userId,
        priorStatus,
        priorMemory: { ...existingJob, status: priorStatus } as MemoryJob,
      };
    }

    cancelJobEviction(jobId);
    setJobInStore(jobId, job);

    // WHY: enqueue after claim+memory wipe: addJobToQueueDetailed still returns
    // 'active' if a stale BullMQ lock remains — refuse a second pipeline then.
    const queueResult = await addJobToQueueDetailed(jobId, { ...job, initialFeedback: feedback });
    if (queueResult === 'active') {
      // WHY: claim + memory wipe already happened — without rollback the row
      // stays pending and Result shows a fake in-progress job until stale sweep.
      await releaseRegenerateClaim(jobId, userId, priorStatus);
      claimedForRollback = null;
      setJobInStore(jobId, { ...existingJob, status: priorStatus } as MemoryJob);
      return res.status(409).json({
        error: 'This job is still generating — wait for it to finish before regenerating',
        code: 'JOB_IN_PROGRESS',
        retryable: true,
      });
    }

    // WHY: after enqueue (or direct-mode handoff) never roll claim back to done —
    // a snapshot/SSE throw used to release pending while BullMQ still owned the
    // job, so the worker ran against a terminal row / wiped the regenerate.
    claimedForRollback = null;

    // WHY: snapshot only after enqueue succeeded: an 'active' 409 rollback used to leave a
    // spurious 'Before regenerate' version for a run that never started. Still safe — the
    // snapshot reads the pre-run `existingJob` captured above, and a queued worker only
    // overwrites contentOutputs at terminal persist; direct mode starts below.
    // WHY: not in persistJobToDB (it rewrites outputs on every persist — larger blast radius).
    // WHY: best-effort: losing history is better than blocking a user-requested regenerate.
    await snapshotBeforeRegenerate(jobId, userId, existingJob, feedback);

    sseManager.sendEvent(jobId, { type: 'progress', stage: 'planning', progress: 2, agent: 'system', message: 'Regeneration started…' });

    if (queueResult === 'unavailable') {
      // WHY: .catch(): guards against unhandled rejection if acquirePipelineSlot()
      // or the pipeline throws before its internal try/finally captures the error
      // (matches the multiply handler's pattern below and create.ts's own WHY comment).
      runPipelineDirect(jobId, { ...job, initialFeedback: feedback }).catch((err: unknown) => {
        logger.error('Regenerate pipeline failed', { jobId, error: err instanceof Error ? err.message : String(err) });
      });
    }
    return res.json({ success: true });
  } catch (error) {
    if (claimedForRollback) {
      await releaseRegenerateClaim(
        claimedForRollback.jobId,
        claimedForRollback.userId,
        claimedForRollback.priorStatus,
      ).catch(() => undefined);
      setJobInStore(claimedForRollback.jobId, claimedForRollback.priorMemory);
    }
    return res.status(500).json({ error: 'Failed to regenerate', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /:jobId/multiply — adapt content to another platform using cached research
router.post('/:jobId/multiply', applyGenerationRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(multiplyJobSchema, req.body, res);
    if (!body) return;
    const { targetPlatform } = body;
    const userId = requireAuthUserId(req, res);
    if (!userId) return;

    const sourceJob = await requireJobOwnership(jobId, userId, res);
    if (!sourceJob) return;

    if (hasStaleJobData(sourceJob)) {
      return res.status(400).json({
        error: "This job's tone or audience data is no longer valid — please create a new job instead of multiplying.",
        code: 'STALE_JOB_DATA',
        retryable: false,
      });
    }

    const cached = await loadCachedResearchBundle(sourceJob, userId, res);
    if (res.headersSent) return;
    if (!cached) {
      return res.status(400).json({
        error: 'No cached research found on source job',
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
    }
    const result = await createMultiplyAdaptJob({
      sourceJob,
      sourceJobId: jobId,
      userId,
      targetPlatform,
      cachedResearch: cached.research,
      res,
    });
    if (result.kind === 'headers_sent') return;
    if (result.kind === 'persist_failed') {
      return res.status(503).json({
        error: 'Could not save the new job — try again shortly',
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
    }
    if (result.kind === 'lock_unavailable' || result.kind === 'family_incomplete') {
      return res.status(503).json({
        error: 'Adapt is temporarily unavailable — try again shortly',
        code: 'SERVICE_UNAVAILABLE',
        retryable: true,
      });
    }
    if (result.kind === 'reused') {
      return res.status(200).json({ jobId: result.jobId, reused: true });
    }
    if (result.kind === 'in_progress') {
      return res.status(409).json({
        error: 'An Adapt job for this platform is already generating',
        code: 'JOB_IN_PROGRESS',
        retryable: true,
        ...(result.jobId ? { jobId: result.jobId } : {}),
      });
    }
    return res.status(201).json({ jobId: result.jobId });
  } catch (error: unknown) {
    console.error('Failed to multiply job:', error);
    Sentry.captureException(error, { tags: { route: 'POST /:jobId/multiply' } });
    return res.status(500).json({ error: 'Failed to multiply content', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
