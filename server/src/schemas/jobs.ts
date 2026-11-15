import { z } from 'zod';
import { coerceCarouselSlides } from './slideCoerce.js';

export const VALID_PLATFORMS = [
  'instagram_carousel',
  'linkedin_post',
  'twitter_thread',
  'instagram_caption',
  'video_script',
] as const;

// WHY: these 9 (not the original 5): client/src/pages/Create/ToneSelector.tsx (5:
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

// WHY: duplicated here, not imported: the carousel template catalog is defined
// in client/src/lib/templateSystem.ts (client-only TypeScript, not reachable
// from the server build). Mirrors this codebase's existing VALID_TONES
// pattern — keep this list in sync with templateSystem.ts's TemplateId union
// whenever a template is added/removed/renamed. Without this, an arbitrary
// string previously passed the bare z.string().max(50) check and reached
// getTemplate()/IGSlide's `as TemplateId` cast unguarded.
export const VALID_TEMPLATE_IDS = [
  'modern-minimal',
  'bold-statement',
  'editorial-classic',
  'tech-modern',
  'vibrant-pop',
  'luxury-dark',
  'clean-corporate',
  'creative-abstract',
  'storyteller',
  'social-media',
] as const;

export const templateIdEnum = z.enum(VALID_TEMPLATE_IDS);

// WHY: mirrored from client Result/constants CAROUSEL_THEMES + TemplateId:
// export theme used to be an unbounded string (SEC-019). Keep in sync with
// carousel.ts ThemeKey / client legacy theme keys.
export const VALID_LEGACY_THEME_IDS = [
  'aurora',
  'magazine',
  'split',
  'bold',
  'minimal',
  'neon',
  'violet',
  'crimson',
  'rose',
] as const;

export const exportThemeEnum = z.enum([
  ...VALID_LEGACY_THEME_IDS,
  ...VALID_TEMPLATE_IDS,
]);

// SECURITY: (SEC-019): only raster data URLs — svg+xml can carry external refs
// that Chromium would fetch during export (images are not blocked by interception).
const IMAGE_DATA_URL_RE =
  /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/i;

// WHY: a 1024px PNG as base64 is often ~1–2.5MB. The old 1_000_000-char cap
// (~750KB) rejected images imageGen had already returned, so the client showed
// a slide PATCH and export could not save. 3_000_000 fits a typical 1024 PNG.
// The deck total stays capped so a multi-slide export cannot stream tens of MB
// into Puppeteer. sharp is not installed — imageGen rejects anything over the
// per-slide cap instead of recompressing it.
export const SLIDE_IMAGE_DATA_URL_MAX_CHARS = 3_000_000;
export const EXPORT_OVERLAY_TOTAL_MAX_CHARS = 8_000_000;

export type SlideImageCheck =
  | { ok: true; image: string }
  | { ok: false; reason: 'too_large' | 'invalid' };

// SECURITY: same raster regex and per-slide cap as slideDataSchema (SEC-019).
// Callers must not show or persist a data URL this rejects.
export function inspectSlideImageDataUrl(mime: string, base64: string): SlideImageCheck {
  const prefix = `data:${mime};base64,`;
  if (prefix.length + base64.length > SLIDE_IMAGE_DATA_URL_MAX_CHARS) {
    return { ok: false, reason: 'too_large' };
  }
  const image = prefix + base64;
  if (!IMAGE_DATA_URL_RE.test(image)) return { ok: false, reason: 'invalid' };
  return { ok: true, image };
}

// WHY: a loose regex, not z.string().uuid(): matches this codebase's existing
// UUID convention (lib/uuid.ts's isValidUUID) rather than zod's stricter RFC
// 4122 version/variant check — same reasoning as schemas/scheduledPosts.ts's
// jobIdSchema.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// WHY: exported: this is the real, enforced business-rule cap on a job's topic —
// jobs/create.ts's POST /batch route mirrors it in its own inline per-item schema
// (import this instead of hand-typing 250 again there). It's intentionally lower
// than sanitizeGenerationInput's LIMITS.topic=500 in middleware/rateLimit.ts,
// which is a generous pre-validation pre-filter that runs before this schema, not
// the source of truth — and lower still than the client's Create form's
// maxLength={250}, which mirrors this exact constant for the same reason (see
// TopicStep.tsx/BatchTopicList.tsx, not directly importable across the client/
// server boundary — same limitation VALID_TEMPLATE_IDS above already documents).
export const TOPIC_MAX_LENGTH = 250;

