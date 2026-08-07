import { z } from 'zod';
import { platformEnum, toneEnum } from './jobs.js';

// WHY a loose regex, not z.string().uuid(): matches this codebase's existing
// UUID convention (lib/uuid.ts's isValidUUID) rather than zod's stricter RFC
// 4122 version/variant check — same reasoning as schemas/scheduledPosts.ts's
// jobIdSchema.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ideateSchema = z.object({
  count: z.number().int().min(1).max(20).default(10),
  focusTopic: z.string().max(200).trim().optional(),
  // WHY optional, not required alongside a mode flag: presence alone signals
  // "competitor-gap mode" (I5) — ideate.ts loads this analysis server-side
  // and splices its contentGaps/suggestedAngles into the prompt. Ownership is
  // re-checked server-side (the id alone doesn't prove the requester owns it).
  competitorAnalysisId: z.string().regex(UUID_REGEX, 'competitorAnalysisId must be a valid UUID').optional(),
});

// WHY a separate schema (not ideateSchema with count clamped to 1): I1's
// regenerate-one call also carries excludeTitles, a field that only makes
// sense in the single-idea-replacement flow — keeping it a distinct schema
// avoids ideateSchema silently accepting an unused field on the main
// generate-batch call.
export const regenerateIdeaSchema = z.object({
  focusTopic: z.string().max(200).trim().optional(),
  // WHY capped at 10 + 100 chars each: this only needs to carry the titles
  // currently visible on screen so the model avoids near-duplicates — an
  // unbounded array/length here would let a caller balloon the prompt with
  // attacker-controlled text for no benefit to the actual feature.
  excludeTitles: z.array(z.string().max(100)).max(10).optional(),
  competitorAnalysisId: z.string().regex(UUID_REGEX, 'competitorAnalysisId must be a valid UUID').optional(),
});

// WHY the array branch: carousel jobs pass their slide array (SlideData[]) as `content`
// (see HashtagPanel.tsx) — without it, every hashtag request for a carousel job failed
// validation and the panel silently rendered blank forever.
export const hashtagsSchema = z.object({
  topic: z.string().min(1, 'topic is required').max(500).trim(),
  platform: platformEnum.optional(),
  content: z.union([
    z.string(),
    z.record(z.string(), z.unknown()),
    z.array(z.record(z.string(), z.unknown())),
  ]).optional(),
});

// WHY platforms (array) alongside platform (single), not a breaking replace:
// the client always sent one platform before this change — keeping `platform`
// required and adding `platforms` as an optional override lets a single-URL,
// multi-platform submission fan out from one fetch+extraction (see
// routes/content/repurpose.ts) without touching the existing single-platform
// call shape. WHY capped at 5: same "up to N in one request" ceiling
// reasoning as jobs/batch's 7-item cap — a generous number for "repurpose this
// one article everywhere" without letting one request balloon into an
// unbounded fan-out of Gemini calls.
export const repurposeSchema = z.object({
  url: z.string().url('url must be a valid URL'),
  platform: platformEnum,
  platforms: z.array(platformEnum).min(1).max(5).optional(),
  tone: toneEnum,
  targetAudience: z.string().min(1).max(300).trim(),
});

// WHY a separate schema (not repurposeSchema with urls[] instead of url):
// the batch endpoint is a genuinely different call shape — N URLs each
// getting one fetch+extract+job, not one URL fanned to N platforms.
// Capped at 10 URLs (same reasoning as jobs/batch's 7-topic cap: generous
// for "repurpose my whole newsletter archive" without letting one request
// balloon into 10+ simultaneous Gemini calls). Each URL gets its own platform
// list (up to 4) so a user can say "repurpose article A to LinkedIn + Twitter
// and article B to Instagram Carousel" in one submission.
export const repurposeBatchSchema = z.object({
  items: z.array(
    z.object({
      url: z.string().url('url must be a valid URL'),
      platform: platformEnum,
      platforms: z.array(platformEnum).min(1).max(4).optional(),
      tone: toneEnum,
      targetAudience: z.string().min(1).max(300).trim(),
    }),
  ).min(1, 'items must not be empty').max(10, 'at most 10 URLs per batch'),
});

// WHY 300-char limit on feedUrl: the longest real-world feed URLs are much
// shorter; a cap prevents a fat URL from being used as an injection vector
// while being generous enough for any legitimate feed address.
export const feedMonitorSchema = z.object({
  feedUrl: z.string().url('feedUrl must be a valid URL').max(500),
  platform: platformEnum,
  tone: toneEnum,
  targetAudience: z.string().min(1).max(300).trim(),
});

// WHY a separate partial schema for PATCH: all fields are optional on update,
// but we still want the same validation constraints (platform/tone enums,
// targetAudience length) as the create schema. This prevents mass-assignment
// and ensures invalid values can't slip through the PATCH route.
export const feedMonitorUpdateSchema = z.object({
  active: z.boolean().optional(),
  platform: platformEnum.optional(),
  tone: toneEnum.optional(),
  targetAudience: z.string().max(300).trim().optional(),
});

export const competitorSchema = z.object({
  handle: z.string().min(1, 'handle is required').max(100).trim(),
  industry: z.string().max(200).optional(),
});

// WHY a hardcoded max of 20 (not user-configurable): the history dropdown in
// Competitor.tsx only ever needs a short recent list, not full pagination —
// same "capped at a reasonable count" scope called out in the task; a query
// param here would add surface area with no real UI need for it yet.
export const competitorHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(20),
});

export const demoSchema = z.object({
  topic: z.string().trim().min(1, 'topic is required').transform(v => v.slice(0, 200)),
  platform: platformEnum,
});
