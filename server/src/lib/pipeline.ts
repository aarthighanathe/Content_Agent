import * as Sentry from '@sentry/node';
import { sseManager } from './sse.js';
import { persistJobToDB } from './persistJob.js';
import { jobsMemory } from '../routes/jobs/ownership.js';
import { getJobFromStore } from '../workers/contentWorker.js';
import { ContentJob } from '../db/schema.js';
import { runOrchestrator } from '../agents/orchestrator.js';
import { runResearcher } from '../agents/researcher.js';
import { runWriter } from '../agents/writer.js';
import { runFormatter } from '../agents/formatter.js';
import { runCritic } from '../agents/critic.js';
import { runPerformancePredictor } from '../agents/performancePredictor.js';

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

export type EmitProgress = (
  stage: string,
  progress: number,
  agent: string,
  message: string,
  durationMs?: number,
) => void;

// WHY: Content Multiplier (routes/jobs/manage.ts POST /:jobId/multiply) reuses
// research from a source job and must skip straight to the Writer stage —
// re-running the orchestrator/researcher would waste Tavily/Gemini quota on
// data we already have. This carries exactly what stage 3 (Writer) needs so
// runContentPipeline can seed orchestratorResult/researchResult without ever
// calling runOrchestrator/runResearcher.
export interface SkipResearchOpts {
  researchResult: any;
  taskPlan: string;
  platformRules: any;
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
): Promise<{ status: 'done'; outputs: any[]; logs: any[]; criticResult: any }> {
  const outputs: any[] = [];
  const logs: any[] = [];

  let orchestratorResult: { taskPlan: string; platformRules: any; searchQueries: string[] };
  let researchResult: any;

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
  let bestDraft: any = null;
  let bestScore = 0;
  let lastCriticResult: any = null;
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
    const writerResult = await runWriter(asContentJob(job), {
      researchReport: researchResult,
      taskPlan: orchestratorResult.taskPlan,
      platformRules: orchestratorResult.platformRules,
      brandVoice: job.brandVoice,
      phrasesUse: job.phrasesUse,
      phrasesAvoid: job.phrasesAvoid,
      contentDna: job.contentDna,
      criticFeedback,
    });
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
  const finalContent = outputs.find((o) => o.outputType === 'final')?.content;
  emitProgress('predicting', 95, 'system', 'Predicting engagement performance…');
  const [predResult] = await Promise.allSettled([
    finalContent
      ? runPerformancePredictor(asContentJob(job), finalContent, lastCriticResult, researchResult)
          .catch((e: any) => { console.warn('Predictor failed (non-fatal):', e?.message); return null; })
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
    set: (jobId: string, data: any) => void;
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

    const jobResult = { ...job, status: 'done', outputs, logs, criticResult };
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
  } catch (error: any) {
    console.error(`Pipeline failed for ${job.id}:`, error);

    if (isSoftDeleted(job.id)) {
      store.evict(job.id);
      return;
    }

    Sentry.captureException(error, { tags: { jobId: job.id, stage: 'pipeline' }, contexts: { job: { topic: job.topic, platform: job.platform } } });
    const failedResult = { ...job, status: 'failed', error: error.message || 'Internal pipeline failure', outputs: [], logs: [] };
    store.set(job.id, failedResult);
    await persistJobToDB(failedResult);

    sseManager.sendEvent(job.id, {
      type: 'progress',
      stage: 'failed',
      progress: 0,
      agent: 'system',
      message: `Job failed: ${error.message || 'Internal pipeline failure'}`,
    });
    throw error;
  }
}

function isSoftDeleted(jobId: string): boolean {
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  return memJob?.deleted === 1;
}
