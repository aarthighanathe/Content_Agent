import { z } from 'zod';

// WHY brandVoice max 150 (was 50): VoiceCard.tsx sends up to 6 selected tone
// labels joined with ", " (e.g. "Professional, Casual, Witty, Educational,
// Direct, Inspirational" = 63 chars) — the old 50-char cap made selecting more
// than ~3-4 pills fail Save with a generic, undiagnosable error
// (FUNCTIONAL_AUDIT_2026-07.md finding #7). 150 comfortably covers all 6
// current options plus headroom for future additions without needing another
// bump every time a tone label is added.
export const brandVoiceSchema = z.object({
  brandName: z.string().max(100).optional(),
  brandVoice: z.string().max(150).optional(),
  phrasesUse: z.string().max(1000).optional(),
  phrasesAvoid: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
});

export const analyzeVoiceSchema = z.object({
  samples: z.string().min(50, 'Please provide at least 3 sample posts (minimum 50 characters)').max(10000),
});

export const onboardingSchema = z.object({
  brandName: z.string().max(100).optional(),
  preferredTone: z.string().max(50).optional(),
});
