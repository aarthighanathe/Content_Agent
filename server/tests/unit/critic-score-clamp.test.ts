/**
 * critic.ts — score clamping regression test.
 *
 * Prior bug: parsed.hookStrength/platformCompliance/brandVoiceMatch/
 * valueDelivery/ctaClarity came straight from LLM-generated JSON with only a
 * falsy guard (`|| 0`), never an upper-bound clamp to the documented 0-20
 * per-dimension range the prompt itself specifies. An out-of-spec LLM
 * response (e.g. "hookStrength": 200) could produce a totalScore over 100,
 * which gets persisted to contentOutputs.qualityScore and rendered in the
 * UI's 0-100 quality score badge/ring (fill >100%, "127/100" label, etc).
 *
 * This test imports and calls the REAL runCritic() from src/agents/critic.ts
 * (not a local transcription of its logic) so a future edit to the clamping
 * logic that isn't mirrored here would actually fail this test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn() }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));

const baseJob = {
  id: 'job-1',
  platform: 'linkedin_post',
  tone: 'professional',
  targetAudience: 'marketers',
} as any;

const content = { hook: 'H', body: 'B', cta: 'C' };

describe('runCritic — score clamping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clamps an out-of-range dimension (200) down to 20 before summing', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      hookStrength: 200, // out-of-spec — prompt documents 0-20
      platformCompliance: 15,
      brandVoiceMatch: 15,
      valueDelivery: 15,
      ctaClarity: 15,
      feedback: 'test',
    }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.scores.hookStrength).toBe(20);
    // 20 (clamped) + 15*4 = 80, never 200 + 60 = 260
    expect(result.totalScore).toBe(80);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it('clamps every dimension independently — totalScore never exceeds 100 even if all five are out of range', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      hookStrength: 200,
      platformCompliance: 999,
      brandVoiceMatch: -50,
      valueDelivery: 21,
      ctaClarity: 20.5,
      feedback: 'test',
    }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.scores.hookStrength).toBe(20);
    expect(result.scores.platformCompliance).toBe(20);
    expect(result.scores.brandVoiceMatch).toBe(0); // negative clamps to 0, not passed through as -50
    expect(result.scores.valueDelivery).toBe(20);
    expect(result.scores.ctaClarity).toBe(20);
    // 20 + 20 + 0 + 20 + 20 — brandVoiceMatch's -50 clamps to the floor (0),
    // not the ceiling, so this is 80, not the dimension-count max of 100.
    expect(result.totalScore).toBe(80);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it('leaves in-range scores untouched (no regression on normal responses)', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      hookStrength: 15,
      platformCompliance: 14,
      brandVoiceMatch: 14,
      valueDelivery: 15,
      ctaClarity: 14,
      feedback: 'test',
    }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.totalScore).toBe(72);
    expect(result.scores).toEqual({
      hookStrength: 15,
      platformCompliance: 14,
      brandVoiceMatch: 14,
      valueDelivery: 15,
      ctaClarity: 14,
    });
  });

  it('a non-numeric dimension value (e.g. a string) clamps to 0 rather than propagating NaN', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      hookStrength: 'not-a-number',
      platformCompliance: 15,
      brandVoiceMatch: 15,
      valueDelivery: 15,
      ctaClarity: 15,
      feedback: 'test',
    }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.scores.hookStrength).toBe(0);
    expect(Number.isNaN(result.totalScore)).toBe(false);
    expect(result.totalScore).toBe(60);
  });
});

// WHY this suite exists: the deleted tests/unit/critic.test.ts asserted a
// malformed-AI-JSON fallback of totalScore 72/approved:true against its own
// hand-copied reimplementation of the parsing logic — the OPPOSITE of the
// real FALLBACK_CRITIC_RESPONSE in src/agents/critic.ts (totalScore 50,
// approved:false, chosen deliberately so a failed critic evaluation triggers
// a revision instead of a free pass). That shadow test could never catch a
// real regression to an auto-approving fallback because it never imported or
// called runCritic() — this suite does, against the real module, so a future
// edit that reverts the conservative fallback actually fails a test.
describe('runCritic — malformed AI response fallback (real module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('non-JSON AI response falls back to the conservative (non-approving) default', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('not json at all %%%');

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.totalScore).toBe(50);
    expect(result.approved).toBe(false);
    expect(result.scores).toEqual({
      hookStrength: 10,
      platformCompliance: 10,
      brandVoiceMatch: 10,
      valueDelivery: 10,
      ctaClarity: 10,
    });
  });

  it('empty AI response string falls back to the conservative (non-approving) default', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce('');

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.totalScore).toBe(50);
    expect(result.approved).toBe(false);
  });

  it('AI response with no scored dimensions at all (every field optional, all absent) scores 0 rather than hitting the parse-failure fallback', async () => {
    // WHY this is NOT the FALLBACK_CRITIC_RESPONSE path: criticResponseSchema
    // makes every dimension `.optional()` (see schemas/agentResponses.ts's own
    // WHY — a missing/invalid single field shouldn't invalidate the whole
    // response), so `{ unrelated: true }` parses as valid JSON *and* passes
    // schema validation with every field undefined — clampScore's `Number(n)
    // || 0` then produces an honest 0 per dimension, distinct from the
    // conservative-but-nonzero 10-per-dimension fallback the two tests above
    // exercise for a genuinely unparseable/invalid-shape response.
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({ unrelated: true }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.totalScore).toBe(0);
    expect(result.approved).toBe(false);
  });
});
