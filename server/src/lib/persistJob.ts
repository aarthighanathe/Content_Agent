import * as Sentry from '@sentry/node';
import { db } from '../db/index.js';
import { contentJobs, contentOutputs, agentLogs } from '../db/schema.js';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { logger } from './logger.js';
import { sseManager } from './sse.js';
import type { PersistedJobResult, PipelineOutput } from './pipeline.js';
import { VALID_PLATFORMS, VALID_TONES } from '../schemas/jobs.js';
import { isValidUUID } from './uuid.js';

// WHY 15 min (REL-001): a healthy pipeline with 3 critic retries is usually
// under ~10 min. The old 1h default left crashed pending rows invisible to
// Result's 404-based "lost" detector for the whole hour. 15 min is above the
// slow-path ceiling and below "stuck forever" UX.
export const STALE_IN_FLIGHT_MAX_AGE_MS = 15 * 60 * 1000;
const STALE_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

// WHY narrow here, not trust the caller: PipelineJob.platform/tone are plain
// `string`/`string | undefined` (the pipeline never re-derives the zod-narrowed
// literal type after createJobSchema validates it in routes/jobs/create.ts),
// but contentJobs.platform/tone are DB enum columns with a fixed literal union.
// A mismatched value here would previously insert silently (masked by
// `jobResult: any`) or, now that it's typed, fail the whole transaction on a
// TS overload-resolution error instead of a clear runtime message — this
// guard makes an unexpected value a loud, specific failure instead of either.
// WHY exported: routes/jobs/regenerate.ts needs the identical predicate to
// validate a source job's tone before reusing it for a new pipeline run
// (STALE_JOB_DATA guard) — importing this keeps both call sites in lockstep
// instead of maintaining two separate `includes()` literals.
export function isValidPlatform(p: string): p is (typeof VALID_PLATFORMS)[number] {
  return (VALID_PLATFORMS as readonly string[]).includes(p);
}
export function isValidTone(t: string): t is (typeof VALID_TONES)[number] {
  return (VALID_TONES as readonly string[]).includes(t);
}

// WHY a type guard, not a plain filter callback: narrowing here lets the
// .map() below assign o.outputType directly into the insert without a cast.
// WHY 'prediction' now included (2026-08-04): PerformancePredictor's output
// was previously discarded before this point — the DB's outputTypeEnum only
// had 4 values. The Dashboard "surface PerformancePredictor output" feature
// needs prediction rows durably stored so stats can aggregate across all of
// a user's jobs. See schema.ts's outputTypeEnum for the matching DB change.
type DBOutputType = 'research' | 'draft' | 'critique' | 'final' | 'prediction';
function isDBOutputType(o: PipelineOutput): o is PipelineOutput & { outputType: DBOutputType } {
  return o.outputType === 'research' || o.outputType === 'draft' || o.outputType === 'critique' || o.outputType === 'final' || o.outputType === 'prediction';
}

/**
 * Insert a durable `pending` row at job create time (CORR-001) so a mid-run
 * crash/redeploy leaves a Library-visible row instead of a permanent 404.
 * Best-effort — create still returns 201 if this fails (memory+SSE keep working).
 */
