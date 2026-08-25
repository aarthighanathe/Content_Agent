// WHY extracted from pipeline.ts: that file grew past the 400-line cap
// (CLAUDE.md "Code Style Rules" / "Never Do These"). These type/interface
// definitions have no runtime dependency on the pipeline execution logic
// (runContentPipeline/runAndPersistPipeline) — they're the shared vocabulary
// both that logic and its 9 external consumers (routes/jobs/*, workers/*,
// lib/persistJob.ts, etc.) import. pipeline.ts re-exports everything here so
// no existing `from '../lib/pipeline.js'` import site needs to change.
import type { ResearchResult } from '../agents/researcher.js';
import type { CriticResult } from '../agents/critic.js';

// WHY content: unknown, not a discriminated union of every agent's output type:
// outputType/agentName don't correlate to a single TypeScript-discriminable field
// the way a real discriminated union needs (e.g. 'writer' agentName covers both
// 'draft' and 'final' outputType, each carrying a different content shape from
// draft to formatted-to-final). unknown is the honest type for a field this file
// only ever stores and forwards — it never reads a key off `content` itself: every
// place that needs a specific shape (formatCarousel, runCritic, etc.) receives the
// value directly from the agent call, not by reading it back out of this array.
export interface PipelineOutput {
  agentName: string;
  outputType: 'research' | 'draft' | 'critique' | 'final' | 'prediction';
  content: unknown;
  qualityScore?: number;
  partial?: boolean;
}

export interface PipelineLog {
  agentName: string;
  action: string;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
}

export interface PipelineJob {
  id: string;
  userId: string;
  topic: string;
  platform: string;
  tone?: string;
  targetAudience?: string;
  brandVoice?: string;
  phrasesUse?: string;
  phrasesAvoid?: string;
  contentDna?: unknown;
  initialFeedback?: string;
  status: string;
  retryCount: number;
  // WHY optional rather than split into a separate "lifecycle metadata" type:
  // these fields are set by whichever route constructs the job (create.ts,
  // manage.ts's regenerate/multiply/tag) and mutated in place as the pipeline
  // runs (emitProgress sets stage/progress/status); a job in jobsMemory/jobStore
  // is one evolving object across its whole lifecycle, not several distinct
  // shapes, so callers need to read/write these by name without a cast.
  deleted?: number;
  tag?: string | null;
  sourceJobId?: string | null;
  sourcePlatform?: string;
  // WHY optional: set by routes/content/repurpose.ts when a job is created
  // from Repurpose's "paste a URL" flow — display/lineage metadata only, same
  // pattern as sourceJobId/sourceCompetitorAnalysisId above (not read by any
  // agent prompt, just carried through to the DB row so Result/Library can
  // show "Repurposed from: <url>").
  sourceUrl?: string | null;
  // WHY optional, carousel-only: the client's template system
  // (client/src/lib/templateSystem.ts) choice made at Create time. Not read
  // by any agent — pure display metadata carried through to the DB row so
  // Result.tsx's live preview and the PNG export can both render the exact
  // template the job was created with (see CLAUDE.md §11).
  templateId?: string | null;
  paletteId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  stage?: string;
  progress?: number;
  // WHY optional, read only by orchestrator.ts: set by routes/jobs/create.ts
  // (C3 — Competitor Content Lens integration) when a job is created from a
  // competitor gap/angle CTA (Competitor.tsx's navigateToCreate call sites).
  // Orchestrator's taskPlan output already flows into the Writer's prompt as
  // <task_plan>, so splicing this into ONLY the orchestrator prompt — rather
  // than threading a new field through researcher.ts/writer.ts too — is the
  // smallest injection point that still reaches the final content: normal
  // research still runs (this ADDS context, it doesn't skipResearch like
  // Content Multiplier), and the resulting taskPlan carries the competitor
  // framing forward automatically.
  sourceCompetitorAnalysisId?: string | null;
  competitorContext?: string;
  [key: string]: unknown;
}

export type EmitProgress = (
  stage: string,
  progress: number,
  agent: string,
  message: string,
  durationMs?: number,
) => void;

// WHY a union of the two literal result shapes, not one interface with optional
// fields: 'done' and 'failed' are genuinely different shapes (done carries
// criticResult, failed carries error, neither carries the other) — a shared
// interface with everything optional would let a caller construct a
// self-contradictory object (e.g. status:'failed' with a criticResult) that this
// union makes impossible instead.
// NOTE: This type extends PipelineJob to maintain compatibility with the
// existing codebase. A true memory optimization (removing unused fields like
// contentDna/brandVoice/phrasesUse/Avoid from the in-memory store) would require
// a larger refactor to separate "job in memory" types from "persisted result"
// types throughout the codebase (manage.ts, persistJob.ts, create.ts all
// access these fields on the stored job object).
export type PersistedJobResult =
  | (PipelineJob & { status: 'done'; outputs: PipelineOutput[]; logs: PipelineLog[]; criticResult: CriticResult | null })
  | (PipelineJob & { status: 'failed'; error: string; outputs: []; logs: [] });

// WHY: Content Multiplier (routes/jobs/manage.ts POST /:jobId/multiply) reuses
// research from a source job and must skip straight to the Writer stage —
// re-running the orchestrator/researcher would waste Tavily/Gemini quota on
// data we already have. This carries exactly what stage 3 (Writer) needs so
// runContentPipeline can seed orchestratorResult/researchResult without ever
// calling runOrchestrator/runResearcher.
export interface SkipResearchOpts {
  researchResult: ResearchResult;
  taskPlan: string;
  platformRules: Record<string, unknown>;
}
