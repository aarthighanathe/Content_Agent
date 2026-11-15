/**
 * carouselBodyLimits — type/role bands, not renumbered slide_number (Pass-6 M3).
 */
import { describe, it, expect } from 'vitest';
import {
  carouselBodyRangeForSlide,
  carouselBodyMaxWords,
} from '../../src/agents/carouselBodyLimits.js';

describe('carouselBodyRangeForSlide', () => {
  it('uses short band for features/howto even at slide_number 2', () => {
    expect(carouselBodyRangeForSlide({ type: 'features', slide_number: 2 } as never)).toEqual({
      min: 20,
      max: 30,
      label: '20–30',
    });
    expect(carouselBodyMaxWords({ type: 'howto' })).toBe(30);
  });

  it('uses short band for content+points (writer features/steps shape)', () => {
    expect(
      carouselBodyRangeForSlide({
        type: 'content',
        points: [{ icon: '⚡', label: 'Fast', desc: 'Ships sooner' }],
      }),
    ).toEqual({ min: 20, max: 30, label: '20–30' });
  });

  it('uses medium band for quote and cta', () => {
    expect(carouselBodyRangeForSlide({ type: 'quote' }).label).toBe('40–55');
    expect(carouselBodyRangeForSlide({ type: 'cta' }).max).toBe(55);
  });

  it('uses long band for cover/stat/content without points', () => {
    expect(carouselBodyRangeForSlide({ type: 'cover' }).label).toBe('45–60');
    expect(carouselBodyRangeForSlide({ type: 'stat' }).max).toBe(60);
    expect(carouselBodyRangeForSlide({ type: 'content' }).min).toBe(45);
  });
});