export const createJobSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(TOPIC_MAX_LENGTH, `Topic must be ${TOPIC_MAX_LENGTH} characters or fewer`).trim(),
  platform: platformEnum,
  tone: toneEnum,
  targetAudience: z.string().min(1, 'targetAudience is required').max(300).trim(),
  // WHY: optional, C3 (Competitor Content Lens → job creation): set only when
  // the job originates from a Competitor.tsx "Create content →" CTA — see
  // CreateHandoff in client/src/lib/utils.ts and this schema's sibling
  // sourceCompetitorAnalysisId. competitorContext is free-form (the gap/
  // opportunity or angle/rationale text) — sanitizeGenerationInput's LIMITS
  // covers it at 300 chars, same cap as brandVoice/targetAudience-scale
  // fields, before it ever reaches this schema.
  competitorContext: z.string().max(300).trim().optional(),
  competitorAnalysisId: z.string().regex(UUID_REGEX, 'competitorAnalysisId must be a valid UUID').optional(),
  // WHY: optional, carousel-only: the client's template system
  // (client/src/lib/templateSystem.ts) choice made on the Create form's
  // AdvancedOptions panel. Only meaningful for platform='instagram_carousel'.
  // It's pure display metadata carried through to the job row so Result.tsx's
  // live preview renders the template the user picked — validated against
  // templateIdEnum (see its WHY comment) rather than an unbounded string.
  templateId: templateIdEnum.optional(),
  paletteId: z.string().max(50).optional(),
});

export const regenerateJobSchema = z.object({
  feedback: z.string().max(1000).optional(),
});

export const multiplyJobSchema = z.object({
  targetPlatform: platformEnum,
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
  // WHY: optional data URL (F2 / SEC-019): AI-generated slide images from
  // EditSlideModal — must be a raster data:image URL (not https://) so Puppeteer
  // never fetches attacker-controlled hosts during export.
  imageDataUrl: z
    .string()
    .max(SLIDE_IMAGE_DATA_URL_MAX_CHARS)
    .regex(IMAGE_DATA_URL_RE, 'imageDataUrl must be a data:image/(png|jpeg|webp) URL')
    .optional(),
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

export const exportCarouselSsrSchema = z
  .object({
    theme: exportThemeEnum,
    slides: z.array(slideDataSchema).min(1, 'slides[] must have at least 1 item').max(20),
    // WHY: bounded but not pinned to the preset count: the renderer already wraps with
    // modulo, so any in-range integer is safe, and hardcoding the exact count here would
    // create a second place to update whenever a design preset is added.
    designPreset: z.number().int().min(0).max(63),
    colors: colorSystemSchema,
    brandName: z.string().max(80),
    handle: z.string().max(60),
    // New template system fields - optional for backward compatibility
    templateId: templateIdEnum.optional(),
    paletteId: z.string().max(50).optional(),
  })
  .superRefine((data, ctx) => {
    let total = 0;
    for (const slide of data.slides) {
      if (typeof slide.imageDataUrl === 'string') {
        total += slide.imageDataUrl.length;
      }
    }
    if (total > EXPORT_OVERLAY_TOTAL_MAX_CHARS) {
      ctx.addIssue({
        code: 'custom',
        message:
          `Combined image overlays exceed ${EXPORT_OVERLAY_TOTAL_MAX_CHARS} characters`,
        path: ['slides'],
      });
    }
  });

// NOTE: content shapes differ per platform (carousel slides array, linkedin
// post object with hook/body/cta, twitter thread with tweets array, etc.).
// Using z.record(z.string(), z.unknown()) instead of z.any() at least rejects
// non-object types (null, array, primitive) at the boundary.
// SECURITY: superRefine size cap — without it a huge nested JSON payload can
// pass shape checks and still blow memory/DB when persisted on PATCH /content.
// WHY: social posts keep this 200KB cap (schemas/social.ts). Carousel PATCH
// embeds raster data URLs, so it uses PATCH_CONTENT_MAX_BYTES instead — the
// social cap rejected a savable slide image before slideDataSchema ran.
export const CONTENT_PAYLOAD_MAX_BYTES = 200_000;
export const PATCH_CONTENT_MAX_BYTES = EXPORT_OVERLAY_TOTAL_MAX_CHARS;

export const patchContentSchema = z
  .object({
    content: z
      .record(z.string(), z.unknown())
      .or(z.array(z.record(z.string(), z.unknown())))
      .or(z.string()),
  })
  .superRefine((data, ctx) => {
    let serialized: string;
    try {
      serialized = JSON.stringify(data.content);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'content could not be serialized for size check',
        path: ['content'],
      });
      return;
    }
    if (serialized.length > PATCH_CONTENT_MAX_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message:
          `content exceeds maximum size of ${PATCH_CONTENT_MAX_BYTES} bytes ` +
          `(got ${serialized.length})`,
        path: ['content'],
      });
    }
  });

