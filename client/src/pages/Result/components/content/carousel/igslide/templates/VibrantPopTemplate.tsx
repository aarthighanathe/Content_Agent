import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Vibrant Pop Template
 * Playful, energetic design with bold colors, rounded shapes,
 * and fun decorative elements. Great for lifestyle and entertainment content.
 */
export const VibrantPopTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function VibrantPopTemplate({
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
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: colors.BRAND_LIGHT,
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: colors.BRAND_DARK,
            opacity: 0.2,
          }}
        />

        {/* Fun badge */}
        <div
          style={{
            alignSelf: 'flex-start',
            padding: '6px 14px',
            background: colors.BRAND_PRIMARY,
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: spacing.sectionSpacing,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          ✨ Hot Take
        </div>

        {/* Headline with playful styling */}
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
            }}
          >
            {slide.body}
          </p>
        )}

        {/* Points with emoji bullets */}
        {slide.points && slide.points.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.gap,
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
                <span
                  style={{
                    fontSize: 18,
                    background: colors.BRAND_LIGHT,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {point.icon || ['🔥', '💡', '⚡', '🎯', '✨'][i % 5]}
                </span>
                <span style={{ fontWeight: 600 }}>{point.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom fun element */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: colors.BRAND_PRIMARY,
          }}
        >
          <span>@{handle}</span>
          <div
            style={{
              display: 'flex',
              gap: 4,
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i <= index + 1 ? colors.BRAND_PRIMARY : `${colors.BRAND_PRIMARY}33`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
