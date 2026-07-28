import { z } from 'zod';
import { platformEnum, toneEnum } from './jobs.js';

export const ideateSchema = z.object({
  count: z.number().int().min(1).max(20).default(10),
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

export const repurposeSchema = z.object({
  url: z.string().url('url must be a valid URL'),
  platform: platformEnum,
  tone: toneEnum,
  targetAudience: z.string().min(1).max(300).trim(),
});

export const competitorSchema = z.object({
  handle: z.string().min(1, 'handle is required').max(100).trim(),
  industry: z.string().max(200).optional(),
});

export const editSlideSchema = z.object({
  headline: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
});

// WHY 600-char cap: matches the limit sanitizeGenerationInput (middleware/rateLimit.ts
// LIMITS.custom_feedback) already enforces on this same field — keep both in sync.
export const regenerateContentSchema = z.object({
  custom_feedback: z.string().max(600).trim().optional(),
});

export const demoSchema = z.object({
  topic: z.string().trim().min(1, 'topic is required').transform(v => v.slice(0, 200)),
  platform: platformEnum,
});
