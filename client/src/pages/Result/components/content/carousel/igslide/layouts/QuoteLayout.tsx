import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import { FONT, BOTTOM_PAD, H_PAD } from '../constants';
import { SlideVisual } from '../../SlideVisual';
import { DotGrid, CornerRings, LeftStripe, GlowBlob, BottomCornerRings } from '../decorativePrimitives';
import { PillTag } from '../contentPieces';

// ── Quote layouts ─────────────────────────────────────────────────────────────

type QuoteLayoutProps = { slide: SlideData; index: number; colors: ColorSystem };

// Variant A: Left-stripe with large serif quote mark
function QuoteLayoutA({ slide, index, colors }: QuoteLayoutProps) {
  const pad = H_PAD;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', padding: `24px ${Math.max(pad, 50)}px ${BOTTOM_PAD}px ${pad + 10}px`, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none' }}>
        <SlideVisual slide={slide} index={index} colors={colors} width={420} height={525} variant="background" />
      </div>
      <DotGrid color={colors.BRAND_PRIMARY} opacity={0.048} />
      <CornerRings colors={colors} />
      <LeftStripe color={colors.BRAND_PRIMARY} />

      <PillTag text="INSIGHT" bgMode="light" colors={colors} />
      <div style={{ height: 18 }} />

      <div style={{ fontFamily: 'Georgia,serif', fontSize: 84, lineHeight: 0.75, color: colors.BRAND_PRIMARY, opacity: 0.3, marginBottom: 10, flexShrink: 0, letterSpacing: -4 }}>
        "
      </div>

      <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, lineHeight: 1.24, letterSpacing: -0.25, color: colors.BRAND_DARK, fontStyle: 'italic', fontFamily: FONT, flexShrink: 0 }}>
        {slide.headline}
      </h2>

      {slide.body && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
            <div style={{ width: 20, height: 1.5, background: colors.BRAND_PRIMARY, borderRadius: 1, opacity: 0.5 }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: colors.BRAND_PRIMARY, opacity: 0.5 }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: colors.BRAND_DARK + 'AA', fontFamily: FONT, flexShrink: 0 }}>
            {slide.body}
          </p>
        </>
      )}
    </div>
  );
}

// Variant B: Centered pull-quote — quote mark in circle badge, centered text, symmetric decoration
function QuoteLayoutB({ slide, index, colors }: QuoteLayoutProps) {
  const pad = H_PAD;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      padding: `24px ${Math.max(pad, 50)}px ${BOTTOM_PAD}px ${pad}px`,
      position: 'relative', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
        <SlideVisual slide={slide} index={index} colors={colors} width={420} height={525} variant="background" />
      </div>
      <DotGrid color={colors.BRAND_PRIMARY} opacity={0.04} />
      <GlowBlob color={colors.BRAND_PRIMARY} x="50%" y="40%" size={240} opacity={0.1} />
      <BottomCornerRings colors={colors} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <PillTag text="QUOTE" bgMode="light" colors={colors} />
        <div style={{ height: 20 }} />

        {/* Quote mark in circle */}
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: colors.BRAND_PRIMARY + '18',
          border: `1.5px solid ${colors.BRAND_PRIMARY}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18, flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 30, lineHeight: 1, color: colors.BRAND_PRIMARY, marginTop: -4 }}>"</span>
        </div>

        <h2 style={{ margin: '0 0 16px', fontSize: 21, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.25, color: colors.BRAND_DARK, fontStyle: 'italic', fontFamily: FONT, flexShrink: 0 }}>
          {slide.headline}
        </h2>

        {slide.body && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0 }}>
              <div style={{ width: 20, height: 1.5, background: colors.BRAND_PRIMARY, borderRadius: 1, opacity: 0.4 }} />
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: colors.BRAND_PRIMARY, opacity: 0.4 }} />
              <div style={{ width: 20, height: 1.5, background: colors.BRAND_PRIMARY, borderRadius: 1, opacity: 0.4 }} />
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: colors.BRAND_DARK + 'AA', fontFamily: FONT, flexShrink: 0 }}>
              {slide.body}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// QuoteLayout dispatcher — alternates by slide index
export function QuoteLayout({ slide, index, colors }: QuoteLayoutProps) {
  const v = index % 2;
  if (v === 1) return <QuoteLayoutB slide={slide} index={index} colors={colors} />;
  return <QuoteLayoutA slide={slide} index={index} colors={colors} />;
}
