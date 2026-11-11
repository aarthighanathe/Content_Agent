// Shared critique/final quality score picker (CORR-004).
// Mirrors server/src/lib/qualityScore.ts — keep both in sync (client cannot
// import server modules). Prefer last final.qualityScore, else last critique.

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

export function getLatestCritique<T extends ScoreableOutput>(outputs: T[] | undefined | null): T | undefined {
  if (!Array.isArray(outputs) || outputs.length === 0) return undefined;
  for (let i = outputs.length - 1; i >= 0; i--) {
    if (outputs[i].outputType === 'critique') return outputs[i];
  }
  return undefined;
}
