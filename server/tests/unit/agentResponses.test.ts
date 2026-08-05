/**
 * schemas/agentResponses.ts — per-field tolerance regression test.
 *
 * WHY this file exists: these schemas are deliberately NOT strict — a naive
 * z.number()/z.string() per field would make ONE malformed field fail
 * validation for the entire object/array containing it (Zod's default
 * all-or-nothing semantics), discarding real content (e.g. all 8 carousel
 * slides) in favor of the generic fallback just because one field on one
 * slide was the wrong type. Every field/array/nested-object here is wrapped
 * in .catch() specifically to prevent that — this test asserts that
 * guarantee holds, since it's exactly the kind of property a future schema
 * edit could accidentally regress without any type error to catch it.
 */
import { describe, it, expect } from 'vitest';
import {
  criticResponseSchema,
  writerCarouselResponseSchema,
  writerLinkedInResponseSchema,
  writerTwitterResponseSchema,
  writerVideoScriptResponseSchema,
} from '../../src/schemas/agentResponses.js';

describe('criticResponseSchema — per-field tolerance', () => {
  it('a single non-numeric field does not invalidate the other 4 valid scores', () => {
    const result = criticResponseSchema.safeParse({
      hookStrength: 15,
      platformCompliance: 'not-a-number',
      brandVoiceMatch: 14,
      valueDelivery: 16,
      ctaClarity: 13,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.hookStrength).toBe(15);
    expect(result.data.platformCompliance).toBe(0); // bad field falls back to 0
    expect(result.data.brandVoiceMatch).toBe(14);
    expect(result.data.valueDelivery).toBe(16);
    expect(result.data.ctaClarity).toBe(13);
  });

  it('an out-of-range value (200) still passes through the schema unclamped (clampScore\'s job, not this schema\'s)', () => {
    const result = criticResponseSchema.safeParse({ hookStrength: 200 });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.hookStrength).toBe(200);
  });

  it('a completely empty object still validates (all fields optional)', () => {
    const result = criticResponseSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('writerCarouselResponseSchema — per-field/per-slide tolerance', () => {
  it('a malformed field on ONE slide does not discard the other real slides', () => {
    const slides = [
      { slide_number: 1, headline: 'Real headline 1', body: 'Real body 1', type: 'cover' },
      { slide_number: 2, headline: 42, body: 'Real body 2', type: 'content' }, // headline wrong type
      { slide_number: 3, headline: 'Real headline 3', body: 'Real body 3', type: 'cta' },
    ];
    const result = writerCarouselResponseSchema.safeParse(slides);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(3);
    expect(result.data[0].headline).toBe('Real headline 1');
    // coerced to string, not discarded — z.coerce.string() turns 42 into "42"
    expect(result.data[1].headline).toBe('42');
    expect(result.data[2].headline).toBe('Real headline 3');
  });

  it('a malformed point inside one slide\'s points array does not discard the slide or the array', () => {
    const slides = [
      {
        slide_number: 1,
        headline: 'Features',
        points: [
          { icon: '⚡', label: 'Fast' },
          null, // malformed point
          { icon: '🎯', label: 'Accurate' },
        ],
      },
    ];
    const result = writerCarouselResponseSchema.safeParse(slides);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0].headline).toBe('Features');
    // the whole points array falls back to [] since one element was
    // unparseable (an object-level .catch({}) can't apply to a bare `null`
    // that isn't an object at all) — but critically, the SLIDE survives.
    expect(result.data[0].points).toEqual([]);
  });

  it('a completely unparseable slide (a bare string, not an object) degrades that slide but keeps its siblings', () => {
    const slides = [
      { slide_number: 1, headline: 'Real slide' },
      'this is not a slide object at all',
      { slide_number: 3, headline: 'Another real slide' },
    ];
    const result = writerCarouselResponseSchema.safeParse(slides);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(3);
    expect(result.data[0].headline).toBe('Real slide');
    expect(result.data[2].headline).toBe('Another real slide');
  });
});

describe('writerLinkedInResponseSchema — per-field tolerance', () => {
  it('a malformed hashtags field does not discard hook/body/cta', () => {
    const result = writerLinkedInResponseSchema.safeParse({
      hook: 'Real hook',
      body: 'Real body',
      cta: 'Real cta',
      hashtags: 'not-an-array',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.hook).toBe('Real hook');
    expect(result.data.hashtags).toEqual([]);
  });
});

describe('writerTwitterResponseSchema — per-tweet tolerance', () => {
  it('one malformed tweet does not discard the others', () => {
    const result = writerTwitterResponseSchema.safeParse({
      tweets: [
        { number: 1, text: '1/ Real tweet' },
        { number: 'bad', text: 42 },
        { number: 3, text: '3/ Another real tweet' },
      ],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.tweets).toHaveLength(3);
    expect(result.data.tweets?.[0].text).toBe('1/ Real tweet');
    expect(result.data.tweets?.[2].text).toBe('3/ Another real tweet');
  });
});

describe('writerVideoScriptResponseSchema — per-segment tolerance', () => {
  it('one malformed segment does not discard the others or the hook', () => {
    const result = writerVideoScriptResponseSchema.safeParse({
      hook: { text: 'Real hook', duration: '0-3s' },
      segments: [
        { number: 1, script: 'Real segment 1' },
        { number: 2, script: null },
        { number: 3, script: 'Real segment 3' },
      ],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.hook?.text).toBe('Real hook');
    expect(result.data.segments).toHaveLength(3);
    expect(result.data.segments?.[0].script).toBe('Real segment 1');
    expect(result.data.segments?.[2].script).toBe('Real segment 3');
  });
});
