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

export interface CompetitorAnalysis {
  strengths?: string[];
  contentPatterns?: string[];
  postingCadence?: string;
  recommendedAngles?: string[];
  // WHY unknown fallback: analysis shape comes from LLM output (agents/ competitor route)
  // and isn't schema-enforced beyond these commonly-read fields.
  [key: string]: unknown;
}

export interface AnalyzeCompetitorResponse {
  handle: string;
  analysis: CompetitorAnalysis;
}
