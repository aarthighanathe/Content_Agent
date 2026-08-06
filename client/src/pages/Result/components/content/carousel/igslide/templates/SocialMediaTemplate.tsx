import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor, getContrastRgba } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Social Media Template
 * Optimized for social platforms with engaging layouts,
 * emoji-friendly design, and mobile-first aesthetics.
 */
export const SocialMediaTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function SocialMediaTemplate({
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
        {/* Social header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: spacing.sectionSpacing,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: colors.BRAND_PRIMARY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            {brandName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: getContrastColor(colors.LIGHT_BG),
              }}
            >
              {brandName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: colors.BRAND_PRIMARY,
              }}
            >
              @{handle}
            </div>
          </div>
        </div>

        {/* Engagement bar */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: spacing.sectionSpacing,
            fontSize: 12,
            color: getContrastRgba(colors.LIGHT_BG, 0.6),
          }}
        >
          <span>❤️ Like</span>
          <span>💬 Comment</span>
          <span>🔄 Share</span>
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

        {/* Points with hashtag style */}
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
                  gap: 8,
                  fontSize: 13,
                  color: getContrastColor(colors.LIGHT_BG),
                }}
              >
                <span style={{ fontSize: 16 }}>{point.icon || ['👍', '🔥', '💯', '⭐', '🚀'][i % 5]}</span>
                <span>
                  <span style={{ color: colors.BRAND_PRIMARY, fontWeight: 600 }}>#</span>
                  {(point.label || '').toLowerCase().replace(/\s+/g, '')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Social footer */}
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
          <span>{index + 1}/{total}</span>
          <span>Swipe for more →</span>
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
