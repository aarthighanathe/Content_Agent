import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import type { DesignPresetConfig } from '../presets';
import { FONT, BOTTOM_PAD, H_PAD } from '../constants';
import { SlideVisual } from '../../SlideVisual';
import { DotGrid, DiagStripes, CornerRings, DiamondAccent, RadialBurst, GlowBlob } from '../decorativePrimitives';
import { BrandLockup, PillTag, InitialsCircle } from '../contentPieces';

// ── Cover layouts ─────────────────────────────────────────────────────────────

type CoverLayoutProps = { slide: SlideData; index: number; colors: ColorSystem; brandName: string; handle: string };

// Variant A: Brand lockup at top, divider, featured pill, headline + body, dot accent bottom
function CoverLayoutA({ slide, colors, brandName, handle }: CoverLayoutProps) {
  const pad = H_PAD;
  const rp  = Math.max(pad, 50);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad}px`, position: 'relative' }}>
      <div style={{ position: 'absolute', bottom: BOTTOM_PAD, left: 0, right: 0, height: 100, overflow: 'hidden', opacity: 0.72 }}>
        <SlideVisual slide={slide} index={0} colors={colors} width={420} height={100} variant="strip" />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, ${colors.LIGHT_BG} 0%, transparent 28%, transparent 72%, ${colors.LIGHT_BG} 100%)`,
          pointerEvents: 'none',
        }} />
      </div>

      <DotGrid color={colors.BRAND_PRIMARY} opacity={0.05} />
      <DiagStripes color={colors.BRAND_PRIMARY} />
      <CornerRings colors={colors} />
      <DiamondAccent color={colors.BRAND_PRIMARY} />

      <BrandLockup brandName={brandName} handle={handle} bgMode="light" colors={colors} />

      <div style={{ height: 1, background: colors.BRAND_PRIMARY, opacity: 0.25, margin: '18px 0 20px' }} />

      <PillTag text="FEATURED" bgMode="light" colors={colors} />
      <div style={{ height: 14 }} />

      <h2 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.7, color: colors.BRAND_DARK, fontFamily: FONT }}>
        {slide.headline}
      </h2>

      {slide.body && (
        <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.6, color: colors.BRAND_DARK + 'AA', fontFamily: FONT }}>
          {slide.body}
        </p>
      )}

      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ width: 28, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2 }} />
        <div style={{ width: 10, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2, opacity: 0.35 }} />
        <div style={{ width: 5,  height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2, opacity: 0.15 }} />
      </div>
    </div>
  );
}

// Variant B: Brand-centric — initials circle in center, headline bottom-anchored, brand at bottom
function CoverLayoutB({ slide, colors, brandName, handle }: CoverLayoutProps) {
  const pad = H_PAD;
  const rp  = Math.max(pad, 50);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `20px ${rp}px ${BOTTOM_PAD}px ${pad}px`, position: 'relative' }}>
      <RadialBurst color={colors.BRAND_PRIMARY} />
      <GlowBlob color={colors.BRAND_PRIMARY} x="50%" y="38%" size={260} opacity={0.09} />
      <DotGrid color={colors.BRAND_PRIMARY} opacity={0.04} />

      {/* Top: pill + slide count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <PillTag text="START HERE" bgMode="light" colors={colors} />
        <span style={{ fontSize: 10, fontWeight: 700, color: colors.BRAND_DARK + '60', fontFamily: FONT, letterSpacing: 1 }}>01</span>
      </div>

      {/* Center: brand initials circle */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <InitialsCircle name={brandName} size={72} colors={colors} />
      </div>

      {/* Bottom: divider + headline + brand lockup */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          <div style={{ width: 28, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2 }} />
          <div style={{ width: 10, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2, opacity: 0.35 }} />
          <div style={{ width: 5,  height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2, opacity: 0.15 }} />
        </div>

        <h2 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.6, color: colors.BRAND_DARK, fontFamily: FONT }}>
          {slide.headline}
        </h2>

        {slide.body && (
          <p style={{ margin: '0 0 14px', fontSize: 12, lineHeight: 1.55, color: colors.BRAND_DARK + 'AA', fontFamily: FONT }}>
            {slide.body}
          </p>
        )}

        <BrandLockup brandName={brandName} handle={handle} bgMode="light" colors={colors} />
      </div>
    </div>
  );
}

// CoverLayout dispatcher — uses preset.cover so each generation gets a different cover style.
// WHY the brandName check: CoverLayoutB's centerpiece IS the brand initials circle — with
// no real brand name that circle would show an empty/placeholder glyph as the visual focus
// of the whole slide, so fall back to CoverLayoutA (brand row is just one optional line).
export function CoverLayout({ slide, index, colors, brandName, handle, preset }: CoverLayoutProps & { preset: DesignPresetConfig }) {
  if (preset.cover === 1 && brandName) return <CoverLayoutB slide={slide} index={index} colors={colors} brandName={brandName} handle={handle} />;
  return <CoverLayoutA slide={slide} index={index} colors={colors} brandName={brandName} handle={handle} />;
}
