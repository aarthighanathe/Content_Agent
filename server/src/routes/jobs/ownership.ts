import { Response } from 'express';
import { db } from '../../db/index.js';
import type { PipelineOutput, PipelineLog } from '../../lib/pipeline.js';
import type { ContentJob, ContentOutput, AgentLog } from '../../db/schema.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { isValidUUID } from '../../lib/uuid.js';
import {
  jobsMemory,
  getJobFromStore,
  setJobInStore,
  type MemoryJob,
} from '../../lib/jobStore.js';

export { isValidUUID };
// WHY: re-export: route modules historically import jobsMemory/getJobFromStore/
// MemoryJob from ownership — keep that import path stable after the lib extract.
export { jobsMemory, getJobFromStore, setJobInStore, type MemoryJob };

/**
 * Shared guard for any route that needs both a reachable DB and a real UUID
 * dbUserId (Clerk-only/demo users with no DB row can't own a foreign-key row
 * in a user-scoped table). Originally duplicated nearly identically across
 * scheduledPosts.ts, collections.ts, and (missing entirely, causing routes to
 * hang with zero response on DB outage) feedMonitors.ts — consolidated here
 * so the three copies can't diverge again.
 *
 * Returns the resolved userId on success, or writes a 503
 * `{ error, code: 'DB_UNAVAILABLE', retryable: true }` response and returns
 * null — callers check for null and return immediately.
 */
export function requireDbUser(req: AuthRequest, res: Response, featureLabel: string): string | null {
  const userId = req.dbUserId;
  if (!db || !userId || !isValidUUID(userId)) {
    res.status(503).json({
      error: `${featureLabel} requires a database connection`,
      code: 'DB_UNAVAILABLE',
      retryable: true,
    });
    return null;
  }
  return userId;
}

/**
 * Resolve the authenticated internal UUID for any protected route.
 * SECURITY: never fall back to Clerk id or the latent `'demo'` string —
 * authMiddleware already fails closed without dbUserId; this guards the
 * call site if middleware is ever weakened (SEC-006).
 */
export function requireAuthUserId(req: AuthRequest, res: Response): string | null {
  const userId = req.dbUserId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING', retryable: false });
    return null;
  }
  return userId;
}

// The shape assembleJobFromDB reconstructs once a job has aged out of memory —
// same field set callers already read off a MemoryJob (id/userId/topic/... plus
// outputs/logs/criticResult), just sourced from Postgres instead of the Map.
export interface AssembledJob {
  id: string;
  userId: string;
  topic: string;
  platform: string;
  tone: string | null;
  targetAudience: string | null;
  // WHY: undefined, not columns off contentJobs: brand_voice/phrases_use/
  // phrases_avoid/content_dna live on the `users` table, not per-job — a job
  // row never snapshots them. regenerate/multiply (manage.ts) already prefer
  // a fresh getUserProfile(userId) lookup over these fields for exactly that
  // reason (current user settings, not a stale per-job copy); the fields
  // stay declared here only so those call sites can read them uniformly off
  // either a MemoryJob or an AssembledJob without a type-narrowing branch.
  brandVoice?: string;
  phrasesUse?: string;
  phrasesAvoid?: string;
  contentDna?: unknown;
  tag: string | null;
  sourceJobId: string | null;
  sourcePlatform: string | null;
  // WHY: added here (found while wiring Repurpose's sourceUrl persistence):
  // sourceCompetitorAnalysisId was added to the contentJobs DB column and to
  // persistJob.ts's INSERT earlier the same day, but never added to this DTO —
  // meaning the "based on competitor analysis" lineage silently disappeared
  // once a job aged out of jobsMemory and had to be reassembled from the DB
  // via assembleJobFromDB below, same bug class as FUNCTIONAL_AUDIT_2026-07.md
  // finding #11 (fixed for sourceJobId, missed for this one).
  sourceCompetitorAnalysisId: string | null;
  sourceUrl: string | null;
  templateId: string | null;
  paletteId: string | null;
  status: string;
  retryCount: number;
  deleted: number;
  createdAt: Date;
  updatedAt: Date;
  outputs: PipelineOutput[];
  logs: PipelineLog[];
  criticResult: unknown;
}

