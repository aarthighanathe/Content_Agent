// WHY extracted from Result.tsx: keeps the page under the 400-line cap and
// colocates the outputType='final' / critic narrowing used only by Result.
import type { CriticResult, ContentJob } from '../../../types/job';
import type { ResultContent } from '../components/ContentColumn';
import { getLatestCritique } from '../../../lib/qualityScore';

// WHY guard instead of trusting JobOutput.content: `content: unknown` (job.ts)
// varies by outputType; a 'critique' output's content is a CriticResult object
// with these fields — narrow before use rather than casting.
export function isCriticResult(value: unknown): value is CriticResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'totalScore' in value &&
    'scores' in value
  );
}

export interface ResultDerivedContent {
  content: ResultContent | undefined;
  isPartialFinal: boolean;
  criticResult: CriticResult | undefined;
  isDone: boolean;
  isFailed: boolean;
  progress: number;
  currentStage: string;
  stageMessage: string;
  isCarousel: boolean;
}

export function deriveResultContent(jobData: ContentJob | null | undefined): ResultDerivedContent {
  // NOTE: always prefer outputType='final' for display. Other output types
  // (draft, research, critique) are intermediate pipeline artifacts — only
  // 'final' has passed the critic gate and has the quality score attached.
  // Prefer a non-partial final when both exist; partial means the critic never
  // approved and the pipeline shipped the best draft under the threshold.
  const finalOutput =
    jobData?.outputs?.find((o) => o.outputType === 'final' && !o.partial)
    ?? jobData?.outputs?.find((o) => o.outputType === 'final');
  const isPartialFinal = Boolean(finalOutput?.partial);
  // WHY latest critique (CORR-004): shared helper keeps Result aligned with
  // Library/list score pickers (critic retries append multiple rows).
  const criticOutput = getLatestCritique(jobData?.outputs);
  // WHY isCriticResult guard: criticOutput.content is `unknown`; only trust it as
  // CriticResult once narrowed. Some legacy rows may have the critic fields on
  // the output itself rather than nested under .content.
  const criticResult: CriticResult | undefined = isCriticResult(criticOutput?.content)
    ? criticOutput.content
    : isCriticResult(criticOutput)
      ? criticOutput
      : undefined;
  // WHY guard then cast: finalOutput.content is `unknown` — a 'final' output's
  // content is always an object or an array of slides, never a primitive.
  const rawContent = finalOutput?.content;
  const content: ResultContent | undefined =
    Array.isArray(rawContent) || (typeof rawContent === 'object' && rawContent !== null)
      ? (rawContent as ResultContent)
      : undefined;
  const isDone = jobData?.status === 'done';
  const isFailed = jobData?.status === 'failed';
  // WHY jobData only (not Zustand): SSE merges into jobData via mergeSSEIntoJobData.
  const progress = jobData?.progress ?? (isDone ? 100 : 0);
  const currentStage = jobData?.stage || jobData?.status || 'pending';
  const stageMessage = jobData?.message ?? '';
  const isCarousel = Array.isArray(content);

  return {
    content,
    isPartialFinal,
    criticResult,
    isDone,
    isFailed,
    progress,
    currentStage,
    stageMessage,
    isCarousel,
  };
}
