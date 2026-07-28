/**
 * TC-016 through TC-031 — Formatter Agent Unit Tests
 * Tests all pure formatting functions with no external dependencies.
 */
import { describe, it, expect } from 'vitest';

// ─── Inline copies of the pure functions so we can test without spinning up the
//     full server (which requires DB/Redis/Clerk at import time). ──────────────

function formatCarousel(slides: any[]): any[] {
  if (!Array.isArray(slides)) return slides;
  return slides.map((slide, index) => {
    const formatted = { ...slide };
    const isLast = index === slides.length - 1;
    if (!formatted.type) {
      formatted.type = index === 0 ? 'cover' : isLast ? 'cta' : 'content';
    }
    formatted.slide_number = index + 1;
    formatted.slideNumber  = index + 1;
    if (isLast) {
      if (formatted.type !== 'cta') formatted.type = 'cta';
      if (!formatted.cta) formatted.cta = { action: 'Follow for more', handle: '' };
    }
    const words = (formatted.body || '').split(/\s+/);
    if (words.length > 80) {
      formatted.body = words.slice(0, 80).join(' ') + '…';
    }
    if (Array.isArray(slide.points)) {
      formatted.points = slide.points;
    }
    return formatted;
  });
}

function formatLinkedIn(post: any): any {
  if (!post || typeof post !== 'object') return post;
  const formatted = { ...post };
  if (formatted.hook && !formatted.hook.includes('\n')) {
    formatted.hook = formatted.hook.trim();
  }
  if (formatted.body) {
    const sentences = formatted.body.split(/(?<=[.!?])\s+/);
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      paragraphs.push(sentences.slice(i, i + 2).join(' '));
    }
    formatted.body = paragraphs.join('\n\n');
  }
  if (formatted.hashtags && formatted.hashtags.length > 5) {
    formatted.hashtags = formatted.hashtags.slice(0, 5);
  }
  if (formatted.hashtags) {
    formatted.hashtags = formatted.hashtags.map((tag: string) =>
      tag.startsWith('#') ? tag : `#${tag}`
    );
  }
  return formatted;
}

function formatTwitterThread(thread: any): any {
  if (!thread || !thread.tweets) return thread;
  const formatted = { ...thread };
  formatted.tweets = formatted.tweets.map((tweet: any, index: number) => {
    const t = { ...tweet };
    const n = index + 1;
    const prefix = `${n}/`;
    const alreadyNumbered = /^\d+\/\s/.test(String(t.text));
    if (!alreadyNumbered) {
      t.text = `${prefix} ${t.text}`;
    }
    if (t.text.length > 280) {
      t.text = t.text.slice(0, 277) + '...';
    }
    t.number = n;
    return t;
  });
  return formatted;
}

