// WHY: one preset per carousel generation so layout variants and bg rhythm
// differ run-to-run without per-slide LLM styling fields.

export interface DesignPresetConfig {
  contentStart: 0 | 1 | 2;
  contentForce: 0 | 1 | 2 | null;
  cover: 0 | 1;
  bgBias: 'alternate' | 'mostly-dark' | 'mostly-light';
}

// NOTE: topic hash picks entry; generation history avoids immediate repeats.
export const DESIGN_PRESETS: DesignPresetConfig[] = [
  { contentStart: 0, contentForce: 0,    cover: 0, bgBias: 'alternate'    },
  { contentStart: 0, contentForce: 1,    cover: 1, bgBias: 'mostly-dark'  },
  { contentStart: 0, contentForce: 2,    cover: 0, bgBias: 'mostly-light' },
  { contentStart: 0, contentForce: null, cover: 0, bgBias: 'alternate'    },
  { contentStart: 1, contentForce: null, cover: 1, bgBias: 'mostly-dark'  },
  { contentStart: 2, contentForce: null, cover: 0, bgBias: 'mostly-light' },
  { contentStart: 0, contentForce: 0,    cover: 1, bgBias: 'mostly-dark'  },
  { contentStart: 0, contentForce: 1,    cover: 0, bgBias: 'mostly-light' },
  { contentStart: 0, contentForce: 2,    cover: 1, bgBias: 'mostly-dark'  },
  { contentStart: 0, contentForce: null, cover: 1, bgBias: 'mostly-light' },
  { contentStart: 1, contentForce: null, cover: 0, bgBias: 'alternate'    },
  { contentStart: 2, contentForce: null, cover: 1, bgBias: 'mostly-dark'  },
  { contentStart: 0, contentForce: 0,    cover: 0, bgBias: 'mostly-light' },
  { contentStart: 0, contentForce: 1,    cover: 1, bgBias: 'alternate'    },
  { contentStart: 0, contentForce: 2,    cover: 0, bgBias: 'alternate'    },
  { contentStart: 1, contentForce: null, cover: 1, bgBias: 'mostly-light' },
  { contentStart: 2, contentForce: null, cover: 0, bgBias: 'mostly-dark'  },
  { contentStart: 0, contentForce: 0,    cover: 1, bgBias: 'mostly-light' },
  { contentStart: 0, contentForce: 2,    cover: 1, bgBias: 'mostly-light' },
  { contentStart: 2, contentForce: null, cover: 1, bgBias: 'alternate'    },
];
