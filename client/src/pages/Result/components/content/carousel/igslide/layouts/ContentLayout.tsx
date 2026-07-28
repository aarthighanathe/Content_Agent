import type { ColorSystem } from '../../../../../../../lib/colorSystem';
import type { SlideData } from '../types';
import type { DesignPresetConfig } from '../presets';
import { FONT, BOTTOM_PAD, H_PAD, GLOW_PRESETS } from '../constants';
import { SlideVisual } from '../../SlideVisual';
import { DotGrid, GridLines, CrosshatchLines, GlowBlob, LeftStripe, DiagStripes, CornerRings, StatWatermark } from '../decorativePrimitives';
import { PillTag, FeatureCard } from '../contentPieces';

// ── Content layouts ───────────────────────────────────────────────────────────

type ContentLayoutProps = { slide: SlideData; index: number; colors: ColorSystem; bgMode: 'light' | 'dark' };

const CONTENT_PILL_LABELS = ['KEY POINTS', 'INSIGHTS', 'BREAKDOWN', 'DEEP DIVE', 'TAKEAWAY', 'OVERVIEW'];

// Variant A: Left-stripe + numbered badge — the classic divider style
function ContentLayoutA({ slide, index, colors, bgMode }: ContentLayoutProps) {
  const isLight   = bgMode === 'light';
  const headColor = isLight ? colors.BRAND_DARK             : '#fff';
  const bodyColor = isLight ? colors.BRAND_DARK + 'AA'      : 'rgba(255,255,255,0.56)';
  const numColor  = isLight ? colors.BRAND_PRIMARY           : colors.BRAND_LIGHT;
  const divColor  = isLight ? colors.BRAND_PRIMARY + '22'   : 'rgba(255,255,255,0.07)';
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pillLabel = CONTENT_PILL_LABELS[index % CONTENT_PILL_LABELS.length];
  const pad = H_PAD;
  const rp  = Math.max(pad, 50);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad + 10}px`, position: 'relative' }}>
      {isLight  ? <DotGrid color={colors.BRAND_PRIMARY} opacity={0.042} /> : <GridLines color={colors.BRAND_PRIMARY} />}
      {!isLight && <GlowBlob color={colors.BRAND_PRIMARY} x={GLOW_PRESETS[index % GLOW_PRESETS.length].x} y={GLOW_PRESETS[index % GLOW_PRESETS.length].y} size={GLOW_PRESETS[index % GLOW_PRESETS.length].size} opacity={0.13} />}
      <LeftStripe color={isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT} accent />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasPoints ? 10 : 14, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: numColor, fontFamily: FONT, letterSpacing: 0.5, opacity: 0.7 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <PillTag text={pillLabel} bgMode={isLight ? 'light' : 'dark'} colors={colors} />
      </div>

      {/* WHY flex+justifyContent here (not on the outer container): the header row above
          must stay pinned to the top regardless of content length, while the headline/body/
          decoration group should center as a unit when there are no points to fill the box —
          otherwise short text leaves a large empty gap above the bottom-pinned decoration. */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', justifyContent: hasPoints ? 'flex-start' : 'center' }}>
        <h2 style={{ margin: hasPoints ? '0 0 8px' : '0 0 10px', fontSize: hasPoints ? 20 : 24, fontWeight: 700, lineHeight: 1.14, letterSpacing: -0.3, color: headColor, fontFamily: FONT, flexShrink: 0 }}>
          {slide.headline}
        </h2>

        {slide.body && (
          <p style={{ margin: hasPoints ? '0 0 10px' : '0', fontSize: 13, lineHeight: 1.55, color: bodyColor, fontFamily: FONT, flexShrink: 0 }}>
            {slide.body}
          </p>
        )}

        {hasPoints && <div style={{ height: 1, background: divColor, marginBottom: 4, flexShrink: 0 }} />}

        {hasPoints && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', flex: 1, minHeight: 0 }}>
            {slide.points!.map((pt, i) => (
              <FeatureCard key={i} fi={i} point={pt} colors={colors} isLight={isLight} isLast={i === slide.points!.length - 1} />
            ))}
          </div>
        )}

        {!hasPoints && (
          <div style={{ marginTop: 20, flexShrink: 0 }}>
            <div style={{ borderRadius: 8, overflow: 'hidden', height: 90, marginBottom: 10, border: `1px solid ${isLight ? colors.BRAND_PRIMARY + '18' : 'rgba(255,255,255,0.07)'}`, opacity: 0.78 }}>
              <SlideVisual slide={slide} index={index} colors={colors} width={360} height={90} variant="block" />
            </div>
            <div style={{ height: 1, background: divColor, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ width: 20, height: 2, background: isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT, borderRadius: 1 }} />
              <div style={{ width: 8,  height: 2, background: isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT, borderRadius: 1, opacity: 0.35 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Variant B: Top accent banner + ghost number watermark — no left stripe, bolder headline
function ContentLayoutB({ slide, index, colors, bgMode }: ContentLayoutProps) {
  const isLight   = bgMode === 'light';
  const headColor = isLight ? colors.BRAND_DARK        : '#fff';
  const bodyColor = isLight ? colors.BRAND_DARK + 'AA' : 'rgba(255,255,255,0.56)';
  const accent    = isLight ? colors.BRAND_PRIMARY      : colors.BRAND_LIGHT;
  const divColor  = isLight ? colors.BRAND_PRIMARY + '22' : 'rgba(255,255,255,0.07)';
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const glowP     = GLOW_PRESETS[(index + 1) % GLOW_PRESETS.length];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Top accent banner */}
      <div style={{
        height: 46, padding: `0 ${Math.max(H_PAD, 50)}px 0 ${H_PAD}px`,
        background: accent + (isLight ? '14' : '1C'),
        borderBottom: `1px solid ${accent}${isLight ? '20' : '18'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <PillTag text={hasPoints ? 'BREAKDOWN' : 'KEY INSIGHT'} bgMode={isLight ? 'light' : 'dark'} colors={colors} />
        <span style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: FONT, opacity: 0.62, letterSpacing: 0.5 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Ghost number watermark behind content */}
      <StatWatermark text={String(index + 1)} color={isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT} />

      {isLight ? <DotGrid color={colors.BRAND_PRIMARY} opacity={0.032} /> : <CrosshatchLines color={colors.BRAND_PRIMARY} />}
      {!isLight && <GlowBlob color={colors.BRAND_PRIMARY} x={glowP.x} y={glowP.y} size={glowP.size} opacity={0.12} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `16px ${Math.max(H_PAD, 50)}px ${BOTTOM_PAD}px ${H_PAD}px`, justifyContent: hasPoints ? 'flex-start' : 'center' }}>
        <h2 style={{ margin: hasPoints ? '0 0 10px' : '0 0 12px', fontSize: hasPoints ? 22 : 26, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.5, color: headColor, fontFamily: FONT, flexShrink: 0 }}>
          {slide.headline}
        </h2>

        {slide.body && !hasPoints && (
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: bodyColor, fontFamily: FONT, flexShrink: 0 }}>
            {slide.body}
          </p>
        )}

        {hasPoints && <div style={{ height: 1, background: divColor, marginBottom: 8, flexShrink: 0 }} />}

        {hasPoints && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {slide.points!.map((pt, i) => (
              <FeatureCard key={i} fi={i} point={pt} colors={colors} isLight={isLight} isLast={i === slide.points!.length - 1} />
            ))}
          </div>
        )}

        {!hasPoints && (
          <div style={{ marginTop: 20, flexShrink: 0 }}>
            <div style={{ borderRadius: 8, overflow: 'hidden', height: 88, border: `1px solid ${isLight ? colors.BRAND_PRIMARY + '18' : 'rgba(255,255,255,0.07)'}`, opacity: 0.78 }}>
              <SlideVisual slide={slide} index={index} colors={colors} width={360} height={88} variant="block" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Variant C: Inset card — no stripe, content inside a floating raised card container
function ContentLayoutC({ slide, index, colors, bgMode }: ContentLayoutProps) {
  const isLight   = bgMode === 'light';
  const headColor = isLight ? colors.BRAND_DARK        : '#fff';
  const bodyColor = isLight ? colors.BRAND_DARK + 'AA' : 'rgba(255,255,255,0.56)';
  const accent    = isLight ? colors.BRAND_PRIMARY      : colors.BRAND_LIGHT;
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const cardBg     = isLight ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.05)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)'       : 'rgba(255,255,255,0.09)';
  const glowP      = GLOW_PRESETS[(index + 2) % GLOW_PRESETS.length];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: `14px ${H_PAD}px ${BOTTOM_PAD}px`, position: 'relative' }}>
      <DiagStripes color={isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT} />
      <CornerRings colors={colors} />
      {!isLight && <GlowBlob color={colors.BRAND_PRIMARY} x={glowP.x} y={glowP.y} size={glowP.size} opacity={0.11} />}
      {isLight && <DotGrid color={colors.BRAND_PRIMARY} opacity={0.036} />}

      {/* Top: slide number + pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: FONT, opacity: 0.62, letterSpacing: 0.5 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <PillTag text={hasPoints ? 'DEEP DIVE' : 'TAKEAWAY'} bgMode={isLight ? 'light' : 'dark'} colors={colors} />
      </div>

      {/* Raised inset card */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 14,
        padding: '14px 14px 10px',
        justifyContent: hasPoints ? 'flex-start' : 'center',
      }}>
        {/* Short accent rule inside card */}
        <div style={{ width: 32, height: 3, background: accent, borderRadius: 2, marginBottom: 10, flexShrink: 0 }} />

        <h2 style={{ margin: hasPoints ? '0 0 10px' : '0 0 12px', fontSize: hasPoints ? 20 : 23, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.3, color: headColor, fontFamily: FONT, flexShrink: 0 }}>
          {slide.headline}
        </h2>

        {slide.body && !hasPoints && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: bodyColor, fontFamily: FONT, flexShrink: 0 }}>
            {slide.body}
          </p>
        )}

        {hasPoints && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {slide.points!.map((pt, i) => (
              <FeatureCard key={i} fi={i} point={pt} colors={colors} isLight={isLight} isLast={i === slide.points!.length - 1} />
            ))}
          </div>
        )}

        {!hasPoints && (
          <div style={{ marginTop: 20, flexShrink: 0 }}>
            <div style={{ borderRadius: 6, overflow: 'hidden', height: 72, border: `1px solid ${isLight ? colors.BRAND_PRIMARY + '14' : 'rgba(255,255,255,0.06)'}`, opacity: 0.72 }}>
              <SlideVisual slide={slide} index={index} colors={colors} width={340} height={72} variant="block" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ContentLayout dispatcher — preset controls the variant strategy per generation
export function ContentLayout({ slide, index, colors, bgMode, preset }: { slide: SlideData; index: number; colors: ColorSystem; bgMode: 'light' | 'dark'; preset: DesignPresetConfig }) {
  // contentForce locks ALL content slides to one variant; null = cycle from contentStart offset
  const v: 0 | 1 | 2 = preset.contentForce !== null
    ? preset.contentForce
    : ((index + preset.contentStart) % 3) as 0 | 1 | 2;
  if (v === 1) return <ContentLayoutB slide={slide} index={index} colors={colors} bgMode={bgMode} />;
  if (v === 2) return <ContentLayoutC slide={slide} index={index} colors={colors} bgMode={bgMode} />;
  return <ContentLayoutA slide={slide} index={index} colors={colors} bgMode={bgMode} />;
}
