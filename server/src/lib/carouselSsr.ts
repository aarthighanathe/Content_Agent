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
  });

  // SECURITY: React escapes text children, and the palette is hex-validated at the
  // route boundary, so this is defense-in-depth rather than the primary control —
  // consistent with the AI-template path and the project's rendering rules.
  return stripScriptsAndEventHandlers(html);
}

/**
 * Renders every slide to a base64 PNG data URL, in parallel.
 * Uses allSettled so one bad slide cannot abort the whole export; the caller decides
 * how to treat partial failure.
 */
export async function renderCarouselSlidesSsr(
  slides: SsrSlideData[],
  ctx: SsrSlideContext,
  jobId: string,
  theme: ThemeKey,
): Promise<PromiseSettledResult<{ index: number; dataUrl: string }>[]> {
  return Promise.allSettled(
    slides.map(async (slide, index) => {
      const html = buildSlideHtml(slide, index, slides.length, ctx);
      const dataUrl = await renderSlideWithCache(html, jobId, index, theme, SSR_VIEWPORT);
      return { index, dataUrl };
    }),
  );
}