export async function insertPendingJobRow(job: {
  id: string;
  userId: string;
  topic: string;
  platform: string;
  tone?: string;
  targetAudience?: string;
  tag?: string | null;
  sourceJobId?: string | null;
  sourcePlatform?: string | null;
  sourceCompetitorAnalysisId?: string | null;
  sourceUrl?: string | null;
  templateId?: string | null;
  paletteId?: string | null;
}): Promise<boolean> {
  if (!db || !isValidUUID(job.userId)) return false;
  const tone = job.tone ?? '';
  if (!isValidPlatform(job.platform) || !isValidTone(tone) || !job.targetAudience) {
    return false;
  }
  try {
    await db.insert(contentJobs).values({
      id: job.id,
      userId: job.userId,
      topic: job.topic,
      platform: job.platform,
      tone,
      targetAudience: job.targetAudience,
      tag: job.tag || null,
      sourceJobId: job.sourceJobId || null,
      sourcePlatform:
        job.sourcePlatform && isValidPlatform(job.sourcePlatform)
          ? job.sourcePlatform
          : null,
      sourceCompetitorAnalysisId:
        job.sourceCompetitorAnalysisId && isValidUUID(job.sourceCompetitorAnalysisId)
          ? job.sourceCompetitorAnalysisId
          : null,
      sourceUrl: job.sourceUrl || null,
      templateId: job.templateId || null,
      paletteId: job.paletteId || null,
      status: 'pending',
      retryCount: 0,
      deleted: 0,
    }).onConflictDoNothing();
    return true;
  } catch (err: unknown) {
    logger.warn('[DB] Failed to insert pending job row', {
      jobId: job.id,
      error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, { tags: { jobId: job.id, action: 'insertPendingJob' } });
    return false;
  }
}

/** Mark non-terminal jobs failed (worker exhausted / startup stale sweep). */
export async function markJobFailedIfInFlight(
  jobId: string,
  reason: string,
): Promise<boolean> {
  if (!db || !isValidUUID(jobId)) return false;
  try {
    const updated = await db.update(contentJobs)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(and(
        eq(contentJobs.id, jobId),
        inArray(contentJobs.status, [
          'pending',
          'researching',
          'writing',
          'formatting',
          'critiquing',
        ]),
      ))
      .returning({ id: contentJobs.id });
    if (updated.length > 0) {
      logger.warn('[DB] Marked in-flight job failed', { jobId, reason: reason.slice(0, 200) });
      return true;
    }
    return false;
  } catch (err: unknown) {
    logger.warn('[DB] Failed to mark in-flight job failed', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Fail pending/in-flight jobs older than `maxAgeMs` and emit terminal SSE so
 * Result clients exit the loading state (REL-001).
 */
export async function sweepStaleInFlightJobs(
  maxAgeMs = STALE_IN_FLIGHT_MAX_AGE_MS,
): Promise<number> {
  if (!db) return 0;
  try {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const updated = await db.update(contentJobs)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(and(
        inArray(contentJobs.status, [
          'pending',
          'researching',
          'writing',
          'formatting',
          'critiquing',
        ]),
        lt(contentJobs.updatedAt, cutoff),
      ))
      .returning({ id: contentJobs.id });
    if (updated.length > 0) {
      logger.warn('[DB] Swept stale in-flight jobs', { count: updated.length });
      for (const row of updated) {
        sseManager.sendEvent(row.id, {
          type: 'progress',
          stage: 'failed',
          progress: 0,
          agent: 'system',
          message: 'Content generation timed out. Please try again or start a new job.',
        });
      }
    }
    return updated.length;
  } catch (err: unknown) {
    logger.warn('[DB] Stale in-flight sweep failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

let staleSweepTimer: ReturnType<typeof setInterval> | null = null;

/** Periodic + immediate sweep from the web process (covers no-Redis / direct mode). */
export function startStaleJobSweep(): void {
  if (staleSweepTimer) return;
  sweepStaleInFlightJobs().catch((err: unknown) => {
    logger.warn('Initial stale in-flight job sweep failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
  staleSweepTimer = setInterval(() => {
    sweepStaleInFlightJobs().catch((err: unknown) => {
      logger.warn('Periodic stale in-flight job sweep failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, STALE_SWEEP_INTERVAL_MS);
  staleSweepTimer.unref?.();
}

export function stopStaleJobSweep(): void {
  if (staleSweepTimer) {
    clearInterval(staleSweepTimer);
    staleSweepTimer = null;
  }
}

export async function persistJobToDB(jobResult: PersistedJobResult): Promise<void> {
  if (!db || !isValidUUID(jobResult.userId)) return;
  const { platform, targetAudience } = jobResult;
  const tone = jobResult.tone ?? '';
  if (!isValidPlatform(platform) || !isValidTone(tone) || !targetAudience) {
    const error = new Error(`Invalid platform/tone/targetAudience: platform=${platform}, tone=${tone}, hasTargetAudience=${!!targetAudience}`);
    logger.error('[DB] Refusing to persist job with invalid platform/tone/targetAudience', {
      jobId: jobResult.id, platform, tone: jobResult.tone, hasTargetAudience: !!targetAudience,
    });
    throw error;
  }
  try {
    // WHY: wrap all writes in a Drizzle transaction so partial failure (e.g.
    // the INSERT after a successful DELETE) rolls back atomically instead of
    // leaving orphaned data. This is the project's own rule for multi-table writes.
    await db.transaction(async (tx) => {
      await tx.insert(contentJobs)
        .values({
          id: jobResult.id,
          userId: jobResult.userId,
          topic: jobResult.topic,
          platform,
          tone,
          targetAudience,
          tag: jobResult.tag || null,
          // WHY carried through here: sourceJobId/sourcePlatform are set on the
          // in-memory job by POST /:jobId/multiply (manage.ts) but were previously
          // dropped on DB persist, so a multiplied job's origin badge went blank
          // once it aged out of memory (FUNCTIONAL_AUDIT_2026-07.md finding #11).
          sourceJobId: jobResult.sourceJobId || null,
          sourcePlatform:
            jobResult.sourcePlatform && isValidPlatform(jobResult.sourcePlatform)
              ? jobResult.sourcePlatform
              : null,
          // WHY carried through here (C3): same lineage-metadata pattern as
          // sourceJobId/sourcePlatform above — set on the in-memory job by
          // routes/jobs/create.ts when created from a Competitor.tsx CTA, and
          // must survive to the DB row or the "based on competitor analysis"
          // badge would go blank once the job ages out of memory, same class
          // of bug FUNCTIONAL_AUDIT_2026-07.md finding #11 fixed for sourceJobId.
          sourceCompetitorAnalysisId:
            jobResult.sourceCompetitorAnalysisId && isValidUUID(jobResult.sourceCompetitorAnalysisId)
              ? jobResult.sourceCompetitorAnalysisId
              : null,
          // WHY carried through here: same lineage-metadata pattern as
          // sourceJobId/sourceCompetitorAnalysisId above — set on the
          // in-memory job by routes/content/repurpose.ts, previously dropped
          // on DB persist, same class of bug FUNCTIONAL_AUDIT_2026-07.md
          // finding #11 fixed for sourceJobId.
          sourceUrl: jobResult.sourceUrl || null,
          // WHY carried through here: same lineage/display-metadata pattern as
          // sourceJobId/sourceUrl above — set on the in-memory job by
          // routes/jobs/create.ts from the client's template-system selection
          // (client/src/lib/templateSystem.ts), must survive to the DB row so
          // the Result page preview and PNG export can both render the exact
          // template a carousel was created with.
          templateId: jobResult.templateId || null,
          paletteId: jobResult.paletteId || null,
          status: jobResult.status,
          retryCount: jobResult.retryCount || 0,
          deleted: jobResult.deleted || 0,
        })
        .onConflictDoUpdate({
          target: contentJobs.id,
          set: {
            status: jobResult.status,
            retryCount: jobResult.retryCount || 0,
            // WHY only write display/lineage fields when the snapshot has them:
            // always writing `|| null` cleared a Library tag or template PATCH
            // made mid-run, because the worker's jobData is the queue payload
            // from create time — not the patched memory row.
            ...(jobResult.templateId ? { templateId: jobResult.templateId } : {}),
            ...(jobResult.paletteId ? { paletteId: jobResult.paletteId } : {}),
            ...(jobResult.sourceUrl ? { sourceUrl: jobResult.sourceUrl } : {}),
            ...(jobResult.sourceJobId ? { sourceJobId: jobResult.sourceJobId } : {}),
            ...(jobResult.sourcePlatform && isValidPlatform(jobResult.sourcePlatform)
              ? { sourcePlatform: jobResult.sourcePlatform }
              : {}),
            ...(jobResult.sourceCompetitorAnalysisId
              && isValidUUID(jobResult.sourceCompetitorAnalysisId)
              ? { sourceCompetitorAnalysisId: jobResult.sourceCompetitorAnalysisId }
              : {}),
            ...(jobResult.tag ? { tag: jobResult.tag } : {}),
            updatedAt: new Date(),
          },
        });

      // WHY skip output wipe on empty failed: regenerate's failure path used to
      // delete the previous final from content_outputs while only a version
      // snapshot (best-effort) remained — leaving Library/Result with nothing
      // to show after a mid-regen LLM error. Status still flips to failed.
      const outputsToInsert: Array<PipelineOutput & { outputType: DBOutputType }> =
        Array.from(jobResult.outputs).filter(isDBOutputType);
      const preservePriorOutputs =
        jobResult.status === 'failed' && outputsToInsert.length === 0;

      if (!preservePriorOutputs) {
        await tx.delete(contentOutputs).where(eq(contentOutputs.jobId, jobResult.id));
        await tx.delete(agentLogs).where(eq(agentLogs.jobId, jobResult.id));

        // WHY the Array.from: jobResult.outputs is typed PipelineOutput[] | []
        // (the union of the 'done' and 'failed' PersistedJobResult arms) — TS's
        // Array.prototype.filter does not apply its type-guard overload across a
        // union-typed receiver like that, silently falling back to the plain
        // boolean-predicate overload and losing the narrowing entirely. Copying
        // through Array.from first collapses the receiver to a single
        // PipelineOutput[], so .filter(isDBOutputType) narrows as expected.
        if (outputsToInsert.length > 0) {
          await tx.insert(contentOutputs).values(
            outputsToInsert.map((o) => ({
              jobId: jobResult.id,
              agentName: o.agentName,
              outputType: o.outputType,
              content: o.content,
              qualityScore: o.qualityScore ?? null,
              partial: o.partial ? 1 : 0,
            }))
          );
        }

        if (jobResult.logs && jobResult.logs.length > 0) {
          await tx.insert(agentLogs).values(
            jobResult.logs.map((l) => ({
              jobId: jobResult.id,
              agentName: l.agentName,
              action: l.action,
              inputSummary: l.inputSummary || null,
              outputSummary: l.outputSummary || null,
              durationMs: l.durationMs || 0,
            }))
          );
        }
      }
    });

    logger.info('[DB] Job persisted', { jobId: jobResult.id, status: jobResult.status });
  } catch (err) {
    console.error('[DB] Failed to persist job:', err);
    Sentry.captureException(err, { tags: { jobId: jobResult.id, action: 'persistJob' } });
    // WHY rethrow: callers used to treat a swallowed DB error as success —
    // runAndPersistPipeline emitted "Content generation complete!", then
    // evicted the only in-memory copy after 10 minutes, leaving a permanent
    // 404. The success path retries inline and keeps memory without eviction;
    // the failed path still needs the throw so its own catch can log.
    throw err;
  }
}
