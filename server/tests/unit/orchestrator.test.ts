/**
 * agents/orchestrator.test.ts — P1
 * Tests orchestrator response parsing, fallback JSON on bad AI output,
 * PLATFORM_RULES coverage, and search query constraints.
 */
import { describe, it, expect } from 'vitest';

// ─── Inline orchestrator parsing logic (mirrors orchestrator.ts) ──────────────

const PLATFORM_RULES: Record<string, any> = {
  instagram_carousel: {
    format: 'carousel',
    slides: '8 slides',
    structure: 'cover → problem → solution → features → stat → quote → steps → cta',
    maxWordsPerSlide: 60,
  },
  linkedin_post: {
    format: 'post',
    wordCount: '150-250 words',
    hashtags: '3-5 hashtags',
    structure: 'hook in first 2 lines, short paragraphs, CTA at end',
  },
  twitter_thread: {
    format: 'thread',
    tweets: '5-8 tweets',
    maxCharsPerTweet: 280,
    structure: 'tweet 1 standalone hook, numbered N/',
  },
  instagram_caption: {
    format: 'caption',
    wordCount: '100-150 words',
    hashtags: '10-15 hashtags',
    emojis: '3-5 inline emojis',
  },
  video_script: {
    format: 'short-form video',
    duration: '30-60 seconds',
    structure: 'hook (0-3s) → 3-5 segments → CTA',
  },
};

function parseOrchestratorResponse(result: string, job: any): {
  taskPlan: string;
  searchQueries: string[];
  platformRules: Record<string, any>;
} {
  let parsed: any;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result);
  } catch {
    parsed = {
      taskPlan: `Create ${job.platform} content about ${job.topic} targeting ${job.targetAudience}`,
      searchQueries: [
        `${job.topic} latest trends and statistics`,
        `best ${job.platform.replace('_', ' ')} content strategy for ${job.topic}`,
        `${job.topic} audience pain points and motivations`,
      ],
    };
  }

  return {
    taskPlan: parsed.taskPlan || '',
    searchQueries: (parsed.searchQueries?.length >= 1 ? parsed.searchQueries : [
      `${job.topic} latest trends and statistics`,
      `best ${job.platform.replace('_', ' ')} content strategy for ${job.topic}`,
      `${job.topic} audience pain points and motivations`,
    ]).slice(0, 3),
    platformRules: PLATFORM_RULES[job.platform] || {},
  };
}

const MOCK_JOB = {
  id: 'job-1',
  topic: 'AI marketing tools',
  platform: 'instagram_carousel',
  tone: 'professional',
  targetAudience: 'digital marketers',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Orchestrator — response parsing', () => {
  it('parses valid JSON response correctly', () => {
    const aiResponse = JSON.stringify({
      taskPlan: 'Create a carousel about AI tools for marketers',
      searchQueries: ['AI tools 2024 stats', 'Instagram carousel best practices', 'marketers AI adoption'],
    });
    const result = parseOrchestratorResponse(aiResponse, MOCK_JOB);
    expect(result.taskPlan).toBe('Create a carousel about AI tools for marketers');
    expect(result.searchQueries).toHaveLength(3);
  });

  it('falls back to default search queries on malformed JSON', () => {
    const result = parseOrchestratorResponse('not valid json', MOCK_JOB);
    expect(result.searchQueries).toHaveLength(3);
    expect(result.taskPlan).toContain('AI marketing tools');
  });

  it('caps searchQueries to 3 even if AI returns more', () => {
    const aiResponse = JSON.stringify({
      taskPlan: 'Test plan',
      searchQueries: ['q1', 'q2', 'q3', 'q4', 'q5'],
    });
    const result = parseOrchestratorResponse(aiResponse, MOCK_JOB);
    expect(result.searchQueries.length).toBeLessThanOrEqual(3);
  });

  it('falls back to 3 default queries when AI returns 0 queries', () => {
    const aiResponse = JSON.stringify({ taskPlan: 'Test', searchQueries: [] });
    const result = parseOrchestratorResponse(aiResponse, MOCK_JOB);
    expect(result.searchQueries).toHaveLength(3);
  });

  it('attaches correct PLATFORM_RULES for instagram_carousel', () => {
    const result = parseOrchestratorResponse('{}', MOCK_JOB);
    expect(result.platformRules.format).toBe('carousel');
    expect(result.platformRules.slides).toBe('8 slides');
  });

  it('taskPlan falls back to empty string when AI response has no taskPlan', () => {
    const aiResponse = JSON.stringify({ searchQueries: ['q1', 'q2', 'q3'] });
    const result = parseOrchestratorResponse(aiResponse, MOCK_JOB);
    expect(typeof result.taskPlan).toBe('string');
  });

  it('extracts JSON embedded in markdown fences', () => {
    const aiResponse = '```json\n{"taskPlan":"Test plan","searchQueries":["q1","q2","q3"]}\n```';
    const result = parseOrchestratorResponse(aiResponse, MOCK_JOB);
    expect(result.taskPlan).toBe('Test plan');
  });
});

// ─── PLATFORM_RULES coverage ──────────────────────────────────────────────────

describe('PLATFORM_RULES', () => {
  const VALID_PLATFORMS = ['instagram_carousel', 'linkedin_post', 'twitter_thread', 'instagram_caption', 'video_script'];

  it('has rules for all 5 platforms', () => {
    VALID_PLATFORMS.forEach(p => {
      expect(PLATFORM_RULES[p]).toBeDefined();
    });
  });

  it('instagram_carousel has 8-slide structure with correct narrative arc', () => {
    const rules = PLATFORM_RULES.instagram_carousel;
    expect(rules.slides).toBe('8 slides');
    expect(rules.structure).toContain('cover');
    expect(rules.structure).toContain('cta');
    expect(rules.maxWordsPerSlide).toBe(60);
  });

  it('linkedin_post specifies word count range', () => {
    const rules = PLATFORM_RULES.linkedin_post;
    expect(rules.wordCount).toMatch(/\d+-\d+\s*words/);
  });

  it('twitter_thread enforces 280 char limit', () => {
    const rules = PLATFORM_RULES.twitter_thread;
    expect(rules.maxCharsPerTweet).toBe(280);
  });

  it('instagram_caption specifies hashtag count', () => {
    const rules = PLATFORM_RULES.instagram_caption;
    expect(rules.hashtags).toContain('10-15');
  });

  it('unknown platform returns empty object', () => {
    const result = parseOrchestratorResponse('{}', { ...MOCK_JOB, platform: 'tiktok' });
    expect(result.platformRules).toEqual({});
  });
});

// ─── Default query construction ───────────────────────────────────────────────

describe('Default search query construction', () => {
  it('includes topic in default queries', () => {
    const result = parseOrchestratorResponse('not json', MOCK_JOB);
    const allQueries = result.searchQueries.join(' ');
    expect(allQueries).toContain('AI marketing tools');
  });

  it('all default queries are non-empty strings', () => {
    const result = parseOrchestratorResponse('bad json %%%', MOCK_JOB);
    result.searchQueries.forEach(q => {
      expect(typeof q).toBe('string');
      expect(q.length).toBeGreaterThan(0);
    });
  });

  it('uses "latest" not hardcoded year in default queries', () => {
    const result = parseOrchestratorResponse('bad json', MOCK_JOB);
    const allQueries = result.searchQueries.join(' ');
    expect(allQueries).toContain('latest');
    expect(allQueries).not.toMatch(/\b202[0-9]\b/);
  });
});
