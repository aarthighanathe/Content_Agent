/**
 * TC-001 through TC-009 — Jobs route validation tests
 * Tests the validation layer of POST /api/jobs/create and /api/jobs/batch
 * without touching real DB, Redis, or LLM services.
 *
 * Strategy: we test the validation logic by extracting it as a pure function
 * that mirrors what the route handler does, since standing up the full server
 * requires all external services (Clerk, Neon, Redis).
 */
import { describe, it, expect } from 'vitest';

// ─── Inline the validation logic from jobs.ts ─────────────────────────────────

interface CreateJobInput {
  topic?: string;
  platform?: string;
  tone?: string;
  targetAudience?: string;
}

interface ValidationResult {
  valid: boolean;
  status?: number;
  error?: string;
  code?: string;
}

const VALID_PLATFORMS = [
  'instagram_carousel',
  'linkedin_post',
  'twitter_thread',
  'instagram_caption',
  'video_script',
];

function validateCreateJob(input: CreateJobInput): ValidationResult {
  const { topic, platform, tone, targetAudience } = input;

  if (!topic || !platform || !tone || !targetAudience) {
    return {
      valid: false,
      status: 400,
      error: 'Missing required fields: topic, platform, tone, targetAudience',
      code: 'VALIDATION_ERROR',
    };
  }

  if (!VALID_PLATFORMS.includes(platform)) {
    return {
      valid: false,
      status: 400,
      error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      code: 'VALIDATION_ERROR',
    };
  }

  return { valid: true };
}

interface BatchJobItem {
  topic?: string;
  platform?: string;
}

interface BatchJobInput {
  items?: BatchJobItem[];
  tone?: string;
  targetAudience?: string;
}

function validateBatchJobs(input: BatchJobInput): ValidationResult {
  const { items } = input;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, status: 400, error: 'items array required', code: 'VALIDATION_ERROR' };
  }
  if (items.length > 7) {
    return { valid: false, status: 400, error: 'Maximum 7 jobs per batch', code: 'VALIDATION_ERROR' };
  }
  for (const item of items) {
    if (!item.topic || !item.platform) {
      return { valid: false, status: 400, error: 'Each item requires topic and platform', code: 'VALIDATION_ERROR' };
    }
    if (!VALID_PLATFORMS.includes(item.platform)) {
      return { valid: false, status: 400, error: `Invalid platform: ${item.platform}`, code: 'VALIDATION_ERROR' };
    }
  }
  return { valid: true };
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

  it('TC-006b — all 5 valid platforms pass validation', () => {
    VALID_PLATFORMS.forEach(platform => {
      const result = validateCreateJob({
        topic: 'test',
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
      topic: null as any,
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
      items: [{ topic: 'AI', platform: 'linkedin_post' }],
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
      items: [{ topic: 'AI', platform: 'tiktok' }],
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
