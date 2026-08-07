/**
 * agents/formatter.ts — tests against the REAL runFormatter() export.
 *
 * The previous version of this file tested inline copies of formatCarousel/
 * formatLinkedIn/formatTwitterThread/formatInstagramCaption rather than the
 * real module (justified as "avoiding DB/Redis/Clerk at import time" — which
 * doesn't actually apply here; formatter.ts only imports sseManager and a
 * type). This drives the real per-platform formatting logic through
 * runFormatter() (the only exported entry point), mocking just sseManager,
 * so a regression in the shipped formatting rules actually fails a test here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));

function makeJob(platform: string): any {
  return { id: 'job-1', platform };
}

function makeSlide(overrides: object = {}): any {
  return { headline: 'Test', body: 'Short body.', ...overrides };
}

function longBody(wordCount: number): string {
  return Array.from({ length: wordCount }, (_, i) => `word${i}`).join(' ');
}

describe('runFormatter — instagram_carousel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds slide_number and slideNumber to every slide', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = [makeSlide(), makeSlide(), makeSlide()];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    result.forEach((s, i) => {
      expect(s.slide_number).toBe(i + 1);
      expect(s.slideNumber).toBe(i + 1);
    });
  });

  it('last slide is forced to type=cta', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = [makeSlide(), makeSlide({ type: 'content' }), makeSlide({ type: 'content' })];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result[result.length - 1].type).toBe('cta');
  });

  it('last slide gets a default cta action when missing', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = [makeSlide(), makeSlide()];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    const last = result[result.length - 1];
    expect(last.cta).toBeDefined();
    expect(last.cta.action).toBeTruthy();
  });

  it('body > 80 words is truncated with ellipsis', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = [makeSlide({ body: longBody(100) }), makeSlide()];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    const words = result[0].body.split(/\s+/);
    expect(result[0].body.endsWith('…')).toBe(true);
    expect(words.length).toBe(80);
  });

  it('body with exactly 80 words is NOT truncated', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = [makeSlide({ body: longBody(80) }), makeSlide()];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result[0].body.endsWith('…')).toBe(false);
  });

  it('non-array input returned as-is', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const notArray = { slides: [] } as any;
    const result = await runFormatter(makeJob('instagram_carousel'), notArray);
    expect(result).toBe(notArray);
  });

  it('points array is preserved on slide', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const points = [{ label: 'Point 1' }, { label: 'Point 2' }];
    const slides = [makeSlide({ points }), makeSlide()];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result[0].points).toEqual(points);
  });

  it('first slide without type gets type=cover, middle gets type=content, existing type preserved', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = [makeSlide({ type: 'stat' }), makeSlide(), makeSlide()];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    // slide 0 has an explicit type ('stat'), preserved since it's not the last slide
    expect(result[0].type).toBe('stat');
    expect(result[1].type).toBe('content');
  });

  it('a genuinely typeless first slide gets type=cover', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = [makeSlide(), makeSlide(), makeSlide()];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result[0].type).toBe('cover');
  });
});

describe('runFormatter — linkedin_post', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hashtags > 5 trimmed to 5', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const post = { hashtags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] };
    const result = await runFormatter(makeJob('linkedin_post'), post) as any;
    expect(result.hashtags.length).toBe(5);
  });

  it('hashtag strings without # get prefixed; already-prefixed not double-prefixed', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const post = { hashtags: ['marketing', '#seo', 'growth'] };
    const result = await runFormatter(makeJob('linkedin_post'), post) as any;
    expect(result.hashtags).toEqual(['#marketing', '#seo', '#growth']);
  });

  it('body is split into 2-sentence paragraphs', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const post = { body: 'Sentence one. Sentence two. Sentence three. Sentence four.' };
    const result = await runFormatter(makeJob('linkedin_post'), post) as any;
    const paragraphs = result.body.split('\n\n');
    expect(paragraphs.length).toBe(2);
  });

  it('null input returned as-is', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const result = await runFormatter(makeJob('linkedin_post'), null as any);
    expect(result).toBeNull();
  });

  it('non-object returned as-is', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const result = await runFormatter(makeJob('linkedin_post'), 'string' as any);
    expect(result).toBe('string');
  });
});

describe('runFormatter — twitter_thread', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tweets > 280 chars truncated to 277 + "..."', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = { tweets: [{ text: 'x'.repeat(300) }] };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[0].text.length).toBe(280);
    expect(result.tweets[0].text.endsWith('...')).toBe(true);
  });

  it('already-numbered tweet exactly 280 chars is not truncated', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const text = '1/ ' + 'x'.repeat(277); // exactly 280 chars, already numbered
    const thread = { tweets: [{ text }] };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[0].text.length).toBe(280);
    expect(result.tweets[0].text.endsWith('...')).toBe(false);
  });

  it('ALL tweets get N/ prefix, including tweet 0', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = {
      tweets: [
        { text: 'First tweet hook' },
        { text: 'Second tweet body' },
        { text: 'Third tweet body' },
      ],
    };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[0].text).toMatch(/^1\//);
    expect(result.tweets[1].text).toMatch(/^2\//);
    expect(result.tweets[2].text).toMatch(/^3\//);
  });

  it('already-prefixed tweets are not double-prefixed', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = { tweets: [{ text: '1/ hook' }, { text: '2/ already prefixed' }] };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[1].text).toBe('2/ already prefixed');
  });

  it('object without tweets returned as-is', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const obj = { other: 'data' } as any;
    const result = await runFormatter(makeJob('twitter_thread'), obj);
    expect(result).toEqual(obj);
  });

  it('null input returned as-is', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const result = await runFormatter(makeJob('twitter_thread'), null as any);
    expect(result).toBeNull();
  });

  it('assigns sequential numbers to tweets', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = { tweets: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    result.tweets.forEach((t: any, i: number) => expect(t.number).toBe(i + 1));
  });
});

describe('runFormatter — instagram_caption', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hashtags > 30 trimmed to 30', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const caption = { hashtags: Array.from({ length: 35 }, (_, i) => `tag${i}`) };
    const result = await runFormatter(makeJob('instagram_caption'), caption) as any;
    expect(result.hashtags.length).toBe(30);
  });

  it('hashtag strings get # prefix', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const caption = { hashtags: ['fitness', '#yoga', 'health'] };
    const result = await runFormatter(makeJob('instagram_caption'), caption) as any;
    expect(result.hashtags).toEqual(['#fitness', '#yoga', '#health']);
  });

  it('missing emojis default to a fallback array of at least 3', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const caption = { caption: 'Test' };
    const result = await runFormatter(makeJob('instagram_caption'), caption) as any;
    expect(Array.isArray(result.emojis)).toBe(true);
    expect(result.emojis.length).toBeGreaterThanOrEqual(3);
  });

  it('fewer than 3 emojis are padded up to 3, not replaced outright', async () => {
    // WHY padded, not replaced: overwriting the whole array on <3 emojis used
    // to discard whatever the writer had already chosen for tone/topic — the
    // fix pads the existing selection with fallback emojis instead, so a
    // caption's own 2 emojis survive alongside 1 padding emoji, not get
    // thrown away for a generic hardcoded 5-emoji set.
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const caption = { emojis: ['😀', '😂'] };
    const result = await runFormatter(makeJob('instagram_caption'), caption) as any;
    expect(result.emojis.length).toBe(3);
    expect(result.emojis).toContain('😀');
    expect(result.emojis).toContain('😂');
  });

  it('3 or more emojis are kept as-is', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const emojis = ['😀', '😂', '🎉'];
    const caption = { emojis };
    const result = await runFormatter(makeJob('instagram_caption'), caption) as any;
    expect(result.emojis).toEqual(emojis);
  });

  it('null input returned as-is', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const result = await runFormatter(makeJob('instagram_caption'), null as any);
    expect(result).toBeNull();
  });
});

describe('runFormatter — unrecognized platform', () => {
  it('passes content through unchanged (default case)', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const content = { hook: { text: 'video hook' }, segments: [] } as any;
    const result = await runFormatter(makeJob('video_script'), content);
    expect(result).toBe(content);
  });
});
