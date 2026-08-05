// WHY content: unknown — an output's content shape varies by outputType (research/draft/
// critique/final/prediction); matches the canonical JobOutput in types/job.ts. Callers must
// narrow with a type guard (see getCritiqueScores in Dashboard.tsx) instead of assuming shape.
export interface JobOutput {
  outputType: string;
  qualityScore?: number | null;
  content?: unknown;
  scores?: Record<string, number> | null;
}

export interface DashboardJob {
  id: string;
  topic: string;
  platform: string;
  status: string;
  createdAt: string;
  outputs?: JobOutput[] | null;
}

export interface PlatformBreakdownItem {
  platform: string;
  avgScore: number;
  count: number;
}

// Type guard for critique.content — narrows `unknown` to the shape read by
// personalizedTips (Dashboard.tsx) without assuming it at the type level.
export function getContentScores(content: unknown): Record<string, number> | null {
  if (
    typeof content === 'object' &&
    content !== null &&
    'scores' in content &&
    typeof (content as { scores?: unknown }).scores === 'object' &&
    (content as { scores?: unknown }).scores !== null
  ) {
    return (content as { scores: Record<string, number> }).scores;
  }
  return null;
}

// Type guard for critique.content.totalScore — narrows `unknown` for
// RecentGenerations.tsx's quality-score display without assuming shape.
export function getContentTotalScore(content: unknown): number | null {
  if (
    typeof content === 'object' &&
    content !== null &&
    'totalScore' in content &&
    typeof (content as { totalScore?: unknown }).totalScore === 'number'
  ) {
    return (content as { totalScore: number }).totalScore;
  }
  return null;
}
