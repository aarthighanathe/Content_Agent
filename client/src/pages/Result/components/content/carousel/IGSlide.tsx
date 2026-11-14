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
import { FitFrame } from './igslide/layouts/FitFrame';
import { estimateFitScale, slidePointCopy } from './igslide/layouts/fitScale';

// WHY: re-export here: external consumers (ssr/renderSlideHtml.tsx, IGCarouselPreview.tsx,
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

// WHY: wrapped in React.memo: IGCarouselPreview re-renders on every interaction
// (drag offset, currentSlide ticks, copy-all flash) while the slides' props
// (slide/colors/brandName/templateId/...) are unchanged — memo lets all 8 slides
// skip a full layout+SVG rebuild, which was the dominant result-page re-render cost.

export const IGSlide = React.memo(
  React.forwardRef<HTMLDivElement, IGSlideProps>(
  // NOTE: isLast stays in IGSlideProps for caller compatibility but is unused here.
  function IGSlide({ slide, index, total, colors, brandName, handle, width = 420, height = 525, designPreset = 0, templateId, paletteId }, ref) {
    const preset = DESIGN_PRESETS[Math.abs(designPreset) % DESIGN_PRESETS.length];

    // WHY: validate instead of cast: a stale/hand-edited id (old localStorage, a
    // removed template) falls through to the legacy layout rather than reaching
    // getTemplate()/getPalette().
    const resolvedTemplateId = templateId && isTemplateId(templateId) ? templateId : undefined;
    const template = resolvedTemplateId ? getTemplate(resolvedTemplateId) : undefined;

    if (resolvedTemplateId && template) {
      // WHY: resolved here, not in each template: templates read `colors` directly,
      // so overriding it once for the template branch is what makes paletteId
      // actually change the rendered colors.
      // NOTE: not useMemo'd — the derive is cheap, the outer React.memo already
      // gates re-renders, and memoizing here would be a conditional hook call.
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
        <FitFrame
          initialScale={estimateFitScale({
            width,
            height,
            padding: 28,
            headingSize: 28,
            bodySize: 15,
            gap: 12,
            sectionSpacing: 16,
            headline: slide.headline ?? '',
            body: slide.body ?? '',
            pointCount: slide.points?.length ?? 0,
            pointCopy: slidePointCopy(slide.points),
          })}
          watch={`${width}x${height}|${type}|${slide.headline ?? ''}|${slide.body ?? ''}|${slide.points?.length ?? 0}`}
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
        </FitFrame>

      </div>
    );
  },
  ),
);
