import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor, getContrastRgba } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Clean Corporate Template
 * Professional, business-focused design with structured layouts,
 * clear hierarchy, and conservative styling. Ideal for B2B content.
 */
export const CleanCorporateTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function CleanCorporateTemplate({
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
          background: colors.LIGHT_BG,
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sectionSpacing,
            paddingBottom: spacing.gap,
            borderBottom: `2px solid ${colors.BRAND_PRIMARY}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.BRAND_PRIMARY,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {brandName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: getContrastRgba(colors.LIGHT_BG, 0.6),
            }}
          >
            {index + 1} of {total}
          </div>
        </div>

        {/* Headline */}
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
            }}
          >
            {slide.body}
          </p>
        )}

        {/* Points with structured layout — flex:1/minHeight:0/overflow:hidden
            so a long list clips within the fixed frame instead of pushing the
            footer (marginTop:'auto' below) off it. */}
        {slide.points && slide.points.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: slide.points.length > 2 ? '1fr 1fr' : '1fr',
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
                  padding: spacing.gap,
                  background: getContrastRgba(colors.LIGHT_BG, 0.04),
                  borderLeft: `3px solid ${colors.BRAND_PRIMARY}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.BRAND_PRIMARY,
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Point {i + 1}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: getContrastColor(colors.LIGHT_BG),
                    fontWeight: 600,
                  }}
                >
                  {point.label}
                </div>
                {point.desc && (
                  <div
                    style={{
                      fontSize: 12,
                      color: getContrastRgba(colors.LIGHT_BG, 0.7),
                      marginTop: 4,
                    }}
                  >
                    {point.desc}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: spacing.gap,
            borderTop: `1px solid ${colors.LIGHT_BORDER}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: getContrastRgba(colors.LIGHT_BG, 0.5),
          }}
        >
          <span>@{handle}</span>
          <span>Professional Content</span>
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
