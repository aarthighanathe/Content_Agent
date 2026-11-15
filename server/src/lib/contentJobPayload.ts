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

// WHY: shared by parseSkipResearch (BullMQ) and multiplyAdapt (direct) so thin
// cached research cannot skip re-research on one path while the other re-runs.
export function isUsableSkipResearch(
  research: Pick<ResearchResult, 'keyFacts' | 'trendingAngles'>,
): boolean {
  return research.keyFacts.length > 0 || research.trendingAngles.length > 0;
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
  if (!isUsableSkipResearch(researchResult)) {
    return undefined;
  }
  const platformRules =
    o.platformRules && typeof o.platformRules === 'object' && !Array.isArray(o.platformRules)
      ? (o.platformRules as Record<string, unknown>)
      : {};
  return { researchResult, taskPlan: o.taskPlan, platformRules };
}

/** Optional BullMQ fields forwarded into PipelineJob after required-id checks. */
export interface ContentJobOptionalFields {
  tone: string | undefined;
  targetAudience: string | undefined;
  brandVoice: string | undefined;
  phrasesUse: string | undefined;
  phrasesAvoid: string | undefined;
  contentDna: unknown;
  initialFeedback: string | undefined;
  sourceMaterial: string | undefined;
  competitorContext: string | undefined;
  sourceCompetitorAnalysisId: string | undefined;
  templateId: string | undefined;
  paletteId: string | undefined;
  sourceUrl: string | undefined;
  sourceJobId: string | undefined;
  sourcePlatform: string | undefined;
  tag: string | undefined;
  skipResearch: SkipResearchOpts | undefined;
}

export function parseContentJobOptionalFields(
  d: Record<string, unknown>,
): ContentJobOptionalFields {
  return {
    tone: asString(d.tone),
    targetAudience: asString(d.targetAudience),
    brandVoice: asString(d.brandVoice),
    phrasesUse: asString(d.phrasesUse),
    phrasesAvoid: asString(d.phrasesAvoid),
    contentDna: d.contentDna,
    initialFeedback: asString(d.initialFeedback),
    sourceMaterial: asString(d.sourceMaterial),
    competitorContext: asString(d.competitorContext),
    sourceCompetitorAnalysisId: asString(d.sourceCompetitorAnalysisId),
    templateId: asString(d.templateId),
    paletteId: asString(d.paletteId),
    sourceUrl: asString(d.sourceUrl),
    sourceJobId: asString(d.sourceJobId),
    sourcePlatform: asString(d.sourcePlatform),
    tag: asString(d.tag),
    skipResearch: parseSkipResearch(d.skipResearch),
  };
}
