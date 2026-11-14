import type { ColorSystem } from '../../../../../../lib/colorSystem';
import type { SlideData, BgMode } from './types';
import type { DesignPresetConfig } from './presets';

const ACCENT_ANGLES = [165, 135, 225, 45, 200, 315, 90];
export function resolveAccentGradient(index: number, colors: ColorSystem): string {
  const angle = ACCENT_ANGLES[index % ACCENT_ANGLES.length];
  return `linear-gradient(${angle}deg, ${colors.BRAND_DARK} 0%, ${colors.BRAND_PRIMARY} 55%, ${colors.BRAND_LIGHT} 100%)`;
}

export function resolveType(slide: SlideData, idx: number, total: number): string {
  return slide.type || (idx === 0 ? 'cover' : idx === total - 1 ? 'cta' : 'content');
}

// WHY: preset-aware backgrounds so each generation gets a distinct light/dark rhythm.
export function resolveBackground(
  slide: SlideData, idx: number, total: number,
  preset: DesignPresetConfig, colors: ColorSystem
): { bgMode: BgMode; background: string } {
  const type = resolveType(slide, idx, total);

  // FLOW: slide.bg_suggestion wins over preset and type defaults.
  if (slide.bg_suggestion === 'accent') return { bgMode: 'accent', background: resolveAccentGradient(idx, colors) };
  if (slide.bg_suggestion === 'dark')   return { bgMode: 'dark',   background: colors.DARK_BG };
  if (slide.bg_suggestion === 'light')  return { bgMode: 'light',  background: colors.LIGHT_BG };

  // FLOW: structural slide types keep fixed bg regardless of preset.
  if (type === 'cta' || type === 'solution')
    return { bgMode: 'accent', background: resolveAccentGradient(idx, colors) };
  if (type === 'cover' || type === 'howto' || type === 'features' || type === 'quote')
    return { bgMode: 'light', background: colors.LIGHT_BG };
  if (type === 'problem' || type === 'stat')
    return { bgMode: 'dark', background: colors.DARK_BG };

  // FLOW: remaining content slides follow preset bgBias or alternate.
  if (preset.bgBias === 'mostly-dark')  return { bgMode: 'dark',  background: colors.DARK_BG };
  if (preset.bgBias === 'mostly-light') return { bgMode: 'light', background: colors.LIGHT_BG };
  return idx % 2 === 0
    ? { bgMode: 'light', background: colors.LIGHT_BG }
    : { bgMode: 'dark',  background: colors.DARK_BG };
}
