import { z } from 'zod';
import { CS, CN } from './coercion.js';

// WHY this file exists: CLAUDE.md forbids `any` (including under "Hard Stops"), but
// agents/critic.ts and agents/writer.ts both used `let parsed: any` at the exact
// boundary where raw LLM JSON is parsed into structured data — the same class of
// boundary that produced the critic.ts score-clamping bug (an out-of-spec
// "hookStrength": 200 flowing unchecked into a 0-100 UI badge). These schemas give
// that boundary a documented shape AND a runtime check, instead of a type annotation
// that only exists at compile time and says nothing about what the LLM actually sent.
//
// WHY .safeParse() + fallback rather than throwing on a shape mismatch: both
// critic.ts and writer.ts already have an existing "if parsing fails, degrade to a
// safe default" path for JSON.parse() failures — a schema mismatch is treated as the
// same class of failure (untrustworthy LLM output) and folds into that same fallback,
// not a new thrown error. This preserves current behavior exactly; it does not make
// parsing stricter than it already effectively was via clampScore/fallback objects,
// it just makes the "untrustworthy shape" check real instead of implicit.
//
// WHY every leaf field across every schema in this file is wrapped in
// .catch(default) (via the CS/CN helpers below) rather than left as bare
// .optional(): Zod's default behavior is all-or-nothing per object/array — ONE
// malformed field fails validation for the entire structure containing it. See
// the Writer section's WHY for the concrete example (one bad field on one
// carousel slide would otherwise discard all 8 real slides). Applied uniformly
// here so every schema in this file gets the same per-field tolerance, not just
// the ones where a bug was first caught. CS/CN themselves live in ./coercion.js,
// shared with contentResponses.ts's standalone-tool schemas.

// ─── Orchestrator ────────────────────────────────────────────────────────────

export const orchestratorResponseSchema = z.object({
  taskPlan: CS().optional(),
  // WHY .catch([]) on the array (not just CS() on each string element): a
  // malformed searchQueries value (e.g. the LLM returns a string instead of an
  // array) should degrade to an empty array — orchestrator.ts's own fallback logic
  // already treats `parsed.searchQueries?.length >= 1` as the signal to use a
  // topic-derived default, so an empty array here correctly triggers that path
  // instead of needing a second layer of fallback logic to duplicate it.
  searchQueries: z.array(CS()).catch([]).optional(),
});

export type OrchestratorResponse = z.infer<typeof orchestratorResponseSchema>;

// ─── Critic ──────────────────────────────────────────────────────────────────

// WHY z.number().catch(0) per field (not .optional() alone, not .int().min(0).max(20)):
// the real consumer (critic.ts's clampScore) already tolerates missing/out-of-range/
// non-numeric values by coercing through `Number(n) || 0` and clamping to 0-20 —
// rejecting the WHOLE response for one bad field (e.g. "hookStrength": "n/a") would be
// stricter than the app's established behavior, discarding 4 possibly-good scores
// along with the 1 bad one. .catch(0) fails closed per-field instead: an invalid
// hookStrength becomes 0 without invalidating platformCompliance/brandVoiceMatch/etc.
// on the same response. A genuinely out-of-range value like 200 still passes through
// here on purpose — that's what clampScore's own 0-20 clamp exists to handle,
// keeping this schema's job scoped to "is it shaped like a number" only.
export const criticResponseSchema = z.object({
  hookStrength: z.number().catch(0).optional(),
  platformCompliance: z.number().catch(0).optional(),
  brandVoiceMatch: z.number().catch(0).optional(),
  valueDelivery: z.number().catch(0).optional(),
  ctaClarity: z.number().catch(0).optional(),
  totalScore: z.number().catch(0).optional(),
  feedback: z.string().optional(),
});

export type CriticResponse = z.infer<typeof criticResponseSchema>;

// ─── Content DNA ─────────────────────────────────────────────────────────────
// WHY here, not schemas/users.ts: this is the exact JSON contract users.ts's
// POST /analyze-voice prompts the LLM for (see routes/users.ts) — a genuine
// LLM-response-parsing boundary, same class as critic/writer. It's placed in this
// file (rather than a request-body schema file) because writer.ts is what actually
// consumes it (WriterInput.contentDna, read field-by-field to build the prompt's
// "Content DNA fingerprint" section) and needed a real type for that field.
// writer.ts receives this as an already-deserialized value from its caller
// (this interface), while contentDnaSchema below is for routes/users.ts's
// POST /analyze-voice — the actual boundary where this shape is parsed from
// raw LLM text (previously `let contentDna: any`).
export interface ContentDna {
  avgSentenceWords?: number;
  hookPattern?: string;
  emojiFrequency?: string;
  ctaStyle?: string;
  structuralSignature?: string;
  vocabularyLevel?: string;
  writingPersonality?: string;
  keyPhrasePatterns?: string[];
}

export const contentDnaSchema = z.object({
  avgSentenceWords: CN().optional(),
  hookPattern: CS().optional(),
  emojiFrequency: CS().optional(),
  ctaStyle: CS().optional(),
  structuralSignature: CS().optional(),
  vocabularyLevel: CS().optional(),
  writingPersonality: CS().optional(),
  keyPhrasePatterns: z.array(CS()).catch([]).optional(),
}) satisfies z.ZodType<ContentDna>;

