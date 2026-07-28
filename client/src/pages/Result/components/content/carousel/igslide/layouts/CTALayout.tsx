import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import { FONT, H_PAD, BOTTOM_PAD } from '../constants';
import { RadialBurst } from '../decorativePrimitives';
import { PillTag, InitialsCircle } from '../contentPieces';

// ── CTA layout ────────────────────────────────────────────────────────────────

export function CTALayout({ slide, colors, brandName, handle }: { slide: SlideData; colors: ColorSystem; brandName: string; handle: string }) {
  const ctaAction = slide.cta?.action || 'Follow for more';
  const ctaHandle = slide.cta?.handle || handle;
  const pad = H_PAD;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: `${pad}px ${pad}px ${BOTTOM_PAD}px ${pad}px`, textAlign: 'center', position: 'relative' }}>
      <RadialBurst color="#fff" />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {brandName && (
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.22)', boxShadow: '0 0 24px rgba(255,255,255,0.1)' }} />
          <InitialsCircle name={brandName} size={48} colors={colors} />
        </div>
      )}

      <PillTag text="FOLLOW FOR MORE" bgMode="accent" colors={colors} />
      <div style={{ height: 12 }} />

      <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.5, color: '#fff', fontFamily: FONT }}>
        {slide.headline}
      </h2>

      {slide.body && (
        <p style={{ margin: '0 0 22px', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.62)', fontFamily: FONT }}>
          {slide.body}
        </p>
      )}

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 30, background: 'rgba(255,255,255,0.96)', color: colors.BRAND_DARK, fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>
        {ctaAction}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>

      {ctaHandle && (
        <div style={{ marginTop: 12, fontSize: 10.5, color: 'rgba(255,255,255,0.38)', fontFamily: FONT, letterSpacing: 0.5 }}>
          {ctaHandle}
        </div>
      )}
    </div>
  );
}
