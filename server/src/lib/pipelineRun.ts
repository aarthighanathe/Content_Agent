import { jobsMemory, getJobFromStore } from './jobStore.js';
import { ContentJob, contentJobs } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { runOrchestrator, type OrchestratorResult } from '../agents/orchestrator.js';
import { runResearcher, type ResearchResult } from '../agents/researcher.js';
import { runWriter } from '../agents/writer.js';
import { runFormatter, type FormatterResponse } from '../agents/formatter.js';
import { runCritic, type CriticResult } from '../agents/critic.js';
import { runPerformancePredictor } from '../agents/performancePredictor.js';
import { sanitizeSearchText } from './sanitizeSearchText.js';
import { isValidUUID } from './uuid.js';
import type {
  PipelineOutput,
  PipelineLog,
  PipelineJob,
  EmitProgress,
  SkipResearchOpts,
} from './pipelineTypes.js';

// WHY: capped: critic feedback is LLM-generated instruction text fed back into
// the writer prompt — unbounded length burns tokens and amplifies any injection
// residue that sanitizeSearchText redacts incompletely.
const CRITIC_FEEDBACK_MAX_CHARS = 600;

function prepareCriticFeedback(raw: string): string {
  return sanitizeSearchText(raw).slice(0, CRITIC_FEEDBACK_MAX_CHARS);
}

// WHY: extracted from pipeline.ts: that file exceeded the 400-line cap; the
// Orchestrator→Critic loop has no dependency on persist/eviction and can live
// alone while runAndPersistPipeline stays the shared success/failure tail.

/** True when soft-delete flipped deleted=1 mid-run (memory-first, sync). */
export function isSoftDeleted(jobId: string): boolean {
  const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
  return memJob?.deleted === 1;
}

