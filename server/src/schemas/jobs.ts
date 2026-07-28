import { z } from 'zod';

export const VALID_PLATFORMS = [
  'instagram_carousel',
  'linkedin_post',
  'twitter_thread',
  'instagram_caption',
  'video_script',
] as const;

// WHY these 8 (not the original 5): client/src/pages/Create/ToneSelector.tsx (5:
// professional/casual/bold/playful/minimal) and client/src/pages/Brand/VoiceCard.tsx
// (6: professional/casual/witty/educational/direct/inspirational) had each drifted
// into their own independent tone vocabulary that didn't match this enum or each
// other — selecting bold/playful/minimal on Create always failed validation with a
// generic error. This enum is now the union of every tone offered anywhere in the
// UI; Create/Brand's option lists must stay a subset of this list (see WHY comments
// there for the reverse pointer).
export const VALID_TONES = [
  'professional',
  'casual',
  'witty',
  'educational',
  'inspirational',
  'bold',
  'playful',
  'minimal',
  'direct',
] as const;

export const platformEnum = z.enum(VALID_PLATFORMS);
export const toneEnum = z.enum(VALID_TONES);

export const createJobSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(250, 'Topic must be 250 characters or fewer').trim(),
  platform: platformEnum,
  tone: toneEnum,
  targetAudience: z.string().min(1, 'targetAudience is required').max(300).trim(),
});

export const batchJobSchema = z.object({
  jobs: z.array(createJobSchema).min(1).max(7, 'Maximum 7 jobs per batch'),
});

export const regenerateJobSchema = z.object({
  feedback: z.string().max(1000).optional(),
});

export const multiplyJobSchema = z.object({
  targetPlatform: platformEnum,
});

export const renderSlidesSchema = z.object({
  theme: z.string().min(1, 'theme is required'),
  slides: z.array(z.record(z.string(), z.unknown())).min(1, 'slides[] must have at least 1 item').max(20),
});

// ── Server-side carousel rendering (PNG export) ──────────────────────────────
// SECURITY: these shapes are interpolated into server-rendered HTML that Puppeteer
// loads. React escapes text children, but the slide components also build inline SVG
// via dangerouslySetInnerHTML using the palette values — so colors are constrained to
// strict hex here rather than accepting arbitrary strings.
const hexColor = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'must be a hex color');

export const colorSystemSchema = z.object({
  BRAND_PRIMARY: hexColor,
  BRAND_LIGHT: hexColor,
  BRAND_DARK: hexColor,
  LIGHT_BG: hexColor,
  LIGHT_BORDER: hexColor,
  DARK_BG: hexColor,
});

// NOTE: defaults rather than .optional() — the renderer's SlidePoint requires all three,
// so a partial point coerces to empty strings instead of rendering `undefined`.
export const slidePointSchema = z.object({
  icon: z.string().max(16).default(''),
  label: z.string().max(200).default(''),
  desc: z.string().max(400).default(''),
});

// NOTE: replaces the unbounded z.record(z.string(), z.unknown()) used by the older
// render route — bounded lengths keep a hostile payload from ballooning render time.
export const slideDataSchema = z.object({
  type: z.string().max(32).optional(),
  headline: z.string().max(300).optional(),
  body: z.string().max(1000).optional(),
  visual_hint: z.string().max(32).optional(),
  imagePrompt: z.string().max(500).optional(),
  bg_suggestion: z.enum(['accent', 'dark', 'light']).optional(),
  points: z.array(slidePointSchema).max(8).optional(),
  cta: z
    .object({
      action: z.string().max(120).optional(),
      handle: z.string().max(60).optional(),
    })
    .optional(),
  slide_number: z.number().int().optional(),
});

export const exportCarouselSsrSchema = z.object({
  theme: z.string().min(1, 'theme is required'),
  slides: z.array(slideDataSchema).min(1, 'slides[] must have at least 1 item').max(20),
  // WHY bounded but not pinned to the preset count: the renderer already wraps with
  // modulo, so any in-range integer is safe, and hardcoding the exact count here would
  // create a second place to update whenever a design preset is added.
  designPreset: z.number().int().min(0).max(63),
  colors: colorSystemSchema,
  brandName: z.string().max(80),
  handle: z.string().max(60),
});

// NOTE: content shapes differ per platform (carousel slides array, linkedin
// post object with hook/body/cta, twitter thread with tweets array, etc.).
// Using z.record(z.string(), z.unknown()) instead of z.any() at least rejects
// non-object types (null, array, primitive) at the boundary.
export const patchContentSchema = z.object({ content: z.record(z.string(), z.unknown()).or(z.array(z.record(z.string(), z.unknown()))).or(z.string()) });

export const tagJobSchema = z.object({
  tag: z.string().min(1, 'Tag cannot be empty').max(30, 'Tag must be 30 characters or fewer').trim(),
});
