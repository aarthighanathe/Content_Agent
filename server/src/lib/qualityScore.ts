// Shared critique/final quality score picker (CORR-004).
// WHY: last critique / final.qualityScore: critic retries append multiple
// critique rows; Result used .pop() while Library/list used .find() (first),
// so the same job showed different scores across surfaces.

export interface ScoreableOutput {
  outputType: string;
  qualityScore?: number | null;
  content?: unknown;
}

function scoreFromContent(content: unknown): number | null {
  if (
    content
    && typeof content === 'object'
    && 'totalScore' in content
    && typeof (content as { totalScore: unknown }).totalScore === 'number'
  ) {
    return (content as { totalScore: number }).totalScore;
  }
  return null;
}

/** Prefer the latest final's qualityScore, else the latest critique. */
export function getLatestQualityScore(outputs: ScoreableOutput[] | undefined | null): number | null {
  if (!Array.isArray(outputs) || outputs.length === 0) return null;

  for (let i = outputs.length - 1; i >= 0; i--) {
    const o = outputs[i];
    if (o.outputType === 'final' && typeof o.qualityScore === 'number') {
      return o.qualityScore;
    }
  }

  for (let i = outputs.length - 1; i >= 0; i--) {
    const o = outputs[i];
    if (o.outputType !== 'critique') continue;
    if (typeof o.qualityScore === 'number') return o.qualityScore;
    const fromContent = scoreFromContent(o.content);
    if (fromContent !== null) return fromContent;
  }

  return null;
}

/**
 * Critique that should drive feedback UI.
 * WHY: prefer the critique whose score matches final.qualityScore — older jobs
 * may still have multiple critique rows after a worse round overwrote the card
 * while bestDraft stayed; matching keeps feedback aligned with the shown score.
 */
export function getLatestCritique<T extends ScoreableOutput>(outputs: T[] | undefined | null): T | undefined {
  if (!Array.isArray(outputs) || outputs.length === 0) return undefined;

  let finalScore: number | undefined;
  for (let i = outputs.length - 1; i >= 0; i--) {
    const o = outputs[i];
    if (o.outputType === 'final' && typeof o.qualityScore === 'number') {
      finalScore = o.qualityScore;
      break;
    }
  }

  if (finalScore !== undefined) {
    for (let i = outputs.length - 1; i >= 0; i--) {
      const o = outputs[i];
      if (o.outputType !== 'critique') continue;
      const score =
        typeof o.qualityScore === 'number' ? o.qualityScore : scoreFromContent(o.content);
      if (score === finalScore) return o;
    }
  }

  for (let i = outputs.length - 1; i >= 0; i--) {
    if (outputs[i].outputType === 'critique') return outputs[i];
  }
  return undefined;
}
