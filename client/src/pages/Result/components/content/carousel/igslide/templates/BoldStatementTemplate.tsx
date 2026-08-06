import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor, getContrastRgba } from '../../../../../../../lib/colorSystem';
import { stablePointKeys } from '../types';

/**
 * Bold Statement Template
 * High-impact design with large typography, strong contrast, and dynamic layouts.
 * Features split-screen layouts and bold accent elements.
 */
export const BoldStatementTemplate = React.forwardRef<HTMLDivElement, CarouselTemplateProps>(
  function BoldStatementTemplate({
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
  const { typography, spacing, layout } = template;

  const isSplit = layout.coverStyle === 'split';

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
          flexDirection: isSplit ? 'row' : 'column',
          padding: spacing.padding,
          background: colors.LIGHT_BG,
        }}
      >
        {/* Left side - accent bar or split background */}
        {isSplit && (
          <div
            style={{
              width: '25%',
              background: colors.BRAND_PRIMARY,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              style={{
                color: getContrastColor(colors.BRAND_PRIMARY),
                fontSize: 48,
                fontWeight: 900,
                lineHeight: 1,
                transform: 'rotate(-90deg)',
                whiteSpace: 'nowrap',
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </div>
          </div>
        )}

        {/* Right side - content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: isSplit ? spacing.padding : 0,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Header block (accent bar + headline + body + points) centers as
              its own group in the space above the footer, rather than the
              whole column (including the pinned footer below) trying to
              center together — that combination left the header content
              stranded near the top with a large dead gap before the footer. */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
            {/* Top accent bar for non-split layouts */}
            {!isSplit && (
              <div
                style={{
                  width: '100%',
                  height: 8,
                  background: colors.BRAND_PRIMARY,
                  marginBottom: spacing.sectionSpacing,
                  flexShrink: 0,
                }}
              />
            )}

          {/* Headline - large and bold */}
          {slide.headline && (
            <h2
              style={{
                fontFamily: resolveTemplateFont(typography.headingFont),
                fontWeight: typography.headingWeight,
                fontSize: isSplit ? 32 : 40,
                letterSpacing: typography.letterSpacing,
                color: colors.BRAND_PRIMARY,
                marginBottom: spacing.gap,
                lineHeight: 1.1,
                textTransform: 'uppercase',
                maxWidth: '100%',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
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
                lineHeight: 1.5,
              }}
            >
              {slide.body}
            </p>
          )}

          {/* Points with bold styling */}
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
                    fontSize: 15,
                    fontWeight: 600,
                    color: getContrastColor(colors.LIGHT_BG),
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: colors.BRAND_PRIMARY,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                  <span>{point.label}</span>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Bottom branding — stays pinned to the frame's bottom edge
              (flexShrink: 0, outside the centered header block above) so the
              brand/handle row reads consistently at a fixed position across
              every slide regardless of how much headline/body/points content
              precedes it. */}
          <div
            style={{
              flexShrink: 0,
              paddingTop: spacing.gap,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: getContrastRgba(colors.LIGHT_BG, 0.5),
            }}
          >
            <span>{brandName}</span>
            <span>@{handle}</span>
          </div>
        </div>
      </div>
    </TemplateLayout>
  );
  }
);
