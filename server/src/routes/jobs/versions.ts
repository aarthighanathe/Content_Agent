// WHY: a separate sub-router, not inline in manage.ts: extracted to keep
// manage.ts under the 400-line split threshold (same "split when it grows,
// mirror the routes/jobs/ sub-router pattern" convention as render.ts/
// stream.ts/insights.ts). Implements FUTURE_FEATURES.md's Library "No
// per-job version history" item — see db/schema.ts's jobOutputVersions WHY
// comment for why the snapshot itself is taken in manage.ts's regenerate
// route rather than in the shared persistJobToDB path.
import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { getJobFromStore, setJobInStore, jobsMemory } from '../../lib/jobStore.js';
import { db } from '../../db/index.js';
import { contentJobs, contentOutputs, jobOutputVersions } from '../../db/schema.js';
import { eq, and, inArray, notInArray, desc } from 'drizzle-orm';
import { requireJobOwnership, requireAuthUserId } from './ownership.js';
import { logger } from '../../lib/logger.js';
import { readOutputs, sanitizeContentDeep } from '../content/shared.js';
import { getLatestQualityScore } from '../../lib/qualityScore.js';
import { isValidUUID } from '../../lib/uuid.js';
import { isJobInFlightStatus } from '../../lib/jobInFlight.js';

const router = Router({ mergeParams: true });

// WHY (M8): unbounded version rows grow on every regenerate/restore — cap the
// list API and prune older snapshots after insert so Library history stays bounded.
const MAX_JOB_VERSIONS = 20;

