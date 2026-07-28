import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import { FONT, H_PAD, BOTTOM_PAD } from '../constants';
import { DotGrid, CornerRings, LeftStripe } from '../decorativePrimitives';
import { PillTag, NumberedStep } from '../contentPieces';

// ── HowTo layout ──────────────────────────────────────────────────────────────

export function HowToLayout({ slide, colors }: { slide: SlideData; colors: ColorSystem }) {
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pad = H_PAD;
  const rp  = Math.max(pad, 50);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad + 10}px`, position: 'relative' }}>
      <DotGrid color={colors.BRAND_PRIMARY} opacity={0.042} />
      <CornerRings colors={colors} />
      <LeftStripe color={colors.BRAND_PRIMARY} accent />

      <div style={{ flexShrink: 0 }}>
        <PillTag text="HOW IT WORKS" bgMode="light" colors={colors} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', justifyContent: hasPoints ? 'flex-start' : 'center' }}>
        <h2 style={{ margin: hasPoints ? '14px 0 6px' : '0 0 6px', fontSize: hasPoints ? 20 : 26, fontWeight: 700, lineHeight: 1.14, letterSpacing: -0.3, color: colors.BRAND_DARK, fontFamily: FONT, flexShrink: 0 }}>
          {slide.headline}
        </h2>

        {slide.body && !hasPoints && (
          <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.6, color: colors.BRAND_DARK + 'AA', fontFamily: FONT, flexShrink: 0 }}>
            {slide.body}
          </p>
        )}

        {hasPoints && (
          // WHY justifyContent: center — a short points list (e.g. 3-4 rows) in a tall
          // box otherwise packs to the top and leaves empty space below; centering keeps
          // it looking intentional whether there are 2 rows or enough to fill the box.
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', flex: 1, minHeight: 0 }}>
            {slide.points!.map((pt, i) => (
              <NumberedStep key={i} point={pt} stepNum={i + 1} colors={colors} isLight={true} isLast={i === slide.points!.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
