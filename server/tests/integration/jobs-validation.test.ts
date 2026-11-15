/**
 * TC-001 through TC-009 — Jobs route validation tests
 * Tests the validation layer of POST /api/jobs/create and /api/jobs/batch
 * without touching real DB, Redis, or LLM services.
 *
 * WHY import createJobSchema / shared enums: a hand-rolled VALID_PLATFORMS copy
 * here drifted from schemas/jobs.ts before — safeParse against the real zod
 * schemas is the same gate parseBody() uses on the routes.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createJobSchema,
  VALID_PLATFORMS,
  toneEnum,
  templateIdEnum,
  TOPIC_MAX_LENGTH,
} from '../../src/schemas/jobs.js';

interface ValidationResult {
  valid: boolean;
  status?: number;
  error?: string;
  code?: string;
}

function fromZod(
  result: { success: true } | { success: false; error: z.ZodError },
): ValidationResult {
  if (result.success) return { valid: true };
  const firstIssue = result.error.issues[0];
  return {
    valid: false,
    status: 400,
    error:
      typeof firstIssue?.message === 'string' && firstIssue.message.length > 0
        ? firstIssue.message
        : 'Invalid request body',
    code: 'VALIDATION_ERROR',
  };
}

function validateCreateJob(input: unknown): ValidationResult {
  return fromZod(createJobSchema.safeParse(input));
}

// WHY: mirrors routes/jobs/create.ts POST /batch inline schema — enums/caps
// imported from schemas/jobs so VALID_* is not duplicated in this test file.
const batchSchema = z.object({
  items: z
    .array(
      z.object({
        topic: z.string().min(3).max(TOPIC_MAX_LENGTH).trim(),
        platform: z.enum(VALID_PLATFORMS),
        tone: toneEnum.optional(),
        targetAudience: z.string().max(300).trim().optional(),
      }),
    )
    .min(1)
    .max(7),
  tone: toneEnum.optional(),
  targetAudience: z.string().max(300).trim().optional(),
  templateId: templateIdEnum.optional(),
  paletteId: z.string().max(50).optional(),
});

function validateBatchJobs(input: unknown): ValidationResult {
  return fromZod(batchSchema.safeParse(input));
}

// ─── POST /api/jobs/create validation ────────────────────────────────────────

describe('POST /api/jobs/create — input validation', () => {
  it('TC-001 — missing topic returns 400 VALIDATION_ERROR', () => {
    const result = validateCreateJob({
      platform: 'instagram_carousel',
      tone: 'professional',
      targetAudience: 'marketers',
    });
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('TC-002 — missing platform returns 400 VALIDATION_ERROR', () => {
    const result = validateCreateJob({
      topic: 'AI trends',
      tone: 'professional',
      targetAudience: 'marketers',
    });
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('TC-003 — missing tone returns 400 VALIDATION_ERROR', () => {
    const result = validateCreateJob({
      topic: 'AI trends',
      platform: 'linkedin_post',
      targetAudience: 'marketers',
    });
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('TC-004 — missing targetAudience returns 400 VALIDATION_ERROR', () => {
    const result = validateCreateJob({
      topic: 'AI trends',
      platform: 'linkedin_post',
      tone: 'professional',
    });
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('TC-005 — invalid platform value returns 400 with valid list', () => {
    const result = validateCreateJob({
      topic: 'AI trends',
      platform: 'tiktok',
      tone: 'casual',
      targetAudience: 'gen z',
    });
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toContain('instagram_carousel');
    expect(result.error).toContain('linkedin_post');
  });

  it('TC-006 — all valid fields pass validation', () => {
    const result = validateCreateJob({
      topic: 'AI trends in marketing',
      platform: 'instagram_carousel',
      tone: 'professional',
      targetAudience: 'digital marketers',
    });
    expect(result.valid).toBe(true);
  });

  it('TC-006b — all valid platforms pass validation', () => {
    VALID_PLATFORMS.forEach((platform) => {
      const result = validateCreateJob({
        topic: 'test topic',
        platform,
        tone: 'casual',
        targetAudience: 'everyone',
      });
      expect(result.valid).toBe(true);
    });
  });

  it('empty string topic fails validation', () => {
    const result = validateCreateJob({
      topic: '',
      platform: 'linkedin_post',
      tone: 'casual',
      targetAudience: 'everyone',
    });
    expect(result.valid).toBe(false);
  });

  it('null fields fail validation', () => {
    const result = validateCreateJob({
      topic: null,
      platform: 'linkedin_post',
      tone: 'casual',
      targetAudience: 'everyone',
    });
    expect(result.valid).toBe(false);
  });
});

// ─── POST /api/jobs/batch validation ─────────────────────────────────────────

describe('POST /api/jobs/batch — input validation', () => {
  it('TC-008 — items.length > 7 returns 400', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      topic: `Topic ${i}`,
      platform: 'linkedin_post',
    }));
    const result = validateBatchJobs({ items });
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
  });

  it('TC-009 — empty items array returns 400', () => {
    const result = validateBatchJobs({ items: [] });
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
  });

  it('TC-009b — missing items returns 400', () => {
    const result = validateBatchJobs({});
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
  });

  it('valid batch of 1 passes', () => {
    const result = validateBatchJobs({
      items: [{ topic: 'AI trends', platform: 'linkedin_post' }],
    });
    expect(result.valid).toBe(true);
  });

  it('valid batch of 7 passes', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({
      topic: `Topic ${i}`,
      platform: 'linkedin_post',
    }));
    const result = validateBatchJobs({ items });
    expect(result.valid).toBe(true);
  });

  it('item with invalid platform fails', () => {
    const result = validateBatchJobs({
      items: [{ topic: 'AI trends', platform: 'tiktok' }],
    });
    expect(result.valid).toBe(false);
  });

  it('item missing topic fails', () => {
    const result = validateBatchJobs({
      items: [{ platform: 'linkedin_post' }],
    });
    expect(result.valid).toBe(false);
  });
});
