import type { TavilySearchResult } from '../lib/ai.js';

// WHY: shared agent output shapes live here (not in researcher.ts/critic.ts) so
// lib/pipelineTypes.ts can import them without forming a type-level cycle with
// agents that import RuntimeJob from pipelineTypes.
export interface ResearchResult {
  trendingAngles: string[];
  keyFacts: string[];
  suggestedHashtags: string[];
  competitorHooks: string[];
  sourceUrls: string[];
  rawResults: TavilySearchResult[];
}

export interface CriticScores {
  hookStrength: number;
  platformCompliance: number;
  brandVoiceMatch: number;
  valueDelivery: number;
  ctaClarity: number;
}

export interface CriticResult {
  approved: boolean;
  totalScore: number;
  // WHY: omitted on feedback-only cards (dimensions absent) so dashboard /
  // predictor never treat coerced zeros as real dimension scores.
  scores?: CriticScores;
  feedback: string;
  // WHY: true when parse/useless-scorecard FALLBACK was used — pipelineRun must
  // not treat generic FALLBACK feedback as writer revision instructions.
  usedFallback?: boolean;
}
