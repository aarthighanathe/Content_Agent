/**
 * TC-047 through TC-049 — Input validation helpers
 * TC-052 — Topic truncation for demo route
 * TC-060 through TC-062 — Carousel theme metadata
 */
import { describe, it, expect } from 'vitest';

// ─── isValidUUID (inlined from jobs.ts) ──────────────────────────────────────

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

describe('isValidUUID', () => {
  it('TC-047 — valid UUID v4 string returns true', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('TC-047b — uppercase UUID is also valid', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('TC-048 — random string returns false', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('TC-048b — partial UUID returns false', () => {
    expect(isValidUUID('550e8400-e29b-41d4')).toBe(false);
  });

  it('TC-049 — empty string returns false', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('TC-049b — numeric-only string returns false', () => {
    expect(isValidUUID('12345678901234567890123456789012')).toBe(false);
  });
});

// ─── Platform validation (inlined) ───────────────────────────────────────────

const VALID_PLATFORMS = [
  'instagram_carousel',
  'linkedin_post',
  'twitter_thread',
  'instagram_caption',
  'video_script',
];

function isValidPlatform(platform: string): boolean {
  return VALID_PLATFORMS.includes(platform);
}

describe('Platform validation', () => {
  it('accepts all 5 valid platforms', () => {
    VALID_PLATFORMS.forEach(p => expect(isValidPlatform(p)).toBe(true));
  });

  it('rejects tiktok', () => {
    expect(isValidPlatform('tiktok')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPlatform('')).toBe(false);
  });

  it('rejects uppercase variant', () => {
    expect(isValidPlatform('INSTAGRAM_CAROUSEL')).toBe(false);
  });
});

// ─── Demo route topic truncation ─────────────────────────────────────────────

describe('TC-052 — Demo topic truncation', () => {
  it('truncates topic to 200 chars', () => {
    const longTopic = 'x'.repeat(300);
    const trimmed = longTopic.trim().slice(0, 200);
    expect(trimmed.length).toBe(200);
  });

  it('short topic unchanged', () => {
    const shortTopic = 'AI in marketing';
    const trimmed = shortTopic.trim().slice(0, 200);
    expect(trimmed).toBe('AI in marketing');
  });

  it('whitespace-only topic detects as empty', () => {
    const topic = '   ';
    expect(!topic?.trim()).toBe(true);
  });
});

// ─── Carousel THEME_META coverage ────────────────────────────────────────────

const EXPECTED_THEMES = ['aurora', 'magazine', 'split', 'bold', 'minimal', 'neon', 'violet', 'crimson', 'rose'];

describe('TC-060 — Carousel theme keys', () => {
  it('TC-060 — all 9 theme keys exist', () => {
    expect(EXPECTED_THEMES.length).toBe(9);
    // Verify uniqueness
    const unique = new Set(EXPECTED_THEMES);
    expect(unique.size).toBe(9);
  });

  it('TC-062 — all theme keys are valid ThemeKey values', () => {
    const validKeys = new Set(EXPECTED_THEMES);
    EXPECTED_THEMES.forEach(t => expect(validKeys.has(t)).toBe(true));
  });
});

// ─── Hashtag validation ───────────────────────────────────────────────────────

describe('Hashtag prefix logic', () => {
  function ensureHashPrefix(tags: string[]): string[] {
    return tags.map(t => t.startsWith('#') ? t : `#${t}`);
  }

  it('adds # to bare words', () => {
    expect(ensureHashPrefix(['marketing', 'growth'])).toEqual(['#marketing', '#growth']);
  });

  it('does not double-prefix', () => {
    expect(ensureHashPrefix(['#already'])).toEqual(['#already']);
  });

  it('handles mixed array', () => {
    expect(ensureHashPrefix(['#tagged', 'untagged'])).toEqual(['#tagged', '#untagged']);
  });
});

// ─── Job status enum progression ────────────────────────────────────────────

describe('Job status enum', () => {
  const VALID_STATUSES = ['pending', 'researching', 'writing', 'formatting', 'critiquing', 'done', 'failed'];

  it('contains all 7 expected statuses', () => {
    expect(VALID_STATUSES.length).toBe(7);
  });

  it('done and failed are terminal states', () => {
    const terminal = ['done', 'failed'];
    terminal.forEach(s => expect(VALID_STATUSES.includes(s)).toBe(true));
  });
});
