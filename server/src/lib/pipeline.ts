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
import type {
  PipelineOutput,
  PipelineLog,
  PipelineJob,
  EmitProgress,
  PersistedJobResult,
  SkipResearchOpts,
} from './pipelineTypes.js';

// WHY re-exported, not moved outright: 9 files import types from this module
// (routes/jobs/*, workers/*, lib/persistJob.ts, etc.) — re-exporting keeps
// every existing `from '../lib/pipeline.js'` import site working unchanged
// while the definitions themselves live in pipelineTypes.ts (see that file's
// own WHY for the split rationale).
export type {
  PipelineOutput,
  PipelineLog,
  PipelineJob,
  EmitProgress,
  PersistedJobResult,
  SkipResearchOpts,
};

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
      // WHY appended, not replaced: overwriting criticFeedback here discarded
      // any substantive critic feedback from a prior iteration (e.g. "CTA is
      // vague") the moment a later attempt merely failed validation — the next
      // writer call would then only see the generic validation error and lose
      // the qualitative guidance entirely.
      const validationNote = `Your previous response was invalid: ${message}. Follow the required JSON structure exactly and provide complete, non-placeholder content for every field.`;
      criticFeedback = criticFeedback ? `${criticFeedback}\n\n${validationNote}` : validationNote;
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

  // WHY throw here instead of falling through: if every retry attempt threw
  // (runWriter kept producing invalid drafts) the critic never ran once, so
  // bestDraft is still null — without this check the function would return
  // status 'done' with zero 'final' outputs, and runAndPersistPipeline would
  // persist that as a successful job. The client's isTerminal check requires
  // a 'final' output that would never arrive, leaving the user on an infinite
  // loading spinner. Throwing routes this into runAndPersistPipeline's
  // existing catch block, which correctly persists status:'failed'.
  if (!approved && !bestDraft && !isSoftDeleted(job.id)) {
    throw new Error('Writer failed to produce a valid draft after 3 attempts');
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
    try {
      await persistJobToDB(failedResult);
    } catch (persistErr) {
      // WHY: persistJobToDB's platform/tone/targetAudience validation throws
      // before its own try/catch, so a job whose data was already invalid
      // (e.g. a stale tone value) throws again here identically. Without this
      // guard that second throw escapes uncaught, leaving the job marked
      // terminal in the in-memory store (line above) with zero DB row and no
      // record of why — this catch ensures at least a log + Sentry trail
      // survives even when the failed-job persist itself fails.
      console.error(`[pipeline] Failed to persist failed-job record for ${job.id} — job has no DB row:`, persistErr);
      Sentry.captureException(persistErr, {
        tags: { jobId: job.id, stage: 'pipeline-persist-failed-result' },
        contexts: { originalError: { message: errorMessage } },
      });
    }

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
