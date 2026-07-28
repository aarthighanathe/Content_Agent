// ── Design preset system ────────────────────────────────────────────────────────
// A preset is randomly selected once per carousel generation and controls the
// overall visual personality: layout variants, bg bias, and cover style.

export interface DesignPresetConfig {
  // Offset into ContentLayout A/B/C cycle (0=A-first, 1=B-first, 2=C-first)
  contentStart: 0 | 1 | 2;
  // Lock all content slides to one variant; null = cycle through all
  contentForce: 0 | 1 | 2 | null;
  // 0 = brand-lockup-at-top cover, 1 = emoji-centered cover
  cover: 0 | 1;
  // Controls light/dark balance of content/tip/details slides
  bgBias: 'alternate' | 'mostly-dark' | 'mostly-light';
}

// 20 distinct presets — topic hash picks a starting preference, history prevents repeats.
// Dimensions: contentForce (A/B/C/mixed), cover (brand/emoji), bgBias (alt/dark/light)
export const DESIGN_PRESETS: DesignPresetConfig[] = [
  { contentStart: 0, contentForce: 0,    cover: 0, bgBias: 'alternate'    }, //  0 Classic editorial
  { contentStart: 0, contentForce: 1,    cover: 1, bgBias: 'mostly-dark'  }, //  1 Bold dark banner emoji
  { contentStart: 0, contentForce: 2,    cover: 0, bgBias: 'mostly-light' }, //  2 Clean card brand
  { contentStart: 0, contentForce: null, cover: 0, bgBias: 'alternate'    }, //  3 Full cycle alternating brand
  { contentStart: 1, contentForce: null, cover: 1, bgBias: 'mostly-dark'  }, //  4 B→C→A cycle dark emoji
  { contentStart: 2, contentForce: null, cover: 0, bgBias: 'mostly-light' }, //  5 C→A→B cycle light brand
  { contentStart: 0, contentForce: 0,    cover: 1, bgBias: 'mostly-dark'  }, //  6 Stripe dark emoji
  { contentStart: 0, contentForce: 1,    cover: 0, bgBias: 'mostly-light' }, //  7 Banner light brand
  { contentStart: 0, contentForce: 2,    cover: 1, bgBias: 'mostly-dark'  }, //  8 Card dark emoji
  { contentStart: 0, contentForce: null, cover: 1, bgBias: 'mostly-light' }, //  9 A→B→C cycle light emoji
  { contentStart: 1, contentForce: null, cover: 0, bgBias: 'alternate'    }, // 10 B→C→A cycle alternating brand
  { contentStart: 2, contentForce: null, cover: 1, bgBias: 'mostly-dark'  }, // 11 C→A→B cycle dark emoji
  { contentStart: 0, contentForce: 0,    cover: 0, bgBias: 'mostly-light' }, // 12 Stripe light brand
  { contentStart: 0, contentForce: 1,    cover: 1, bgBias: 'alternate'    }, // 13 Banner alternating emoji
  { contentStart: 0, contentForce: 2,    cover: 0, bgBias: 'alternate'    }, // 14 Card alternating brand
  { contentStart: 1, contentForce: null, cover: 1, bgBias: 'mostly-light' }, // 15 B→C→A cycle light emoji
  { contentStart: 2, contentForce: null, cover: 0, bgBias: 'mostly-dark'  }, // 16 C→A→B cycle dark brand
  { contentStart: 0, contentForce: 0,    cover: 1, bgBias: 'mostly-light' }, // 17 Stripe light emoji
  { contentStart: 0, contentForce: 2,    cover: 1, bgBias: 'mostly-light' }, // 18 Card light emoji
  { contentStart: 2, contentForce: null, cover: 1, bgBias: 'alternate'    }, // 19 C→A→B cycle alternating emoji
];
