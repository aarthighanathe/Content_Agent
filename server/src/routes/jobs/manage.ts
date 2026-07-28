import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../middleware/auth.js';
import { sseManager } from '../../lib/sse.js';
import { getJobFromStore, setJobInStore } from '../../workers/contentWorker.js';
import { addJobToQueue } from '../../lib/queue.js';
import { userProfiles } from '../users.js';
import { db } from '../../db/index.js';
import { contentJobs, contentOutputs } from '../../db/schema.js';
import { eq, and, sql, ilike, desc, asc } from 'drizzle-orm';
import { jobsMemory, requireJobOwnership, assembleJobFromDB, isValidUUID } from './ownership.js';
import { runPipelineDirect } from './create.js';
import { runAndPersistPipeline } from '../../lib/pipeline.js';
import { parseBody, regenerateJobSchema, multiplyJobSchema, patchContentSchema, tagJobSchema, VALID_PLATFORMS } from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';

const router = Router({ mergeParams: true });

// WHY these two: FUNCTIONAL_AUDIT_2026-07.md finding #4 — Library.tsx's search box,
// platform pills, and sort dropdown previously only filtered/sorted whatever page of
// jobs happened to already be loaded (10 rows), silently missing everything on other
// pages. `search`/`platform` now run as real WHERE clauses in the DB query below;
// `sort` is applied DB-side for date/platform. `sort=score` is the one exception —
// quality score lives on a joined contentOutputs row, not a contentJobs column, so
// sorting by it across the *entire* library would require a heavier aggregate query.
// It's applied in-memory to whatever page was fetched, same as before this fix —
// still an accepted, narrower limitation than search/filter, and documented as such
// in Library.tsx's own comment at the sort-menu callsite.
type JobSortKey = 'date' | 'score' | 'platform';

// GET / — paginated, searchable, filterable, sortable job list
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const userId = req.dbUserId || req.userId || 'demo';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 500) : '';
    const platformFilter = typeof req.query.platform === 'string' && (VALID_PLATFORMS as readonly string[]).includes(req.query.platform)
      ? req.query.platform
      : undefined;
    const sort: JobSortKey = req.query.sort === 'score' || req.query.sort === 'platform' ? req.query.sort : 'date';

    if (db && isValidUUID(userId)) {
      try {
        const whereClauses = [eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0)];
        if (search) whereClauses.push(ilike(contentJobs.topic, `%${search}%`));
        if (platformFilter) whereClauses.push(eq(contentJobs.platform, platformFilter as (typeof VALID_PLATFORMS)[number]));
        const whereClause = and(...whereClauses);

        const [{ total: totalCount }] = await db
          .select({ total: sql<number>`cast(count(*) as int)` })
          .from(contentJobs)
          .where(whereClause);

        // WHY a separate grouped query, ignoring platformFilter: this backs the
        // toolbar's per-platform pill badges (e.g. "LinkedIn 23"), which need the
        // true count for every platform regardless of which one is currently
        // selected — computing counts from only the already-platform-filtered
        // page would make every pill except the active one always read 0.
        const countWhereClauses = [eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0)];
        if (search) countWhereClauses.push(ilike(contentJobs.topic, `%${search}%`));
        const platformCountRows = await db
          .select({ platform: contentJobs.platform, count: sql<number>`cast(count(*) as int)` })
          .from(contentJobs)
          .where(and(...countWhereClauses))
          .groupBy(contentJobs.platform);
        const platformCounts: Record<string, number> = {};
        for (const row of platformCountRows) platformCounts[row.platform] = row.count;

        const dbJobs = await db.query.contentJobs.findMany({
          where: whereClause,
          orderBy: sort === 'platform' ? [asc(contentJobs.platform), desc(contentJobs.createdAt)] : [desc(contentJobs.createdAt)],
          offset: (page - 1) * limit,
          limit,
          with: { outputs: { columns: { agentName: true, outputType: true, qualityScore: true, partial: true } } },
        });

        const assembledDbJobs = dbJobs.map(assembleJobFromDB);

        let finalJobs: any[] = assembledDbJobs;
        let finalTotal = totalCount;
        // WHY page===1 only, and only when no search/filter is active: in-flight
        // memory-only jobs (not yet persisted) have no DB row to match a WHERE
        // clause against, so folding them into a filtered/searched result would be
        // inconsistent — they'd appear regardless of whether they actually match.
        // They still show up in the default (no search/filter) page-1 view, same
        // as before this fix.
        if (page === 1 && !search && !platformFilter) {
          const runningMemJobs = Array.from(jobsMemory.values()).filter(
            (j) =>
              j.userId === userId && j.deleted !== 1 &&
              j.status !== 'done' && j.status !== 'failed' &&
              !assembledDbJobs.find((d: any) => d.id === j.id),
          );
          if (runningMemJobs.length > 0) {
            finalJobs = [...runningMemJobs, ...assembledDbJobs];
            finalTotal += runningMemJobs.length;
          }
        }

        if (sort === 'score') {
          finalJobs = [...finalJobs].sort((a, b) => getJobScore(b) - getJobScore(a));
        }

        return res.json({ jobs: finalJobs, total: finalTotal, page, totalPages: Math.ceil(finalTotal / limit), platformCounts });
      } catch (dbErr) {
        console.error('[DB] GET /jobs failed, falling back to memory:', dbErr);
      }
    }

    let allJobs = Array.from(jobsMemory.values()).filter((j) => j.deleted !== 1 && j.userId === userId);
    if (search) {
      const needle = search.toLowerCase();
      allJobs = allJobs.filter((j) => (j.topic || '').toLowerCase().includes(needle));
    }
    const memPlatformCounts: Record<string, number> = {};
    for (const j of allJobs) memPlatformCounts[j.platform] = (memPlatformCounts[j.platform] || 0) + 1;
    if (platformFilter) {
      allJobs = allJobs.filter((j) => j.platform === platformFilter);
    }
    if (sort === 'platform') {
      allJobs = allJobs.sort((a, b) => a.platform.localeCompare(b.platform) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'score') {
      allJobs = allJobs.sort((a, b) => getJobScore(b) - getJobScore(a));
    } else {
      allJobs = allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const total = allJobs.length;
    const jobs = allJobs.slice((page - 1) * limit, page * limit);
    return res.json({ jobs, total, page, totalPages: Math.ceil(total / limit), platformCounts: memPlatformCounts });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch jobs', code: 'SERVER_ERROR', retryable: true });
  }
});

