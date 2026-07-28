// ── Shared types for the IGSlide split ─────────────────────────────────────────
// WHY: SlideData/SlidePoint are re-exported from IGSlide.tsx (the public entry point)
// so external consumers (ssr/renderSlideHtml.tsx, IGCarouselPreview.tsx,
// useCarouselDesignSeed.ts, EditSlideModal.tsx, SlideVisual.tsx) keep importing from
// './IGSlide' unchanged — only the internal layout/decoration code moved.

export interface SlidePoint {
  icon: string;
  label: string;
  desc: string;
}

export interface SlideData {
  type?:          string;
  headline?:      string;
  body?:          string;
  visual_hint?:   string;
  imagePrompt?:   string;
  bg_suggestion?: string;
  points?:        SlidePoint[];
  cta?:           { action?: string; handle?: string };
  slide_number?:  number;
}

export type BgMode = 'light' | 'dark' | 'accent';
