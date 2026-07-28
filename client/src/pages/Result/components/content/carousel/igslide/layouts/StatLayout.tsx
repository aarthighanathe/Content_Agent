import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import { FONT, BOTTOM_PAD, H_PAD } from '../constants';
import { GridLines, GlowBlob, StatWatermark, LeftStripe } from '../decorativePrimitives';
import { PillTag } from '../contentPieces';

// ── Stat layout ───────────────────────────────────────────────────────────────

export function StatLayout({ slide, colors }: { slide: SlideData; colors: ColorSystem }) {
  const match = (slide.headline || '').match(/^(\$?[\d,.]+[KMBx%+×]*(?:\s*[×xX]\s*\d+)?)/);
  const stat  = match ? match[1].trim() : '';
  const rest  = match ? slide.headline!.slice(match[0].length).trim() : slide.headline || '';
  const pad = H_PAD;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', padding: `24px ${Math.max(pad, 50)}px ${BOTTOM_PAD}px ${pad + 10}px`, position: 'relative' }}>
      <GridLines color={colors.BRAND_PRIMARY} />
      <GlowBlob color={colors.BRAND_PRIMARY} x="20%" y="55%" size={220} opacity={0.14} />
      {stat && <StatWatermark text={stat} color={colors.BRAND_LIGHT} />}
      <LeftStripe color={colors.BRAND_LIGHT} />

      <div style={{ flexShrink: 0 }}>
        <PillTag text="DATA POINT" bgMode="dark" colors={colors} />
      </div>
      <div style={{ height: 22 }} />

      {stat && (
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.9, color: colors.BRAND_LIGHT, fontFamily: FONT, letterSpacing: -3, marginBottom: 10, flexShrink: 0 }}>
          {stat}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexShrink: 0 }}>
        <div style={{ width: 28, height: 2, background: colors.BRAND_PRIMARY, borderRadius: 1 }} />
        <div style={{ width: 12, height: 2, background: colors.BRAND_PRIMARY, borderRadius: 1, opacity: 0.4 }} />
      </div>

      {rest && (
        <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, lineHeight: 1.22, letterSpacing: -0.2, color: '#fff', fontFamily: FONT, flexShrink: 0 }}>
          {rest}
        </h2>
      )}
      {slide.body && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.52)', fontFamily: FONT, flexShrink: 0 }}>
          {slide.body}
        </p>
      )}
    </div>
  );
}
