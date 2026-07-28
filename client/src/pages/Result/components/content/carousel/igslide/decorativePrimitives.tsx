import React from 'react';
import type { ColorSystem } from '../../../../../../lib/colorSystem';
import { FONT, PROGRESS_H } from './constants';

// ── SVG icon set ──────────────────────────────────────────────────────────────

type SP = { c: string };
const IcoZap      = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IcoTarget   = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IcoShield   = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoRefresh  = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const IcoStar     = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoTrend    = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IcoCheck    = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IcoAward    = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
const IcoMsg      = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const IcoLayers   = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IcoArrow    = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 16 16 12 12 8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const IcoChart    = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcoGlobe    = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IcoLock     = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoSearch   = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoDollar   = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IcoPhone    = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const IcoBookmark = ({ c }: SP) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;

const FALLBACK = [IcoZap, IcoTarget, IcoShield, IcoStar, IcoTrend, IcoCheck, IcoAward, IcoMsg];
const EMOJI_MAP: Record<string, React.ComponentType<SP>> = {
  '⚡': IcoZap,    '🎯': IcoTarget,  '🛡️': IcoShield, '🔄': IcoRefresh,
  '⭐': IcoStar,   '✨': IcoStar,    '📊': IcoChart,  '📈': IcoTrend,
  '✅': IcoCheck,  '🏆': IcoAward,   '💬': IcoMsg,    '🧩': IcoLayers,
  '🚀': IcoArrow,  '🌐': IcoGlobe,   '🔒': IcoLock,   '🔑': IcoLock,
  '📌': IcoBookmark,'🔍': IcoSearch, '💰': IcoDollar, '📱': IcoPhone,
  '💡': IcoStar,   '🔥': IcoZap,    '⚙️': IcoRefresh, '📚': IcoLayers,
};

export function FeatureIcon({ icon, color, fi }: { icon: string; color: string; fi: number }) {
  const t = icon.trim();
  if (/^\d+$/.test(t)) {
    return (
      <div style={{ width: 26, height: 26, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: FONT }}>{t}</span>
      </div>
    );
  }
  const Ico = EMOJI_MAP[t] ?? FALLBACK[fi % FALLBACK.length];
  return (
    <div style={{ width: 26, height: 26, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Ico c={color} />
    </div>
  );
}

// ── Decorative primitives ─────────────────────────────────────────────────────

export function DotGrid({ color, opacity = 0.055 }: { color: string; opacity?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity }}
      dangerouslySetInnerHTML={{ __html: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dg" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="${color}"/></pattern></defs><rect width="100%" height="100%" fill="url(#dg)"/></svg>` }}
    />
  );
}

export function GridLines({ color }: { color: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04 }}
      dangerouslySetInnerHTML={{ __html: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="gl" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" fill="none" stroke="${color}" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#gl)"/></svg>` }}
    />
  );
}

export function CrosshatchLines({ color }: { color: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.032 }}
      dangerouslySetInnerHTML={{ __html: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="ch" width="24" height="24" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="24" y2="24" stroke="${color}" stroke-width="1"/><line x1="24" y1="0" x2="0" y2="24" stroke="${color}" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#ch)"/></svg>` }}
    />
  );
}

export function GlowBlob({ color, x = '75%', y = '18%', size = 200, opacity = 0.16 }: { color: string; x?: string; y?: string; size?: number; opacity?: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', width: size, height: size, borderRadius: '50%', background: color, filter: 'blur(64px)', opacity, pointerEvents: 'none' }} />
  );
}

export function CornerRings({ colors }: { colors: ColorSystem }) {
  const c = colors.BRAND_PRIMARY;
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, width: 160, height: 160, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -72, right: -72, width: 160, height: 160, borderRadius: '50%', border: `1.5px solid ${c}`, opacity: 0.07 }} />
      <div style={{ position: 'absolute', top: -44, right: -44, width: 100, height: 100, borderRadius: '50%', background: c, opacity: 0.07 }} />
      <div style={{ position: 'absolute', top: -16, right: -16, width: 58, height: 58, borderRadius: '50%', border: `1.5px solid ${c}`, opacity: 0.14 }} />
      <div style={{ position: 'absolute', top: 14, right: 14, width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.3 }} />
    </div>
  );
}

export function BottomCornerRings({ colors }: { colors: ColorSystem }) {
  const c = colors.BRAND_PRIMARY;
  return (
    <div style={{ position: 'absolute', bottom: PROGRESS_H, left: 0, width: 130, height: 130, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 130, height: 130, borderRadius: '50%', border: `1.5px solid ${c}`, opacity: 0.08 }} />
      <div style={{ position: 'absolute', bottom: -36, left: -36, width: 80, height: 80, borderRadius: '50%', background: c, opacity: 0.06 }} />
      <div style={{ position: 'absolute', bottom: -10, left: -10, width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${c}`, opacity: 0.12 }} />
    </div>
  );
}

export function DiamondAccent({ color }: { color: string }) {
  return (
    <div style={{ position: 'absolute', bottom: PROGRESS_H + 14, left: -18, pointerEvents: 'none', opacity: 0.1 }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        <rect x="15" y="15" width="30" height="30" fill="none" stroke={color} strokeWidth="1.5" transform="rotate(45 30 30)" />
        <rect x="22" y="22" width="16" height="16" fill={color} opacity="0.5" transform="rotate(45 30 30)" />
      </svg>
    </div>
  );
}

export function LeftStripe({ color, accent = false }: { color: string; accent?: boolean }) {
  return (
    <div style={{
      position: 'absolute', left: 0, top: 20, bottom: PROGRESS_H + 20,
      width: 3, borderRadius: '0 2px 2px 0',
      background: accent
        ? `linear-gradient(to bottom, ${color}, ${color}60, transparent)`
        : color,
    }} />
  );
}

export function RadialBurst({ color }: { color: string }) {
  const N = 18, cx = 210, cy = 262;
  const lines = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + 380 * Math.cos(a)).toFixed(1)}" y2="${(cy + 380 * Math.sin(a)).toFixed(1)}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.07"/>`;
  }).join('');
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: `<svg width="420" height="525" xmlns="http://www.w3.org/2000/svg">${lines}</svg>` }}
    />
  );
}

export function StatWatermark({ text, color }: { text: string; color: string }) {
  return (
    <div style={{
      position: 'absolute', right: -12, top: 30,
      fontSize: 180, fontWeight: 900, lineHeight: 0.85,
      color, opacity: 0.05,
      fontFamily: FONT, letterSpacing: -8,
      pointerEvents: 'none', userSelect: 'none',
    }}>
      {text}
    </div>
  );
}

export function DiagStripes({ color }: { color: string }) {
  return (
    <div style={{ position: 'absolute', bottom: PROGRESS_H, right: 0, width: 130, height: 130, overflow: 'hidden', pointerEvents: 'none', opacity: 0.06 }}
      dangerouslySetInnerHTML={{ __html: `<svg width="130" height="130" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="ds" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="${color}" stroke-width="4"/></pattern></defs><rect width="130" height="130" fill="url(#ds)"/></svg>` }}
    />
  );
}
