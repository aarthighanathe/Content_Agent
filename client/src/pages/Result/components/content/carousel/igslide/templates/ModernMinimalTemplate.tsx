import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor, getContrastRgba } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Modern Minimal Template
 * Clean, spacious design with centered typography and minimal decorative elements.
 * Focus on readability and breathing room.
 */
export const ModernMinimalTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function ModernMinimalTemplate({
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
          alignItems: 'center',
          padding: spacing.padding,
          textAlign: 'center',
          background: colors.LIGHT_BG,
        }}
      >
        {/* Fixed header block: accent + headline + body never compress, so the
            points list below is what absorbs any leftover/short space instead
            of the whole slide overflowing past the frame. */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Decorative top accent */}
          <div
            style={{
              width: 40,
              height: 3,
              background: colors.BRAND_PRIMARY,
              marginBottom: spacing.sectionSpacing,
              borderRadius: 2,
            }}
          />

          {/* Headline */}
          {slide.headline && (
            <h2
              style={{
                fontFamily: resolveTemplateFont(typography.headingFont),
                fontWeight: typography.headingWeight,
                fontSize: typography.headingSize,
                letterSpacing: typography.letterSpacing,
                color: colors.BRAND_PRIMARY,
                marginBottom: spacing.gap,
                lineHeight: 1.2,
                maxWidth: '90%',
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
                lineHeight: 1.6,
                maxWidth: '85%',
              }}
            >
              {slide.body}
            </p>
          )}
        </div>

        {/* Points/bullets — the flexible region: centers in whatever space is
            left under the header when short, and scrolls-within-bounds
            (clipped by TemplateLayout's overflow:hidden) rather than pushing
            the slide number/footer off the bottom when long. */}
        {slide.points && slide.points.length > 0 && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: spacing.gap,
              marginTop: spacing.sectionSpacing,
              maxWidth: '85%',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            {slide.points.map((point, i) => (
              <div
                key={stablePointKeys(slide.points!)[i]}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  fontSize: 14,
                  textAlign: 'left',
                  color: getContrastColor(colors.LIGHT_BG),
                }}
              >
                <span
                  style={{
                    color: colors.BRAND_PRIMARY,
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {point.icon || '•'}
                </span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{point.label}</div>
                  {point.desc && (
                    <div style={{ fontSize: 13, opacity: 0.8 }}>{point.desc}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom spacer: guarantees breathing room under the last point (or
            body text, if there are no points) so content never touches the
            frame edge or collides with the slide-number footer below. */}
        <div style={{ flexShrink: 0, height: spacing.padding }} />

        {/* Slide number */}
        <div
          style={{
            position: 'absolute',
            bottom: spacing.padding,
            right: spacing.padding,
            fontSize: 12,
            fontFamily: resolveTemplateFont(typography.bodyFont),
            color: getContrastRgba(colors.LIGHT_BG, 0.4),
            fontWeight: 500,
          }}
        >
          {index + 1}/{total}
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
