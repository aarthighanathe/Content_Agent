import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor, getContrastRgba } from '../../../../../../../lib/colorSystem';
import { usePointKeys } from '../types';

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
  const pointKeys = usePointKeys(slide.points);

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
        {/* WHY: fixed header — accent + headline + body never compress, so the
            points list below is what absorbs any leftover/short space instead
            of the whole slide overflowing past the frame. */}
        <div style={{ flexShrink: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: 40,
              height: 3,
              background: colors.BRAND_PRIMARY,
              marginBottom: spacing.sectionSpacing,
              borderRadius: 2,
            }}
          />

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

        {/* WHY: Points stay their full height. A flex shrink here used to clip the
            last row while the card still looked like it had room. */}
        {slide.points && slide.points.length > 0 && (
          <div
            style={{
              flexGrow: 1,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: spacing.gap,
              marginTop: spacing.sectionSpacing,
              width: '100%',
            }}
          >
            {slide.points.map((point, i) => (
              <div
                key={pointKeys[i]}
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
                    flexShrink: 0,
                  }}
                >
                  {point.icon || '•'}
                </span>
                <div style={{ flex: '1 1 0%', minWidth: 0, overflowWrap: 'break-word' }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{point.label}</div>
                  {point.desc && (
                    <div style={{ fontSize: 13, opacity: 0.8 }}>{point.desc}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* WHY: spacer keeps copy clear of the absolutely positioned slide counter. */}
        <div style={{ flexShrink: 0, height: spacing.padding }} />

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
