import * as Sentry from '@sentry/node';
import { db } from '../db/index.js';
import { contentJobs, contentOutputs, agentLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from './logger.js';
import type { PersistedJobResult, PipelineOutput } from './pipeline.js';
import { VALID_PLATFORMS, VALID_TONES } from '../schemas/jobs.js';
import { isValidUUID } from './uuid.js';

// WHY narrow here, not trust the caller: PipelineJob.platform/tone are plain
// `string`/`string | undefined` (the pipeline never re-derives the zod-narrowed
// literal type after createJobSchema validates it in routes/jobs/create.ts),
// but contentJobs.platform/tone are DB enum columns with a fixed literal union.
// A mismatched value here would previously insert silently (masked by
// `jobResult: any`) or, now that it's typed, fail the whole transaction on a
// TS overload-resolution error instead of a clear runtime message — this
// guard makes an unexpected value a loud, specific failure instead of either.
function isValidPlatform(p: string): p is (typeof VALID_PLATFORMS)[number] {
  return (VALID_PLATFORMS as readonly string[]).includes(p);
}
function isValidTone(t: string): t is (typeof VALID_TONES)[number] {
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
            updatedAt: new Date(),
          },
        });

      await tx.delete(contentOutputs).where(eq(contentOutputs.jobId, jobResult.id));
      await tx.delete(agentLogs).where(eq(agentLogs.jobId, jobResult.id));

      // WHY the Array.from: jobResult.outputs is typed PipelineOutput[] | []
      // (the union of the 'done' and 'failed' PersistedJobResult arms) — TS's
      // Array.prototype.filter does not apply its type-guard overload across a
      // union-typed receiver like that, silently falling back to the plain
      // boolean-predicate overload and losing the narrowing entirely. Copying
      // through Array.from first collapses the receiver to a single
      // PipelineOutput[], so .filter(isDBOutputType) narrows as expected.
      const outputsToInsert: Array<PipelineOutput & { outputType: DBOutputType }> =
        Array.from(jobResult.outputs).filter(isDBOutputType);

      if (outputsToInsert.length > 0) {
        await tx.insert(contentOutputs).values(
          outputsToInsert.map((o) => ({
            jobId: jobResult.id,
            agentName: o.agentName,
            outputType: o.outputType,
            content: o.content,
            qualityScore: o.qualityScore || null,
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
    });

    logger.info('[DB] Job persisted', { jobId: jobResult.id, status: jobResult.status });
  } catch (err) {
    console.error('[DB] Failed to persist job:', err);
    Sentry.captureException(err, { tags: { jobId: jobResult.id, action: 'persistJob' } });
  }
}
