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

// WHY: post-format completeness requires >= 8 real slides (writer EXACTLY-8 floor).
function padToEight(slides: any[]): any[] {
  const out = [...slides];
  while (out.length < 8) {
    out.push(makeSlide({ type: 'content', headline: `Pad ${out.length + 1}` }));
  }
  return out;
}

function longBody(wordCount: number): string {
  return Array.from({ length: wordCount }, (_, i) => `word${i}`).join(' ');
}

describe('runFormatter — instagram_carousel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds slide_number and slideNumber to every slide', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = padToEight([makeSlide(), makeSlide(), makeSlide()]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    result.forEach((s, i) => {
      expect(s.slide_number).toBe(i + 1);
      expect(s.slideNumber).toBe(i + 1);
    });
  });

  it('appends a CTA slide when none remain instead of mutating the prior slide', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = padToEight([
      makeSlide({ type: 'cover', headline: 'Cover' }),
      makeSlide({ type: 'content', headline: 'Keep me' }),
      makeSlide({ type: 'content', headline: 'Also keep' }),
    ]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result).toHaveLength(9);
    expect(result[1].type).toBe('content');
    expect(result[1].headline).toBe('Keep me');
    expect(result[2].type).toBe('content');
    expect(result[2].headline).toBe('Also keep');
    expect(result[8].type).toBe('cta');
    expect(result[8].cta?.action).toBeTruthy();
    expect(result[8].slide_number).toBe(9);
  });

  it('appended CTA gets a default action when no CTA slide exists', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = padToEight([makeSlide(), makeSlide()]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    const last = result[result.length - 1];
    expect(last.type).toBe('cta');
    expect(last.cta).toBeDefined();
    expect(last.cta.action).toBeTruthy();
  });

  it('hollow CTA drop does not overwrite the prior content slide type', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    // WHY: 8 real slides + one hollow CTA — after drop the floor still passes and
    // ensureCarouselHasCta appends instead of mutating the last content slide.
    const slides = [
      ...padToEight([
        makeSlide({ type: 'cover', headline: 'Cover headline' }),
        makeSlide({ type: 'content', headline: 'Real insight', body: 'Keep this body.' }),
      ]),
      makeSlide({ type: 'cta', headline: 'undefined', body: 'null' }),
    ];
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result.some((s) => s.headline === 'Real insight' && s.type === 'content')).toBe(true);
    expect(result[result.length - 1].type).toBe('cta');
    expect(result[result.length - 1].headline).not.toBe('Real insight');
    expect(result.map((s) => s.slide_number)).toEqual(
      result.map((_: unknown, i: number) => i + 1),
    );
  });

  it('rejects carousels below the 8-slide floor after hollow filter', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = [
      makeSlide({ type: 'cover' }),
      makeSlide({ type: 'content' }),
      makeSlide({ type: 'cta', headline: 'undefined', body: 'null' }),
    ];
    await expect(runFormatter(makeJob('instagram_carousel'), slides)).rejects.toThrow(
      /expected 8/,
    );
  });

  it('body over the slide-1 cap (60) is truncated with ellipsis', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = padToEight([makeSlide({ body: longBody(100) }), makeSlide()]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    const words = result[0].body.split(/\s+/);
    expect(result[0].body.endsWith('…')).toBe(true);
    expect(words.length).toBe(60);
  });

  it('body with exactly 60 words is NOT truncated', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = padToEight([makeSlide({ body: longBody(60) }), makeSlide()]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result[0].body.endsWith('…')).toBe(false);
  });

  it('features-typed slide truncates at 30 words even when not index 4', async () => {
    // WHY: after hollow drops, features may sit at slide_number 2 — type/role
    // must drive the 30-word cap, not the renumbered index (old map used 60).
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = padToEight([
      makeSlide({ type: 'cover' }),
      makeSlide({ type: 'features', body: longBody(40) }),
      makeSlide({ type: 'cta', body: longBody(10) }),
    ]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    const words = result[1].body.split(/\s+/);
    expect(result[1].body.endsWith('…')).toBe(true);
    expect(words.length).toBe(30);
  });

  it('content slide with points truncates at 30 (list-intro role)', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const points = [{ icon: '01', label: 'Step', desc: 'Do the thing' }];
    const slides = padToEight([
      makeSlide({ type: 'cover' }),
      makeSlide({ type: 'content', points, body: longBody(40) }),
      makeSlide({ type: 'cta' }),
    ]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result[1].body.endsWith('…')).toBe(true);
    expect(result[1].body.split(/\s+/).length).toBe(30);
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
    const slides = padToEight([makeSlide({ points }), makeSlide()]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    expect(result[0].points).toEqual(points);
  });

  it('first slide without type gets type=cover, middle gets type=content, existing type preserved', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = padToEight([makeSlide({ type: 'stat' }), makeSlide(), makeSlide()]);
    const result = await runFormatter(makeJob('instagram_carousel'), slides) as any[];
    // slide 0 has an explicit type ('stat'), preserved since it's not the last slide
    expect(result[0].type).toBe('stat');
    expect(result[1].type).toBe('content');
  });

  it('a genuinely typeless first slide gets type=cover', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const slides = padToEight([makeSlide(), makeSlide(), makeSlide()]);
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

// WHY: post-format completeness requires >= 3 real tweets (writer floor).
function padTweets(tweets: Array<{ text: string }>): Array<{ text: string }> {
  const out = [...tweets];
  while (out.length < 3) {
    out.push({ text: `Pad tweet ${out.length + 1}` });
  }
  return out;
}

describe('runFormatter — twitter_thread', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tweets > 280 chars truncated to 277 + "..."', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = { tweets: padTweets([{ text: 'x'.repeat(300) }]) };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[0].text.length).toBe(280);
    expect(result.tweets[0].text.endsWith('...')).toBe(true);
  });

  it('already-numbered tweet exactly 280 chars is not truncated', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const text = '1/ ' + 'x'.repeat(277); // exactly 280 chars, already numbered
    const thread = { tweets: padTweets([{ text }]) };
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

  it('already-prefixed tweets are stripped once then re-prefixed (no double N/)', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = {
      tweets: padTweets([{ text: '1/ hook' }, { text: '2/ already prefixed' }]),
    };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[0].text).toBe('1/ hook');
    expect(result.tweets[1].text).toBe('2/ already prefixed');
  });

  it('re-prefixes when numbered without a space (1/Hook → 1/ Hook)', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = { tweets: padTweets([{ text: '1/Hook' }, { text: '2/Body' }]) };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[0].text).toBe('1/ Hook');
    expect(result.tweets[1].text).toBe('2/ Body');
  });

  it('fractions/dates like 3/5 are preserved under the thread index', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = {
      tweets: padTweets([
        { text: '3/5 of marketers still skip research' },
        { text: 'Here is what to do instead' },
      ]),
    };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[0].text).toBe('1/ 3/5 of marketers still skip research');
    expect(result.tweets[1].text).toMatch(/^2\//);
  });

  it('corrects a wrong writer index when re-prefixing', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const thread = {
      tweets: padTweets([{ text: '5/ first tweet' }, { text: '9/ second' }]),
    };
    const result = await runFormatter(makeJob('twitter_thread'), thread) as any;
    expect(result.tweets[0].text).toBe('1/ first tweet');
    expect(result.tweets[1].text).toBe('2/ second');
  });

  it('object without tweets throws incomplete (completeness gate)', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const obj = { other: 'data' } as any;
    // WHY: enforceWriterCompleteness now requires tweets[] — missing array
    // must retry instead of shipping a hollow "complete" thread.
    await expect(runFormatter(makeJob('twitter_thread'), obj)).rejects.toThrow(
      /Incomplete Twitter thread: tweets array is required/,
    );
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

  it('rejects caption that scrubs to empty coerce junk', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    await expect(
      runFormatter(makeJob('instagram_caption'), { caption: 'undefined' } as any),
    ).rejects.toThrow(/Incomplete Instagram caption/);
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

describe('runFormatter — video_script', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scrubs coerce-junk nested strings on hook/segments/cta', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const content = {
      hook: { text: 'Watch this', duration: 'undefined', visual: 'Close-up' },
      segments: [{ number: 1, script: 'Real script', caption: 'null' }],
      cta: { text: 'Follow for more', duration: '3s', visual: 'undefined' },
    } as any;
    const result = await runFormatter(makeJob('video_script'), content) as any;
    expect(result.hook.text).toBe('Watch this');
    expect(result.hook.duration).toBeUndefined();
    expect(result.segments[0].caption).toBeUndefined();
    expect(result.cta.text).toBe('Follow for more');
    expect(result.cta.visual).toBeUndefined();
  });

  it('rejects video script whose cta.text scrubs to coerce junk', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    await expect(
      runFormatter(makeJob('video_script'), {
        hook: { text: 'Watch this' },
        segments: [{ number: 1, script: 'Real script' }],
        cta: { text: 'undefined' },
      } as any),
    ).rejects.toThrow(/cta\.text/);
  });
});

describe('runFormatter — unrecognized platform', () => {
  it('passes content through unchanged (default case)', async () => {
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const content = { other: 'data' } as any;
    const result = await runFormatter(makeJob('unknown_platform'), content);
    expect(result).toBe(content);
  });
});
