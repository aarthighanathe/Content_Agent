// WHY reuse PlatformContent on the wire: the content posted to a social platform is
// always a job's final output content — PostToSocialResponse doesn't need the type
// imported here (only the request body in api.ts does).
export interface PostToSocialResponse {
  ok: boolean;
  postId?: string;
  // WHY added: the server now builds a real, browsable URL from postId (a raw
  // platform ID isn't one on its own) — see server/src/routes/social.ts's
  // POST /post handler. FUNCTIONAL_AUDIT_2026-07.md finding #10.
  postUrl?: string;
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

// WHY mirrored from server COMPETITOR_PLATFORMS: client/server are separate
// TS projects — keep in sync with server/src/schemas/content.ts.
export type CompetitorPlatform = 'linkedin' | 'twitter' | 'instagram';

export interface AnalyzeCompetitorResponse {
  handle: string;
  // Present on new analyses; may be absent when reloading a pre-platform
  // history row that never stored one.
  platform?: CompetitorPlatform;
  // Canonical profile URL the server resolved (e.g. linkedin.com/in/slug).
  profileUrl?: string;
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
  platform?: CompetitorPlatform | string;
  industry?: string;
  analysis: CompetitorAnalysis;
  createdAt: string;
}

export interface CompetitorAnalysisHistoryResponse {
  analyses: CompetitorAnalysisHistoryItem[];
}
