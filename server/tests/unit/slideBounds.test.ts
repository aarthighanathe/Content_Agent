import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  EXPORT_OVERLAY_TOTAL_MAX_CHARS,
  parseContentForPlatform,
  SLIDE_IMAGE_DATA_URL_MAX_CHARS,
  inspectSlideImageDataUrl,
  slideDataSchema,
} from '../../src/schemas/jobs.js';
import { carouselContentForStore } from '../../src/schemas/slideCoerce.js';

describe('slide image caps', () => {
  it('accepts a raster data URL inside the per-slide cap', () => {
    const checked = inspectSlideImageDataUrl('image/png', 'AAAA');
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.image).toBe('data:image/png;base64,AAAA');
  });

  it('rejects svg and an oversized payload', () => {
    expect(inspectSlideImageDataUrl('image/svg+xml', 'AAAA')).toEqual({
      ok: false,
      reason: 'invalid',
    });
    const huge = 'A'.repeat(SLIDE_IMAGE_DATA_URL_MAX_CHARS);
    expect(inspectSlideImageDataUrl('image/png', huge)).toEqual({
      ok: false,
      reason: 'too_large',
    });
  });

  it('keeps the deck total at least 8_000_000 characters', () => {
    expect(SLIDE_IMAGE_DATA_URL_MAX_CHARS).toBeGreaterThanOrEqual(2_500_000);
    expect(EXPORT_OVERLAY_TOTAL_MAX_CHARS).toBe(8_000_000);
  });
});

describe('carousel save bounds', () => {
  it('truncates writer-sized point fields on PATCH and drops a bad background', () => {
    const result = parseContentForPlatform('instagram_carousel', [{
      headline: 'H'.repeat(400),
      bg_suggestion: 'blue',
      slideNumber: 4,
      points: Array.from({ length: 9 }, () => ({
        icon: 'x'.repeat(40),
        label: 'l'.repeat(250),
        desc: 'd'.repeat(450),
      })),
    }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const slides = result.content as Array<{
      headline?: string;
      bg_suggestion?: string;
      points?: Array<{ icon: string; label: string; desc: string }>;
    }>;
    expect(slides[0]?.headline).toHaveLength(300);
    expect(slides[0]?.bg_suggestion).toBeUndefined();
    expect(slides[0]?.points).toHaveLength(8);
    expect(slides[0]?.points?.[0]?.icon).toHaveLength(16);
    expect(slides[0]?.points?.[0]?.label).toHaveLength(200);
    expect(slides[0]?.points?.[0]?.desc).toHaveLength(400);
  });

  it('still rejects a non-raster or oversized imageDataUrl', () => {
    const oversized = `data:image/png;base64,${'A'.repeat(SLIDE_IMAGE_DATA_URL_MAX_CHARS)}`;
    expect(parseContentForPlatform('instagram_carousel', [{
      headline: 'H',
      imageDataUrl: oversized,
    }]).ok).toBe(false);
    expect(parseContentForPlatform('instagram_carousel', [{
      headline: 'H',
      imageDataUrl: 'data:image/svg+xml;base64,AAAA',
    }]).ok).toBe(false);
    expect(slideDataSchema.safeParse({
      points: [{ icon: 'x'.repeat(17), label: 'L', desc: 'D' }],
    }).success).toBe(false);
  });

  it('persists truncated slides and keeps formatter-only keys', () => {
    const stored = carouselContentForStore(
      [{
        headline: 'H'.repeat(400),
        slideNumber: 3,
        bg_suggestion: 'nope',
        points: Array.from({ length: 9 }, () => ({
          icon: 'i'.repeat(20),
          label: 'lab',
          desc: 'desc',
        })),
      }],
      (value) => {
        const parsed = z.array(slideDataSchema).min(1).max(20).safeParse(value);
        return parsed.success ? { success: true, data: parsed.data } : { success: false };
      },
    );
    const slides = stored as Array<{
      headline?: string;
      slideNumber?: number;
      bg_suggestion?: string;
      points?: Array<{ icon: string }>;
    }>;
    expect(slides[0]?.headline).toHaveLength(300);
    expect(slides[0]?.slideNumber).toBe(3);
    expect(slides[0]?.bg_suggestion).toBeUndefined();
    expect(slides[0]?.points).toHaveLength(8);
    expect(slides[0]?.points?.[0]?.icon).toHaveLength(16);
  });
});
