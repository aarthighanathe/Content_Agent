import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import { FONT, H_PAD, BOTTOM_PAD } from '../constants';
import { DotGrid, CornerRings } from '../decorativePrimitives';
import { PillTag, PromptBox, BrandLockup } from '../contentPieces';

// ── Solution layout ───────────────────────────────────────────────────────────

export function SolutionLayout({ slide, colors, brandName, handle }: { slide: SlideData; colors: ColorSystem; brandName: string; handle: string }) {
  const pad = H_PAD;
  const rp  = Math.max(pad, 50);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad}px`, position: 'relative' }}>
      <DotGrid color="rgba(255,255,255,1)" opacity={0.04} />
      <CornerRings colors={colors} />
      <div style={{ position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ flexShrink: 0 }}>
        <PillTag text="THE SOLUTION" bgMode="accent" colors={colors} />
      </div>

      {/* WHY justifyContent: center (not space-between): the brand lockup below stays
          pinned to the bottom via marginTop: auto regardless, so centering this group
          in the remaining space keeps the headline/body from clumping at the top when
          the body text is short. */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', justifyContent: 'center' }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 28, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.5, color: '#fff', fontFamily: FONT, flexShrink: 0 }}>
          {slide.headline}
        </h2>

        {slide.body && (
          <PromptBox label="How it works" text={slide.body} />
        )}
      </div>

      {brandName && (
        <div style={{ paddingTop: 18, flexShrink: 0 }}>
          <BrandLockup brandName={brandName} handle={handle} bgMode="accent" colors={colors} />
        </div>
      )}
    </div>
  );
}
