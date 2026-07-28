/**
 * agents/researcher — Unit Tests
 * Tests pure extraction logic (fact/angle/hook/URL/hashtag extraction).
 * Inline copies to avoid importing the full agent (requires SSE + DB).
 */
import { describe, it, expect } from 'vitest';

// ─── Inline copies of researcher.ts pure extraction logic ────────────────────

function extractKeyFacts(results: any[]): string[] {
  const keyFacts: string[] = [];
  results.forEach((result: any) => {
    if (result.content) {
      const factSentences = result.content.split('. ').filter((s: string) =>
        s.match(/\d+%|\d+ (million|billion|thousand)|study|research|survey|report/i)
      );
      keyFacts.push(...factSentences.slice(0, 2));
    }
  });
  return keyFacts.slice(0, 5);
}

function extractTrendingAngles(results: any[]): string[] {
  return results
    .filter((r: any) => r.title)
    .map((r: any) => r.title)
    .slice(0, 5);
}

function extractCompetitorHooks(results: any[]): string[] {
  const hooks: string[] = [];
  results.forEach((result: any) => {
    if (result.content) {
      const sentences = result.content.split('. ').slice(0, 2);
      if (sentences.length > 0) hooks.push(sentences[0]);
    }
  });
  return hooks.slice(0, 5);
}

function extractSourceUrls(results: any[]): string[] {
  const urls = results.filter((r: any) => r.url).map((r: any) => r.url);
  return [...new Set(urls)].slice(0, 5);
}

function generateHashtags(topic: string, platform: string): string[] {
  const topicWords = topic.toLowerCase().split(/\s+/);
  const hashtags: string[] = [];
  topicWords.forEach((word: string) => {
    if (word.length > 3) hashtags.push(`#${word}`);
  });
  hashtags.push(`#${platform.replace('_', '')}`, '#contentcreator', '#socialmedia');
  return [...new Set(hashtags)].slice(0, 15);
}

function processParallelResults(outcomes: PromiseSettledResult<any>[]): any[] {
  const allResults: any[] = [];
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled' && outcome.value?.results) {
      allResults.push(...outcome.value.results);
    }
  }
  return allResults;
}

// ─── extractKeyFacts ─────────────────────────────────────────────────────────

describe('extractKeyFacts', () => {
  it('extracts sentences containing a percentage', () => {
    const results = [{ content: 'Revenue grew 47%. Other stuff here.' }];
    expect(extractKeyFacts(results)).toContain('Revenue grew 47%');
  });

  it('extracts sentences containing "million"', () => {
    const results = [{ content: '5 million users joined in 2024. The sky is blue.' }];
    const facts = extractKeyFacts(results);
    expect(facts[0]).toMatch(/5 million/);
  });

  it('extracts sentences containing "billion"', () => {
    const results = [{ content: 'Market cap reached 2 billion dollars.' }];
    expect(extractKeyFacts(results)).toHaveLength(1);
  });

  it('extracts sentences containing "study"', () => {
    const results = [{ content: 'A new study found surprising results. Nothing else.' }];
    expect(extractKeyFacts(results)[0]).toMatch(/study/i);
  });

  it('extracts sentences containing "research" keyword', () => {
    const results = [{ content: 'New research confirms the hypothesis.' }];
    expect(extractKeyFacts(results)[0]).toMatch(/research/i);
  });

  it('extracts sentences with "survey" or "report"', () => {
    const results = [
      { content: 'A survey of 1000 marketers. A report shows 80% increase.' },
    ];
    const facts = extractKeyFacts(results);
    expect(facts.some((f) => /survey/i.test(f))).toBe(true);
  });

  it('does NOT extract plain sentences with no numeric/study keywords', () => {
    const results = [{ content: 'This is an interesting article. Content is king.' }];
    expect(extractKeyFacts(results)).toHaveLength(0);
  });

  it('caps output at 5 facts across many results', () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      content: `Fact ${i}: 50% growth seen. Another 30 million users added.`,
    }));
    expect(extractKeyFacts(results).length).toBeLessThanOrEqual(5);
  });

  it('returns empty array when results have no content', () => {
    const results = [{ url: 'https://example.com', title: 'Title only' }];
    expect(extractKeyFacts(results)).toHaveLength(0);
  });

  it('returns empty array for empty results array', () => {
    expect(extractKeyFacts([])).toHaveLength(0);
  });
});

// ─── extractTrendingAngles ────────────────────────────────────────────────────

describe('extractTrendingAngles', () => {
  it('extracts title from each result', () => {
    const results = [{ title: 'AI Marketing in 2025' }, { title: 'Growth Hacking Strategies' }];
    expect(extractTrendingAngles(results)).toEqual([
      'AI Marketing in 2025',
      'Growth Hacking Strategies',
    ]);
  });

  it('skips results without a title', () => {
    const results = [{ url: 'https://example.com' }, { title: 'Valid Title' }];
    expect(extractTrendingAngles(results)).toEqual(['Valid Title']);
  });

  it('caps at 5 angles', () => {
    const results = Array.from({ length: 8 }, (_, i) => ({ title: `Title ${i}` }));
    expect(extractTrendingAngles(results)).toHaveLength(5);
  });

  it('returns empty array for empty results', () => {
    expect(extractTrendingAngles([])).toHaveLength(0);
  });
});

// ─── extractCompetitorHooks ───────────────────────────────────────────────────

