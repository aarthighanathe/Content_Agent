import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Tech Modern Template
 * Clean, tech-inspired design with geometric shapes, monospace accents,
 * and a futuristic aesthetic. Features grid patterns and technical elements.
 */
export const TechModernTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function TechModernTemplate({
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
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(${colors.BRAND_LIGHT}11 1px, transparent 1px),
              linear-gradient(90deg, ${colors.BRAND_LIGHT}11 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
            opacity: 0.3,
          }}
        />

        {/* Top tech bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sectionSpacing,
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: 1,
            color: colors.BRAND_PRIMARY,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span>[SYSTEM_READY]</span>
          <span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        </div>

        {/* Corner accent */}
        <div
          style={{
            position: 'absolute',
            top: spacing.padding,
            right: spacing.padding,
            width: 30,
            height: 30,
            borderRight: `2px solid ${colors.BRAND_PRIMARY}`,
            borderTop: `2px solid ${colors.BRAND_PRIMARY}`,
            zIndex: 1,
          }}
        />

        {/* Content area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Headline with tech styling */}
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
                textTransform: 'uppercase',
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

          {/* Points with tech bullet style */}
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
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: getContrastColor(colors.LIGHT_BG),
                  }}
                >
                  <span style={{ color: colors.BRAND_PRIMARY }}>&gt;</span>
                  <span>{point.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom tech bar */}
        <div
          style={{
            marginTop: spacing.sectionSpacing,
            padding: '12px 16px',
            background: `${colors.BRAND_PRIMARY}11`,
            borderLeft: `3px solid ${colors.BRAND_PRIMARY}`,
            fontFamily: 'monospace',
            fontSize: 10,
            color: colors.BRAND_PRIMARY,
            position: 'relative',
            zIndex: 1,
          }}
        >
          @{handle} // {brandName.toUpperCase()}
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
