import * as Sentry from '@sentry/node';
import { sseManager } from './sse.js';
import { persistJobToDB } from './persistJob.js';
import { jobsMemory } from '../routes/jobs/ownership.js';
import { getJobFromStore } from '../workers/contentWorker.js';
import { ContentJob } from '../db/schema.js';
import { runOrchestrator, type OrchestratorResult } from '../agents/orchestrator.js';
import { runResearcher, type ResearchResult } from '../agents/researcher.js';
import { runWriter } from '../agents/writer.js';
import { runFormatter, type FormatterResponse } from '../agents/formatter.js';
import { runCritic, type CriticResult } from '../agents/critic.js';
import { runPerformancePredictor } from '../agents/performancePredictor.js';

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

// WHY: agent signatures are typed against ContentJob (the Drizzle-inferred DB
// row), but both pipeline callers construct plain in-memory job objects that
// only carry the fields agents actually read (id/topic/platform/etc.) — never
// a real DB row with Date-typed createdAt/updatedAt. This was true before this
// refactor too (callers previously passed `job: any`); the cast documents the
// gap in one place instead of scattering `any` across every agent call site.
// Tightening agent signatures to a real runtime pipeline-job type is tracked
// separately (see code-quality review: "type the agent pipeline").
function asContentJob(job: PipelineJob): ContentJob {
  return job as unknown as ContentJob;
}

