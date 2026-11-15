/**
 * agents/performancePredictor.ts — tests against the REAL runPerformancePredictor() export.
 *
 * No prior test file existed for this agent. Written directly against the real
 * module (mocking only generateWithAI) rather than a transcription, matching
 * the standard the rest of this pass's test rewrites established.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn() }));

const MOCK_JOB = { id: 'job-1', platform: 'linkedin_post', topic: 'AI tools', targetAudience: 'marketers' } as any;
const MOCK_CONTENT = { hook: 'A bold claim', body: 'Body text', cta: 'Follow for more' } as any;
const MOCK_CRITIC_RESULT = {
  approved: true,
  totalScore: 85,
  scores: { hookStrength: 18, platformCompliance: 17, brandVoiceMatch: 16, valueDelivery: 17, ctaClarity: 17 },
  feedback: '',
} as any;

describe('runPerformancePredictor — response parsing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses a valid JSON response correctly', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      tier: 'high',
      confidenceScore: 80,
      topReason: 'Strong hook',
      improvementSuggestion: 'Add a stat',
      benchmarkContext: 'Outperforms average',
    }));

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, MOCK_CRITIC_RESULT, undefined);

    expect(result.tier).toBe('high');
    expect(result.confidenceScore).toBe(80);
    expect(result.topReason).toBe('Strong hook');
  });

  it('falls back to a score-derived default on malformed JSON', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('not valid json');

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, MOCK_CRITIC_RESULT, undefined);

    // MOCK_CRITIC_RESULT.totalScore is 85 (>= 80), so the fallback's own
    // score-based logic should pick 'high'.
    expect(result.tier).toBe('high');
    expect(typeof result.topReason).toBe('string');
    expect(result.topReason.length).toBeGreaterThan(0);
  });

  it('rejects invalid raw tier (even with topReason) and uses score-derived fallback', async () => {
    // WHY: hollow gate requires raw tier ∈ high|medium|low — schema .catch
    // must not revive an invalid first-span as a usable prediction.
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      tier: 'very high',
      confidenceScore: 90,
      topReason: 'Reason',
      improvementSuggestion: 'Suggestion',
      benchmarkContext: 'Context',
    }));

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, MOCK_CRITIC_RESULT, undefined);

    // MOCK_CRITIC_RESULT.totalScore 85 → score-derived 'high'.
    expect(result.tier).toBe('high');
    expect(result.topReason.length).toBeGreaterThan(0);
    expect(result.topReason).not.toBe('Reason');
  });

  it('clamps confidenceScore to 0-100', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      tier: 'high',
      confidenceScore: 250,
      topReason: 'Strong hook',
    }));

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, MOCK_CRITIC_RESULT, undefined);

    expect(result.confidenceScore).toBeLessThanOrEqual(100);
  });

  it('works with carousel array content (Array.isArray branch)', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      tier: 'medium',
      confidenceScore: 70,
      topReason: 'Solid carousel hook',
    }));

    const carouselContent = [
      { headline: 'Slide 1 headline', body: 'Body' },
      { headline: 'Slide 2 headline', body: 'Body' },
    ] as any;

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(
      { ...MOCK_JOB, platform: 'instagram_carousel' },
      carouselContent,
      MOCK_CRITIC_RESULT,
      undefined,
    );

    expect(result.tier).toBe('medium');
  });

  it('works with twitter thread content (tweets branch)', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      tier: 'low',
      confidenceScore: 40,
      topReason: 'Weak opening tweet',
    }));

    const threadContent = { tweets: [{ number: 1, text: '1/ Opening tweet' }] } as any;

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(
      { ...MOCK_JOB, platform: 'twitter_thread' },
      threadContent,
      MOCK_CRITIC_RESULT,
      undefined,
    );

    expect(result.tier).toBe('low');
  });

  it('handles a missing/undefined criticResult without throwing', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('not valid json');

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, undefined, undefined);

    // No criticResult → fallback's `criticResult?.totalScore || 70` uses 70,
    // which lands in the 'medium' tier bucket (>= 65 but < 80).
    expect(result.tier).toBe('medium');
  });

  it('omits fake zero dimensions when critic scores are absent (feedback-only)', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      tier: 'medium',
      confidenceScore: 60,
      topReason: 'Total score only',
      improvementSuggestion: 'Add dimensions next time',
      benchmarkContext: 'Average',
    }));

    const feedbackOnly = {
      approved: false,
      totalScore: 72,
      feedback: 'Rewrite the hook.',
    } as any;

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, feedbackOnly, undefined);

    const prompt = vi.mocked(generateWithAI).mock.calls[0]?.[0] as string;
    expect(prompt).toContain('Per-dimension scores unavailable');
    expect(prompt).not.toContain('Hook Strength: 0/20');
  });

  it('skips a hollow first-span candidate and uses a later complete prediction', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(
      '{} {"tier":"high","confidenceScore":88,"topReason":"Sharp opening claim","improvementSuggestion":"Add a stat","benchmarkContext":"Above average"}',
    );

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, MOCK_CRITIC_RESULT, undefined);

    expect(result.tier).toBe('high');
    expect(result.topReason).toBe('Sharp opening claim');
    expect(result.confidenceScore).toBe(88);
  });

  it('rejects schema-success hollow (missing topReason) and falls back to score-derived default', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    // WHY: tier alone passes schema .catch/.optional but is hollow without topReason.
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      tier: 'low',
      confidenceScore: 40,
    }));

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, MOCK_CRITIC_RESULT, undefined);

    // MOCK_CRITIC_RESULT.totalScore 85 → score-derived 'high', not hollow 'low'.
    expect(result.tier).toBe('high');
    expect(result.topReason.length).toBeGreaterThan(0);
  });
});