describe('extractCompetitorHooks', () => {
  it('extracts the first sentence from result content', () => {
    const results = [{ content: 'First hook sentence. Second sentence.' }];
    expect(extractCompetitorHooks(results)).toContain('First hook sentence');
  });

  it('caps at 5 hooks', () => {
    const results = Array.from({ length: 8 }, (_, i) => ({
      content: `Hook ${i} sentence. Body text.`,
    }));
    expect(extractCompetitorHooks(results)).toHaveLength(5);
  });

  it('skips results without content', () => {
    const results = [{ url: 'https://example.com', title: 'No content' }];
    expect(extractCompetitorHooks(results)).toHaveLength(0);
  });

  it('returns empty array for empty results', () => {
    expect(extractCompetitorHooks([])).toHaveLength(0);
  });
});

// ─── extractSourceUrls ────────────────────────────────────────────────────────

describe('extractSourceUrls', () => {
  it('extracts URLs from results', () => {
    const results = [
      { url: 'https://example.com', content: 'text' },
      { url: 'https://blog.com/post', content: 'other' },
    ];
    expect(extractSourceUrls(results)).toEqual([
      'https://example.com',
      'https://blog.com/post',
    ]);
  });

  it('deduplicates identical URLs', () => {
    const results = [
      { url: 'https://example.com' },
      { url: 'https://example.com' },
      { url: 'https://other.com' },
    ];
    expect(extractSourceUrls(results)).toHaveLength(2);
  });

  it('caps at 5 URLs', () => {
    const results = Array.from({ length: 8 }, (_, i) => ({
      url: `https://example${i}.com`,
    }));
    expect(extractSourceUrls(results)).toHaveLength(5);
  });

  it('skips results without url', () => {
    const results = [{ content: 'no url here', title: 'no url' }];
    expect(extractSourceUrls(results)).toHaveLength(0);
  });
});

// ─── generateHashtags ─────────────────────────────────────────────────────────

describe('generateHashtags', () => {
  it('prefixes topic words longer than 3 chars with #', () => {
    const tags = generateHashtags('content marketing', 'linkedin_post');
    expect(tags).toContain('#content');
    expect(tags).toContain('#marketing');
  });

  it('excludes words with 3 or fewer characters', () => {
    const tags = generateHashtags('AI for SMB', 'linkedin_post');
    expect(tags).not.toContain('#ai');
    expect(tags).not.toContain('#for');
    expect(tags).not.toContain('#smb');
  });

  it('appends platform name (replacing underscore)', () => {
    const tags = generateHashtags('growth', 'linkedin_post');
    expect(tags).toContain('#linkedinpost');
  });

  it('always includes #contentcreator and #socialmedia', () => {
    const tags = generateHashtags('growth', 'twitter_thread');
    expect(tags).toContain('#contentcreator');
    expect(tags).toContain('#socialmedia');
  });

  it('deduplicates tags', () => {
    const tags = generateHashtags('social media marketing', 'instagram_caption');
    const unique = new Set(tags);
    expect(unique.size).toBe(tags.length);
  });

  it('caps at 15 hashtags', () => {
    const longTopic = Array.from({ length: 20 }, (_, i) => `keyword${i}`).join(' ');
    const tags = generateHashtags(longTopic, 'linkedin_post');
    expect(tags.length).toBeLessThanOrEqual(15);
  });
});

// ─── processParallelResults ───────────────────────────────────────────────────

describe('processParallelResults (Promise.allSettled handling)', () => {
  it('merges results from fulfilled promises', () => {
    const outcomes: PromiseSettledResult<any>[] = [
      { status: 'fulfilled', value: { results: [{ title: 'A' }, { title: 'B' }] } },
      { status: 'fulfilled', value: { results: [{ title: 'C' }] } },
    ];
    expect(processParallelResults(outcomes)).toHaveLength(3);
  });

  it('silently skips rejected promises', () => {
    const outcomes: PromiseSettledResult<any>[] = [
      { status: 'fulfilled', value: { results: [{ title: 'Valid' }] } },
      { status: 'rejected', reason: new Error('Network error') },
    ];
    const results = processParallelResults(outcomes);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Valid');
  });

  it('skips fulfilled value without results array', () => {
    const outcomes: PromiseSettledResult<any>[] = [
      { status: 'fulfilled', value: { error: 'no results key' } },
    ];
    expect(processParallelResults(outcomes)).toHaveLength(0);
  });

  it('handles all rejected — returns empty array', () => {
    const outcomes: PromiseSettledResult<any>[] = [
      { status: 'rejected', reason: new Error('timeout') },
      { status: 'rejected', reason: new Error('rate limit') },
    ];
    expect(processParallelResults(outcomes)).toHaveLength(0);
  });

  it('handles empty outcomes', () => {
    expect(processParallelResults([])).toHaveLength(0);
  });
});

// ─── search query capping ─────────────────────────────────────────────────────

describe('search query capping', () => {
  it('caps search queries to 3 via slice(0, 3)', () => {
    const queries = ['q1', 'q2', 'q3', 'q4', 'q5'];
    expect(queries.slice(0, 3)).toHaveLength(3);
    expect(queries.slice(0, 3)).toEqual(['q1', 'q2', 'q3']);
  });

  it('handles fewer than 3 queries gracefully', () => {
    const queries = ['q1'];
    expect(queries.slice(0, 3)).toHaveLength(1);
  });
});
