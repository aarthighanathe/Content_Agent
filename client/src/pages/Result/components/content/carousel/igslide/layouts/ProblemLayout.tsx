import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import { FONT, H_PAD, BOTTOM_PAD } from '../constants';
import { GridLines, GlowBlob, LeftStripe } from '../decorativePrimitives';
import { PillTag, StrikethroughPill } from '../contentPieces';

// ── Problem layout ────────────────────────────────────────────────────────────

export function ProblemLayout({ slide, colors }: { slide: SlideData; colors: ColorSystem }) {
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pad = H_PAD;
  const rp  = Math.max(pad, 50);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad + 10}px`, position: 'relative' }}>
      <GridLines color={colors.BRAND_PRIMARY} />
      <GlowBlob color="#FF4444" x="80%" y="15%" size={200} opacity={0.08} />
      <LeftStripe color={colors.BRAND_LIGHT} />

      <div style={{ flexShrink: 0 }}>
        <PillTag text="THE PROBLEM" bgMode="dark" colors={colors} />
      </div>

      {/* WHY: the pill tag above stays pinned to the top; centering only this group keeps
          short headline/body text from clumping at the top with empty space below. */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', justifyContent: hasPoints ? 'flex-start' : 'center' }}>
        <h2 style={{ margin: '20px 0 12px', fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5, color: '#fff', fontFamily: FONT, flexShrink: 0 }}>
          {slide.headline}
        </h2>

        {slide.body && (
          <p style={{ margin: '0 0 20px', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.52)', fontFamily: FONT, flexShrink: 0 }}>
            {slide.body}
          </p>
        )}

        {hasPoints && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
            {slide.points!.map((pt, i) => (
              <StrikethroughPill key={i} text={pt.label} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