// WHY (M2): DELETE elsewhere sets DB deleted=1 (memory may miss) — check DB once
// per stage boundary so Gemini stops sooner; persist refuse stays defense-in-depth.
async function isSoftDeletedDurable(jobId: string): Promise<boolean> {
  if (isSoftDeleted(jobId)) return true;
  if (!db || !isValidUUID(jobId)) return false;
  try {
    const rows = await db
      .select({ deleted: contentJobs.deleted })
      .from(contentJobs)
      .where(eq(contentJobs.id, jobId))
      .limit(1);
    if (rows.length > 0 && rows[0]?.deleted === 1) {
      const memJob = getJobFromStore(jobId) || jobsMemory.get(jobId);
      if (memJob) memJob.deleted = 1;
      return true;
    }
  } catch {
    // WHY: fail open to memory-only — a DB blip must not abort a healthy run.
  }
  return false;
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

// WHY: a type guard before cast: CLAUDE.md requires a runtime check before any
// `as` cast. FormatterResponse has a known shape (hook/cta/tweets/caption/etc.
// depending on platform), so we verify at least one expected field exists
// before trusting the cast. This prevents a malformed content shape from
// silently flowing through as a valid FormatterResponse.
// WHY: Array.isArray is checked first: carousels format to a plain slide array
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
    // from the source job's cached outputs (no Tavily/orchestrator LLM call).
    // WHY: still push research+orchestrator outputs: Adapt-of-Adapt used to fail
    // with "No cached research" because multiply jobs persisted none. Copying
    // the reused bundle onto this job keeps the lineage self-contained.
    researchResult = opts.skipResearch.researchResult;
    orchestratorResult = {
      taskPlan: opts.skipResearch.taskPlan,
      platformRules: opts.skipResearch.platformRules,
      searchQueries: [],
    };
    outputs.push({ agentName: 'orchestrator', outputType: 'research', content: orchestratorResult });
    outputs.push({ agentName: 'researcher', outputType: 'research', content: researchResult });
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

    // WHY (M2): stage-boundary durable check — stop before Tavily if deleted elsewhere.
    if (await isSoftDeletedDurable(job.id)) {
      return { status: 'done', outputs, logs, criticResult: null };
    }

    // Stage 2: Research
    emitProgress('researching', 25, 'researcher', 'Analyzing trends and gathering facts…');
    const resStart = Date.now();
    researchResult = await runResearcher(asContentJob(job), orchestratorResult.searchQueries);
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

  // WHY (M2): stage-boundary durable check before the expensive write loop
  // (covers skipResearch path too — Adapt never ran the research checks above).
  if (await isSoftDeletedDurable(job.id)) {
    return { status: 'done', outputs, logs, criticResult: null };
  }

  // Stage 3: Write → Format → Critique loop
  let retryCount = 0;
  let approved = false;
  let bestDraft: FormatterResponse | null = null;
  // WHY: -1: a legitimate score of 0 must still be able to claim bestDraft.
  let bestScore = -1;
  let lastCriticResult: CriticResult | null = null;
  // WHY: sourceMaterial stays fixed across critic retries: article text is
  // reference data, not revision instructions (SEC-003). initialFeedback is
  // user regenerate notes and is replaced by critic feedback after round 1.
  const sourceMaterial = job.sourceMaterial || undefined;
  // SECURITY: initialFeedback is user regenerate notes — sanitize + cap before
  // the writer prompt treats it as revision instructions (same as critic path).
  let criticFeedback: string | undefined = job.initialFeedback
    ? prepareCriticFeedback(job.initialFeedback)
    : undefined;

  while (!approved && retryCount < 3) {
    // WHY: durable check before each Writer/Formatter/Critic round-trip (the most
    // expensive part) so a mid-run delete on another path/process stops Gemini
    // sooner — memory-only missed cross-process deletes (M2).
    if (await isSoftDeletedDurable(job.id)) break;

    const attemptBase = retryCount === 0 ? 40 : 60 + retryCount * 5;

    emitProgress('writing', attemptBase + 2, 'writer', retryCount > 0 ? `Revising draft (attempt ${retryCount + 1})…` : 'Drafting content…');
    const wStart = Date.now();
    // WHY: caught here, not left to propagate: runWriter throws when a carousel
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
        sourceMaterial,
        criticFeedback,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Writer produced an invalid draft';
      // WHY: rethrow (unless a draft exists): a provider outage is not a validation
      // problem — feeding it back as "your response was invalid" wastes retries and
      // pollutes the prompt. With a bestDraft already in hand, deliver it as partial.
      if (/All AI providers failed/i.test(message)) {
        if (bestDraft) break;
        throw err;
      }
      const wMs = Date.now() - wStart;
      logs.push({
        agentName: 'writer',
        action: `Draft REJECTED (${message})`,
        inputSummary: criticFeedback ? `Revising with feedback: ${criticFeedback.slice(0, 100)}` : 'Creating initial draft',
        outputSummary: 'Writer output failed validation — requesting revision',
        durationMs: wMs,
      });
      // WHY: appended, not replaced: overwriting criticFeedback here discarded
      // any substantive critic feedback from a prior iteration (e.g. "CTA is
      // vague") the moment a later attempt merely failed validation — the next
      // writer call would then only see the generic validation error and lose
      // the qualitative guidance entirely.
      const validationNote = `Your previous response was invalid: ${message}. Follow the required JSON structure exactly and provide complete, non-placeholder content for every field.`;
      criticFeedback = prepareCriticFeedback(
        criticFeedback ? `${criticFeedback}\n\n${validationNote}` : validationNote,
      );
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

    // WHY: try/catch: a formatter/critic throw used to discard a good earlier draft;
    // with bestDraft present we break out and deliver it as partial instead.
    let formattedContent: FormatterResponse;
    let criticResult: CriticResult;
    let fMs: number;
    let cMs: number;
    try {
      const fStart = Date.now();
      formattedContent = await runFormatter(asContentJob(job), writerResult);
      fMs = Date.now() - fStart;
      logs.push({
        agentName: 'formatter',
        action: 'Content formatted for platform',
        inputSummary: `Formatting ${job.platform} content`,
        outputSummary: 'Applied platform-specific formatting rules',
        durationMs: fMs,
      });
      emitProgress('critiquing', attemptBase + 18, 'formatter', 'Formatting done — running quality review…', fMs);

      const cStart = Date.now();
      criticResult = await runCritic(asContentJob(job), formattedContent, job.brandVoice);
      cMs = Date.now() - cStart;
    } catch (err) {
      if (!bestDraft) throw err;
      console.warn('Formatter/critic failed; delivering best draft:', err instanceof Error ? err.message : String(err));
      logs.push({
        agentName: 'critic',
        action: 'Review failed — delivering best earlier draft',
        inputSummary: `Evaluating ${job.platform} content`,
        outputSummary: err instanceof Error ? err.message.slice(0, 200) : 'Unknown error',
        durationMs: 0,
      });
      break;
    }
    lastCriticResult = criticResult;
    logs.push({
      agentName: 'critic',
      action: criticResult.approved ? 'Content APPROVED' : `Content REJECTED (score: ${criticResult.totalScore}/100)`,
      inputSummary: `Evaluating ${job.platform} content`,
      outputSummary: `Score: ${criticResult.totalScore}/100 - ${criticResult.approved ? 'APPROVED' : 'REJECTED'}`,
      durationMs: cMs,
    });
    outputs.push({ agentName: 'critic', outputType: 'critique', content: criticResult, qualityScore: criticResult.totalScore });

    if (criticResult.totalScore > bestScore || !bestDraft) {
      bestScore = criticResult.totalScore;
      bestDraft = formattedContent;
    }

    if (criticResult.approved) {
      approved = true;
      outputs.push({ agentName: 'writer', outputType: 'final', content: formattedContent, qualityScore: criticResult.totalScore });
      emitProgress('critiquing', 92, 'critic', `Approved! Quality score: ${criticResult.totalScore}/100`, cMs);
    } else {
      // SECURITY: critic feedback is model-generated text re-injected into the
      // writer prompt — neutralize injection patterns and cap length (M6).
      criticFeedback = prepareCriticFeedback(criticResult.feedback);
      retryCount++;
      job.retryCount = retryCount;
      emitProgress('writing', attemptBase + 25, 'critic', `Score ${criticResult.totalScore}/100 — requesting revision…`, cMs);
    }
  }

  if (!approved && bestDraft) {
    outputs.push({ agentName: 'writer', outputType: 'final', content: bestDraft, qualityScore: bestScore, partial: true });
  }

  // WHY: throw here instead of falling through: if every retry attempt threw
  // (runWriter kept producing invalid drafts) the critic never ran once, so
  // bestDraft is still null — without this check the function would return
  // status 'done' with zero 'final' outputs, and runAndPersistPipeline would
  // persist that as a successful job. The client's isTerminal check requires
  // a 'final' output that would never arrive, leaving the user on an infinite
  // loading spinner. Throwing routes this into runAndPersistPipeline's
  // existing catch block, which correctly persists status:'failed'.
  if (!approved && !bestDraft && !(await isSoftDeletedDurable(job.id))) {
    throw new Error('Writer failed to produce a valid draft after 3 attempts');
  }

  // WHY: bail before predictor: soft-delete is checked between writer rounds, but
  // breaking that loop used to still run the performance predictor (another LLM
  // call) before runAndPersistPipeline noticed deleted=1. Skip it entirely.
  if (await isSoftDeletedDurable(job.id)) {
    return { status: 'done', outputs, logs, criticResult: lastCriticResult };
  }

  // Stage 4: Performance prediction (non-fatal — a predictor failure must not fail the job)
  // WHY: 'predicting' not 'done': emitProgress sets jobData.status='done' whenever
  // stage==='done', and callers treat status==='done' as "outputs are ready to
  // render". Labeling this pre-persist stage 'done' let clients observe
  // status:'done' with no outputs attached yet — the exact bug that caused the
  // Result page to freeze on a stale, output-less snapshot mid-pipeline.
  // WHY: the cast here: finalContent comes back out of the PipelineOutput[]
  // array as `unknown` (see PipelineOutput's own WHY — outputType doesn't
  // discriminate cleanly enough to type `content` precisely at rest), but it
  // was pushed in a few lines up as exactly `formattedContent`
  // (FormatterResponse, itself built from WriterResponse) — this is the same
  // "we know more than the type system can prove from storage alone" gap
  // asContentJob documents above, not a new unverified assumption.
  // WHY: the type guard before cast: CLAUDE.md requires a runtime check before
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

