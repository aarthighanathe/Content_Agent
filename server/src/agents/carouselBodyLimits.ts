// WHY: shared by critic (min/max gate) and formatter (truncate max) so both
// stay aligned. Ranges follow narrative role (slide.type / points), not the
// post-filter renumbered slide_number — hollow drops used to shift features/CTA
// onto the wrong index band.

export type CarouselBodyRange = {
  min: number;
  max: number;
  label: string;
};

const LONG_BODY: CarouselBodyRange = { min: 45, max: 60, label: '45–60' };
const SHORT_LIST_INTRO: CarouselBodyRange = { min: 20, max: 30, label: '20–30' };
const MEDIUM_BODY: CarouselBodyRange = { min: 40, max: 55, label: '40–55' };

const SHORT_LIST_TYPES = new Set(['features', 'howto', 'how-to', 'steps']);

/**
 * Word-count band for a carousel slide body by type / narrative role.
 */
export function carouselBodyRangeForSlide(slide: {
  type?: unknown;
  points?: unknown;
}): CarouselBodyRange {
  const type = typeof slide.type === 'string' ? slide.type.trim().toLowerCase() : '';
  // WHY: writer often emits features/steps as type:"content" with a points[] —
  // treat that as the short-intro role even when type is generic.
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;

  if (SHORT_LIST_TYPES.has(type) || hasPoints) {
    return SHORT_LIST_INTRO;
  }
  if (type === 'quote' || type === 'cta') {
    return MEDIUM_BODY;
  }
  // cover / problem / solution / stat / content / tip / details / unknown
  return LONG_BODY;
}

export function carouselBodyMaxWords(slide: {
  type?: unknown;
  points?: unknown;
}): number {
  return carouselBodyRangeForSlide(slide).max;
}