// WHY a type guard before cast: CLAUDE.md requires a runtime check before any
// `as` cast. FormatterResponse has a known shape (hook/cta/tweets/caption/etc.
// depending on platform), so we verify at least one expected field exists
// before trusting the cast. This prevents a malformed content shape from
// silently flowing through as a valid FormatterResponse.
// WHY Array.isArray is checked first: carousels format to a plain slide array
// (FormattedCarouselResponse) with none of the hook/tweets/caption keys —
// performancePredictor.ts's own contentSummary narrowing already treats
// Array.isArray(content) as the carousel case, so this guard must accept it
// too or every carousel job silently skips performance prediction.
function isFormatterResponse(content: unknown): content is FormatterResponse {
  return (
    Array.isArray(content) ||
    (typeof content === 'object' &&
      content !== null &&
      ('hook' in content || 'tweets' in content || 'caption' in content))
  );
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

/**
 * The single 5-stage Orchestrator → Researcher → Writer → Formatter → Critic
 * pipeline. Shared by the direct-mode runner (routes/jobs/create.ts, used when
 * Redis/BullMQ is unavailable) and the BullMQ worker (workers/contentWorker.ts)
 * so both code paths run identical logic — including Content DNA, the
 * feedback-seeded regenerate flow, and the Performance Predictor stage.
 *
 * Callers own persistence of the terminal result (jobResult/failedResult) into
 * their own store — this function only emits progress and returns the result.
 */
export async function runContentPipeline(
  job: PipelineJob,
  emitProgress: EmitProgress,
  opts?: { skipResearch?: SkipResearchOpts },
): Promise<{ status: 'done'; outputs: PipelineOutput[]; logs: PipelineLog[]; criticResult: CriticResult | null }> {
  const outputs: PipelineOutput[] = [];
  const logs: PipelineLog[] = [];

  let orchestratorResult: OrchestratorResult;
  let researchResult: ResearchResult;

  if (opts?.skipResearch) {
    // FLOW: Content Multiplier path — research/task-plan/platform-rules come
    // from the source job's cached outputs, so no orchestrator/researcher log
    // or output entries are pushed (no orchestrator/researcher work happened).
    researchResult = opts.skipResearch.researchResult;
    orchestratorResult = {
      taskPlan: opts.skipResearch.taskPlan,
      platformRules: opts.skipResearch.platformRules,
      searchQueries: [],
    };
    emitProgress('writing', 10, 'system', `Adapting to ${job.platform.replace(/_/g, ' ')}…`);
  } else {
    // Stage 1: Planning
    emitProgress('planning', 5, 'orchestrator', 'Planning content structure…');
    const orchStart = Date.now();
    orchestratorResult = await runOrchestrator(asContentJob(job));
    const orchMs = Date.now() - orchStart;
    logs.push({
      agentName: 'orchestrator',
      action: 'Created task plan and search queries',
      inputSummary: `Topic: ${job.topic}, Platform: ${job.platform}`,
      outputSummary: `Plan created with ${orchestratorResult.searchQueries.length} search queries`,
      durationMs: orchMs,
    });
    outputs.push({ agentName: 'orchestrator', outputType: 'research', content: orchestratorResult });
    emitProgress('researching', 20, 'orchestrator', `Task plan created — ${orchestratorResult.searchQueries.length} search queries`, orchMs);

    // Stage 2: Research
    emitProgress('researching', 25, 'researcher', 'Analyzing trends and gathering facts…');
    const resStart = Date.now();
    researchResult = await runResearcher(asContentJob(job), orchestratorResult.searchQueries);
    const resMs = Date.now() - resStart;
    logs.push({
      agentName: 'researcher',
      action: 'Web research completed',
      inputSummary: `Queries: ${orchestratorResult.searchQueries.join(', ')}`,
      outputSummary: `Found ${researchResult.keyFacts.length} facts, ${researchResult.trendingAngles.length} angles`,
      durationMs: resMs,
    });
    outputs.push({ agentName: 'researcher', outputType: 'research', content: researchResult });
    emitProgress('writing', 40, 'researcher', `Research done — ${researchResult.keyFacts.length} key facts`, resMs);
  }

  // Stage 3: Write → Format → Critique loop
  let retryCount = 0;
  let approved = false;
  let bestDraft: FormatterResponse | null = null;
  let bestScore = 0;
  let lastCriticResult: CriticResult | null = null;
  let criticFeedback: string | undefined = job.initialFeedback || undefined;

  while (!approved && retryCount < 3) {
    // WHY: check before each Writer/Formatter/Critic round-trip (the most
    // expensive part of the pipeline) so a mid-run delete stops burning LLM
    // calls on a job nobody will ever read, instead of only catching it once
    // at the very end in runAndPersistPipeline.
    if (isSoftDeleted(job.id)) break;

    const attemptBase = retryCount === 0 ? 40 : 60 + retryCount * 5;

    emitProgress('writing', attemptBase + 2, 'writer', retryCount > 0 ? `Revising draft (attempt ${retryCount + 1})…` : 'Drafting content…');
    const wStart = Date.now();
    // WHY caught here, not left to propagate: runWriter throws when a carousel
    // response comes back truncated (<6 slides) even after schema validation —
    // that's exactly the transient LLM hiccup the critic-feedback retry loop
    // exists to absorb, not a reason to hard-fail the whole job. Before this fix,
    // the throw skipped the loop entirely and landed in runAndPersistPipeline's
    // outer catch, marking the job 'failed' on the very first bad response.
    let writerResult;
    try {
      writerResult = await runWriter(asContentJob(job), {
        researchReport: researchResult,
        taskPlan: orchestratorResult.taskPlan,
        platformRules: orchestratorResult.platformRules,
        brandVoice: job.brandVoice,
        phrasesUse: job.phrasesUse,
        phrasesAvoid: job.phrasesAvoid,
        contentDna: job.contentDna,
        criticFeedback,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Writer produced an invalid draft';
      const wMs = Date.now() - wStart;
      logs.push({
        agentName: 'writer',
        action: `Draft REJECTED (${message})`,
        inputSummary: criticFeedback ? `Revising with feedback: ${criticFeedback.slice(0, 100)}` : 'Creating initial draft',
        outputSummary: 'Writer output failed validation — requesting revision',
        durationMs: wMs,
      });
      criticFeedback = `Your previous response was invalid: ${message}. Follow the required JSON structure exactly and provide complete, non-placeholder content for every field.`;
      retryCount++;
      job.retryCount = retryCount;
      emitProgress('writing', attemptBase + 5, 'writer', 'Draft invalid — requesting revision…', wMs);
      continue;
    }
    const wMs = Date.now() - wStart;
    logs.push({
      agentName: 'writer',
      action: retryCount > 0 ? `Revision ${retryCount}` : 'Initial draft created',
      inputSummary: criticFeedback ? `Revising with feedback: ${criticFeedback.slice(0, 100)}` : 'Creating initial draft',
      outputSummary: `Draft generated for ${job.platform}`,
      durationMs: wMs,
    });
    outputs.push({ agentName: 'writer', outputType: 'draft', content: writerResult });
    emitProgress('formatting', attemptBase + 10, 'writer', 'Draft written — applying platform rules…', wMs);

    const fStart = Date.now();
    const formattedContent = await runFormatter(asContentJob(job), writerResult);
    const fMs = Date.now() - fStart;
    logs.push({
      agentName: 'formatter',
      action: 'Content formatted for platform',
      inputSummary: `Formatting ${job.platform} content`,
      outputSummary: 'Applied platform-specific formatting rules',
      durationMs: fMs,
    });
    emitProgress('critiquing', attemptBase + 18, 'formatter', 'Formatting done — running quality review…', fMs);

    const cStart = Date.now();
    const criticResult = await runCritic(asContentJob(job), formattedContent, job.brandVoice);
    const cMs = Date.now() - cStart;
    lastCriticResult = criticResult;
    logs.push({
      agentName: 'critic',
      action: criticResult.approved ? 'Content APPROVED' : `Content REJECTED (score: ${criticResult.totalScore}/100)`,
      inputSummary: `Evaluating ${job.platform} content`,
      outputSummary: `Score: ${criticResult.totalScore}/100 - ${criticResult.approved ? 'APPROVED' : 'REJECTED'}`,
      durationMs: cMs,
    });
    outputs.push({ agentName: 'critic', outputType: 'critique', content: criticResult, qualityScore: criticResult.totalScore });

    if (criticResult.totalScore > bestScore) {
      bestScore = criticResult.totalScore;
      bestDraft = formattedContent;
    }

    if (criticResult.approved) {
      approved = true;
      outputs.push({ agentName: 'writer', outputType: 'final', content: formattedContent, qualityScore: criticResult.totalScore });
      emitProgress('critiquing', 92, 'critic', `Approved! Quality score: ${criticResult.totalScore}/100`, cMs);
    } else {
      criticFeedback = criticResult.feedback;
      retryCount++;
      job.retryCount = retryCount;
      emitProgress('writing', attemptBase + 25, 'critic', `Score ${criticResult.totalScore}/100 — requesting revision…`, cMs);
    }
  }

  if (!approved && bestDraft) {
    outputs.push({ agentName: 'writer', outputType: 'final', content: bestDraft, qualityScore: bestScore, partial: true });
  }

  // Stage 4: Performance prediction (non-fatal — a predictor failure must not fail the job)
  // WHY 'predicting' not 'done': emitProgress sets jobData.status='done' whenever
  // stage==='done', and callers treat status==='done' as "outputs are ready to
  // render". Labeling this pre-persist stage 'done' let clients observe
  // status:'done' with no outputs attached yet — the exact bug that caused the
  // Result page to freeze on a stale, output-less snapshot mid-pipeline.
  // WHY the cast here: finalContent comes back out of the PipelineOutput[]
  // array as `unknown` (see PipelineOutput's own WHY — outputType doesn't
  // discriminate cleanly enough to type `content` precisely at rest), but it
  // was pushed in a few lines up as exactly `formattedContent`
  // (FormatterResponse, itself built from WriterResponse) — this is the same
  // "we know more than the type system can prove from storage alone" gap
  // asContentJob documents above, not a new unverified assumption.
  // WHY the type guard before cast: CLAUDE.md requires a runtime check before
  // any `as` cast. isFormatterResponse verifies the content has at least one
  // expected FormatterResponse field before we trust the cast.
  const finalContentRaw = outputs.find((o) => o.outputType === 'final')?.content;
  const finalContent = finalContentRaw && isFormatterResponse(finalContentRaw) ? finalContentRaw : undefined;
  emitProgress('predicting', 95, 'system', 'Predicting engagement performance…');
  const [predResult] = await Promise.allSettled([
    finalContent
      ? runPerformancePredictor(asContentJob(job), finalContent, lastCriticResult ?? undefined, researchResult)
          .catch((e: unknown) => { console.warn('Predictor failed (non-fatal):', e instanceof Error ? e.message : String(e)); return null; })
      : Promise.resolve(null),
  ]);
  if (predResult.status === 'fulfilled' && predResult.value) {
    outputs.push({ agentName: 'predictor', outputType: 'prediction', content: predResult.value });
  }

  return { status: 'done', outputs, logs, criticResult: lastCriticResult };
}

/**
 * Runs the pipeline, persists the terminal result (success or failure) to the
 * given store + DB, and emits the final SSE event. Shared tail logic for both
 * the direct-mode runner and the BullMQ worker so success/failure handling —
 * including the 10-minute memory eviction — can't drift between them again.
 */
export async function runAndPersistPipeline(
  job: PipelineJob,
  emitProgress: EmitProgress,
  store: {
    set: (jobId: string, data: PersistedJobResult) => void;
    evict: (jobId: string) => void;
  },
  opts?: { skipResearch?: SkipResearchOpts },
): Promise<void> {
  try {
    const { outputs, logs, criticResult } = await runContentPipeline(job, emitProgress, opts);

    // WHY: the user may have deleted this job mid-run (DELETE /:jobId sets
    // deleted=1 in jobsMemory/jobStore + DB). Persisting a "done" result now
    // would resurrect a soft-deleted job and waste the write — bail out here
    // instead of racing the delete.
    if (isSoftDeleted(job.id)) {
      store.evict(job.id);
      return;
    }

    const jobResult: PersistedJobResult = { ...job, status: 'done', outputs, logs, criticResult };
    store.set(job.id, jobResult);
    await persistJobToDB(jobResult);

    setTimeout(() => store.evict(job.id), 10 * 60 * 1000);

    // WHY sseManager directly, not emitProgress: emitProgress's implementations
    // (contentWorker.ts, create.ts) write their own snapshot of the job back to
    // the store on every call. contentWorker.ts's snapshot never carries
    // `outputs` (it's a separate local variable), so calling emitProgress here
    // would overwrite the jobResult we just stored above with an output-less
    // one — the exact bug that left clients polling a "done" job with no
    // outputs forever. The store write is already complete; only the SSE
    // notification is still needed.
    sseManager.sendEvent(job.id, {
      type: 'progress', stage: 'done', progress: 100,
      agent: 'system', message: 'Content generation complete!',
    });
  } catch (error: unknown) {
    console.error(`Pipeline failed for ${job.id}:`, error);

    if (isSoftDeleted(job.id)) {
      store.evict(job.id);
      return;
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal pipeline failure';
    Sentry.captureException(error, { tags: { jobId: job.id, stage: 'pipeline' }, contexts: { job: { topic: job.topic, platform: job.platform } } });
    const failedResult: PersistedJobResult = { ...job, status: 'failed', error: errorMessage, outputs: [], logs: [] };
    store.set(job.id, failedResult);
    await persistJobToDB(failedResult);

    sseManager.sendEvent(job.id, {
      type: 'progress',
      stage: 'failed',
      progress: 0,
      agent: 'system',
      message: `Job failed: ${errorMessage}`,
    });
    throw error;
  }
}

function isSoftDeleted(jobId: string): boolean {
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  return memJob?.deleted === 1;
}