// WHY: exported so regenerate.ts prunes after its snapshot insert too, not only on restore.
export async function pruneOldVersions(jobId: string): Promise<void> {
  if (!db) return;
  try {
    const keep = await db.select({ id: jobOutputVersions.id })
      .from(jobOutputVersions)
      .where(eq(jobOutputVersions.jobId, jobId))
      .orderBy(desc(jobOutputVersions.createdAt))
      .limit(MAX_JOB_VERSIONS);
    if (keep.length < MAX_JOB_VERSIONS) return;
    const keepIds = keep.map((row) => row.id);
    await db.delete(jobOutputVersions)
      .where(and(
        eq(jobOutputVersions.jobId, jobId),
        notInArray(jobOutputVersions.id, keepIds),
      ));
  } catch (err: unknown) {
    logger.warn('[DB] Failed to prune old job versions', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// GET /:jobId/versions — list this job's snapshotted history, newest first.
// Only exists when the job has been regenerated or restored at least once
// (each snapshot is taken right before an overwrite — see manage.ts's
// POST /:jobId/regenerate and this file's own restore route below).
router.get('/:jobId/versions', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = requireAuthUserId(req, res);
    if (!userId) return;

    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    if (!db) return res.json({ versions: [] });

    const versions = await db.query.jobOutputVersions.findMany({
      where: eq(jobOutputVersions.jobId, jobId),
      orderBy: (v, { desc: descOrd }) => [descOrd(v.createdAt)],
      columns: { id: true, qualityScore: true, label: true, createdAt: true },
      limit: MAX_JOB_VERSIONS,
    });

    return res.json({ versions });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch version history', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /:jobId/versions/:versionId/restore — replace the job's current 'final'
// output with a past snapshot's content. The current 'final' output is itself
// snapshotted first (same "restore is non-destructive" guarantee as
// regenerate's own pre-overwrite snapshot), so restoring never loses whatever
// was on screen just before the restore.
router.post('/:jobId/versions/:versionId/restore', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const versionId = req.params.versionId as string;
    const userId = requireAuthUserId(req, res);
    if (!userId) return;

    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    // WHY: also block researching|writing|formatting|critiquing — mid-pipeline
    // DB statuses from updateJobStageInDb (R2); pending|processing alone missed them.
    if (isJobInFlightStatus(job.status)) {
      return res.status(409).json({
        error: 'Job is still generating — try again when it finishes',
        code: 'JOB_IN_PROGRESS',
        retryable: true,
      });
    }

    // WHY: 404 (not 400/500): a non-UUID id would make Postgres throw on the
    // uuid cast and surface as a 500; "not found" is also what a valid-but-
    // unknown id returns, so the response doesn't leak id-format details.
    if (!isValidUUID(versionId)) {
      return res.status(404).json({ error: 'Version not found', code: 'NOT_FOUND', retryable: false });
    }

    if (!db) {
      return res.status(503).json({ error: 'Version history requires a database connection', code: 'DB_UNAVAILABLE', retryable: true });
    }

    const [version] = await db.select().from(jobOutputVersions)
      .where(and(eq(jobOutputVersions.id, versionId), eq(jobOutputVersions.jobId, jobId)))
      .limit(1);
    if (!version) {
      return res.status(404).json({ error: 'Version not found', code: 'NOT_FOUND', retryable: false });
    }

    // Snapshot the current 'final' output before overwriting it, same pattern
    // as the regenerate route's pre-overwrite snapshot.
    let preRestoreSnapshot: { content: unknown; score: number | null } | null = null;
    const currentOutputs = readOutputs(job);
    const currentFinal = currentOutputs.find((o) => o.outputType === 'final');
    if (currentFinal) {
      // WHY: same as regenerate snapshot — .find() first critique is wrong when
      // multiple critique rows exist; getLatestQualityScore prefers final match.
      const currentScore = getLatestQualityScore(currentOutputs);
      preRestoreSnapshot = { content: currentFinal.content, score: currentScore };
    }

    const sanitizedContent = sanitizeContentDeep(version.content);

    // WHY: atomic terminal guard (same predicate as PATCH /:jobId/content): a regenerate claim
    // can flip done|failed→pending between the isJobInFlightStatus read above and these writes;
    // the transaction rolls back (snapshot included) when the guarded UPDATE matches 0 rows.
    // The snapshot lives inside the tx so a rejected restore leaves no spurious 'Before restore'.
    try {
      await db.transaction(async (tx) => {
        const terminal = await tx.update(contentJobs)
          .set({ updatedAt: new Date() })
          .where(and(
            eq(contentJobs.id, jobId),
            eq(contentJobs.userId, userId),
            inArray(contentJobs.status, ['done', 'failed']),
            eq(contentJobs.deleted, 0),
          ))
          .returning({ id: contentJobs.id });
        if (terminal.length === 0) throw new Error('JOB_IN_PROGRESS');

        if (preRestoreSnapshot) {
          await tx.insert(jobOutputVersions).values({
            jobId,
            content: preRestoreSnapshot.content,
            qualityScore: preRestoreSnapshot.score,
            label: 'Before restore',
          });
        }
        const existing = await tx.select({ id: contentOutputs.id })
          .from(contentOutputs)
          .where(and(eq(contentOutputs.jobId, jobId), eq(contentOutputs.outputType, 'final')))
          .limit(1);
        if (existing.length > 0) {
          await tx.update(contentOutputs).set({ content: sanitizedContent }).where(eq(contentOutputs.id, existing[0].id));
        } else {
          await tx.insert(contentOutputs).values({ jobId, agentName: 'writer', outputType: 'final', content: sanitizedContent });
        }
      });
    } catch (dbErr) {
      if (dbErr instanceof Error && dbErr.message === 'JOB_IN_PROGRESS') {
        return res.status(409).json({
          error: 'Job is still generating — try again when it finishes',
          code: 'JOB_IN_PROGRESS',
          retryable: true,
        });
      }
      logger.error('[DB] Failed to restore version', { jobId, userId, versionId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
      Sentry.captureException(dbErr, { tags: { route: 'POST /:jobId/versions/:versionId/restore', action: 'db-write' } });
      return res.status(500).json({ error: 'Failed to restore version — please try again', code: 'DB_WRITE_FAILED', retryable: true });
    }

    // WHY: prune after commit; it is best-effort and must not run inside the guarded tx.
    if (preRestoreSnapshot) await pruneOldVersions(jobId);

    // WHY: update both stores, same cache-aside pattern as PATCH /:jobId/content:
    // the in-memory copy (if the job hasn't aged out yet) must reflect the
    // restore too, or a client polling the in-flight job would keep seeing
    // the pre-restore content until the 10-minute eviction TTL passes.
    const memJob = jobsMemory.get(jobId) || getJobFromStore(jobId);
    // WHY: only mutate memory if still terminal (a regenerate may have claimed it post-commit).
    if (memJob && !isJobInFlightStatus(memJob.status)) {
      const memOutputs = readOutputs(memJob);
      const finalOutput = memOutputs.find((o) => o.outputType === 'final');
      if (finalOutput) {
        finalOutput.content = sanitizedContent;
      } else if ('outputs' in memJob) {
        // WHY: push rather than skip: mirrors the DB's insert-if-missing branch
        // above. Without this, a job whose in-memory copy has no 'final' output
        // yet silently kept stale/absent content until eviction. `'outputs' in`
        // narrows MemoryJob to PersistedJobResult (index signature removed).
        memJob.outputs = [
          ...memOutputs,
          { agentName: 'writer', outputType: 'final', content: sanitizedContent },
        ];
      }
      jobsMemory.set(jobId, memJob);
      setJobInStore(jobId, memJob);
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to restore version', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