// WHY: Pick, not the full ContentOutput/AgentLog: callers of assembleJobFromDB
// query relations with different column subsets (manage.ts's list endpoint
// omits `content` on outputs to keep the paginated list response light — see
// GET / — while requireJobOwnership's single-job lookup selects every
// column). Picking only the fields actually read here means either query
// shape satisfies this type; content stays optional so the light-weight list
// query remains valid.
type DBOutputRow = Pick<ContentOutput, 'agentName' | 'outputType' | 'qualityScore' | 'partial'> &
  Partial<Pick<ContentOutput, 'content'>>;
type DBLogRow = Pick<AgentLog, 'agentName' | 'action' | 'inputSummary' | 'outputSummary' | 'durationMs'>;
type DBJobWithRelations = ContentJob & { outputs: DBOutputRow[]; logs?: AgentLog[] | DBLogRow[] };

export function assembleJobFromDB(dbJob: DBJobWithRelations): AssembledJob {
  const outputs: PipelineOutput[] = (dbJob.outputs || []).map((o) => ({
    agentName: o.agentName,
    outputType: o.outputType,
    content: 'content' in o ? o.content : undefined,
    qualityScore: o.qualityScore ?? undefined,
    partial: o.partial === 1,
  }));
  const logs: PipelineLog[] = (dbJob.logs || []).map((l) => ({
    agentName: l.agentName,
    action: l.action,
    inputSummary: l.inputSummary ?? '',
    outputSummary: l.outputSummary ?? '',
    durationMs: l.durationMs ?? 0,
  }));
  // WHY: last critique (CORR-004): align assembleJobFromDB with Result/Library.
  const criticOutputs = (dbJob.outputs || []).filter(
    (o) => o.outputType === 'critique' && o.agentName === 'critic',
  );
  const criticOutput = criticOutputs.length > 0 ? criticOutputs[criticOutputs.length - 1] : undefined;
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
    sourceCompetitorAnalysisId: dbJob.sourceCompetitorAnalysisId,
    sourceUrl: dbJob.sourceUrl,
    templateId: dbJob.templateId,
    paletteId: dbJob.paletteId,
    status: dbJob.status,
    retryCount: dbJob.retryCount,
    deleted: dbJob.deleted,
    createdAt: dbJob.createdAt,
    updatedAt: dbJob.updatedAt,
    outputs,
    logs,
    criticResult: criticOutput?.content ?? null,
  };
}

/**
 * Soft ownership lookup — same memory → DB order as requireJobOwnership, but
 * never writes a response. Used when walking Adapt ancestry: a deleted parent
 * must stop the walk, not 404 the child the user actually owns.
 */
export async function lookupOwnedJob(
  jobId: string,
  requestingUserId: string,
): Promise<MemoryJob | AssembledJob | null> {
  // NOTE: check both in-memory stores — BullMQ worker uses jobStore, direct
  // pipeline uses jobsMemory. Both must be checked so every code path works.
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  if (memJob) {
    if (memJob.userId !== requestingUserId || memJob.deleted === 1) return null;
    return memJob;
  }

  if (db) {
    try {
      const dbJob = await db.query.contentJobs.findFirst({
        where: (j, { eq: jeq, and: jand }) =>
          jand(jeq(j.id, jobId), jeq(j.userId, requestingUserId), jeq(j.deleted, 0)),
        with: { outputs: true, logs: true },
      });
      if (dbJob) return assembleJobFromDB(dbJob);
    } catch { /* treat as miss */ }
  }
  return null;
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
): Promise<MemoryJob | AssembledJob | null> {
  const job = await lookupOwnedJob(jobId, requestingUserId);
  if (job) return job;
  res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
  return null;
}
