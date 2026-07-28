import type { ColorSystem } from '../../../../../../lib/colorSystem';
import type { SlidePoint, BgMode } from './types';
import { FONT } from './constants';
import { FeatureIcon } from './decorativePrimitives';

// ── Pill + label components ───────────────────────────────────────────────────

export function PillTag({ text, bgMode, colors }: { text: string; bgMode: BgMode; colors: ColorSystem }) {
  const styles = {
    light:  { bg: colors.BRAND_PRIMARY + '14', border: colors.BRAND_PRIMARY + '30', color: colors.BRAND_PRIMARY },
    dark:   { bg: colors.BRAND_LIGHT   + '18', border: colors.BRAND_LIGHT   + '35', color: colors.BRAND_LIGHT   },
    accent: { bg: 'rgba(255,255,255,0.12)',      border: 'rgba(255,255,255,0.22)',     color: 'rgba(255,255,255,0.75)' },
  };
  const s = styles[bgMode];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT, color: s.color }}>
      {text}
    </div>
  );
}

export function StrikethroughPill({ text }: { text: string }) {
  return (
    <span style={{
      fontSize: 11, padding: '5px 12px', borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#6B6570', textDecoration: 'line-through', fontFamily: FONT,
    }}>
      {text}
    </span>
  );
}

export function PromptBox({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      padding: '14px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <p style={{ margin: '0 0 7px', fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: FONT, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.92)', fontStyle: 'italic', lineHeight: 1.45, fontFamily: FONT }}>"{text}"</p>
    </div>
  );
}

export function InitialsCircle({ name, size = 36, colors }: { name: string; size?: number; colors: ColorSystem }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.BRAND_PRIMARY}, ${colors.BRAND_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: Math.round(size * 0.42), fontFamily: FONT }}>
        {(name || 'B').trim()[0].toUpperCase()}
      </span>
    </div>
  );
}

// WHY render nothing without a brandName: this used to always show an initials circle
// and "Brand"/"@yourbrand" placeholder text, even for users who never set a brand name.
// That's fabricated identity on the slide, not a real fallback — omit the whole lockup
// instead of showing a made-up one.
export function BrandLockup({ brandName, handle, bgMode, colors }: { brandName: string; handle: string; bgMode: BgMode; colors: ColorSystem }) {
  if (!brandName) return null;
  const tc = bgMode === 'light' ? colors.BRAND_DARK : '#fff';
  const sc = bgMode === 'light' ? colors.BRAND_DARK + '88' : 'rgba(255,255,255,0.45)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <InitialsCircle name={brandName} colors={colors} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: tc, fontFamily: FONT, letterSpacing: 0.2 }}>{brandName}</div>
        {handle && <div style={{ fontSize: 10, color: sc, fontFamily: FONT }}>{handle}</div>}
      </div>
    </div>
  );
}

// ── Feature / step components ─────────────────────────────────────────────────

export function FeatureRow({ point, colors, isLight, isLast, fi }: { point: SlidePoint; colors: ColorSystem; isLight: boolean; isLast: boolean; fi: number }) {
  const borderColor = isLight ? colors.LIGHT_BORDER : 'rgba(255,255,255,0.07)';
  const labelColor  = isLight ? colors.BRAND_DARK   : 'rgba(255,255,255,0.9)';
  const descColor   = isLight ? '#8A8580'            : 'rgba(255,255,255,0.45)';
  const iconColor   = isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '10px 0',
      borderBottom: isLast ? 'none' : `1px solid ${borderColor}`,
      flexShrink: 0,
    }}>
      <FeatureIcon icon={point.icon} color={iconColor} fi={fi} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: labelColor, fontFamily: FONT, lineHeight: 1.3 }}>{point.label}</div>
        {point.desc && <div style={{ fontSize: 11, color: descColor, fontFamily: FONT, lineHeight: 1.4, marginTop: 2 }}>{point.desc}</div>}
      </div>
    </div>
  );
}

export function FeatureCard({ point, colors, isLight, isLast, fi }: { point: SlidePoint; colors: ColorSystem; isLight: boolean; isLast: boolean; fi: number }) {
  const cardBg     = isLight ? colors.BRAND_PRIMARY + '10' : 'rgba(255,255,255,0.05)';
  const cardBorder = isLight ? colors.BRAND_PRIMARY + '22' : 'rgba(255,255,255,0.08)';
  const labelColor = isLight ? colors.BRAND_DARK           : '#fff';
  const descColor  = isLight ? colors.BRAND_DARK + 'AA'    : 'rgba(255,255,255,0.46)';
  const iconColor  = isLight ? colors.BRAND_PRIMARY         : colors.BRAND_LIGHT;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '7px 9px', borderRadius: 8,
      background: cardBg, border: `1px solid ${cardBorder}`,
      marginBottom: isLast ? 0 : 6, flexShrink: 0,
    }}>
      <FeatureIcon icon={point.icon} color={iconColor} fi={fi} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, fontFamily: FONT, lineHeight: 1.3, marginBottom: 1 }}>{point.label}</div>
        <div style={{
          fontSize: 10, color: descColor, fontFamily: FONT, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>{point.desc}</div>
      </div>
    </div>
  );
}

export function NumberedStep({ point, stepNum, colors, isLight, isLast }: { point: SlidePoint; stepNum: number; colors: ColorSystem; isLight: boolean; isLast: boolean }) {
  const borderColor = isLight ? colors.LIGHT_BORDER : 'rgba(255,255,255,0.07)';
  const labelColor  = isLight ? colors.BRAND_DARK   : 'rgba(255,255,255,0.9)';
  const descColor   = isLight ? '#8A8580'            : 'rgba(255,255,255,0.45)';
  const numColor    = isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      padding: '11px 0',
      borderBottom: isLast ? 'none' : `1px solid ${borderColor}`,
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 24, fontWeight: 300, color: numColor,
        fontFamily: "var(--font-heading)",
        minWidth: 32, lineHeight: 1,
      }}>
        {String(stepNum).padStart(2, '0')}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: labelColor, fontFamily: FONT, lineHeight: 1.3 }}>{point.label}</div>
        {point.desc && <div style={{ fontSize: 11, color: descColor, fontFamily: FONT, lineHeight: 1.4, marginTop: 2 }}>{point.desc}</div>}
      </div>
    </div>
  );
}

// NOTE: the in-slide ProgressBar ("n/total" + bottom bar) and SwipeArrow (next-slide
// chevron) were removed — they duplicated the position-dots row IGCarouselPreview already
// renders below the frame, and had no meaning at all on a static exported PNG. PROGRESS_H
// is kept as a layout constant: several decorations below still reserve that bottom margin.
