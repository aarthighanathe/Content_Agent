import React from 'react';
import type { ColorSystem } from '../../../../../lib/colorSystem';
import type { SlideData, SlidePoint } from './igslide/types';
import { DESIGN_PRESETS } from './igslide/presets';
import { DESIGN_PRESET_COUNT } from './igslide/constants';
import { resolveType, resolveBackground } from './igslide/slideResolvers';
import { CoverLayout } from './igslide/layouts/CoverLayout';
import { ContentLayout } from './igslide/layouts/ContentLayout';
import { StatLayout } from './igslide/layouts/StatLayout';
import { QuoteLayout } from './igslide/layouts/QuoteLayout';
import { CTALayout } from './igslide/layouts/CTALayout';
import { ProblemLayout } from './igslide/layouts/ProblemLayout';
import { SolutionLayout } from './igslide/layouts/SolutionLayout';
import { HowToLayout } from './igslide/layouts/HowToLayout';
import { FeaturesLayout } from './igslide/layouts/FeaturesLayout';

// WHY re-export here: external consumers (ssr/renderSlideHtml.tsx, IGCarouselPreview.tsx,
// useCarouselDesignSeed.ts, EditSlideModal.tsx, SlideVisual.tsx) all import SlideData/
// SlidePoint from './IGSlide' — this file stays the public entry point for the whole
// carousel-slide-rendering subsystem even though the implementation now lives in ./igslide/.
export type { SlideData, SlidePoint };
export { DESIGN_PRESET_COUNT };

interface IGSlideProps {
  slide:         SlideData;
  index:         number;
  total:         number;
  colors:        ColorSystem;
  isLast:        boolean;
  brandName:     string;
  handle:        string;
  width?:        number;
  height?:       number;
  designPreset?: number;  // 0-5, randomly selected once per carousel generation
}

// ── Main export ───────────────────────────────────────────────────────────────

export const IGSlide = React.forwardRef<HTMLDivElement, IGSlideProps>(
  // NOTE: isLast stays in IGSlideProps (callers pass it) but is no longer consumed here —
  // it only ever fed the now-removed SwipeArrow.
  function IGSlide({ slide, index, total, colors, brandName, handle, width = 420, height = 525, designPreset = 0 }, ref) {
    const preset = DESIGN_PRESETS[Math.abs(designPreset) % DESIGN_PRESETS.length];
    const type   = resolveType(slide, index, total);
    const { bgMode, background } = resolveBackground(slide, index, total, preset, colors);

    return (
      <div
        ref={ref}
        style={{ position: 'relative', width, height, flexShrink: 0, background, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {type === 'cover'                                                  && <CoverLayout    slide={slide} index={index} colors={colors} brandName={brandName} handle={handle} preset={preset} />}
        {type === 'problem'                                                && <ProblemLayout  slide={slide} colors={colors} />}
        {type === 'solution'                                               && <SolutionLayout slide={slide} colors={colors} brandName={brandName} handle={handle} />}
        {type === 'howto'                                                  && <HowToLayout    slide={slide} colors={colors} />}
        {type === 'features'                                               && <FeaturesLayout slide={slide} colors={colors} />}
        {(type === 'content' || type === 'tip' || type === 'details')      && <ContentLayout  slide={slide} index={index} colors={colors} bgMode={bgMode === 'light' ? 'light' : 'dark'} preset={preset} />}
        {type === 'stat'                                                   && <StatLayout     slide={slide} colors={colors} />}
        {type === 'quote'                                                  && <QuoteLayout    slide={slide} index={index} colors={colors} />}
        {type === 'cta'                                                    && <CTALayout      slide={slide} colors={colors} brandName={brandName} handle={handle} />}
        {!['cover','problem','solution','howto','features','content','tip','details','stat','quote','cta'].includes(type) && (
          <ContentLayout slide={slide} index={index} colors={colors} bgMode={bgMode === 'light' ? 'light' : 'dark'} preset={preset} />
        )}

      </div>
    );
  }
);
