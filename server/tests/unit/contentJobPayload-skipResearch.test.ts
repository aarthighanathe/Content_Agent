/**
 * contentJobPayload — shared thin-research skipResearch guard (Pass-8).
 */
import { describe, it, expect } from 'vitest';
import {
  isUsableSkipResearch,
  parseSkipResearch,
} from '../../src/lib/contentJobPayload.js';

describe('isUsableSkipResearch / parseSkipResearch', () => {
  it('rejects thin research (no facts and no angles)', () => {
    expect(
      isUsableSkipResearch({ keyFacts: [], trendingAngles: [] }),
    ).toBe(false);
  });

  it('accepts research with facts or angles', () => {
    expect(
      isUsableSkipResearch({ keyFacts: ['a'], trendingAngles: [] }),
    ).toBe(true);
    expect(
      isUsableSkipResearch({ keyFacts: [], trendingAngles: ['b'] }),
    ).toBe(true);
  });

  it('parseSkipResearch returns undefined for thin research payloads', () => {
    expect(
      parseSkipResearch({
        taskPlan: 'Create twitter_thread content about AI',
        platformRules: { format: 'thread' },
        researchResult: {
          keyFacts: [],
          trendingAngles: [],
          suggestedHashtags: [],
          competitorHooks: [],
          sourceUrls: [],
        },
      }),
    ).toBeUndefined();
  });

  it('parseSkipResearch returns a bundle when research is usable', () => {
    const parsed = parseSkipResearch({
      taskPlan: 'Create twitter_thread content about AI',
      platformRules: { format: 'thread' },
      researchResult: {
        keyFacts: ['fact'],
        trendingAngles: [],
        suggestedHashtags: ['#ai'],
        competitorHooks: [],
        sourceUrls: [],
      },
    });
    expect(parsed?.researchResult.keyFacts).toEqual(['fact']);
    expect(parsed?.taskPlan).toContain('twitter_thread');
  });
});
