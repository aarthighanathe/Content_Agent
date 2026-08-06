export interface ColorSystem {
  BRAND_PRIMARY: string;
  BRAND_LIGHT:   string;
  BRAND_DARK:    string;
  LIGHT_BG:      string;
  LIGHT_BORDER:  string;
  DARK_BG:       string;
}

// Maps colorTheme index → brand primary hex
export const THEME_ACCENTS = [
  '#00D4FF',  // 0 — Aurora    (cyan)
  '#D4A017',  // 1 — Magazine  (gold)
  '#FF6B35',  // 2 — Split     (orange)
  '#C9A84C',  // 3 — Bold      (copper gold)
  '#6366F1',  // 4 — Minimal   (indigo)
  '#00FF94',  // 5 — Neon      (electric mint)
  '#A855F7',  // 6 — Violet    (vivid purple)
  '#FF2D55',  // 7 — Crimson   (electric red)
  '#FF3CAC',  // 8 — Rose      (hot magenta)
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// Derive a dark background uniquely tinted per primary color.
// Starts from near-black (#04040A) and blends 9% of the primary hue in.
function tintedDark(primaryHex: string): string {
  const [r, g, b] = hexToRgb(primaryHex);
  const t = 0.09;
  return rgbToHex(4 + r * t, 4 + g * t, 10 + b * t);
}

export function deriveColorSystem(primaryHex: string): ColorSystem {
  return {
    BRAND_PRIMARY: primaryHex,
    BRAND_LIGHT:   lighten(primaryHex, 0.24),
    BRAND_DARK:    darken(primaryHex, 0.34),
    // Light slides use a tinted wash of the primary — no more generic off-white
    LIGHT_BG:      lighten(primaryHex, 0.88),
    LIGHT_BORDER:  lighten(primaryHex, 0.72),
    DARK_BG:       tintedDark(primaryHex),
  };
}

// WCAG-relative-luminance based text color: pick black or white, whichever
// contrasts more against the given background hex. Replaces the old
// `colors.DARK_BG === '#1a1a1a'` sentinel check, which always evaluated
// false because DARK_BG is procedurally tinted per-palette and can never
// equal that literal string.
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function getContrastColor(bgHex: string): '#1a1a1a' | '#ffffff' {
  return relativeLuminance(bgHex) > 0.5 ? '#1a1a1a' : '#ffffff';
}

// Same contrast decision as getContrastColor, expressed as a translucent
// black/white rgba() for muted/secondary text and subtle overlay fills.
export function getContrastRgba(bgHex: string, alpha: number): string {
  return relativeLuminance(bgHex) > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
}

// Convert template color palette to ColorSystem
// Maps template palette colors to the existing ColorSystem structure
export function deriveColorSystemFromPalette(palette: {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}): ColorSystem {
  return {
    BRAND_PRIMARY: palette.primary,
    BRAND_LIGHT:   palette.accent,
    BRAND_DARK:    palette.secondary,
    LIGHT_BG:      palette.background,
    LIGHT_BORDER:  lighten(palette.primary, 0.72),
    DARK_BG:       tintedDark(palette.primary),
  };
}
