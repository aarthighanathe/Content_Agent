// WHY: writer output and older rows can exceed slideDataSchema (icon, points,
// bg_suggestion). Truncate before PATCH parse and before persist so those
// decks stay editable. imageDataUrl is not sliced — a cut data URL is not a
// valid image, and the raster/size cap stays a hard reject.

const SLIDE_BG = new Set(['accent', 'dark', 'light']);

function clipString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function assignClip(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  max: number,
): void {
  const clipped = clipString(value, max);
  if (clipped === undefined) {
    delete target[key];
    return;
  }
  target[key] = clipped;
}

function coerceSlidePoint(point: unknown): { icon: string; label: string; desc: string } {
  if (!point || typeof point !== 'object' || Array.isArray(point)) {
    return { icon: '', label: '', desc: '' };
  }
  const pt = point as Record<string, unknown>;
  return {
    icon: clipString(pt.icon, 16) ?? '',
    label: clipString(pt.label, 200) ?? '',
    desc: clipString(pt.desc, 400) ?? '',
  };
}

export function coerceCarouselSlides(content: unknown): unknown {
  if (!Array.isArray(content)) return content;
  return content.map((slide) => {
    if (!slide || typeof slide !== 'object' || Array.isArray(slide)) return slide;
    const s = slide as Record<string, unknown>;
    const next: Record<string, unknown> = { ...s };
    assignClip(next, 'type', s.type, 32);
    assignClip(next, 'headline', s.headline, 300);
    assignClip(next, 'body', s.body, 1000);
    assignClip(next, 'visual_hint', s.visual_hint, 32);
    assignClip(next, 'imagePrompt', s.imagePrompt, 500);
    const bg = s.bg_suggestion;
    if (typeof bg === 'string' && SLIDE_BG.has(bg)) next.bg_suggestion = bg;
    else delete next.bg_suggestion;
    if (typeof s.slide_number === 'number' && Number.isFinite(s.slide_number)) {
      next.slide_number = Math.trunc(s.slide_number);
    }
    if (Array.isArray(s.points)) {
      next.points = s.points.slice(0, 8).map(coerceSlidePoint);
    }
    const ctaRaw = s.cta;
    if (ctaRaw && typeof ctaRaw === 'object' && !Array.isArray(ctaRaw)) {
      const cta = { ...(ctaRaw as Record<string, unknown>) };
      assignClip(cta, 'action', cta.action, 120);
      assignClip(cta, 'handle', cta.handle, 60);
      next.cta = cta;
    }
    return next;
  });
}

interface SlideParse {
  success: boolean;
  data?: unknown;
}

function mergeParsedSlides(coerced: unknown[], parsed: unknown[]): unknown[] {
  return coerced.map((slide, i) => {
    const next = parsed[i];
    if (!slide || typeof slide !== 'object' || Array.isArray(slide)) return next ?? slide;
    if (!next || typeof next !== 'object' || Array.isArray(next)) return slide;
    // WHY: safeParse drops unknown keys (formatter's slideNumber). Keep them.
    return {
      ...(slide as Record<string, unknown>),
      ...(next as Record<string, unknown>),
    };
  });
}

function withoutImages(slides: unknown[]): unknown[] {
  return slides.map((slide) => {
    if (!slide || typeof slide !== 'object' || Array.isArray(slide)) return slide;
    const copy = { ...(slide as Record<string, unknown>) };
    delete copy.imageDataUrl;
    return copy;
  });
}

// WHY: persist path. Parser is injected so this file does not import jobs.ts
// (jobs.ts calls coerceCarouselSlides — a cycle would leave slideDataSchema
// uninitialized). A bad image is dropped once so the rest of the deck can
// still be stored inside the schema; PATCH does not use this retry.
export function carouselContentForStore(
  content: unknown,
  parseSlides: (value: unknown) => SlideParse,
): unknown {
  if (!Array.isArray(content)) return content;
  const coerced = coerceCarouselSlides(content);
  if (!Array.isArray(coerced)) return content;
  const first = parseSlides(coerced);
  if (first.success && Array.isArray(first.data)) {
    return mergeParsedSlides(coerced, first.data);
  }
  const stripped = withoutImages(coerced);
  const second = parseSlides(stripped);
  if (second.success && Array.isArray(second.data)) {
    return mergeParsedSlides(stripped, second.data);
  }
  return coerced;
}
