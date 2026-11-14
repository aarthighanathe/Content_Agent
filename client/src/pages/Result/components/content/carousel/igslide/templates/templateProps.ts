import type { SlideData } from '../../IGSlide';
import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { CarouselTemplate } from '../../../../../../../lib/templateSystem';

// WHY: single CarouselTemplateProps so all templates share one ref-forwarding
// contract with IGSlide's legacy branch (slideRefs / export DOM access).
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
