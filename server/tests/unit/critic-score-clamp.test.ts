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

// WHY rich LinkedIn shape: deterministic LinkedIn gates cap short hooks,
// single-block bodies, and soft CTAs — clamp tests must use content that
// passes those gates so they measure clampScore() alone, not the LI caps.
const content = {
  hook: 'Most founders still treat LinkedIn like a personal blog dump.',
  body: 'Here is the tension.\n\nOne named example from research.\n\nTakeaway next.\n\nAsk for the action.',
  cta: 'Which metric do you track in the first 30 days?',
};

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
    expect(result.usedFallback).toBe(true);
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
    expect(result.usedFallback).toBe(true);
  });

  it('skips a useless leading scorecard and uses a later complete one', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(
      '{}\n' +
        JSON.stringify({
          hookStrength: 14,
          platformCompliance: 13,
          brandVoiceMatch: 12,
          valueDelivery: 15,
          ctaClarity: 11,
          feedback: 'Tighten the CTA to name a specific next step.',
        }),
    );

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.usedFallback).toBeUndefined();
    expect(result.totalScore).toBe(65);
    expect(result.feedback).toContain('Tighten the CTA');
  });

  it('parses multi-sentence feedback with raw newlines via sanitizeAiJson', async () => {
    // WHY: without sanitizeAiJson, literal newlines inside the feedback string
    // break JSON.parse and used to force FALLBACK even when scores were present.
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(
      '{\n' +
        '  "hookStrength": 14,\n' +
        '  "platformCompliance": 13,\n' +
        '  "brandVoiceMatch": 12,\n' +
        '  "valueDelivery": 15,\n' +
        '  "ctaClarity": 11,\n' +
        '  "feedback": "First fix: sharpen the hook.\nSecond fix: name a concrete CTA."\n' +
        '}',
    );

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.usedFallback).toBeUndefined();
    expect(result.totalScore).toBe(65);
    expect(result.feedback).toContain('First fix');
    expect(result.feedback).toContain('Second fix');
  });

  it('AI response with no scored dimensions and no feedback uses FALLBACK', async () => {
    // WHY: criticResponseSchema is coerce-friendly (optional+.catch), so
    // `{ unrelated: true }` still safeParse-succeeds — isUselessCriticScorecard
    // detects all score keys absent + empty feedback and substitutes FALLBACK.
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({ unrelated: true }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.totalScore).toBe(50);
    expect(result.approved).toBe(false);
    expect(result.usedFallback).toBe(true);
    expect(result.scores).toEqual({
      hookStrength: 10,
      platformCompliance: 10,
      brandVoiceMatch: 10,
      valueDelivery: 10,
      ctaClarity: 10,
    });
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('dimensions absent but non-empty feedback is kept (not FALLBACK)', async () => {
    // WHY: feedback-only cards used to trip allAbsentFromRaw → usedFallback,
    // which skipped Writer revision on real actionable feedback.
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      feedback: 'Rewrite the hook to lead with a concrete number.',
      totalScore: 48,
    }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.usedFallback).toBeUndefined();
    expect(result.feedback).toContain('Rewrite the hook');
    expect(result.totalScore).toBe(48);
    expect(result.approved).toBe(false);
    // WHY: omit coerced-zero dimensions so dashboard/predictor skip them.
    expect(result.scores).toBeUndefined();
  });

  it('feedback-only high totalScore does not approve (no free-pass)', async () => {
    // WHY: keeping totalScore for display/revision must not skip Writer←Critic
    // when every dimension was omitted from the LLM card.
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      feedback: 'Sharpen the CTA to name a specific next step.',
      totalScore: 92,
    }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.usedFallback).toBeUndefined();
    expect(result.totalScore).toBe(92);
    expect(result.feedback).toContain('Sharpen the CTA');
    expect(result.approved).toBe(false);
    // WHY: omit coerced-zero dimensions so dashboard/predictor skip them.
    expect(result.scores).toBeUndefined();
  });

  it('all-zero dimensions with empty feedback use FALLBACK', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      hookStrength: 0,
      platformCompliance: 0,
      brandVoiceMatch: 0,
      valueDelivery: 0,
      ctaClarity: 0,
      feedback: '   ',
    }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.totalScore).toBe(50);
    expect(result.approved).toBe(false);
    expect(result.usedFallback).toBe(true);
  });

  it('all-zero dimensions with real feedback are kept (not FALLBACK)', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      hookStrength: 0,
      platformCompliance: 0,
      brandVoiceMatch: 0,
      valueDelivery: 0,
      ctaClarity: 0,
      feedback: 'Rewrite the hook to lead with a concrete number.',
    }));

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(baseJob, content, 'professional');

    expect(result.totalScore).toBe(0);
    expect(result.feedback).toContain('Rewrite the hook');
    expect(result.usedFallback).toBeUndefined();
  });
});

