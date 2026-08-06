import type { SlideData } from '../../IGSlide';
import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { CarouselTemplate } from '../../../../../../../lib/templateSystem';

// Shared prop shape for every igslide/templates/*.tsx component — was
// independently redeclared under 10 different names before this existed.
// Each component forwards its ref to TemplateLayout's root div, same as the
// legacy layout branch in IGSlide.tsx does, so slideRefs-style DOM access
// works identically regardless of which rendering path a slide takes.
export interface CarouselTemplateProps {
  slide: SlideData;
  index: number;
  total: number;
  colors: ColorSystem;
  brandName: string;
  handle: string;
  width: number;
  height: number;
  template: CarouselTemplate;
}
