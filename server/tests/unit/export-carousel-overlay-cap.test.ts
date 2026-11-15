/**
 * exportCarouselSsrSchema — combined image overlay size cap (3MB chars).
 *
 * WHY unit (not route): a 3MB+ JSON body through supertest is slow and fights
 * express.json limits; the superRefine is the contract under test.
 */
import { describe, it, expect } from 'vitest';
import {
  exportCarouselSsrSchema,
  EXPORT_OVERLAY_TOTAL_MAX_CHARS,
  SLIDE_IMAGE_DATA_URL_MAX_CHARS,
} from '../../src/schemas/jobs.js';

const COLORS = {
  BRAND_PRIMARY: '#6366F1',
  BRAND_LIGHT: '#A5B4FC',
  BRAND_DARK: '#312E81',
  LIGHT_BG: '#F8FAFC',
  LIGHT_BORDER: '#E2E8F0',
  DARK_BG: '#0F172A',
};

function dataUrlOfLength(charLength: number): string {
  const prefix = 'data:image/png;base64,';
  const pad = 'A'.repeat(Math.max(0, charLength - prefix.length));
  return `${prefix}${pad}`;
}

function baseBody(slides: unknown[]): Record<string, unknown> {
  return {
    theme: 'aurora',
    designPreset: 0,
    colors: COLORS,
    brandName: 'Pensieve',
    handle: '@pensieve',
    slides,
  };
}

describe('exportCarouselSsrSchema overlay total cap', () => {
  it(`rejects combined imageDataUrl overlays over ${EXPORT_OVERLAY_TOTAL_MAX_CHARS} characters`, () => {
    // WHY 4×~750k: under per-slide max (1MB) but over the 3MB deck total.
    const perSlide = Math.floor(EXPORT_OVERLAY_TOTAL_MAX_CHARS / 4) + 1;
    expect(perSlide).toBeLessThanOrEqual(SLIDE_IMAGE_DATA_URL_MAX_CHARS);

    const result = exportCarouselSsrSchema.safeParse(
      baseBody([
        { headline: 'A', imageDataUrl: dataUrlOfLength(perSlide) },
        { headline: 'B', imageDataUrl: dataUrlOfLength(perSlide) },
        { headline: 'C', imageDataUrl: dataUrlOfLength(perSlide) },
        { headline: 'D', imageDataUrl: dataUrlOfLength(perSlide) },
      ]),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes('Combined image overlays exceed'))).toBe(true);
  });

  it('accepts combined overlays at or under the 3MB total when each slide is in range', () => {
    const perSlide = Math.floor(EXPORT_OVERLAY_TOTAL_MAX_CHARS / 4);
    expect(perSlide * 4).toBeLessThanOrEqual(EXPORT_OVERLAY_TOTAL_MAX_CHARS);

    const result = exportCarouselSsrSchema.safeParse(
      baseBody([
        { headline: 'A', imageDataUrl: dataUrlOfLength(perSlide) },
        { headline: 'B', imageDataUrl: dataUrlOfLength(perSlide) },
        { headline: 'C', imageDataUrl: dataUrlOfLength(perSlide) },
        { headline: 'D', imageDataUrl: dataUrlOfLength(perSlide) },
      ]),
    );

    expect(result.success).toBe(true);
  });
});
