import React from 'react';
import type { ColorSystem } from '../../../../../lib/colorSystem';
import { deriveColorSystemFromPalette } from '../../../../../lib/colorSystem';
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
import { getTemplate, getPalette, isTemplateId } from '../../../../../lib/templateSystem';
import { TEMPLATE_COMPONENTS } from './igslide/templates/registry';

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
  // New template system fields - optional for backward compatibility
  templateId?:   string;
  paletteId?:    string;
}

// ── Main export ───────────────────────────────────────────────────────────────
// WHY wrapped in React.memo: IGCarouselPreview re-renders on every interaction
// (drag offset, currentSlide ticks, copy-all flash) while the slides' props
// (slide/colors/brandName/templateId/...) are unchanged — memo lets all 8 slides
// skip a full layout+SVG rebuild, which was the dominant result-page re-render cost.

export const IGSlide = React.memo(
  React.forwardRef<HTMLDivElement, IGSlideProps>(
  // NOTE: isLast stays in IGSlideProps (callers pass it) but is no longer consumed here —
  // it only ever fed the now-removed SwipeArrow.
  function IGSlide({ slide, index, total, colors, brandName, handle, width = 420, height = 525, designPreset = 0, templateId, paletteId }, ref) {
    const preset = DESIGN_PRESETS[Math.abs(designPreset) % DESIGN_PRESETS.length];

    // Validate templateId against the real TEMPLATES catalog rather than
    // blindly casting — a stale/hand-edited value (old localStorage, a
    // renamed/removed template id) now falls through to the legacy layout
    // below instead of reaching getTemplate()/getPalette() at all.
    const resolvedTemplateId = templateId && isTemplateId(templateId) ? templateId : undefined;
    const template = resolvedTemplateId ? getTemplate(resolvedTemplateId) : undefined;

    if (resolvedTemplateId && template) {
      // WHY resolved here, not left to each template component: the template's
      // own curated palette (templateSystem.ts's colorPalettes) previously had
      // no path to the rendered colors at all — every template component read
      // `colors` (the legacy 9-theme accent system) directly, so picking a
      // palette in the gallery had zero visual effect. Resolving it once here
      // and overriding `colors` for the template branch only is the smallest
      // fix that makes paletteId actually do something.
      // NOTE: computed here rather than useMemo'd on purpose — this derive is
      // cheap (small object) and only re-runs when IGSlide itself re-renders
      // (the outer React.memo already gates IGSlide on stable props), so caching
      // it would add a conditional hook call for no measurable win.
      const templatePalette = paletteId ? getPalette(resolvedTemplateId, paletteId) : undefined;
      const templateColors: ColorSystem = templatePalette
        ? deriveColorSystemFromPalette(templatePalette.colors)
        : colors;
      const TemplateComponent = TEMPLATE_COMPONENTS[resolvedTemplateId];
      return (
        <TemplateComponent
          ref={ref}
          slide={slide}
          index={index}
          total={total}
          colors={templateColors}
          brandName={brandName}
          handle={handle}
          width={width}
          height={height}
          template={template}
        />
      );
    }

    // Fall back to legacy layout system — type/bgMode/background are only
    // meaningful for this path, so they stay computed here rather than
    // unconditionally at the top of the component.
    const type = resolveType(slide, index, total);
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
  },
  ),
);
