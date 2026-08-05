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

  it('falls back to "medium" when tier is not a valid enum value, without discarding the other valid fields', async () => {
    // NOTE: unlike critic.ts/writer.ts/orchestrator.ts, this specific behavior
    // isn't a regression fix — the pre-existing code already validated tier
    // via `['high','medium','low'].includes(parsed.tier) ? parsed.tier :
    // 'medium'` and independently defaulted every other field with `|| ''`,
    // so it was already per-field tolerant. This test documents that the new
    // schema-based validation (z.enum(...).catch('medium')) preserves that
    // exact behavior, not that it fixes a bug that existed here.
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

    expect(['high', 'medium', 'low']).toContain(result.tier);
    // The other valid fields on the same response are NOT discarded just
    // because tier was invalid — .catch() is per-field, not per-object.
    expect(result.confidenceScore).toBe(90);
    expect(result.topReason).toBe('Reason');
  });

  it('clamps confidenceScore to 0-100', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({ tier: 'high', confidenceScore: 250 }));

    const { runPerformancePredictor } = await import('../../src/agents/performancePredictor.js');
    const result = await runPerformancePredictor(MOCK_JOB, MOCK_CONTENT, MOCK_CRITIC_RESULT, undefined);

    expect(result.confidenceScore).toBeLessThanOrEqual(100);
  });

  it('works with carousel array content (Array.isArray branch)', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({ tier: 'medium', confidenceScore: 70 }));

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
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({ tier: 'low', confidenceScore: 40 }));

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
});
