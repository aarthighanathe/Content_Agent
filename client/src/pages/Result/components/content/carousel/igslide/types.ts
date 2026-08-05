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

// WHY position-independent, not `${index}-${label}`: SlidePoint has no id
// field, and a key that still embeds the array index shifts identity on
// reorder exactly like a bare index key would — it only helps the
// different-length-array case, not the reordered-array one (EditSlideModal
// can do either). Keying on content plus a per-VALUE occurrence counter
// (not a per-ARRAY-position one) means a point keeps the same key as long as
// its own text is unchanged and it's still the Nth point with that text,
// regardless of where in the array it now sits.
export function stablePointKeys(points: SlidePoint[]): string[] {
  const seen = new Map<string, number>();
  return points.map((pt) => {
    const base = `${pt.label}::${pt.desc}`;
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return `${base}#${occurrence}`;
  });
}
