import {
  runOrchestrator,
  buildTargetPlatformTaskPlan,
  getPlatformRules,
  type OrchestratorResult,
} from '../agents/orchestrator.js';
import { runResearcher, type ResearchResult } from '../agents/researcher.js';
import { runPerformancePredictor } from '../agents/performancePredictor.js';
import type { FormatterResponse } from '../agents/formatter.js';
import type { CriticResult } from '../agents/critic.js';
import { aborted, classifyAbort } from './pipelineAbort.js';
import { runWriteCritiqueLoop } from './pipelineWriteLoop.js';
import type {
  PipelineOutput,
  PipelineLog,
  PipelineJob,
  EmitProgress,
  PipelineRunOpts,
} from './pipelineTypes.js';

// WHY: re-export so existing `from './pipelineRun.js'` / pipeline.js importers
// keep working after abort helpers moved under the 400-line cap.
export { isSoftDeleted } from './pipelineAbort.js';

// WHY: extracted from pipeline.ts: that file exceeded the 400-line cap; the
// Orchestrator→Critic loop has no dependency on persist/eviction and can live
// alone while runAndPersistPipeline stays the shared success/failure tail.

// WHY: runtime check before the cast. Array.isArray first — carousels are a
// slide array with none of the hook/tweets/caption keys, and the predictor
// treats that as the carousel case.
function isFormatterResponse(content: unknown): content is FormatterResponse {
  return (
    Array.isArray(content) ||
    (typeof content === 'object' &&
      content !== null &&
      ('hook' in content || 'tweets' in content || 'caption' in content))
  );
}

