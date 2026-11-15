/**
 * getLatestCritique — prefer critique matching final.qualityScore (Pass-6 M1).
 * Version snapshots (regenerate / restore) use getLatestQualityScore — Pass-7.
 */
import { describe, it, expect } from 'vitest';
import { getLatestCritique, getLatestQualityScore } from '../../src/lib/qualityScore.js';

describe('getLatestCritique', () => {
  it('prefers the critique whose score matches final.qualityScore', () => {
    const outputs = [
      {
        outputType: 'critique',
        qualityScore: 68,
        content: { totalScore: 68, feedback: 'best draft' },
      },
      {
        outputType: 'critique',
        qualityScore: 55,
        content: { totalScore: 55, feedback: 'worse revision' },
      },
      {
        outputType: 'final',
        qualityScore: 68,
        content: { hook: 'A' },
      },
    ];
    const critique = getLatestCritique(outputs);
    expect(critique?.qualityScore).toBe(68);
    expect((critique?.content as { feedback: string }).feedback).toBe('best draft');
    expect(getLatestQualityScore(outputs)).toBe(68);
  });

  it('falls back to the latest critique when no final exists', () => {
    const outputs = [
      { outputType: 'critique', qualityScore: 40, content: { totalScore: 40 } },
      { outputType: 'critique', qualityScore: 50, content: { totalScore: 50 } },
    ];
    expect(getLatestCritique(outputs)?.qualityScore).toBe(50);
  });
});

describe('getLatestQualityScore — version snapshot contract (Pass-7)', () => {
  // WHY: regenerate.ts / versions.ts used .find() (first critique). With retries
  // the first card is often not the score on the final — snapshots must match
  // getLatestQualityScore so Library history shows the same number as Result.
  it('prefers final.qualityScore over an earlier worse critique', () => {
    const outputs = [
      { outputType: 'critique', qualityScore: 55, content: { totalScore: 55 } },
      { outputType: 'critique', qualityScore: 82, content: { totalScore: 82 } },
      { outputType: 'final', qualityScore: 82, content: { hook: 'A' } },
    ];
    expect(getLatestQualityScore(outputs)).toBe(82);
    // .find() would wrongly return 55 — the bug this contract guards against.
    expect(outputs.find((o) => o.outputType === 'critique')?.qualityScore).toBe(55);
  });
});
