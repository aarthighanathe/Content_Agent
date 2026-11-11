import { describe, expect, it } from 'vitest';
import {
  estimateFitScale,
  pointFitLayoutForTemplate,
} from '../../pages/Result/components/content/carousel/igslide/layouts/fitScale';

const CLEAN = {
  width: 420,
  height: 525,
  padding: 32,
  headingSize: 30,
  bodySize: 14,
  gap: 16,
  sectionSpacing: 24,
};

const DENSE_POINTS = [
  {
    label: 'Audit Current Posts',
    desc: 'Review the last 10 posts, note any outbound links and engagement drop.',
  },
  {
    label: 'Design Hook-First Slide',
    desc: 'Create a bold, curiosity-driven cover that promises a specific payoff within seconds.',
  },
  {
    label: 'Add Interactive Loop',
    desc: 'Insert polls, quizzes, or carousel prompts that ask '
      + 'the viewer to commit before the last slide.',
  },
  {
    label: 'Embed Save-Trigger',
    desc: 'End with a checklist or resource that viewers want to save and come back to later.',
  },
];

describe('estimateFitScale', () => {
  it('shrinks a dense Clean Corporate card grid so the bottom row stays inside the frame', () => {
    const scale = estimateFitScale({
      ...CLEAN,
      headline: 'Zero-Click Engine: 4 Steps to Activate',
      body: 'Follow this exact four-step sequence each week to embed engagement loops '
        + 'and watch your metrics rise. Consistent application turns casual viewers '
        + 'into active participants and amplifies organic reach.',
      pointCount: DENSE_POINTS.length,
      points: DENSE_POINTS,
      pointLayout: pointFitLayoutForTemplate('clean-corporate', DENSE_POINTS.length, 16),
    });

    expect(scale).toBeGreaterThan(0.7);
    expect(scale).toBeLessThan(0.85);
  });

  it('leaves a short Clean Corporate slide at full size', () => {
    const scale = estimateFitScale({
      ...CLEAN,
      headline: 'One clear idea',
      body: 'Short supporting line.',
      pointCount: 0,
      points: [],
      pointLayout: pointFitLayoutForTemplate('clean-corporate', 0, 16),
    });

    expect(scale).toBe(1);
  });

  it('does not invent a card grid for other templates', () => {
    expect(pointFitLayoutForTemplate('editorial-classic', 4, 16)).toBeNull();
  });
});
