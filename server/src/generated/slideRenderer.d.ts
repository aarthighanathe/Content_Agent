// Hand-written types for the esbuild-produced slideRenderer.js bundle.
// WHY hand-written: esbuild emits no declarations, and generating them would require
// pulling the client's tsconfig into the server build. The surface is one function.
// Source of truth: client/src/ssr/renderSlideHtml.tsx — keep in sync.

export interface SsrColorSystem {
  BRAND_PRIMARY: string;
  BRAND_LIGHT: string;
  BRAND_DARK: string;
  LIGHT_BG: string;
  LIGHT_BORDER: string;
  DARK_BG: string;
}

export interface SsrSlideData {
  type?: string;
  headline?: string;
  body?: string;
  visual_hint?: string;
  imagePrompt?: string;
  bg_suggestion?: string;
  points?: { icon: string; label: string; desc: string }[];
  cta?: { action?: string; handle?: string };
  slide_number?: number;
}

export interface RenderSlideParams {
  slide: SsrSlideData;
  index: number;
  total: number;
  colors: SsrColorSystem;
  brandName: string;
  handle: string;
  designPreset: number;
}

/** CSS-pixel dimensions of the rendered slide box (matches the on-screen preview). */
export declare const SLIDE_WIDTH: number;
export declare const SLIDE_HEIGHT: number;

/** Renders one carousel slide to a standalone, self-contained HTML document. */
export declare function renderSlideHtml(params: RenderSlideParams): string;
