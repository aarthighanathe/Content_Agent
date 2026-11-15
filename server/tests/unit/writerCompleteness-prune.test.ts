/**
 * writerCompleteness — Pass-8 prune + carousel floor (batch 2).
 */
import { describe, it, expect } from 'vitest';
import {
  CAROUSEL_MIN_SLIDES,
  enforceWriterCompleteness,
} from '../../src/agents/writerCompleteness.js';

describe('enforceWriterCompleteness — prune + floors', () => {
  it('raises carousel floor to exactly 8 on the writer path', () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({
      headline: `H${i}`,
      body: `B${i}`,
    }));
    expect(() =>
      enforceWriterCompleteness('instagram_carousel', seven as never),
    ).toThrow(new RegExp(`received 7 slides, expected ${CAROUSEL_MIN_SLIDES}`));
  });

  it('re-checks carousel floor after format scrub (requireMinCounts false)', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({
      headline: `H${i}`,
      body: `B${i}`,
    }));
    expect(() =>
      enforceWriterCompleteness('instagram_carousel', six as never, {
        requireMinCounts: false,
      }),
    ).toThrow(/expected 8/);
  });

  it('prunes hollow tweets when requireMinCounts is false', () => {
    const result = enforceWriterCompleteness(
      'twitter_thread',
      {
        tweets: [
          { number: 1, text: 'First real tweet' },
          { number: 2, text: '   ' },
          { number: 3, text: 'undefined' },
          { number: 4, text: 'Second real tweet' },
          { number: 5, text: 'Third real tweet' },
        ],
      } as never,
      { requireMinCounts: false },
    ) as { tweets: Array<{ text: string }> };

    expect(result.tweets).toEqual([
      { number: 1, text: 'First real tweet' },
      { number: 4, text: 'Second real tweet' },
      { number: 5, text: 'Third real tweet' },
    ]);
  });

  it('throws when pruned tweets fall below minima on formatter path', () => {
    expect(() =>
      enforceWriterCompleteness(
        'twitter_thread',
        {
          tweets: [
            { number: 1, text: 'Only one real' },
            { number: 2, text: 'null' },
            { number: 3, text: '  ' },
          ],
        } as never,
        { requireMinCounts: false },
      ),
    ).toThrow(/expected at least 3/);
  });

  it('throws Incomplete when tweets is missing or not an array', () => {
    expect(() =>
      enforceWriterCompleteness('twitter_thread', { hook: 'no tweets key' } as never),
    ).toThrow(/tweets array is required/);
    expect(() =>
      enforceWriterCompleteness(
        'twitter_thread',
        { tweets: 'not-an-array' } as never,
      ),
    ).toThrow(/tweets array is required/);
    expect(() =>
      enforceWriterCompleteness(
        'twitter_thread',
        { tweets: null } as never,
        { requireMinCounts: false },
      ),
    ).toThrow(/tweets array is required/);
  });

  it('prunes hollow segments when requireMinCounts is false', () => {
    const result = enforceWriterCompleteness(
      'video_script',
      {
        hook: { text: 'Watch this' },
        segments: [
          { number: 1, script: 'Real segment' },
          { number: 2, script: '  ' },
          { number: 3, script: 'undefined' },
        ],
        cta: { text: 'Follow' },
      } as never,
      { requireMinCounts: false },
    ) as { segments: Array<{ script: string }> };

    expect(result.segments).toEqual([{ number: 1, script: 'Real segment' }]);
  });
});
