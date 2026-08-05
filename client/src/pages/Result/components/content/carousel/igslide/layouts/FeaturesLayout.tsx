import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import { FONT, H_PAD, BOTTOM_PAD } from '../constants';
import { DotGrid, LeftStripe } from '../decorativePrimitives';
import { PillTag, FeatureRow } from '../contentPieces';
import { stablePointKeys } from '../types';

// ── Features layout ───────────────────────────────────────────────────────────

export function FeaturesLayout({ slide, colors }: { slide: SlideData; colors: ColorSystem }) {
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pointKeys = hasPoints ? stablePointKeys(slide.points!) : [];
  const pad = H_PAD;
  const rp  = Math.max(pad, 50);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad + 10}px`, position: 'relative' }}>
      <DotGrid color={colors.BRAND_PRIMARY} opacity={0.042} />
      <LeftStripe color={colors.BRAND_PRIMARY} accent />

      <div style={{ flexShrink: 0 }}>
        <PillTag text="WHAT YOU GET" bgMode="light" colors={colors} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', justifyContent: hasPoints ? 'flex-start' : 'center' }}>
        <h2 style={{ margin: hasPoints ? '12px 0 4px' : '0 0 4px', fontSize: hasPoints ? 20 : 26, fontWeight: 700, lineHeight: 1.14, letterSpacing: -0.3, color: colors.BRAND_DARK, fontFamily: FONT, flexShrink: 0 }}>
          {slide.headline}
        </h2>

        {slide.body && !hasPoints && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: colors.BRAND_DARK + 'AA', fontFamily: FONT, flexShrink: 0 }}>
            {slide.body}
          </p>
        )}

        {hasPoints && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {slide.points!.map((pt, i) => (
              <FeatureRow key={pointKeys[i]} fi={i} point={pt} colors={colors} isLight={true} isLast={i === slide.points!.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
