/**
 * agents/orchestrator.ts — tests against the REAL exports.
 *
 * The previous version of this file tested a local transcription
 * (parseOrchestratorResponse + a duplicated PLATFORM_RULES copy) rather than
 * the real module — it passed even when it didn't reflect orchestrator.ts's
 * actual behavior. This imports the real runOrchestrator() (mocking only
 * generateWithAI/sseManager), so the schema-validation fix applied in this
 * pass (a parseable-but-malformed response now falls to the same safe default
 * as a JSON.parse() failure, instead of silently flowing through) is actually
 * verified here, not just type-checked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn() }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));

const MOCK_JOB = {
  id: 'job-1',
  topic: 'AI marketing tools',
  platform: 'instagram_carousel',
  tone: 'professional',
  targetAudience: 'digital marketers',
} as any;

describe('runOrchestrator — response parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses a valid JSON response correctly', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      taskPlan: 'Create a carousel about AI tools for marketers',
      searchQueries: ['AI tools 2024 stats', 'Instagram carousel best practices', 'marketers AI adoption'],
    }));

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);

    expect(result.taskPlan).toBe('Create a carousel about AI tools for marketers');
    expect(result.searchQueries).toHaveLength(3);
  });

  it('falls back to default search queries on malformed JSON', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('not valid json');

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);

    expect(result.searchQueries).toHaveLength(3);
    expect(result.taskPlan).toContain('AI marketing tools');
  });

  it('falls back to the same default when JSON parses but the shape is invalid (schema-validation fix)', async () => {
    // WHY this test matters: before this pass's fix, a parseable-but-malformed
    // response (searchQueries sent as a single string instead of an array)
    // would have flowed through as `parsed.searchQueries?.length >= 1` on a
    // STRING's .length property — "some string".length is a number, so this
    // could silently pass the >= 1 check and return a string where an array
    // of queries was expected downstream. The schema now coerces/falls back
    // this to a real array.
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      taskPlan: 'Test plan',
      searchQueries: 'not an array at all',
    }));

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);

    expect(Array.isArray(result.searchQueries)).toBe(true);
    expect(result.searchQueries).toHaveLength(3);
    result.searchQueries.forEach((q) => expect(typeof q).toBe('string'));
  });

  it('caps searchQueries to 3 even if the model returns more', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      taskPlan: 'Test plan',
      searchQueries: ['q1', 'q2', 'q3', 'q4', 'q5'],
    }));

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);

    expect(result.searchQueries.length).toBeLessThanOrEqual(3);
  });

  it('falls back to 3 default queries when the model returns 0 queries', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({ taskPlan: 'Test', searchQueries: [] }));

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);

    expect(result.searchQueries).toHaveLength(3);
  });

  it('attaches correct platform rules for instagram_carousel', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('{}');

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);

    expect(result.platformRules.format).toBe('carousel');
    expect(result.platformRules.slides).toBe('8 slides');
  });

  it('taskPlan falls back to a topic-derived default when the model response has no taskPlan', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({ searchQueries: ['q1', 'q2', 'q3'] }));

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);

    expect(typeof result.taskPlan).toBe('string');
    expect(result.taskPlan.length).toBeGreaterThan(0);
  });

  it('extracts JSON embedded in markdown fences', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('```json\n{"taskPlan":"Test plan","searchQueries":["q1","q2","q3"]}\n```');

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);

    expect(result.taskPlan).toBe('Test plan');
  });

  it('unknown platform returns empty platformRules', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('{}');

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator({ ...MOCK_JOB, platform: 'tiktok' });

    expect(result.platformRules).toEqual({});
  });

  it('default queries include the topic and use "latest" not a hardcoded year', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('not json');

    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator(MOCK_JOB);
    const allQueries = result.searchQueries.join(' ');

    expect(allQueries).toContain('AI marketing tools');
    expect(allQueries).toContain('latest');
    expect(allQueries).not.toMatch(/\b202[0-9]\b/);
    result.searchQueries.forEach((q) => {
      expect(typeof q).toBe('string');
      expect(q.length).toBeGreaterThan(0);
    });
  });
});

describe('PLATFORM_RULES coverage (via runOrchestrator)', () => {
  const VALID_PLATFORMS = ['instagram_carousel', 'linkedin_post', 'twitter_thread', 'instagram_caption', 'video_script'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has rules for all 5 platforms', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');

    for (const platform of VALID_PLATFORMS) {
      vi.mocked(generateWithAI).mockResolvedValueOnce('{}');
      const result = await runOrchestrator({ ...MOCK_JOB, platform });
      expect(Object.keys(result.platformRules).length).toBeGreaterThan(0);
    }
  });

  it('linkedin_post specifies a word count range', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('{}');
    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator({ ...MOCK_JOB, platform: 'linkedin_post' });
    expect(result.platformRules.wordCount).toMatch(/\d+-\d+\s*words/);
  });

  it('twitter_thread enforces a 280 char limit', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('{}');
    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator({ ...MOCK_JOB, platform: 'twitter_thread' });
    expect(result.platformRules.maxCharsPerTweet).toBe(280);
  });

  it('instagram_carousel has an 8-slide structure with a correct narrative arc', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('{}');
    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator({ ...MOCK_JOB, platform: 'instagram_carousel' });
    expect(result.platformRules.slides).toBe('8 slides');
    expect(result.platformRules.structure).toContain('cover');
    expect(result.platformRules.structure).toContain('cta');
    expect(result.platformRules.maxWordsPerSlide).toBe(60);
  });

  it('instagram_caption specifies a 10-15 hashtag count', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('{}');
    const { runOrchestrator } = await import('../../src/agents/orchestrator.js');
    const result = await runOrchestrator({ ...MOCK_JOB, platform: 'instagram_caption' });
    expect(result.platformRules.hashtags).toContain('10-15');
  });
});