describe('runCritic — carousel body length by type (Pass-6 M3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not dock features at slide_number 2 for a short list-intro body', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      hookStrength: 16,
      platformCompliance: 16,
      brandVoiceMatch: 16,
      valueDelivery: 16,
      ctaClarity: 16,
      feedback: 'ok',
    }));

    const shortIntro = Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ');
    const longBody = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
    const slides = [
      { slide_number: 1, type: 'cover', body: longBody },
      // WHY: renumbered to 2 after a hollow drop — index map would demand 45–60.
      { slide_number: 2, type: 'features', body: shortIntro },
      { slide_number: 3, type: 'cta', body: Array.from({ length: 45 }, (_, i) => `w${i}`).join(' ') },
    ];

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(
      { ...baseJob, platform: 'instagram_carousel' },
      slides,
      'professional',
    );

    expect(result.scores.platformCompliance).toBe(16);
    expect(result.feedback).not.toMatch(/out of range/i);
  });

  it('docks a features slide whose body exceeds the short band', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(JSON.stringify({
      hookStrength: 16,
      platformCompliance: 16,
      brandVoiceMatch: 16,
      valueDelivery: 16,
      ctaClarity: 16,
      feedback: 'ok',
    }));

    const tooLong = Array.from({ length: 40 }, (_, i) => `w${i}`).join(' ');
    const slides = [
      { slide_number: 1, type: 'cover', body: Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ') },
      { slide_number: 2, type: 'features', body: tooLong },
      { slide_number: 3, type: 'cta', body: Array.from({ length: 45 }, (_, i) => `w${i}`).join(' ') },
    ];

    const { runCritic } = await import('../../src/agents/critic.js');
    const result = await runCritic(
      { ...baseJob, platform: 'instagram_carousel' },
      slides,
      'professional',
    );

    expect(result.scores.platformCompliance).toBe(12);
    expect(result.feedback).toMatch(/features #2/);
  });
});

describe('isUselessCriticScorecard', () => {
  it('flags raw objects with every score key absent and empty feedback', async () => {
    const { isUselessCriticScorecard } = await import('../../src/agents/critic.js');
    expect(
      isUselessCriticScorecard({ unrelated: true }, {
        hookStrength: undefined,
        platformCompliance: undefined,
        brandVoiceMatch: undefined,
        valueDelivery: undefined,
        ctaClarity: undefined,
        feedback: '',
      }),
    ).toBe(true);
  });

  it('keeps dimension-absent cards when feedback is non-empty', async () => {
    const { isUselessCriticScorecard } = await import('../../src/agents/critic.js');
    expect(
      isUselessCriticScorecard({
        feedback: 'Sharpen the CTA to name a specific next step.',
        totalScore: 55,
      }, {
        hookStrength: undefined,
        platformCompliance: undefined,
        brandVoiceMatch: undefined,
        valueDelivery: undefined,
        ctaClarity: undefined,
        feedback: 'Sharpen the CTA to name a specific next step.',
        totalScore: 55,
      }),
    ).toBe(false);
  });

  it('keeps a partial scorecard with at least one real score', async () => {
    const { isUselessCriticScorecard } = await import('../../src/agents/critic.js');
    expect(
      isUselessCriticScorecard({
        hookStrength: 12,
        feedback: '',
      }, {
        hookStrength: 12,
        platformCompliance: undefined,
        brandVoiceMatch: undefined,
        valueDelivery: undefined,
        ctaClarity: undefined,
        feedback: '',
      }),
    ).toBe(false);
  });
});