// WHY: lock_lost is a dropped content:run key, not a user delete.
export type PipelineRunResult = {
  status: 'done' | 'cancelled' | 'lock_lost';
  outputs: PipelineOutput[];
  logs: PipelineLog[];
  criticResult: CriticResult | null;
};

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
  opts?: PipelineRunOpts,
): Promise<PipelineRunResult> {
  const outputs: PipelineOutput[] = [];
  const logs: PipelineLog[] = [];
  const runLockSignal = opts?.runLockSignal;

  let orchestratorResult: OrchestratorResult;
  let researchResult: ResearchResult;

  if (opts?.skipResearch) {
    // FLOW: Content Multiplier path — reuse cached research only (no Tavily).
    // WHY: never reuse source taskPlan/platformRules — those describe the source
    // platform; build a target-platform plan/rules for job.platform instead.
    // WHY: still push research+orchestrator outputs: Adapt-of-Adapt used to fail
    // with "No cached research" because multiply jobs persisted none. Copying
    // the reused research onto this job keeps the lineage self-contained.
    researchResult = opts.skipResearch.researchResult;
    orchestratorResult = {
      taskPlan: buildTargetPlatformTaskPlan(job),
      platformRules: getPlatformRules(job.platform),
      searchQueries: [],
    };
    outputs.push({ agentName: 'orchestrator', outputType: 'research', content: orchestratorResult });
    outputs.push({ agentName: 'researcher', outputType: 'research', content: researchResult });
    emitProgress('writing', 10, 'system', `Adapting to ${job.platform.replace(/_/g, ' ')}…`);
  } else {
    // Stage 1: Planning
    emitProgress('planning', 5, 'orchestrator', 'Planning content structure…');
    const orchStart = Date.now();
    orchestratorResult = await runOrchestrator(job);
    const orchMs = Date.now() - orchStart;
    logs.push({
      agentName: 'orchestrator',
      action: 'Created task plan and search queries',
      inputSummary: `Topic: ${job.topic}, Platform: ${job.platform}`,
      outputSummary: `Plan created with ${orchestratorResult.searchQueries.length} search queries`,
      durationMs: orchMs,
    });
    outputs.push({ agentName: 'orchestrator', outputType: 'research', content: orchestratorResult });
    emitProgress(
      'researching',
      20,
      'orchestrator',
      `Task plan created — ${orchestratorResult.searchQueries.length} search queries`,
      orchMs,
    );

    // WHY (M2): stage-boundary durable check — stop before Tavily if deleted elsewhere.
    const abortEarly = await classifyAbort(job.id, runLockSignal);
    if (abortEarly) return aborted(abortEarly, outputs, logs, null);

    // Stage 2: Research
    emitProgress('researching', 25, 'researcher', 'Analyzing trends and gathering facts…');
    const resStart = Date.now();
    researchResult = await runResearcher(job, orchestratorResult.searchQueries);
    const resMs = Date.now() - resStart;
    // WHY: (M4): empty Tavily / no extractable facts — mark research output partial
    // so downstream can tell thin research from a full report without failing the job.
    const thinResearch = researchResult.keyFacts.length === 0
      && researchResult.trendingAngles.length === 0;
    logs.push({
      agentName: 'researcher',
      action: 'Web research completed',
      inputSummary: `Queries: ${orchestratorResult.searchQueries.join(', ')}`,
      outputSummary: thinResearch
        ? 'No sources/facts — continuing with topic only'
        : `Found ${researchResult.keyFacts.length} facts, ${researchResult.trendingAngles.length} angles`,
      durationMs: resMs,
    });
    outputs.push({
      agentName: 'researcher',
      outputType: 'research',
      content: researchResult,
      ...(thinResearch ? { partial: true } : {}),
    });
    emitProgress(
      'writing',
      40,
      'researcher',
      thinResearch
        ? 'Research returned no sources — continuing with topic only'
        : `Research done — ${researchResult.keyFacts.length} key facts`,
      resMs,
    );
  }

  // WHY (M2): stage-boundary check before the write loop (covers skipResearch).
  const abortWrite = await classifyAbort(job.id, runLockSignal);
  if (abortWrite) return aborted(abortWrite, outputs, logs, null);

  // Stage 3: Write → Format → Critique (see pipelineWriteLoop.ts)
  const writeLoop = await runWriteCritiqueLoop(
    job,
    emitProgress,
    researchResult,
    orchestratorResult,
    outputs,
    logs,
    runLockSignal,
  );

  if (writeLoop.aborted) {
    return aborted(writeLoop.aborted, outputs, logs, writeLoop.lastCriticResult);
  }

  const { approved, bestDraft, bestScore, lastCriticResult } = writeLoop;

  // WHY: cancelled before promoting bestDraft→final — a mid-run delete must not
  // return status:'done' (with or without a final) that callers treat as success.
  const abortLate = await classifyAbort(job.id, runLockSignal);
  if (abortLate) return aborted(abortLate, outputs, logs, lastCriticResult);

  if (!approved && bestDraft) {
    outputs.push({
      agentName: 'writer',
      outputType: 'final',
      content: bestDraft,
      // WHY: bestScore stays -1 when formatter seeded a draft but critic never
      // scored it — omit qualityScore so the UI does not show a fake 0/100.
      ...(bestScore >= 0 ? { qualityScore: bestScore } : {}),
      partial: true,
    });
  }

  // WHY: throw when every writer attempt failed with no bestDraft — otherwise
  // we'd return status 'done' with zero finals and leave the client spinning.
  if (!approved && !bestDraft) {
    throw new Error('Writer failed to produce a valid draft after 3 attempts');
  }

  // Stage 4: Performance prediction (non-fatal)
  // WHY: 'predicting' not 'done': emitProgress sets status='done' on stage==='done',
  // which let clients observe done with no outputs attached yet.
  const finalContentRaw = outputs.find((o) => o.outputType === 'final')?.content;
  const finalContent = finalContentRaw && isFormatterResponse(finalContentRaw)
    ? finalContentRaw
    : undefined;
  emitProgress('predicting', 95, 'system', 'Predicting engagement performance…');
  const [predResult] = await Promise.allSettled([
    finalContent
      ? runPerformancePredictor(job, finalContent, lastCriticResult ?? undefined, researchResult)
          .catch((e: unknown) => {
            console.warn(
              'Predictor failed (non-fatal):',
              e instanceof Error ? e.message : String(e),
            );
            return null;
          })
      : Promise.resolve(null),
  ]);
  if (predResult.status === 'fulfilled' && predResult.value) {
    outputs.push({ agentName: 'predictor', outputType: 'prediction', content: predResult.value });
  }

  return { status: 'done', outputs, logs, criticResult: lastCriticResult };
}
