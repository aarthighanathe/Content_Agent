import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Luxury Dark Template
 * Premium, sophisticated dark mode design with gold/metallic accents,
 * elegant typography, and refined spacing. Perfect for luxury brands.
 */
export const LuxuryDarkTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function LuxuryDarkTemplate({
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
          // WHY colors.DARK_BG not a literal hex: this template is always visually
          // dark, but the actual shade must still come from the resolved ColorSystem
          // (per-palette tinted, deriveColorSystemFromPalette) so switching the
          // curated palette in the gallery has a visible effect here too — a
          // hardcoded '#0a0a0a' silently ignored every palette choice.
          background: colors.DARK_BG,
          position: 'relative',
        }}
      >
        {/* Gold accent border */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            bottom: 20,
            border: `1px solid ${colors.BRAND_PRIMARY}33`,
            pointerEvents: 'none',
          }}
        />

        {/* Corner ornaments */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 20,
            height: 20,
            borderTop: `2px solid ${colors.BRAND_PRIMARY}`,
            borderLeft: `2px solid ${colors.BRAND_PRIMARY}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 20,
            height: 20,
            borderTop: `2px solid ${colors.BRAND_PRIMARY}`,
            borderRight: `2px solid ${colors.BRAND_PRIMARY}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            width: 20,
            height: 20,
            borderBottom: `2px solid ${colors.BRAND_PRIMARY}`,
            borderLeft: `2px solid ${colors.BRAND_PRIMARY}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 20,
            height: 20,
            borderBottom: `2px solid ${colors.BRAND_PRIMARY}`,
            borderRight: `2px solid ${colors.BRAND_PRIMARY}`,
          }}
        />

        {/* Premium badge */}
        <div
          style={{
            alignSelf: 'center',
            padding: '8px 24px',
            background: 'transparent',
            border: `1px solid ${colors.BRAND_PRIMARY}`,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 3,
            color: colors.BRAND_PRIMARY,
            marginBottom: spacing.sectionSpacing,
            textTransform: 'uppercase',
          }}
        >
          Premium
        </div>

        {/* Headline with luxury styling */}
        {slide.headline && (
          <h2
            style={{
              fontFamily: resolveTemplateFont(typography.headingFont),
              fontWeight: typography.headingWeight,
              fontSize: typography.headingSize,
              letterSpacing: typography.letterSpacing,
              color: colors.BRAND_PRIMARY,
              marginBottom: spacing.gap,
              lineHeight: 1.3,
              textAlign: 'center',
            }}
          >
            {slide.headline}
          </h2>
        )}

        {/* Decorative divider */}
        <div
          style={{
            alignSelf: 'center',
            width: 60,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${colors.BRAND_PRIMARY}, transparent)`,
            marginBottom: spacing.sectionSpacing,
          }}
        />

        {/* Body text */}
        {slide.body && (
          <p
            style={{
              fontFamily: resolveTemplateFont(typography.bodyFont),
              fontWeight: typography.bodyWeight,
              fontSize: typography.bodySize,
              color: getContrastColor(colors.DARK_BG),
              marginBottom: spacing.sectionSpacing,
              lineHeight: 1.7,
              textAlign: 'center',
              opacity: 0.9,
            }}
          >
            {slide.body}
          </p>
        )}

        {/* Points with elegant bullet style — flex:1/minHeight:0/overflow:hidden
            so a long list clips within the fixed frame instead of pushing the
            bottom branding (marginTop:'auto' below) off it. */}
        {slide.points && slide.points.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.gap,
              alignItems: 'center',
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
                  gap: 16,
                  fontSize: 14,
                  color: getContrastColor(colors.DARK_BG),
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: colors.BRAND_PRIMARY,
                    boxShadow: `0 0 10px ${colors.BRAND_PRIMARY}`,
                  }}
                />
                <span style={{ opacity: 0.9 }}>{point.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom branding */}
        <div
          style={{
            marginTop: 'auto',
            textAlign: 'center',
            fontSize: 11,
            letterSpacing: 2,
            color: `${colors.BRAND_PRIMARY}88`,
            textTransform: 'uppercase',
          }}
        >
          {brandName} · @{handle}
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
