import type { PlatformContent } from './job';

// WHY reuse PlatformContent: the content posted to a social platform is always a job's
// final output content (carousel slide / thread / caption), same shape already modeled
// in job.ts for Result rendering — no need for a second parallel shape.
export interface PostToSocialResponse {
  ok: boolean;
  postId?: string;
  // WHY added: the server now builds a real, browsable URL from postId (a raw
  // platform ID isn't one on its own) — see server/src/routes/social.ts's
  // POST /post handler. FUNCTIONAL_AUDIT_2026-07.md finding #10.
  postUrl?: string;
}

export interface SchedulePostInput {
  platform: string;
  content: PlatformContent | PlatformContent[] | string;
  scheduledAt: string;
  jobId?: string;
}

export interface SchedulePostResponse {
  ok: boolean;
  scheduleId: string;
  scheduledAt: string;
  platform: string;
}

// WHY these exact fields, not a looser shape: mirrors server/src/schemas/contentResponses.ts's
// competitorResponseSchema (the Zod schema POST /content/competitor actually validates its
// response against) field-for-field, since server and client are separate TS projects with no
// shared schema import. Keep these in sync if that schema changes.
export interface CompetitorAnalysis {
  brandName?: string;
  estimatedNiche?: string;
  topThemes?: { theme?: string; frequency?: string; engagementLevel?: 'high' | 'medium' | 'low' }[];
  contentPatterns?: {
    formatPreference?: string;
    hookStyle?: string;
    ctaPattern?: string;
  };
  contentGaps?: { gap?: string; opportunity?: string }[];
  suggestedAngles?: { angle?: string; rationale?: string }[];
  keyTakeaway?: string;
  dataQualityNote?: string;
}

export interface AnalyzeCompetitorResponse {
  handle: string;
  analysis: CompetitorAnalysis;
  // WHY optional: absent when persistence failed server-side (best-effort —
  // see server/src/routes/content/competitor.ts's non-fatal DB-write catch)
  // or when no DB-backed user id was available. The result itself is still
  // fully usable without it; only "reload this later from history" needs it.
  analysisId?: string;
}

// WHY a separate history-row type, not AnalyzeCompetitorResponse reused: a
// history row additionally carries id/createdAt/industry (persisted metadata
// the live analyze response doesn't need to round-trip), and omits the
// top-level `handle` duplication AnalyzeCompetitorResponse has for the
// single-shot analyze call.
export interface CompetitorAnalysisHistoryItem {
  id: string;
  handle: string;
  industry?: string;
  analysis: CompetitorAnalysis;
  createdAt: string;
}

export interface CompetitorAnalysisHistoryResponse {
  analyses: CompetitorAnalysisHistoryItem[];
}
