// Server-side carousel rendering — the export path that actually matches the UI.
//
// WHY this module exists: the previous export asked Gemini to invent HTML per theme,
// so downloaded PNGs looked nothing like the on-screen carousel and differed between
// runs (the LLM even failed over to Groq mid-export). Here we render the very same
// IGSlide React component the preview uses, via a prebuilt bundle, then screenshot it.
//
// FLOW: routes/jobs/render.ts → renderCarouselSlidesSsr() → renderSlideHtml() (bundle)
//       → stripScriptsAndEventHandlers() → renderSlideWithCache() → base64 PNG
import { renderSlideHtml, SLIDE_WIDTH, SLIDE_HEIGHT } from '../generated/slideRenderer.js';
import type { SsrColorSystem, SsrSlideData } from '../generated/slideRenderer.js';
import {
  renderSlideWithCache,
  stripScriptsAndEventHandlers,
  type RenderViewport,
  type ThemeKey,
} from './carousel.js';

/** Instagram portrait carousel: 1080x1350 (4:5) — the aspect the preview is designed at. */
const EXPORT_WIDTH = 1080;

// WHY 420x525 at DSF 2.571 instead of a 1080x1350 viewport: the component hardcodes
// several px values and SVG viewBoxes at the 420x525 preview size, so laying out at any
// other CSS size would re-wrap text and misplace decorations. Rendering at preview size
// and rasterizing at scale reproduces the preview exactly, just at higher resolution.
export const SSR_VIEWPORT: RenderViewport = {
  width: SLIDE_WIDTH,
  height: SLIDE_HEIGHT,
  deviceScaleFactor: EXPORT_WIDTH / SLIDE_WIDTH,
};

export interface SsrSlideContext {
  colors: SsrColorSystem;
  brandName: string;
  handle: string;
  designPreset: number;
  // New template system fields
  templateId?: string;
  paletteId?: string;
}

/**
 * Builds the sanitized HTML document for a single slide.
 * Deterministic: identical inputs always yield an identical string, which the PNG
 * content-hash cache in renderSlideWithCache relies on.
 */
export function buildSlideHtml(
  slide: SsrSlideData,
  index: number,
  total: number,
  ctx: SsrSlideContext,
): string {
  const html = renderSlideHtml({
    slide,
    index,
    total,
    colors: ctx.colors,
    brandName: ctx.brandName,
    handle: ctx.handle,
    designPreset: ctx.designPreset,
    templateId: ctx.templateId,
    paletteId: ctx.paletteId,
  });

  // SECURITY: React escapes text children, and the palette is hex-validated at the
  // route boundary, so this is defense-in-depth rather than the primary control —
  // consistent with the AI-template path and the project's rendering rules.
  return stripScriptsAndEventHandlers(html);
}

// WHY 2, not all slides at once: the pool starts at 2 browsers and scales to 8.
// Firing 8 Puppeteer screenshots together regularly exhausted the pool / hit
// the 60s acquire timeout, so the ZIP shipped with only the slides that won
// the race. Two at a time matches the warm pool and keeps every export complete.
const EXPORT_RENDER_CONCURRENCY = 2;

async function renderOneSlideSsr(
  slide: SsrSlideData,
  index: number,
  total: number,
  ctx: SsrSlideContext,
  jobId: string,
  theme: ThemeKey,
): Promise<{ index: number; dataUrl: string }> {
  try {
    const html = buildSlideHtml(slide, index, total, ctx);
    const dataUrl = await renderSlideWithCache(
      html,
      jobId,
      index,
      theme,
      SSR_VIEWPORT,
      ctx.templateId,
      ctx.paletteId,
    );
    return { index, dataUrl };
  } catch (err) {
    // WHY re-thrown with `index` attached: render.ts's failure reporting reads
    // `reason.index` off each rejected settled result to tell the user which
    // slide(s) failed. A plain rethrow here carried no such property, so every
    // failure was reported as "slide -1" regardless of which one actually broke.
    const cause = err instanceof Error ? err : new Error(String(err));
    throw Object.assign(cause, { index });
  }
}

/**
 * Renders every slide to a base64 PNG data URL, in small parallel batches.
 * Uses allSettled so one bad slide cannot abort the rest; the caller decides
 * how to treat partial failure.
 */
export async function renderCarouselSlidesSsr(
  slides: SsrSlideData[],
  ctx: SsrSlideContext,
  jobId: string,
  theme: ThemeKey,
): Promise<PromiseSettledResult<{ index: number; dataUrl: string }>[]> {
  const results: PromiseSettledResult<{ index: number; dataUrl: string }>[] = [];
  // WHY sequential batches (not one allSettled over every slide): see
  // EXPORT_RENDER_CONCURRENCY. Awaiting each batch is intentional resource
  // limiting, not an accidental N+1.
  for (let start = 0; start < slides.length; start += EXPORT_RENDER_CONCURRENCY) {
    const batch = slides.slice(start, start + EXPORT_RENDER_CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((slide, batchIndex) => {
        const index = start + batchIndex;
        return renderOneSlideSsr(slide, index, slides.length, ctx, jobId, theme);
      }),
    );
    results.push(...batchResults);
  }
  return results;
}
