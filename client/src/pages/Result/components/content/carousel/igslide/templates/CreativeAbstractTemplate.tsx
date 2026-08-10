import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Creative Abstract Template
 * Artistic, unconventional design with asymmetric layouts,
 * organic shapes, and creative typography. For creative industries.
 */
export const CreativeAbstractTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function CreativeAbstractTemplate({
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
          padding: spacing.padding,
          position: 'relative',
          background: colors.LIGHT_BG,
        }}
      >
        {/* Abstract shapes */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: -20,
            width: 200,
            height: 200,
            background: `linear-gradient(135deg, ${colors.BRAND_PRIMARY}33, ${colors.BRAND_LIGHT}22)`,
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
            transform: 'rotate(-15deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            right: -40,
            width: 180,
            height: 180,
            background: `linear-gradient(135deg, ${colors.BRAND_DARK}22, ${colors.BRAND_PRIMARY}33)`,
            borderRadius: '40% 60% 70% 30% / 40% 70% 30% 60%',
            transform: 'rotate(20deg)',
          }}
        />

        {/* Content with offset layout */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Headline with creative styling */}
          {slide.headline && (
            <h2
              style={{
                fontFamily: resolveTemplateFont(typography.headingFont),
                fontWeight: typography.headingWeight,
                fontSize: typography.headingSize,
                letterSpacing: typography.letterSpacing,
                color: getContrastColor(colors.LIGHT_BG),
                marginBottom: spacing.gap,
                lineHeight: 1.2,
              }}
            >
              {slide.headline}
            </h2>
          )}

          {/* Body text */}
          {slide.body && (
            <p
              style={{
                fontFamily: resolveTemplateFont(typography.bodyFont),
                fontWeight: typography.bodyWeight,
                fontSize: typography.bodySize,
                color: getContrastColor(colors.LIGHT_BG),
                marginBottom: spacing.sectionSpacing,
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}
            >
              {slide.body}
            </p>
          )}

          {/* Points with creative layout — flex:1/minHeight:0/overflow:hidden
              so a long list clips gracefully within the frame instead of only
              being caught by TemplateLayout's own outer clip (which would cut
              off mid-point rather than the list shrinking to fit). */}
          {slide.points && slide.points.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
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
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 14,
                    color: getContrastColor(colors.LIGHT_BG),
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      background: colors.BRAND_PRIMARY,
                      transform: i % 2 === 0 ? 'rotate(45deg)' : 'rotate(0deg)',
                      borderRadius: i % 2 === 0 ? 0 : '50%',
                    }}
                  />
                  <span>{point.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