function getJobScore(job: any): number {
  const critique = (job.outputs || []).find((o: any) => o.outputType === 'critique');
  if (!critique) return -1;
  if (typeof critique.qualityScore === 'number' && critique.qualityScore > 0) return critique.qualityScore;
  const c = critique.content;
  if (c !== null && typeof c === 'object' && 'totalScore' in c && typeof c.totalScore === 'number') return c.totalScore;
  return -1;
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

    const memJob = jobsMemory.get(jobId);
    if (memJob) { memJob.deleted = 1; jobsMemory.set(jobId, memJob); }
    if (db) {
      try {
        await db.update(contentJobs).set({ deleted: 1 })
          .where(and(eq(contentJobs.id, jobId), eq(contentJobs.userId, userId)));
      } catch (dbErr) {
        console.error('[DB] DELETE job failed:', dbErr);
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

    const regenProfile = userProfiles.get(userId) || {};
    const job = {
      id: jobId, userId, topic: existingJob.topic, platform: existingJob.platform,
      tone: existingJob.tone, targetAudience: existingJob.targetAudience,
      brandVoice: regenProfile.brandVoice || existingJob.brandVoice || 'professional',
      phrasesUse: regenProfile.phrasesUse || existingJob.phrasesUse || '',
      phrasesAvoid: regenProfile.phrasesAvoid || existingJob.phrasesAvoid || '',
      contentDna: regenProfile.contentDna || existingJob.contentDna || null,
      status: 'pending', retryCount: 0, outputs: [], logs: [], criticResult: null,
      createdAt: existingJob.createdAt, updatedAt: new Date().toISOString(),
    };

    jobsMemory.set(jobId, job);
    setJobInStore(jobId, job);

    sseManager.sendEvent(jobId, { type: 'progress', stage: 'planning', progress: 2, agent: 'system', message: 'Regeneration started…' });

    const queued = await addJobToQueue(jobId, { ...job, initialFeedback: feedback });
    if (!queued) {
      runPipelineDirect(jobId, { ...job, initialFeedback: feedback });
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

    const cachedResearch = sourceJob.outputs?.find((o: any) => o.agentName === 'researcher' && o.outputType === 'research')?.content;
    const cachedOrchestrator = sourceJob.outputs?.find((o: any) => o.agentName === 'orchestrator')?.content;

    if (!cachedResearch) {
      return res.status(400).json({ error: 'No cached research found on source job' });
    }

    const newJobId = uuidv4();
    const userProfile = userProfiles.get(userId) || {};
    const newJob = {
      id: newJobId, userId, topic: sourceJob.topic, platform: targetPlatform,
      tone: sourceJob.tone, targetAudience: sourceJob.targetAudience,
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
  } catch (error: any) {
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

    const memJob = jobsMemory.get(jobId);
    if (memJob) { memJob.tag = tag; jobsMemory.set(jobId, memJob); }

    if (db) {
      try {
        // SECURITY: filter by both jobId and userId — defense-in-depth beyond the ownership check
        await db.update(contentJobs)
          .set({ tag })
          .where(and(eq(contentJobs.id, jobId), eq(contentJobs.userId, userId)));
      } catch (dbErr) {
        console.error('[DB] PATCH tag failed:', dbErr);
      }
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update tag', code: 'SERVER_ERROR', retryable: false });
  }
});

// PATCH /:jobId/content
router.patch('/:jobId/content', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const body = parseBody(patchContentSchema, req.body, res);
    if (!body) return;
    const { content } = body;
    const userId = req.dbUserId || req.userId || 'demo';
    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    const memJob = jobsMemory.get(jobId) || getJobFromStore(jobId);
    if (memJob) {
      const finalOutput = memJob.outputs?.find((o: any) => o.outputType === 'final');
      if (finalOutput) { finalOutput.content = content; jobsMemory.set(jobId, memJob); setJobInStore(jobId, memJob); }
    }

    if (db) {
      try {
        const existing = await db.select({ id: contentOutputs.id })
          .from(contentOutputs)
          .where(and(eq(contentOutputs.jobId, jobId), eq(contentOutputs.outputType, 'final')))
          .limit(1);
        if (existing.length > 0) {
          await db.update(contentOutputs).set({ content }).where(eq(contentOutputs.id, existing[0].id));
        }
      } catch (dbErr) {
        console.error('[DB] PATCH content failed:', dbErr);
      }
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update content' });
  }
});

export default router;
