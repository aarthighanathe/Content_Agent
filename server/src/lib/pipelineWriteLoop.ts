import { runWriter } from '../agents/writer.js';
import { runFormatter, type FormatterResponse } from '../agents/formatter.js';
import { runCriticWithFallbackRetries, type CriticResult } from '../agents/critic.js';
import type { OrchestratorResult } from '../agents/orchestrator.js';
import type { ResearchResult } from '../agents/researcher.js';
import { classifyAbort, type RunAbort } from './pipelineAbort.js';
import {
  CLIENT_CRITIC_REVIEW_FAILED,
  CLIENT_WRITER_DRAFT_REJECTED,
} from './clientErrors.js';
import { logger } from './logger.js';
import { sanitizeSearchText } from './sanitizeSearchText.js';
import type {
  PipelineOutput,
  PipelineLog,
  PipelineJob,
  EmitProgress,
} from './pipelineTypes.js';

// WHY: capped: critic feedback is LLM-generated instruction text fed back into
// the writer prompt — unbounded length burns tokens and amplifies any injection
// residue that sanitizeSearchText redacts incompletely.
const CRITIC_FEEDBACK_MAX_CHARS = 600;

function prepareCriticFeedback(raw: string): string {
  return sanitizeSearchText(raw).slice(0, CRITIC_FEEDBACK_MAX_CHARS);
}

// WHY: validation/completeness notes must survive the 600-char cap — appending
// then slicing dropped them whenever prior feedback already filled the budget.
function prepareCriticFeedbackWithTrailingNote(
  prior: string | undefined,
  note: string,
): string {
  const safeNote = sanitizeSearchText(note);
  if (!prior) {
    return safeNote.slice(0, CRITIC_FEEDBACK_MAX_CHARS);
  }
  const safePrior = sanitizeSearchText(prior);
  const sep = '\n\n';
  const reserved = Math.min(safeNote.length + sep.length, CRITIC_FEEDBACK_MAX_CHARS);
  const priorCap = CRITIC_FEEDBACK_MAX_CHARS - reserved;
  const head = priorCap > 0 ? safePrior.slice(0, priorCap) : '';
  return (head ? `${head}${sep}${safeNote}` : safeNote).slice(0, CRITIC_FEEDBACK_MAX_CHARS);
}

export type WriteLoopResult = {
  approved: boolean;
  bestDraft: FormatterResponse | null;
  bestScore: number;
  lastCriticResult: CriticResult | null;
  aborted: RunAbort | null;
};

/**
 * Stage 3 Write → Format → Critique loop. Extracted from pipelineRun.ts under
 * the 400-line cap after Pass-5 FALLBACK + separate retry-budget fixes.
 */
