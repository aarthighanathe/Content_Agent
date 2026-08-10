import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor, getContrastRgba } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Storyteller Template
 * Narrative-focused design with quote-style layouts,
 * warm typography, and story-telling elements. Great for personal brands.
 */
export const StorytellerTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function StorytellerTemplate({
  slide,
  index,
  total,
  colors,
  brandName,
  handle,
  width,
  height,
  template,
}, ref) {
  const { typography, spacing } = template;

  return (
    <TemplateLayout
      ref={ref}
      slide={slide}
      index={index}
      total={total}
      colors={colors}
      brandName={brandName}
      handle={handle}
      width={width}
      height={height}
      template={template}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: spacing.padding,
          position: 'relative',
          background: colors.LIGHT_BG,
        }}
      >
        {/* Large quote mark */}
        <div
          style={{
            fontSize: 120,
            color: `${colors.BRAND_PRIMARY}22`,
            lineHeight: 1,
            fontFamily: resolveTemplateFont(typography.headingFont),
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          "
        </div>

        {/* Story chapter indicator */}
        <div
          style={{
            alignSelf: 'flex-end',
            fontSize: 11,
            letterSpacing: 2,
            color: colors.BRAND_PRIMARY,
            marginBottom: spacing.sectionSpacing,
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}
        >
          Chapter {index + 1}
        </div>

        {/* Headline as story title */}
        {slide.headline && (
          <h2
            style={{
              fontFamily: resolveTemplateFont(typography.headingFont),
              fontWeight: typography.headingWeight,
              fontSize: typography.headingSize,
              letterSpacing: typography.letterSpacing,
              color: getContrastColor(colors.LIGHT_BG),
              marginBottom: spacing.gap,
              lineHeight: 1.3,
              fontStyle: 'italic',
            }}
          >
            {slide.headline}
          </h2>
        )}

        {/* Body text as story content */}
        {slide.body && (
          <p
            style={{
              fontFamily: resolveTemplateFont(typography.bodyFont),
              fontWeight: typography.bodyWeight,
              fontSize: typography.bodySize,
              color: getContrastColor(colors.LIGHT_BG),
              marginBottom: spacing.sectionSpacing,
              lineHeight: 1.8,
              fontStyle: 'italic',
            }}
          >
            {slide.body}
          </p>
        )}

        {/* Points as story beats — flex:1/minHeight:0/overflow:hidden so a long
            list clips within the fixed frame instead of pushing the story
            signature (marginTop:'auto' below) off it. */}
        {slide.points && slide.points.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.gap,
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {slide.points.map((point, i) => (
              <div
                key={stablePointKeys(slide.points!)[i]}
                style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 14,
                  color: getContrastColor(colors.LIGHT_BG),
                }}
              >
                <span
                  style={{
                    fontFamily: resolveTemplateFont(typography.headingFont),
                    fontSize: 24,
                    color: colors.BRAND_PRIMARY,
                    lineHeight: 1,
                    opacity: 0.5,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, paddingTop: 6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{point.label}</div>
                  {point.desc && (
                    <div style={{ fontSize: 13, opacity: 0.8, fontStyle: 'italic' }}>
                      {point.desc}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Story signature */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: spacing.gap,
            borderTop: `1px solid ${colors.BRAND_PRIMARY}33`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: getContrastRgba(colors.LIGHT_BG, 0.6),
              fontStyle: 'italic',
            }}
          >
            — {brandName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: colors.BRAND_PRIMARY,
              letterSpacing: 1,
            }}
          >
            @{handle}
          </div>
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
