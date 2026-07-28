import * as Sentry from '@sentry/node';
import { db } from '../db/index.js';
import { contentJobs, contentOutputs, agentLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from './logger.js';

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

const validOutputTypes = ['research', 'draft', 'critique', 'final'];

export async function persistJobToDB(jobResult: any): Promise<void> {
  if (!db || !isValidUUID(jobResult.userId)) return;
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
          platform: jobResult.platform,
          tone: jobResult.tone,
          targetAudience: jobResult.targetAudience,
          tag: jobResult.tag || null,
          // WHY carried through here: sourceJobId/sourcePlatform are set on the
          // in-memory job by POST /:jobId/multiply (manage.ts) but were previously
          // dropped on DB persist, so a multiplied job's origin badge went blank
          // once it aged out of memory (FUNCTIONAL_AUDIT_2026-07.md finding #11).
          sourceJobId: jobResult.sourceJobId || null,
          sourcePlatform: jobResult.sourcePlatform || null,
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

      const outputsToInsert = (jobResult.outputs || []).filter(
        (o: any) => validOutputTypes.includes(o.outputType)
      );

      if (outputsToInsert.length > 0) {
        await tx.insert(contentOutputs).values(
          outputsToInsert.map((o: any) => ({
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
          jobResult.logs.map((l: any) => ({
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
