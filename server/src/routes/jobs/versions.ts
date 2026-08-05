// WHY a separate sub-router, not inline in manage.ts: extracted to keep
// manage.ts under the 400-line split threshold (same "split when it grows,
// mirror the routes/jobs/ sub-router pattern" convention as render.ts/
// stream.ts/insights.ts). Implements FUTURE_FEATURES.md's Library "No
// per-job version history" item — see db/schema.ts's jobOutputVersions WHY
// comment for why the snapshot itself is taken in manage.ts's regenerate
// route rather than in the shared persistJobToDB path.
import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { getJobFromStore, setJobInStore } from '../../workers/contentWorker.js';
import { db } from '../../db/index.js';
import { contentOutputs, jobOutputVersions } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { jobsMemory, requireJobOwnership } from './ownership.js';
import { logger } from '../../lib/logger.js';
import { readOutputs, sanitizeContentDeep } from '../content/shared.js';

const router = Router({ mergeParams: true });

// GET /:jobId/versions — list this job's snapshotted history, newest first.
// Only exists when the job has been regenerated or restored at least once
// (each snapshot is taken right before an overwrite — see manage.ts's
// POST /:jobId/regenerate and this file's own restore route below).
router.get('/:jobId/versions', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.dbUserId || req.userId || 'demo';

    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

    if (!db) return res.json({ versions: [] });

    const versions = await db.query.jobOutputVersions.findMany({
      where: eq(jobOutputVersions.jobId, jobId),
      orderBy: (v, { desc: descOrd }) => [descOrd(v.createdAt)],
      columns: { id: true, qualityScore: true, label: true, createdAt: true },
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
    const userId = req.dbUserId || req.userId || 'demo';

    const job = await requireJobOwnership(jobId, userId, res);
    if (!job) return;

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
    const currentOutputs = readOutputs(job);
    const currentFinal = currentOutputs.find((o) => o.outputType === 'final');
    if (currentFinal) {
      const currentCritique = currentOutputs.find((o) => o.outputType === 'critique');
      const currentScore = typeof currentCritique?.qualityScore === 'number' ? currentCritique.qualityScore : null;
      try {
        await db.insert(jobOutputVersions).values({
          jobId, content: currentFinal.content, qualityScore: currentScore, label: 'Before restore',
        });
      } catch (dbErr) {
        logger.error('[DB] Failed to snapshot version before restore', { jobId, userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
        Sentry.captureException(dbErr, { tags: { route: 'POST /:jobId/versions/:versionId/restore', action: 'pre-restore-snapshot' } });
      }
    }

    const sanitizedContent = sanitizeContentDeep(version.content);

    try {
      const existing = await db.select({ id: contentOutputs.id })
        .from(contentOutputs)
        .where(and(eq(contentOutputs.jobId, jobId), eq(contentOutputs.outputType, 'final')))
        .limit(1);
      if (existing.length > 0) {
        await db.update(contentOutputs).set({ content: sanitizedContent }).where(eq(contentOutputs.id, existing[0].id));
      } else {
        await db.insert(contentOutputs).values({ jobId, agentName: 'writer', outputType: 'final', content: sanitizedContent });
      }
    } catch (dbErr) {
      logger.error('[DB] Failed to restore version', { jobId, userId, versionId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
      Sentry.captureException(dbErr, { tags: { route: 'POST /:jobId/versions/:versionId/restore', action: 'db-write' } });
      return res.status(500).json({ error: 'Failed to restore version — please try again', code: 'DB_WRITE_FAILED', retryable: true });
    }

    // WHY update both stores, same cache-aside pattern as PATCH /:jobId/content:
    // the in-memory copy (if the job hasn't aged out yet) must reflect the
    // restore too, or a client polling the in-flight job would keep seeing
    // the pre-restore content until the 10-minute eviction TTL passes.
    const memJob = jobsMemory.get(jobId) || getJobFromStore(jobId);
    if (memJob) {
      const finalOutput = readOutputs(memJob).find((o) => o.outputType === 'final');
      if (finalOutput) { finalOutput.content = sanitizedContent; jobsMemory.set(jobId, memJob); setJobInStore(jobId, memJob); }
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to restore version' });
  }
});

export default router;
