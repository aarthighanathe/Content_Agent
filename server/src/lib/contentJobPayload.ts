// WHY: BullMQ payload narrowing extracted from contentWorker so that file
// stays under the 400-line cap (worker boot + lock + pipeline stay there).
import type { SkipResearchOpts } from './pipelineTypes.js';
import type { ResearchResult } from '../agents/researcher.js';

export function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === 'string');
}

/** Reconstruct Adapt's skipResearch bundle from the BullMQ payload (JSON-safe). */
export function parseSkipResearch(raw: unknown): SkipResearchOpts | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.taskPlan !== 'string' || !o.taskPlan.trim()) return undefined;
  const researchRaw = o.researchResult;
  if (!researchRaw || typeof researchRaw !== 'object') return undefined;
  const r = researchRaw as Record<string, unknown>;
  const researchResult: ResearchResult = {
    trendingAngles: asStringArray(r.trendingAngles),
    keyFacts: asStringArray(r.keyFacts),
    suggestedHashtags: asStringArray(r.suggestedHashtags),
    competitorHooks: asStringArray(r.competitorHooks),
    sourceUrls: asStringArray(r.sourceUrls),
    // WHY: empty rawResults from queue: Tavily hits are large and unused after
    // keyFacts/angles exist — avoid trusting untyped queue JSON shapes.
    rawResults: [],
  };
  if (researchResult.keyFacts.length === 0 && researchResult.trendingAngles.length === 0) {
    return undefined;
  }
  const platformRules =
    o.platformRules && typeof o.platformRules === 'object' && !Array.isArray(o.platformRules)
      ? (o.platformRules as Record<string, unknown>)
      : {};
  return { researchResult, taskPlan: o.taskPlan, platformRules };
}
