import { z } from 'zod';
import { CS } from './coercion.js';

// WHY a separate file from agentResponses.ts: those schemas validate the core
// 5-agent pipeline's LLM output (orchestrator/critic/writer/predictor). The
// schemas here validate LLM JSON parsed in routes/content.ts's standalone
// tools (ideate/hashtags/competitor) — a different call site with no pipeline
// involvement, but the same untrusted-LLM-JSON boundary problem CLAUDE.md's
// `any` ban exists for. Same CS-with-.catch() tolerance pattern as
// agentResponses.ts: one malformed field degrades to a default instead of
// discarding the whole response. CS itself lives in ./coercion.js, shared
// with agentResponses.ts's pipeline schemas.

// ─── Ideate ──────────────────────────────────────────────────────────────────

// WHY a subset of PerformancePredictor's PredictionResult, not the full
// shape: confidenceScore/improvementSuggestion/benchmarkContext all assume
// written+critiqued content exists, which isn't true at ideation time (I4) —
// tier + a short reason is the honest amount of signal a pre-writing estimate
// can support.
export const ideaPredictionSchema = z.object({
  tier: z.enum(['high', 'medium', 'low']).catch('medium'),
  topReason: CS(),
});

export const ideaSchema = z.object({
  title: CS().optional(),
  platform: CS().optional(),
  angle: CS().optional(),
  why: CS().optional(),
  // WHY optional (I3): only populated when the idea's `why` was grounded in a
  // real Tavily search result — old localStorage-persisted ideas (client
  // store.ts's isIdeatedIdea guard) never had this field, so it must stay
  // optional to avoid silently dropping pre-existing saved/ideated data.
  sourceUrl: CS().optional(),
  prediction: ideaPredictionSchema.optional(),
});

export const ideateResponseSchema = z.object({
  ideas: z.array(ideaSchema).catch([]).optional(),
});

export type IdeateResponse = z.infer<typeof ideateResponseSchema>;

// WHY a single-idea variant, not ideateResponseSchema reused with count=1:
// I1's regenerate-one route returns one bare idea object, not an `ideas`
// array wrapper — keeping the response shape distinct from the batch
// endpoint's makes the client-side contract explicit (one idea in, one back).
export const regenerateIdeaResponseSchema = ideaSchema;

export type RegenerateIdeaResponse = z.infer<typeof regenerateIdeaResponseSchema>;

// ─── Hashtags ────────────────────────────────────────────────────────────────

export const hashtagsResponseSchema = z.object({
  broad: z.array(CS()).catch([]).optional(),
  niche: z.array(CS()).catch([]).optional(),
  branded: z.array(CS()).catch([]).optional(),
  strategy: CS().optional(),
  reachTier: z.enum(['large', 'medium', 'niche']).catch('medium').optional(),
});

export type HashtagsResponse = z.infer<typeof hashtagsResponseSchema>;

// ─── Competitor ──────────────────────────────────────────────────────────────

export const competitorThemeSchema = z.object({
  theme: CS().optional(),
  frequency: CS().optional(),
  engagementLevel: z.enum(['high', 'medium', 'low']).catch('medium').optional(),
});

export const competitorGapSchema = z.object({
  gap: CS().optional(),
  opportunity: CS().optional(),
});

export const competitorAngleSchema = z.object({
  angle: CS().optional(),
  rationale: CS().optional(),
});

export const competitorResponseSchema = z.object({
  brandName: CS().optional(),
  estimatedNiche: CS().optional(),
  topThemes: z.array(competitorThemeSchema).catch([]).optional(),
  contentPatterns: z
    .object({
      formatPreference: CS().optional(),
      hookStyle: CS().optional(),
      ctaPattern: CS().optional(),
    })
    .catch({})
    .optional(),
  contentGaps: z.array(competitorGapSchema).catch([]).optional(),
  suggestedAngles: z.array(competitorAngleSchema).catch([]).optional(),
  keyTakeaway: CS().optional(),
  dataQualityNote: CS().optional(),
});

export type CompetitorResponse = z.infer<typeof competitorResponseSchema>;
