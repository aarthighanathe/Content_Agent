import React from 'react';
import type { ReactNode } from 'react';
import type { SlideData } from '../../IGSlide';
import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { CarouselTemplate } from '../../../../../../../lib/templateSystem';

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
 * NOTE: `layout.decorativeElements` (e.g. 'thin-lines', 'quote-marks') is NOT
 * rendered generically here — each *Template.tsx component already builds its
 * own hand-crafted decorative shapes inline (see e.g. StorytellerTemplate's
 * quote mark, LuxuryDarkTemplate's corner ornaments). A prior generic
 * `<div className="template-deco-{element}">` loop here rendered empty,
 * unstyled divs with no backing CSS — pure dead output — and was removed.
 * `decorativeElements` itself stays real data, read by TemplateGallery.tsx's
 * preview swatches via `.includes()` checks.
 */
export const TemplateLayout = React.forwardRef<HTMLDivElement, TemplateLayoutProps>(
  function TemplateLayout({ width, height, template, children }, ref) {
    const { layout } = template;

    return (
      // WHY no padding/background here: every *Template.tsx component already
      // applies its own `padding: spacing.padding` and `background` to its inner
      // content div (that's where each template's actual surface color lives).
      // This box used to apply `padding: spacing.padding` a second time on top
      // of that, shrinking the visible template surface inward from all four
      // edges on every side — the gap revealed whatever sat behind it (the page
      // background), which is exactly the letterboxed "post floating on a black
      // background" bug reported on both the live preview and the exported PNG.
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
        data-cover-style={layout.coverStyle}
        data-content-style={layout.contentStyle}
      >
        {/* Child content — each template component computes its own heading/body
            styles from `template.typography` directly rather than reading an
            injected prop, so children render as-is. */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