// WHY: stricter than patchContentSchema — body size alone still lets a user
// save shapes that break export/Result. Handler picks by job.platform after ownership.
const patchLinkedInContentSchema = z.object({
  hook: z.string().max(500).optional(),
  hookAlt: z.string().max(500).optional(),
  body: z.string().max(12_000).optional(),
  cta: z.string().max(500).optional(),
  hashtags: z.array(z.string().max(100)).max(40).optional(),
});

const patchTwitterContentSchema = z.object({
  tweets: z
    .array(
      z.object({
        number: z.number().int().optional(),
        text: z.string().max(500),
      }),
    )
    .min(1)
    .max(50),
});

const patchCaptionContentSchema = z.object({
  caption: z.string().max(5000).optional(),
  hashtags: z.array(z.string().max(100)).max(40).optional(),
});

const patchVideoContentSchema = z.object({
  hook: z
    .object({
      text: z.string().max(1000).optional(),
      duration: z.string().max(40).optional(),
      visual: z.string().max(500).optional(),
    })
    .optional(),
  segments: z
    .array(
      z.object({
        number: z.number().int().optional(),
        script: z.string().max(4000).optional(),
        duration: z.string().max(40).optional(),
        broll: z.string().max(500).optional(),
        caption: z.string().max(500).optional(),
      }),
    )
    .max(30)
    .optional(),
  cta: z
    .object({
      text: z.string().max(1000).optional(),
      duration: z.string().max(40).optional(),
      visual: z.string().max(500).optional(),
    })
    .optional(),
});

/**
 * Validate PATCH /content payload against the job's platform shape.
 * Returns parsed content or a user-facing error string.
 */
export function parseContentForPlatform(
  platform: string,
  content: unknown,
): { ok: true; content: unknown } | { ok: false; error: string } {
  if (platform === 'instagram_carousel') {
    // WHY: truncate long writer strings / extra points before the hard schema
    // so an edit of already-stored slides still saves. imageDataUrl is not
    // truncated — export and PATCH keep the raster size cap.
    const parsed = z.array(slideDataSchema).min(1).max(20).safeParse(
      coerceCarouselSlides(content),
    );
    if (!parsed.success) {
      return { ok: false, error: 'Carousel content must be an array of valid slides' };
    }
    return { ok: true, content: parsed.data };
  }
  if (platform === 'linkedin_post') {
    const parsed = patchLinkedInContentSchema.safeParse(content);
    if (!parsed.success) {
      return { ok: false, error: 'LinkedIn content must include valid hook/body/cta fields' };
    }
    return { ok: true, content: parsed.data };
  }
  if (platform === 'twitter_thread') {
    const parsed = patchTwitterContentSchema.safeParse(content);
    if (!parsed.success) {
      return { ok: false, error: 'Twitter content must include a tweets[] array' };
    }
    return { ok: true, content: parsed.data };
  }
  if (platform === 'instagram_caption') {
    const parsed = patchCaptionContentSchema.safeParse(content);
    if (!parsed.success) {
      return { ok: false, error: 'Caption content must include valid caption/hashtags fields' };
    }
    return { ok: true, content: parsed.data };
  }
  if (platform === 'video_script') {
    const parsed = patchVideoContentSchema.safeParse(content);
    if (!parsed.success) {
      return { ok: false, error: 'Video script content has an invalid shape' };
    }
    return { ok: true, content: parsed.data };
  }
  return { ok: false, error: 'Unknown platform — cannot validate content shape' };
}

export const tagJobSchema = z.object({
  tag: z.string().min(1, 'Tag cannot be empty').max(30, 'Tag must be 30 characters or fewer').trim(),
});

// WHY: a dedicated schema, not reusing createJobSchema's optional templateId/
// paletteId: this one requires at least templateId (switching template is the
// point of the request) while still allowing paletteId to reset to the
// template's own default when omitted.
export const setCarouselTemplateSchema = z.object({
  templateId: templateIdEnum,
  paletteId: z.string().max(50).optional(),
});
