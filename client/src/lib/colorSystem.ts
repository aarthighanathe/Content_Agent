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
