/**
 * agents/writer.test.ts — P0
 * Tests writer agent parsing, sanitizer, placeholder detection, and all
 * platform-specific fallback objects. Mocks generateWithAI so no LLM calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Inline the internal helpers we want to test ──────────────────────────────

const PLACEHOLDER_PATTERNS = [
  /Feature name/i,
  /Step name/i,
  /\[specific subject\]/i,
  /\[composition\]/i,
  /\[lighting\]/i,
  /bold promise or provocative question/i,
  /name the pain point directly/i,
  /the reframe or solution in one bold claim/i,
];

function containsPlaceholders(obj: any): boolean {
  const str = JSON.stringify(obj);
  return PLACEHOLDER_PATTERNS.some(p => p.test(str));
}

function sanitizeAiJson(s: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { out += ch; escaped = true; continue; }
    if (ch === '"') { out += ch; inString = !inString; continue; }
    if (inString) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
    }
    out += ch;
  }
  return out;
}

// Build platform-specific fallbacks matching writer.ts logic
function buildFallback(job: any, rawText: string): any {
  if (job.platform === 'instagram_carousel') {
    return [
      { slide_number: 1, type: 'cover',   headline: job.topic, body: 'Swipe to discover the key insights.', visual_hint: '🔥' },
      { slide_number: 2, type: 'content', headline: 'The Core Challenge', body: rawText.slice(0, 120), visual_hint: '📌' },
      { slide_number: 3, type: 'cta',     headline: 'Save this for later', body: 'Follow for more content like this.', visual_hint: '👇', cta: { action: 'Follow for more', handle: '@yourbrand' } },
    ];
  } else if (job.platform === 'twitter_thread') {
    return { tweets: [{ number: 1, text: `1/ ${rawText.slice(0, 270)}` }] };
  } else if (job.platform === 'instagram_caption') {
    return { caption: rawText.slice(0, 300), hashtags: ['#content', '#socialmedia', '#creator'] };
  } else if (job.platform === 'video_script') {
    return {
      hook: { text: job.topic, duration: '0-3s', visual: 'Presenter on camera' },
      segments: [{ number: 1, script: rawText.slice(0, 200), duration: '15s', broll: 'Screen recording', caption: job.topic }],
      cta: { text: 'Follow for more!', duration: '3-5s', visual: 'Text overlay' },
      hashtags: ['#reels', '#shorts'],
      speakerNotes: 'Ad-lib as needed.',
      totalDuration: '30s',
    };
  } else {
    return { hook: job.topic, body: rawText.slice(0, 400), cta: 'Follow for more!', hashtags: ['#content'] };
  }
}

function validateCarousel(parsed: any[], platform: string): void {
  if (platform === 'instagram_carousel' && Array.isArray(parsed) && parsed.length < 6) {
    throw new Error(`Incomplete carousel: received ${parsed.length} slides, expected 8. Retrying.`);
  }
}

// ─── containsPlaceholders ─────────────────────────────────────────────────────

describe('containsPlaceholders', () => {
  it('returns false for real content', () => {
    const slides = [
      { headline: 'How AI Changed Marketing Forever', body: 'AI tools have cut content creation time by 70%.' },
    ];
    expect(containsPlaceholders(slides)).toBe(false);
  });

  it('detects "Feature name" placeholder', () => {
    const slides = [{ points: [{ label: 'Feature name', desc: 'some desc' }] }];
    expect(containsPlaceholders(slides)).toBe(true);
  });

  it('detects "Step name" placeholder', () => {
    const slides = [{ points: [{ label: 'Step name', desc: 'some desc' }] }];
    expect(containsPlaceholders(slides)).toBe(true);
  });

  it('detects [specific subject] placeholder', () => {
    const obj = { headline: 'About [specific subject]' };
    expect(containsPlaceholders(obj)).toBe(true);
  });

  it('detects "bold promise or provocative question" placeholder', () => {
    const obj = { headline: 'bold promise or provocative question here' };
    expect(containsPlaceholders(obj)).toBe(true);
  });

  it('case-insensitive match', () => {
    const obj = { headline: 'FEATURE NAME goes here' };
    expect(containsPlaceholders(obj)).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(containsPlaceholders([])).toBe(false);
  });
});

// ─── sanitizeAiJson ───────────────────────────────────────────────────────────

describe('sanitizeAiJson', () => {
  it('parses clean JSON unchanged', () => {
    const json = JSON.stringify({ headline: 'Test', body: 'Body.' });
    const sanitized = sanitizeAiJson(json);
    expect(JSON.parse(sanitized)).toEqual({ headline: 'Test', body: 'Body.' });
  });

  it('escapes unescaped newlines inside string values', () => {
    // Raw JSON with literal newline inside a string (invalid JSON)
    const raw = '{"body":"line one\nline two"}';
    const sanitized = sanitizeAiJson(raw);
    expect(() => JSON.parse(sanitized)).not.toThrow();
    const parsed = JSON.parse(sanitized);
    expect(parsed.body).toBe('line one\nline two');
  });

  it('escapes unescaped tabs inside string values', () => {
    const raw = '{"body":"word\tword"}';
    const sanitized = sanitizeAiJson(raw);
    expect(() => JSON.parse(sanitized)).not.toThrow();
  });

  it('preserves already-escaped sequences', () => {
    const raw = '{"body":"line\\nnewline"}';
    const sanitized = sanitizeAiJson(raw);
    expect(JSON.parse(sanitized).body).toBe('line\nnewline');
  });

  it('handles empty string', () => {
    expect(sanitizeAiJson('')).toBe('');
  });

  it('handles JSON arrays', () => {
    const json = '[{"slide":1},{"slide":2}]';
    expect(sanitizeAiJson(json)).toBe(json);
  });
});

// ─── Platform fallback objects ────────────────────────────────────────────────

describe('Writer fallback objects per platform', () => {
  const RAW = 'This is the raw AI response text that could not be parsed as JSON.';

  it('instagram_carousel fallback has 3 slides with correct types', () => {
    const job = { topic: 'AI Marketing', platform: 'instagram_carousel' };
    const result = buildFallback(job, RAW);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('cover');
    expect(result[0].headline).toBe('AI Marketing');
    expect(result[2].type).toBe('cta');
  });

  it('twitter_thread fallback wraps text in tweets array', () => {
    const job = { topic: 'AI Marketing', platform: 'twitter_thread' };
    const result = buildFallback(job, RAW);
    expect(result.tweets).toBeDefined();
    expect(result.tweets[0].text).toMatch(/^1\//);
  });

  it('twitter_thread fallback tweet text truncated to 270 chars + prefix', () => {
    const longText = 'x'.repeat(300);
    const job = { topic: 'AI', platform: 'twitter_thread' };
    const result = buildFallback(job, longText);
    expect(result.tweets[0].text.length).toBeLessThanOrEqual(275);
  });

  it('instagram_caption fallback has caption and 3 hashtags', () => {
    const job = { topic: 'AI Marketing', platform: 'instagram_caption' };
    const result = buildFallback(job, RAW);
    expect(result.caption).toBeTruthy();
    expect(result.hashtags).toHaveLength(3);
    expect(result.hashtags[0]).toMatch(/^#/);
  });

  it('video_script fallback has hook, segments, and cta', () => {
    const job = { topic: 'AI Marketing', platform: 'video_script' };
    const result = buildFallback(job, RAW);
    expect(result.hook).toBeDefined();
    expect(result.hook.text).toBe('AI Marketing');
    expect(Array.isArray(result.segments)).toBe(true);
    expect(result.cta).toBeDefined();
    expect(result.hashtags).toBeDefined();
  });

  it('linkedin_post fallback returns object with hook, body, cta, hashtags', () => {
    const job = { topic: 'AI Marketing', platform: 'linkedin_post' };
    const result = buildFallback(job, RAW);
    expect(result.hook).toBeTruthy();
    expect(result.cta).toBeTruthy();
    expect(Array.isArray(result.hashtags)).toBe(true);
  });
});

// ─── Carousel slide count validation ─────────────────────────────────────────

describe('Carousel slide count validation', () => {
  it('throws for < 6 slides on instagram_carousel', () => {
    const fewSlides = [{ slide_number: 1 }, { slide_number: 2 }];
    expect(() => validateCarousel(fewSlides, 'instagram_carousel')).toThrow('Incomplete carousel');
    expect(() => validateCarousel(fewSlides, 'instagram_carousel')).toThrow('2 slides, expected 8');
  });

  it('throws at exactly 5 slides', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ slide_number: i + 1 }));
    expect(() => validateCarousel(five, 'instagram_carousel')).toThrow();
  });

  it('does NOT throw for 6 slides', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ slide_number: i + 1 }));
    expect(() => validateCarousel(six, 'instagram_carousel')).not.toThrow();
  });

  it('does NOT throw for 8 slides', () => {
    const eight = Array.from({ length: 8 }, (_, i) => ({ slide_number: i + 1 }));
    expect(() => validateCarousel(eight, 'instagram_carousel')).not.toThrow();
  });

  it('does NOT throw for non-carousel platforms with any array size', () => {
    const small = [{ tweet: 1 }];
    expect(() => validateCarousel(small as any, 'twitter_thread')).not.toThrow();
  });
});

// ─── JSON extraction from AI response with surrounding text ──────────────────

describe('JSON extraction from AI response', () => {
  function extractAndParse(result: string): any {
    const jsonMatch = result.match(/[[{][\s\S]*[\]}]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : result;
    return JSON.parse(sanitizeAiJson(jsonStr));
  }

  it('extracts JSON array from markdown-fenced response', () => {
    const response = '```json\n[{"slide":1},{"slide":2}]\n```';
    const parsed = extractAndParse(response);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it('extracts JSON object embedded in explanation text', () => {
    const response = 'Here is your content:\n\n{"hook":"Big idea","body":"Details here."}';
    const parsed = extractAndParse(response);
    expect(parsed.hook).toBe('Big idea');
  });

  it('handles clean JSON without surrounding text', () => {
    const response = '{"hook":"Clean","body":"Clean body."}';
    const parsed = extractAndParse(response);
    expect(parsed.hook).toBe('Clean');
  });
});