// ─── Writer ──────────────────────────────────────────────────────────────────
// NOTE: content shapes differ per platform — this mirrors the same reasoning as
// patchContentSchema in schemas/jobs.ts, just for the LLM's raw response instead of
// a client PATCH body. Each platform schema is intentionally loose (optional fields,
// no length caps) since this is pre-formatter/pre-render raw model output, not the
// render-time shape schemas/jobs.ts's slideDataSchema already guards downstream.
//
// WHY .catch() on every leaf field AND every array/nested-object, not just the top
// level: z.array()/z.object() are all-or-nothing by default — ONE malformed field
// anywhere (e.g. a numeric headline instead of a string on slide 5 of 8, or a single
// bad item in a points array) fails validation for the ENTIRE structure containing
// it. For instagram_carousel specifically that means one bad field on one slide would
// discard all 8 real slides in favor of the 3-slide generic fallback — a much bigger
// loss of real content than critic.ts's flat 5-field case. .catch(default) at every
// level (leaf fields AND array/object wrappers) makes each field/slide/point fail
// independently instead of the whole response failing together, matching how this
// code already behaved before any schema existed (a wrong-typed field just produced
// undefined/garbage in that one spot, not a thrown error for the whole object).

const writerSlidePointSchema = z.object({
  icon: CS().optional(),
  label: CS().optional(),
  desc: CS().optional(),
});

export const writerCarouselSlideSchema = z.object({
  slide_number: CN().optional(),
  type: CS().optional(),
  bg_suggestion: CS().optional(),
  headline: CS().optional(),
  body: CS().optional(),
  visual_hint: CS().optional(),
  points: z.array(writerSlidePointSchema).catch([]).optional(),
  cta: z
    .object({
      action: CS().optional(),
      handle: CS().optional(),
    })
    .catch({})
    .optional(),
});

// WHY .catch({}) per slide (inside the array below), not just .catch([]) on the
// array itself: without a per-element fallback, one genuinely unparseable slide
// (e.g. a bare string instead of an object) would still need the WHOLE array to
// fail before .catch([]) on the array kicks in, wiping out every other real slide
// too. Wrapping each element lets a bad slide degrade to an empty object (still
// counted as a slide by downstream index-based logic) while its siblings survive.
export const writerCarouselResponseSchema = z
  .array(writerCarouselSlideSchema.catch({}))
  .catch([]);

export const writerLinkedInResponseSchema = z.object({
  hook: CS().optional(),
  body: CS().optional(),
  cta: CS().optional(),
  hashtags: z.array(CS()).catch([]).optional(),
});

export const writerTwitterResponseSchema = z.object({
  tweets: z
    .array(
      z
        .object({
          number: CN().optional(),
          text: CS().optional(),
        })
        .catch({}),
    )
    .catch([])
    .optional(),
});

export const writerInstagramCaptionResponseSchema = z.object({
  caption: CS().optional(),
  hashtags: z.array(CS()).catch([]).optional(),
});

export const writerVideoScriptResponseSchema = z.object({
  hook: z
    .object({
      text: CS().optional(),
      duration: CS().optional(),
      visual: CS().optional(),
    })
    .catch({})
    .optional(),
  segments: z
    .array(
      z
        .object({
          number: CN().optional(),
          script: CS().optional(),
          duration: CS().optional(),
          broll: CS().optional(),
          caption: CS().optional(),
        })
        .catch({}),
    )
    .catch([])
    .optional(),
  cta: z
    .object({
      text: CS().optional(),
      duration: CS().optional(),
      visual: CS().optional(),
    })
    .catch({})
    .optional(),
  hashtags: z.array(CS()).catch([]).optional(),
  speakerNotes: CS().optional(),
  totalDuration: CS().optional(),
});

export type WriterCarouselResponse = z.infer<typeof writerCarouselResponseSchema>;
export type WriterLinkedInResponse = z.infer<typeof writerLinkedInResponseSchema>;
export type WriterTwitterResponse = z.infer<typeof writerTwitterResponseSchema>;
export type WriterInstagramCaptionResponse = z.infer<typeof writerInstagramCaptionResponseSchema>;
export type WriterVideoScriptResponse = z.infer<typeof writerVideoScriptResponseSchema>;

// WHY a union rather than one schema per call site: runWriter's return type is
// genuinely platform-dependent (an array for carousels, an object shape that varies
// by platform otherwise) — this union is what replaces writer.ts's
// `Promise<any>` return type with something real.
export type WriterResponse =
  | WriterCarouselResponse
  | WriterLinkedInResponse
  | WriterTwitterResponse
  | WriterInstagramCaptionResponse
  | WriterVideoScriptResponse;

// ─── Performance Predictor ────────────────────────────────────────────────────

// WHY z.enum(...).catch('medium') for tier specifically (not CS()): the original
// code validated this with `['high','medium','low'].includes(parsed.tier) ?
// parsed.tier : 'medium'` — an enum membership check with a fallback, not a
// string coercion. z.enum(...).catch() reproduces that exact check-and-fallback
// semantics rather than silently accepting any string (which CS() would).
export const performancePredictorResponseSchema = z.object({
  tier: z.enum(['high', 'medium', 'low']).catch('medium').optional(),
  confidenceScore: CN().optional(),
  topReason: CS().optional(),
  improvementSuggestion: CS().optional(),
  benchmarkContext: CS().optional(),
});

export type PerformancePredictorResponse = z.infer<typeof performancePredictorResponseSchema>;
