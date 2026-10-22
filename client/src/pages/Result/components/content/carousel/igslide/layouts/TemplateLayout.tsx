import React from 'react';
import type { ReactNode } from 'react';
import type { SlideData } from '../../IGSlide';
import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { CarouselTemplate } from '../../../../../../../lib/templateSystem';
import { FitFrame } from './FitFrame';
import { estimateFitScale, slidePointCopy } from './fitScale';

interface TemplateLayoutProps {
  slide: SlideData;
  index: number;
  total: number;
  colors: ColorSystem;
  brandName: string;
  handle: string;
  width: number;
  height: number;
  template: CarouselTemplate;
  children: ReactNode;
}

/**
 * Base template layout component that applies template-specific styling
 * (typography, spacing, layout) to child content.
 *
 * This component serves as a wrapper that applies the template's design system
 * to the slide content. Template-specific layouts extend this to add their
 * unique structural elements.
 *
 * NOTE: decorative elements are NOT rendered generically here — each
 * *Template.tsx component already builds its own hand-crafted decorative
 * shapes inline (see e.g. StorytellerTemplate's quote mark, LuxuryDarkTemplate's
 * corner ornaments). A prior generic `<div className="template-deco-{element}">`
 * loop here rendered empty, unstyled divs with no backing CSS — pure dead
 * output — and was removed, along with the `layout.decorativeElements` data
 * field itself (2026-08-10 — its only real consumer, TemplateGallery.tsx, was
 * already deleted in the 2026-08-06 migration to CompactTemplatePicker.tsx).
 */
export const TemplateLayout = React.forwardRef<HTMLDivElement, TemplateLayoutProps>(
  function TemplateLayout({ width, height, template, slide, children }, ref) {
    const fitScale = estimateFitScale({
      width,
      height,
      padding: template.spacing.padding,
      headingSize: template.typography.headingSize,
      bodySize: template.typography.bodySize,
      gap: template.spacing.gap,
      sectionSpacing: template.spacing.sectionSpacing,
      headline: slide.headline ?? '',
      body: slide.body ?? '',
      pointCount: slide.points?.length ?? 0,
      pointCopy: slidePointCopy(slide.points),
    });
    const imageDataUrl = typeof slide.imageDataUrl === 'string' && slide.imageDataUrl.startsWith('data:image/')
      ? slide.imageDataUrl
      : null;

    return (
      // WHY no padding/background here: every *Template.tsx component already
      // applies its own `padding: spacing.padding` and `background` to its inner
      // content div (that's where each template's actual surface color lives).
      // This box's only job is fixed sizing + clipping; full-bleed styling is
      // entirely the child template component's responsibility.
      <div
        ref={ref}
        style={{
          width,
          height,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
        data-template={template.id}
      >
        {/* WHY behind children: AI slide image (F2) is decorative backdrop —
            template content still owns typography/layout on top. */}
        {imageDataUrl && (
          <img
            src={imageDataUrl}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative', zIndex: 1 }}>
          <FitFrame
            initialScale={fitScale}
            padding={template.spacing.padding}
            watch={`${width}x${height}|${slide.headline ?? ''}|${slide.body ?? ''}|${slidePointCopy(slide.points)}`}
          >
            {children}
          </FitFrame>
        </div>
      </div>
    );
  }
);
