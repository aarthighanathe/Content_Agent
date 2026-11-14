import React from 'react';
import { TemplateLayout } from '../layouts/TemplateLayout';
import type { CarouselTemplateProps } from './templateProps';
import { resolveTemplateFont } from '../fontStack';
import { getContrastColor, getContrastRgba } from '../../../../../../../lib/colorSystem';
import { usePointKeys } from '../types';

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
  const pointKeys = usePointKeys(slide.points);

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
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
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

          {/* WHY: Points with bold styling — own flex:1/minHeight:0/overflow:hidden
              so a long list clips gracefully within the already-bounded header
              block above, instead of only being caught by that block's outer
              clip (which would cut off mid-point rather than the whole list
              shrinking to fit). */}
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
                  key={pointKeys[i]}
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
