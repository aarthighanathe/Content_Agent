import type { PipelineOutput, PipelineLog } from './pipeline.js';
import type { ContentJob, ContentOutput, AgentLog } from '../db/schema.js';
import { getLatestCritique } from './qualityScore.js';

// WHY: extracted from routes/jobs/ownership.ts so workers (publishWorker) can
// reassemble a job from DB rows without importing the Express ownership guards.

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
  // row never snapshots them. regenerate/multiply already prefer a fresh
  // getUserProfile(userId) lookup over these fields for exactly that reason
  // (current user settings, not a stale per-job copy); the fields stay
  // declared here only so those call sites can read them uniformly off either
  // a MemoryJob or an AssembledJob without a type-narrowing branch.
  brandVoice?: string;
  phrasesUse?: string;
  phrasesAvoid?: string;
  contentDna?: unknown;
  tag: string | null;
  sourceJobId: string | null;
  sourcePlatform: string | null;
  // WHY: sourceCompetitorAnalysisId was added to the contentJobs DB column and
  // to persistJob.ts's INSERT earlier, but was once missing from this DTO —
  // meaning competitor lineage silently disappeared once a job aged out of
  // jobsMemory (same bug class as FUNCTIONAL_AUDIT_2026-07.md finding #11).
  sourceCompetitorAnalysisId: string | null;
  sourceUrl: string | null;
  templateId: string | null;
  paletteId: string | null;
  // WHY: durable copies so Regenerate can rehydrate them after memory eviction.
  sourceMaterial: string | null;
  competitorContext: string | null;
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
// query relations with different column subsets (list omits `content` on
// outputs to keep the paginated list light — see GET / — while
// requireJobOwnership's single-job lookup selects every column). Picking only
// the fields actually read here means either query shape satisfies this type;
// content stays optional so the light-weight list query remains valid.
type DBOutputRow = Pick<ContentOutput, 'agentName' | 'outputType' | 'qualityScore' | 'partial'> &
  Partial<Pick<ContentOutput, 'content'>>;
type DBLogRow = Pick<AgentLog, 'agentName' | 'action' | 'inputSummary' | 'outputSummary' | 'durationMs'>;
type DBJobWithRelations = ContentJob & { outputs: DBOutputRow[]; logs?: AgentLog[] | DBLogRow[] };

// SECURITY: list, collection, SSE, and GET /:jobId responses must not include
// source article text or competitor prompt context. assembleJobFromDB keeps
// both — regenerate and the publish worker still read them off the assembled
// job. Strip only at the HTTP boundary.
const CLIENT_JOB_OMIT = new Set<string>(['sourceMaterial', 'competitorContext']);

export function toClientJob<T extends object>(
  job: T,
): Omit<T, 'sourceMaterial' | 'competitorContext'> {
  // WHY: a generic object has no string index signature, so the copy is built
  // from Object.entries rather than a spread into Record<string, unknown>.
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(job)) {
    if (CLIENT_JOB_OMIT.has(key)) continue;
    copy[key] = value;
  }
  return copy as Omit<T, 'sourceMaterial' | 'competitorContext'>;
}

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
  // WHY: match final.qualityScore when multiple critiques exist (Pass-6 M1);
  // fall back to latest critic critique (CORR-004 Result/Library align).
  const criticCandidates = (dbJob.outputs || []).filter(
    (o) => o.outputType === 'critique' && o.agentName === 'critic',
  );
  const criticOutput = getLatestCritique([
    ...outputs.filter((o) => o.outputType === 'final'),
    ...criticCandidates.map((o) => ({
      outputType: o.outputType,
      qualityScore: o.qualityScore ?? undefined,
      content: 'content' in o ? o.content : undefined,
    })),
  ]);
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
    sourceMaterial: dbJob.sourceMaterial,
    competitorContext: dbJob.competitorContext,
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
