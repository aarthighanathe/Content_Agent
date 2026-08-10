import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor, getContrastRgba } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Editorial Classic Template
 * Magazine-style layout with elegant serif typography, ruled lines,
 * and sophisticated spacing. Inspired by print editorial design.
 */
export const EditorialClassicTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function EditorialClassicTemplate({
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
        {/* Top decorative line */}
        <div
          style={{
            width: '100%',
            height: 2,
            background: colors.BRAND_PRIMARY,
            marginBottom: spacing.sectionSpacing,
          }}
        />

        {/* Header with page number */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sectionSpacing,
            fontFamily: resolveTemplateFont(typography.bodyFont),
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: getContrastRgba(colors.LIGHT_BG, 0.6),
          }}
        >
          <span>Editorial</span>
          <span>{String(index + 1).padStart(2, '0')}</span>
        </div>

        {/* Drop cap style headline */}
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

        {/* Decorative divider */}
        <div
          style={{
            width: 60,
            height: 1,
            background: colors.BRAND_LIGHT,
            marginBottom: spacing.sectionSpacing,
          }}
        />

        {/* Body text with editorial styling */}
        {slide.body && (
          <p
            style={{
              fontFamily: resolveTemplateFont(typography.bodyFont),
              fontWeight: typography.bodyWeight,
              fontSize: typography.bodySize,
              color: getContrastColor(colors.LIGHT_BG),
              marginBottom: spacing.sectionSpacing,
              lineHeight: 1.7,
              textAlign: 'justify',
            }}
          >
            {slide.body}
          </p>
        )}

        {/* Points with editorial bullet style — flex:1/minHeight:0/overflow:hidden
            so a long list clips within the fixed frame instead of pushing the
            bottom decorative line (marginTop:'auto' below) off it. */}
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
                    fontSize: 18,
                    fontWeight: 700,
                    color: colors.BRAND_PRIMARY,
                    lineHeight: 1,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{point.label}</div>
                  {point.desc && (
                    <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
                      {point.desc}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom decorative line */}
        <div
          style={{
            marginTop: 'auto',
            width: '100%',
            height: 2,
            background: colors.BRAND_PRIMARY,
          }}
        />
      </div>
    </TemplateLayout>
  );
  }
);
