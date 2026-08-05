/**
 * agents/researcher.ts — tests against the REAL runResearcher() export.
 *
 * The previous version of this file tested inline copies of researcher.ts's
 * extraction logic (extractKeyFacts, extractTrendingAngles, etc.) rather than
 * the real module, with a comment explicitly noting this was "to avoid
 * importing the full agent (requires SSE + DB)." That's no longer a real
 * blocker — mocking searchTavily and sseManager (both trivial, no DB
 * involved) lets the real runResearcher() run directly, so a regression in
 * the shipped extraction logic actually fails a test here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/ai.js', () => ({ searchTavily: vi.fn() }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));

const MOCK_JOB = {
  id: 'job-1',
  topic: 'content marketing',
  platform: 'linkedin_post',
} as any;

const QUERIES = ['q1', 'q2', 'q3'];

function mockTavilyResults(...resultSets: Array<Array<Record<string, unknown>>>) {
  return async (searchTavilyMock: ReturnType<typeof vi.fn>) => {
    resultSets.forEach((results) => searchTavilyMock.mockResolvedValueOnce({ results }));
  };
}

describe('runResearcher — key fact extraction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts sentences containing a percentage', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([{ content: 'Revenue grew 47%. Other stuff here.' }])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.keyFacts).toContain('Revenue grew 47%');
  });

  it('extracts sentences containing "million"/"billion"/"study"/"research"/"survey"/"report"', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([
      { content: '5 million users joined. A new study found results. Market cap reached 2 billion dollars.' },
    ])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.keyFacts.some((f) => /5 million/.test(f))).toBe(true);
  });

  it('does NOT extract plain sentences with no numeric/study keywords', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([{ content: 'This is an interesting article. Content is king.' }])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.keyFacts).toHaveLength(0);
  });

  it('caps output at 5 facts across many results', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    const manyResults = Array.from({ length: 10 }, (_, i) => ({
      content: `Fact ${i}: 50% growth seen. Another 30 million users added.`,
    }));
    await mockTavilyResults(manyResults)(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.keyFacts.length).toBeLessThanOrEqual(5);
  });

  it('returns empty array when results have no content', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([{ url: 'https://example.com', title: 'Title only' }])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.keyFacts).toHaveLength(0);
  });
});

describe('runResearcher — trending angles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts title from each result', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([{ title: 'AI Marketing in 2025' }, { title: 'Growth Hacking Strategies' }])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.trendingAngles).toEqual(['AI Marketing in 2025', 'Growth Hacking Strategies']);
  });

  it('skips results without a title', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([{ url: 'https://example.com' }, { title: 'Valid Title' }])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.trendingAngles).toEqual(['Valid Title']);
  });

  it('caps at 5 angles', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    const results = Array.from({ length: 8 }, (_, i) => ({ title: `Title ${i}` }));
    await mockTavilyResults(results)(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.trendingAngles).toHaveLength(5);
  });
});

describe('runResearcher — competitor hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts the first sentence from result content', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([{ content: 'First hook sentence. Second sentence.' }])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.competitorHooks).toContain('First hook sentence');
  });

  it('caps at 5 hooks', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    const results = Array.from({ length: 8 }, (_, i) => ({ content: `Hook ${i} sentence. Body text.` }));
    await mockTavilyResults(results)(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.competitorHooks).toHaveLength(5);
  });
});

describe('runResearcher — source URLs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts and deduplicates URLs, capped at 5', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([
      { url: 'https://example.com' },
      { url: 'https://example.com' },
      { url: 'https://other.com' },
    ])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.sourceUrls).toHaveLength(2);
  });

  it('skips results without url', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([{ content: 'no url here', title: 'no url' }])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.sourceUrls).toHaveLength(0);
  });
});

describe('runResearcher — generated hashtags', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefixes topic words longer than 3 chars with #, excludes short words, appends platform + fixed tags', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    vi.mocked(searchTavily).mockResolvedValue({ results: [] });

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher({ ...MOCK_JOB, topic: 'AI for content marketing' }, QUERIES);

    expect(result.suggestedHashtags).toContain('#content');
    expect(result.suggestedHashtags).toContain('#marketing');
    expect(result.suggestedHashtags).not.toContain('#ai');
    expect(result.suggestedHashtags).not.toContain('#for');
    expect(result.suggestedHashtags).toContain('#linkedinpost');
    expect(result.suggestedHashtags).toContain('#contentcreator');
    expect(result.suggestedHashtags).toContain('#socialmedia');
  });

  it('deduplicates and caps hashtags at 15', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    vi.mocked(searchTavily).mockResolvedValue({ results: [] });

    const longTopic = Array.from({ length: 20 }, (_, i) => `keyword${i}`).join(' ');
    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher({ ...MOCK_JOB, topic: longTopic }, QUERIES);

    expect(result.suggestedHashtags.length).toBeLessThanOrEqual(15);
    expect(new Set(result.suggestedHashtags).size).toBe(result.suggestedHashtags.length);
  });
});

describe('runResearcher — parallel search handling (Promise.allSettled)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('merges results from all fulfilled searches', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    await mockTavilyResults([{ title: 'A' }, { title: 'B' }], [{ title: 'C' }])(vi.mocked(searchTavily));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.trendingAngles).toEqual(['A', 'B', 'C']);
  });

  it('silently continues when one of the parallel searches rejects', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    vi.mocked(searchTavily)
      .mockResolvedValueOnce({ results: [{ title: 'Valid' }] })
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ results: [] });

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.trendingAngles).toEqual(['Valid']);
  });

  it('returns empty extraction results (not a thrown error) when all searches reject', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    vi.mocked(searchTavily).mockRejectedValue(new Error('timeout'));

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, QUERIES);

    expect(result.trendingAngles).toHaveLength(0);
    expect(result.keyFacts).toHaveLength(0);
    expect(result.rawResults).toHaveLength(0);
  });

  it('only searches the first 3 queries even if more are provided', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    vi.mocked(searchTavily).mockResolvedValue({ results: [] });

    const { runResearcher } = await import('../../src/agents/researcher.js');
    await runResearcher(MOCK_JOB, ['q1', 'q2', 'q3', 'q4', 'q5']);

    expect(searchTavily).toHaveBeenCalledTimes(3);
  });

  it('a fulfilled search whose value has no results key contributes nothing (not a crash)', async () => {
    const { searchTavily } = await import('../../src/lib/ai.js');
    // @ts-expect-error — deliberately malformed to match a real degraded Tavily response
    vi.mocked(searchTavily).mockResolvedValueOnce({ error: 'no results key' });

    const { runResearcher } = await import('../../src/agents/researcher.js');
    const result = await runResearcher(MOCK_JOB, ['q1']);

    expect(result.trendingAngles).toHaveLength(0);
    expect(result.rawResults).toHaveLength(0);
  });
});