function formatInstagramCaption(caption: any): any {
  if (!caption || typeof caption !== 'object') return caption;
  const formatted = { ...caption };
  if (formatted.hashtags && formatted.hashtags.length > 30) {
    formatted.hashtags = formatted.hashtags.slice(0, 30);
  }
  if (formatted.hashtags) {
    formatted.hashtags = formatted.hashtags.map((tag: string) =>
      tag.startsWith('#') ? tag : `#${tag}`
    );
  }
  if (!formatted.emojis || formatted.emojis.length < 3) {
    formatted.emojis = ['✨', '💫', '🔥', '💡', '🎯'];
  }
  return formatted;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSlide(overrides: object = {}): any {
  return { headline: 'Test', body: 'Short body.', ...overrides };
}

function longBody(wordCount: number): string {
  return Array.from({ length: wordCount }, (_, i) => `word${i}`).join(' ');
}

// ─── formatCarousel ───────────────────────────────────────────────────────────

describe('formatCarousel', () => {
  it('TC-016 — adds slide_number to every slide', () => {
    const slides = [makeSlide(), makeSlide(), makeSlide()];
    const result = formatCarousel(slides);
    result.forEach((s, i) => {
      expect(s.slide_number).toBe(i + 1);
      expect(s.slideNumber).toBe(i + 1);
    });
  });

  it('TC-017 — last slide is forced to type=cta', () => {
    const slides = [makeSlide(), makeSlide({ type: 'content' }), makeSlide({ type: 'content' })];
    const result = formatCarousel(slides);
    expect(result[result.length - 1].type).toBe('cta');
  });

  it('TC-017b — last slide type=cta gets a default cta action when missing', () => {
    const slides = [makeSlide(), makeSlide()];
    const result = formatCarousel(slides);
    const last = result[result.length - 1];
    expect(last.cta).toBeDefined();
    expect(last.cta.action).toBeTruthy();
  });

  it('TC-018 — body > 80 words is truncated with ellipsis', () => {
    const body100 = longBody(100);
    const slides = [makeSlide({ body: body100 }), makeSlide()];
    const result = formatCarousel(slides);
    const words = result[0].body.split(/\s+/);
    // Last "word" is the ellipsis concatenated onto word79, count up to 80 tokens
    expect(result[0].body.endsWith('…')).toBe(true);
    expect(words.length).toBe(80);
  });

  it('TC-018b — body with exactly 80 words is NOT truncated', () => {
    const body80 = longBody(80);
    const slides = [makeSlide({ body: body80 }), makeSlide()];
    const result = formatCarousel(slides);
    expect(result[0].body.endsWith('…')).toBe(false);
  });

  it('TC-019 — non-array input returned as-is', () => {
    const notArray: any = { slides: [] };
    const result = formatCarousel(notArray);
    expect(result).toBe(notArray);
  });

  it('TC-020 — points array is preserved on slide', () => {
    const points = [{ text: 'Point 1' }, { text: 'Point 2' }];
    const slides = [makeSlide({ points }), makeSlide()];
    const result = formatCarousel(slides);
    expect(result[0].points).toEqual(points);
  });

  it('TC-021 — first slide without type gets type=cover', () => {
    const slides = [makeSlide(), makeSlide(), makeSlide()];
    const result = formatCarousel(slides);
    expect(result[0].type).toBe('cover');
  });

  it('TC-021b — middle slide without type gets type=content', () => {
    const slides = [makeSlide(), makeSlide(), makeSlide()];
    const result = formatCarousel(slides);
    expect(result[1].type).toBe('content');
  });

  it('TC-021c — existing type on non-last slide is preserved', () => {
    const slides = [makeSlide({ type: 'stat' }), makeSlide()];
    const result = formatCarousel(slides);
    expect(result[0].type).toBe('stat');
  });
});

// ─── formatLinkedIn ───────────────────────────────────────────────────────────

describe('formatLinkedIn', () => {
  it('TC-022 — hashtags > 5 trimmed to 5', () => {
    const post = { hashtags: ['a','b','c','d','e','f','g'] };
    const result = formatLinkedIn(post);
    expect(result.hashtags.length).toBe(5);
  });

  it('TC-023 — hashtag strings without # get prefixed', () => {
    const post = { hashtags: ['marketing', '#seo', 'growth'] };
    const result = formatLinkedIn(post);
    expect(result.hashtags).toEqual(['#marketing', '#seo', '#growth']);
  });

  it('TC-023b — hashtags already prefixed not double-prefixed', () => {
    const post = { hashtags: ['#already', '#tagged'] };
    const result = formatLinkedIn(post);
    expect(result.hashtags[0]).toBe('#already');
  });

  it('TC-024 — body is split into 2-sentence paragraphs', () => {
    const post = {
      body: 'Sentence one. Sentence two. Sentence three. Sentence four.',
    };
    const result = formatLinkedIn(post);
    const paragraphs = result.body.split('\n\n');
    expect(paragraphs.length).toBe(2);
  });

  it('TC-025 — null input returned as-is', () => {
    expect(formatLinkedIn(null)).toBeNull();
  });

  it('TC-025b — non-object returned as-is', () => {
    expect(formatLinkedIn('string')).toBe('string');
  });
});

// ─── formatTwitterThread ─────────────────────────────────────────────────────

describe('formatTwitterThread', () => {
  it('TC-026 — tweets > 280 chars truncated to 277 + ...', () => {
    const longText = 'x'.repeat(300);
    const thread = { tweets: [{ text: longText }] };
    const result = formatTwitterThread(thread);
    expect(result.tweets[0].text.length).toBe(280);
    expect(result.tweets[0].text.endsWith('...')).toBe(true);
  });

  it('TC-026b — already-numbered tweet exactly 280 chars is not truncated', () => {
    // "1/ " prefix already present, so no extra chars added; must stay <= 280
    const text = '1/ ' + 'x'.repeat(277); // exactly 280 chars, already numbered
    const thread = { tweets: [{ text }] };
    const result = formatTwitterThread(thread);
    expect(result.tweets[0].text.length).toBe(280);
    expect(result.tweets[0].text.endsWith('...')).toBe(false);
  });

  it('TC-027 — ALL tweets get N/ prefix (including tweet 0)', () => {
    const thread = {
      tweets: [
        { text: 'First tweet hook' },
        { text: 'Second tweet body' },
        { text: 'Third tweet body' },
      ],
    };
    const result = formatTwitterThread(thread);
    expect(result.tweets[0].text).toMatch(/^1\//); // first tweet now also numbered
    expect(result.tweets[1].text).toMatch(/^2\//);
    expect(result.tweets[2].text).toMatch(/^3\//);
  });

  it('TC-027b — already-prefixed tweets are not double-prefixed', () => {
    const thread = { tweets: [{ text: '1/ hook' }, { text: '2/ already prefixed' }] };
    const result = formatTwitterThread(thread);
    expect(result.tweets[1].text).toBe('2/ already prefixed');
  });

  it('TC-028 — object without tweets returned as-is', () => {
    const obj = { other: 'data' };
    expect(formatTwitterThread(obj)).toEqual(obj);
  });

  it('TC-028b — null input returned as-is', () => {
    expect(formatTwitterThread(null)).toBeNull();
  });

  it('assigns sequential numbers to tweets', () => {
    const thread = { tweets: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] };
    const result = formatTwitterThread(thread);
    result.tweets.forEach((t: any, i: number) => expect(t.number).toBe(i + 1));
  });
});

// ─── formatInstagramCaption ───────────────────────────────────────────────────

describe('formatInstagramCaption', () => {
  it('TC-029 — hashtags > 30 trimmed to 30', () => {
    const tags = Array.from({ length: 35 }, (_, i) => `tag${i}`);
    const caption = { hashtags: tags };
    const result = formatInstagramCaption(caption);
    expect(result.hashtags.length).toBe(30);
  });

  it('TC-030 — hashtag strings get # prefix', () => {
    const caption = { hashtags: ['fitness', '#yoga', 'health'] };
    const result = formatInstagramCaption(caption);
    expect(result.hashtags).toEqual(['#fitness', '#yoga', '#health']);
  });

  it('TC-031 — missing emojis default to 5-item array', () => {
    const caption = { caption: 'Test' };
    const result = formatInstagramCaption(caption);
    expect(Array.isArray(result.emojis)).toBe(true);
    expect(result.emojis.length).toBe(5);
  });

  it('TC-031b — fewer than 3 emojis replaced with defaults', () => {
    const caption = { emojis: ['😀', '😂'] };
    const result = formatInstagramCaption(caption);
    expect(result.emojis.length).toBe(5);
  });

  it('TC-031c — 3 or more emojis are kept as-is', () => {
    const emojis = ['😀', '😂', '🎉'];
    const caption = { emojis };
    const result = formatInstagramCaption(caption);
    expect(result.emojis).toEqual(emojis);
  });

  it('null input returned as-is', () => {
    expect(formatInstagramCaption(null)).toBeNull();
  });
});
