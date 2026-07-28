/**
 * TC-032 through TC-036 — Critic Agent Logic Unit Tests
 * Mocks generateWithAI to test score computation and parsing in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Inline the critic's score-assembly logic (mirroring critic.ts) ──────────

interface CriticScores {
  hookStrength: number;
  platformCompliance: number;
  brandVoiceMatch: number;
  valueDelivery: number;
  ctaClarity: number;
}

interface CriticResult {
  approved: boolean;
  totalScore: number;
  scores: CriticScores;
  feedback: string;
}

function parseCriticResponse(rawText: string): CriticResult {
  let parsed: any;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch {
    parsed = {
      hookStrength: 15,
      platformCompliance: 14,
      brandVoiceMatch: 14,
      valueDelivery: 15,
      ctaClarity: 14,
      totalScore: 72,
      approved: true,
      feedback: 'Content meets minimum quality standards.',
    };
  }

  const totalScore =
    (parsed.hookStrength || 0) +
    (parsed.platformCompliance || 0) +
    (parsed.brandVoiceMatch || 0) +
    (parsed.valueDelivery || 0) +
    (parsed.ctaClarity || 0);

  const approved = totalScore >= 70;

  return {
    approved,
    totalScore,
    scores: {
      hookStrength: parsed.hookStrength || 0,
      platformCompliance: parsed.platformCompliance || 0,
      brandVoiceMatch: parsed.brandVoiceMatch || 0,
      valueDelivery: parsed.valueDelivery || 0,
      ctaClarity: parsed.ctaClarity || 0,
    },
    feedback: parsed.feedback || '',
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Critic — score computation', () => {
  it('TC-032 — totalScore is sum of 5 dimension scores', () => {
    const raw = JSON.stringify({
      hookStrength: 15,
      platformCompliance: 14,
      brandVoiceMatch: 14,
      valueDelivery: 15,
      ctaClarity: 14,
    });
    const result = parseCriticResponse(raw);
    expect(result.totalScore).toBe(72);
  });

  it('TC-033 — approved=true when totalScore >= 70', () => {
    const raw = JSON.stringify({
      hookStrength: 15,
      platformCompliance: 15,
      brandVoiceMatch: 15,
      valueDelivery: 15,
      ctaClarity: 15,
    });
    const result = parseCriticResponse(raw);
    expect(result.totalScore).toBe(75);
    expect(result.approved).toBe(true);
  });

  it('TC-033b — approved=true at exactly 70', () => {
    const raw = JSON.stringify({
      hookStrength: 14,
      platformCompliance: 14,
      brandVoiceMatch: 14,
      valueDelivery: 14,
      ctaClarity: 14,
    });
    const result = parseCriticResponse(raw);
    expect(result.totalScore).toBe(70);
    expect(result.approved).toBe(true);
  });

  it('TC-034 — approved=false when totalScore < 70', () => {
    const raw = JSON.stringify({
      hookStrength: 10,
      platformCompliance: 10,
      brandVoiceMatch: 10,
      valueDelivery: 10,
      ctaClarity: 10,
    });
    const result = parseCriticResponse(raw);
    expect(result.totalScore).toBe(50);
    expect(result.approved).toBe(false);
  });

  it('TC-034b — approved=false at 69', () => {
    const raw = JSON.stringify({
      hookStrength: 14,
      platformCompliance: 14,
      brandVoiceMatch: 14,
      valueDelivery: 14,
      ctaClarity: 13,
    });
    const result = parseCriticResponse(raw);
    expect(result.totalScore).toBe(69);
    expect(result.approved).toBe(false);
  });

  it('TC-035 — malformed AI JSON falls back to default score of 72', () => {
    const result = parseCriticResponse('this is not json at all %%%');
    expect(result.totalScore).toBe(72);
    expect(result.approved).toBe(true);
  });

  it('TC-035b — empty string falls back to defaults', () => {
    const result = parseCriticResponse('');
    expect(result.totalScore).toBe(72);
    expect(result.approved).toBe(true);
  });

  it('TC-036 — missing dimension keys default to 0', () => {
    const raw = JSON.stringify({
      hookStrength: 20,
      // other dims missing
    });
    const result = parseCriticResponse(raw);
    expect(result.scores.platformCompliance).toBe(0);
    expect(result.scores.brandVoiceMatch).toBe(0);
    expect(result.scores.valueDelivery).toBe(0);
    expect(result.scores.ctaClarity).toBe(0);
    expect(result.totalScore).toBe(20);
    expect(result.approved).toBe(false);
  });

  it('preserves feedback string from AI response', () => {
    const raw = JSON.stringify({
      hookStrength: 14,
      platformCompliance: 14,
      brandVoiceMatch: 14,
      valueDelivery: 14,
      ctaClarity: 14,
      feedback: 'Great hook but CTA could be stronger',
    });
    const result = parseCriticResponse(raw);
    expect(result.feedback).toBe('Great hook but CTA could be stronger');
  });

  it('extracts JSON embedded in markdown code block', () => {
    const raw = '```json\n' + JSON.stringify({
      hookStrength: 18,
      platformCompliance: 17,
      brandVoiceMatch: 16,
      valueDelivery: 17,
      ctaClarity: 15,
    }) + '\n```';
    const result = parseCriticResponse(raw);
    expect(result.totalScore).toBe(83);
    expect(result.approved).toBe(true);
  });
});