export async function runWriteCritiqueLoop(
  job: PipelineJob,
  emitProgress: EmitProgress,
  researchResult: ResearchResult,
  orchestratorResult: OrchestratorResult,
  outputs: PipelineOutput[],
  logs: PipelineLog[],
  runLockSignal?: AbortSignal,
): Promise<WriteLoopResult> {
  // WHY: separate budgets — validation-only continues used to burn the shared
  // criticRevisionAttempts cap and starve real Writer←Critic revision rounds.
  let writerValidationAttempts = 0;
  let criticRevisionAttempts = 0;
  let approved = false;
  let bestDraft: FormatterResponse | null = null;
  // WHY: -1: a legitimate score of 0 must still be able to claim bestDraft.
  let bestScore = -1;
  let lastCriticResult: CriticResult | null = null;
  // WHY: track a real (non-FALLBACK) critique so synthetic score 50 cannot
  // replace bestDraft / lastCriticResult / display critique later.
  let sawRealCritique = false;
  // WHY: sourceMaterial stays fixed across critic retries: article text is
  // reference data, not revision instructions (SEC-003).
  const sourceMaterial = job.sourceMaterial || undefined;
  // SECURITY: initialFeedback is user regenerate notes — sanitize + cap before
  // the writer prompt treats it as revision instructions (same as critic path).
  let criticFeedback: string | undefined = job.initialFeedback
    ? prepareCriticFeedback(job.initialFeedback)
    : undefined;

  while (!approved && criticRevisionAttempts < 3 && writerValidationAttempts < 3) {
    // WHY: durable check before each expensive round so mid-run deletes stop Gemini.
    const abortKind = await classifyAbort(job.id, runLockSignal);
    if (abortKind) {
      return { approved, bestDraft, bestScore, lastCriticResult, aborted: abortKind };
    }

    const round = criticRevisionAttempts + writerValidationAttempts;
    const attemptBase = round === 0 ? 40 : 60 + round * 5;

    emitProgress(
      'writing',
      attemptBase + 2,
      'writer',
      round > 0 ? `Revising draft (attempt ${round + 1})…` : 'Drafting content…',
    );
    const wStart = Date.now();
    // WHY: catch validation throws here so incomplete drafts retry in-loop (M7)
    // instead of hard-failing the whole job on the first bad response.
    let writerResult;
    try {
      writerResult = await runWriter(job, {
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
      if (/All AI providers failed/i.test(message)) {
        if (bestDraft) break;
        throw err;
      }
      const wMs = Date.now() - wStart;
      // SECURITY: logs are client-visible (LoadingView / GET /:jobId) — fixed
      // string only; raw provider text stays in the server logger.
      logger.warn('[pipeline] Writer draft rejected', {
        jobId: job.id,
        error: message,
        durationMs: wMs,
      });
      logs.push({
        agentName: 'writer',
        action: CLIENT_WRITER_DRAFT_REJECTED,
        inputSummary: criticFeedback
          ? `Revising with feedback: ${criticFeedback.slice(0, 100)}`
          : 'Creating initial draft',
        outputSummary: 'Writer output failed validation — requesting revision',
        durationMs: wMs,
      });
      // WHY: fixed note for the next writer pass — err.message must not land in
      // criticFeedback (next round's inputSummary is also client-visible).
      const validationNote =
        'Your previous response was invalid. Follow the required JSON structure exactly and provide complete, non-placeholder content for every field.';
      criticFeedback = prepareCriticFeedbackWithTrailingNote(criticFeedback, validationNote);
      writerValidationAttempts++;
      job.retryCount = criticRevisionAttempts + writerValidationAttempts;
      emitProgress('writing', attemptBase + 5, 'writer', 'Draft invalid — requesting revision…', wMs);
      continue;
    }
    const wMs = Date.now() - wStart;
    logs.push({
      agentName: 'writer',
      action: criticRevisionAttempts > 0 ? `Revision ${criticRevisionAttempts}` : 'Initial draft created',
      inputSummary: criticFeedback
        ? `Revising with feedback: ${criticFeedback.slice(0, 100)}`
        : 'Creating initial draft',
      outputSummary: `Draft generated for ${job.platform}`,
      durationMs: wMs,
    });
    outputs.push({ agentName: 'writer', outputType: 'draft', content: writerResult });
    emitProgress('formatting', attemptBase + 10, 'writer', 'Draft written — applying platform rules…', wMs);

    let formattedContent: FormatterResponse;
    let criticResult: CriticResult;
    let cMs: number;
    try {
      const fStart = Date.now();
      formattedContent = await runFormatter(job, writerResult);
      const fMs = Date.now() - fStart;
      logs.push({
        agentName: 'formatter',
        action: 'Content formatted for platform',
        inputSummary: `Formatting ${job.platform} content`,
        outputSummary: 'Applied platform-specific formatting rules',
        durationMs: fMs,
      });
      emitProgress('critiquing', attemptBase + 18, 'formatter', 'Formatting done — running quality review…', fMs);

      // WHY: seed draft only — bestScore stays -1 until a real/FALLBACK critique
      // so a critic throw cannot promote a fake 0/100 qualityScore.
      if (!bestDraft) {
        bestDraft = formattedContent;
      }

      const criticRun = await runCriticWithFallbackRetries(
        job,
        formattedContent,
        job.brandVoice,
        {
          onParseRetry: (attempt, elapsedMs) => {
            emitProgress(
              'critiquing',
              attemptBase + 18,
              'critic',
              `Quality review unreadable — retrying critic (${attempt}/2)…`,
              elapsedMs,
            );
          },
        },
      );
      criticResult = criticRun.result;
      cMs = criticRun.durationMs;
    } catch (err) {
      if (!bestDraft) throw err;
      // SECURITY: outputSummary is persisted on GET /:jobId — fixed client string.
      logger.warn('[pipeline] Formatter/critic failed; delivering best draft', {
        jobId: job.id,
        error: err instanceof Error ? err.message : String(err),
      });
      logs.push({
        agentName: 'critic',
        action: 'Review failed — delivering best earlier draft',
        inputSummary: `Evaluating ${job.platform} content`,
        outputSummary: CLIENT_CRITIC_REVIEW_FAILED,
        durationMs: 0,
      });
      break;
    }

    logs.push({
      agentName: 'critic',
      action: criticResult.usedFallback
        ? 'Critic FALLBACK (parse/useless) — keeping draft without writer revision'
        : criticResult.approved
          ? 'Content APPROVED'
          : `Content REJECTED (score: ${criticResult.totalScore}/100)`,
      inputSummary: `Evaluating ${job.platform} content`,
      outputSummary: `Score: ${criticResult.totalScore}/100 - ${
        criticResult.usedFallback
          ? 'FALLBACK'
          : criticResult.approved
            ? 'APPROVED'
            : 'REJECTED'
      }`,
      durationMs: cMs,
    });

    // WHY: synthetic FALLBACK score 50 must not beat a prior real lower critique,
    // replace lastCriticResult, or append a display critique when a real one exists.
    if (criticResult.usedFallback) {
      if (!sawRealCritique) {
        // WHY: same gate as bestDraft — a worse FALLBACK card must not become
        // lastCriticResult / display critique while bestDraft stays earlier content.
        if (criticResult.totalScore > bestScore || !bestDraft) {
          bestScore = criticResult.totalScore;
          bestDraft = formattedContent;
          lastCriticResult = criticResult;
          outputs.push({
            agentName: 'critic',
            outputType: 'critique',
            content: criticResult,
            qualityScore: criticResult.totalScore,
          });
        }
      }
      emitProgress(
        'critiquing',
        attemptBase + 25,
        'critic',
        `Quality review unavailable — keeping draft (score ${
          sawRealCritique ? bestScore : criticResult.totalScore
        }/100)`,
        cMs,
      );
      break;
    }

    // WHY: feedback-only cards omit scores but may carry inflated totalScore —
    // ranking on that total beat real dimension scores. Rank only when scores
    // exist. Still store lastCriticResult + critique on feedback-only rejects
    // so all-feedback-only runs get a quality card; only set sawRealCritique
    // once a critique row is stored so FALLBACK can still fill otherwise.
    const hasDimensionScores = criticResult.scores != null;
    const isNewBest =
      hasDimensionScores && (criticResult.totalScore > bestScore || !bestDraft);
    if (isNewBest) {
      bestScore = criticResult.totalScore;
      bestDraft = formattedContent;
      lastCriticResult = criticResult;
      outputs.push({
        agentName: 'critic',
        outputType: 'critique',
        content: criticResult,
        qualityScore: criticResult.totalScore,
      });
      sawRealCritique = true;
    }

    if (criticResult.approved) {
      approved = true;
      // WHY: always pair the approved final with this round's draft/critique —
      // a prior feedback-only inflated total must not keep Result on another card.
      bestDraft = formattedContent;
      bestScore = criticResult.totalScore;
      lastCriticResult = criticResult;
      if (!isNewBest) {
        outputs.push({
          agentName: 'critic',
          outputType: 'critique',
          content: criticResult,
          qualityScore: criticResult.totalScore,
        });
      }
      sawRealCritique = true;
      outputs.push({
        agentName: 'writer',
        outputType: 'final',
        content: formattedContent,
        qualityScore: criticResult.totalScore,
      });
      emitProgress(
        'critiquing',
        92,
        'critic',
        `Approved! Quality score: ${criticResult.totalScore}/100`,
        cMs,
      );
    } else {
      // WHY: feedback-only reject — skip bestScore compare (inflated totals) but
      // still surface a critique + advance the draft when no scored best exists.
      if (!hasDimensionScores && bestScore < 0) {
        bestDraft = formattedContent;
        lastCriticResult = criticResult;
        outputs.push({
          agentName: 'critic',
          outputType: 'critique',
          content: criticResult,
          qualityScore: criticResult.totalScore,
        });
        sawRealCritique = true;
      }
      // SECURITY: critic feedback re-injected into writer — sanitize + cap (M6).
      criticFeedback = prepareCriticFeedback(criticResult.feedback);
      criticRevisionAttempts++;
      job.retryCount = criticRevisionAttempts + writerValidationAttempts;
      emitProgress(
        'writing',
        attemptBase + 25,
        'critic',
        `Score ${criticResult.totalScore}/100 — requesting revision…`,
        cMs,
      );
    }
  }

  return { approved, bestDraft, bestScore, lastCriticResult, aborted: null };
}
