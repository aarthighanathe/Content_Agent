import { Response } from 'express';
import { db } from '../../db/index.js';
import { getJobFromStore } from '../../workers/contentWorker.js';

// Shared in-memory cache: holds active/in-flight jobs before they are persisted to DB.
// Also populated briefly after completion (TTL: 10 min) so polling clients can still read the result.
export const jobsMemory = new Map<string, any>();

export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function assembleJobFromDB(dbJob: any): any {
  const outputs = (dbJob.outputs || []).map((o: any) => ({
    agentName: o.agentName,
    outputType: o.outputType,
    content: o.content,
    qualityScore: o.qualityScore,
    partial: o.partial === 1,
  }));
  const logs = (dbJob.logs || []).map((l: any) => ({
    agentName: l.agentName,
    action: l.action,
    inputSummary: l.inputSummary,
    outputSummary: l.outputSummary,
    durationMs: l.durationMs,
  }));
  const criticOutput = (dbJob.outputs || []).find(
    (o: any) => o.outputType === 'critique' && o.agentName === 'critic',
  );
  return {
    id: dbJob.id,
    userId: dbJob.userId,
    topic: dbJob.topic,
    platform: dbJob.platform,
    tone: dbJob.tone,
    targetAudience: dbJob.targetAudience,
    tag: dbJob.tag,
    sourceJobId: dbJob.sourceJobId,
    sourcePlatform: dbJob.sourcePlatform,
    status: dbJob.status,
    retryCount: dbJob.retryCount,
    deleted: dbJob.deleted,
    createdAt: dbJob.createdAt,
    updatedAt: dbJob.updatedAt,
    outputs,
    logs,
    criticResult: criticOutput?.content || null,
  };
}

/**
 * Middleware-style ownership guard for all :jobId routes.
 *
 * Lookup order: BullMQ worker store → jobsMemory → DB.
 * This order ensures in-flight jobs (not yet in DB) are still accessible.
 *
 * SECURITY: Returns 404 (not 403) on ownership mismatch — a 403 would confirm
 * that the job exists but belongs to someone else, leaking enumeration info.
 *
 * FLOW: Returns the job object on success, or calls res.status(404).json()
 * and returns null — callers check for null and return immediately.
 */
export async function requireJobOwnership(
  jobId: string,
  requestingUserId: string,
  res: Response,
): Promise<any | null> {
  // NOTE: check both in-memory stores — BullMQ worker uses jobStore, direct
  // pipeline uses jobsMemory. Both must be checked so every code path works.
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  if (memJob) {
    if (memJob.userId !== requestingUserId || memJob.deleted === 1) {
      res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
      return null;
    }
    return memJob;
  }

  // Memory miss — job has been evicted (completed > 10 min ago) or never existed.
  // Fall back to DB. If DB is also unavailable, this resolves to 404.
  if (db) {
    try {
      const dbJob = await db.query.contentJobs.findFirst({
        where: (j, { eq: jeq, and: jand }) =>
          jand(jeq(j.id, jobId), jeq(j.userId, requestingUserId), jeq(j.deleted, 0)),
        with: { outputs: true, logs: true },
      });
      if (dbJob) return assembleJobFromDB(dbJob);
    } catch { /* fall through to 404 */ }
  }

  res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
  return null;
}
