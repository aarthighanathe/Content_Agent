// WHY: the PNG export used to ask Gemini to invent HTML for each slide, so downloads
// never resembled the on-screen carousel and changed between runs. This module renders
// the SAME IGSlide component the preview uses to static HTML, which the server then
// screenshots with Puppeteer — one design, one source of truth, fully deterministic.
//
// FLOW: server (carouselSsr.ts) → renderSlideHtml() → Puppeteer setContent → PNG
//
// This file is bundled by client/scripts/build-ssr.mjs into
// server/src/generated/slideRenderer.js (React and the fonts are bundled in), so the
// server needs no React dependency and no access to client source at runtime.
import { renderToStaticMarkup } from 'react-dom/server';
import { IGSlide, type SlideData } from '../pages/Result/components/content/carousel/IGSlide';
import type { ColorSystem } from '../lib/colorSystem';

// esbuild inlines these as `data:font/woff2;base64,...` strings (--loader:.woff2=dataurl).
// WHY inline: headless Chrome renders with JavaScript disabled, so document.fonts.ready
// is unavailable and a webfont fetched over the network can silently lose the race and
// screenshot in a fallback face. Embedding removes the network entirely and makes the
// output byte-identical across runs, which the PNG content-hash cache depends on.
import jakartaRegular from './fonts/PlusJakartaSans-latin.woff2';
import jakartaItalic from './fonts/PlusJakartaSans-italic-latin.woff2';
import playfairRegular from './fonts/PlayfairDisplay-latin.woff2';
import playfairItalic from './fonts/PlayfairDisplay-italic-latin.woff2';

/** Preview dimensions from IGCarouselPreview — the PNG is this box at a higher scale. */
export const SLIDE_WIDTH = 420;
export const SLIDE_HEIGHT = 525;

export interface RenderSlideParams {
  slide: SlideData;
  index: number;
  total: number;
  colors: ColorSystem;
  brandName: string;
  handle: string;
  designPreset: number;
  // New template system fields
  templateId?: string;
  paletteId?: string;
}

// NOTE: IGSlide reads exactly one CSS custom property from the app's global index.css —
// --font-heading (NumberedStep, the how-to step numerals). Importing index.css here
// would drag in Tailwind and all the app chrome, so the value is redeclared verbatim
// instead. If IGSlide starts using another var, it must be added here or it renders
// unstyled.
const DOCUMENT_CSS = `
@font-face{font-family:'Plus Jakarta Sans';src:url(${jakartaRegular}) format('woff2');font-weight:200 800;font-style:normal;font-display:block}
@font-face{font-family:'Plus Jakarta Sans';src:url(${jakartaItalic}) format('woff2');font-weight:200 800;font-style:italic;font-display:block}
@font-face{font-family:'Playfair Display';src:url(${playfairRegular}) format('woff2');font-weight:400 900;font-style:normal;font-display:block}
@font-face{font-family:'Playfair Display';src:url(${playfairItalic}) format('woff2');font-weight:400 900;font-style:italic;font-display:block}
:root{--font-heading:'Playfair Display',Georgia,serif}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
`;

/**
 * Renders one carousel slide to a standalone HTML document sized 420x525 CSS px.
 * Pure function of its arguments — no clocks, no randomness, no environment reads —
 * so identical params always produce an identical string.
 */
export function renderSlideHtml(params: RenderSlideParams): string {
  const { slide, index, total, colors, brandName, handle, designPreset, templateId, paletteId } = params;

  const markup = renderToStaticMarkup(
    <IGSlide
      slide={slide}
      index={index}
      total={total}
      colors={colors}
      isLast={index === total - 1}
      brandName={brandName}
      handle={handle}
      width={SLIDE_WIDTH}
      height={SLIDE_HEIGHT}
      designPreset={designPreset}
      templateId={templateId}
      paletteId={paletteId}
    />,
  );

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${DOCUMENT_CSS}</style></head>`
    + `<body><div style="width:${SLIDE_WIDTH}px;height:${SLIDE_HEIGHT}px;overflow:hidden">${markup}</div></body></html>`;
}
