// WHY: shared layout numbers extracted from IGSlide so legacy layouts stay aligned.

export const FONT       = "'Plus Jakarta Sans',system-ui,sans-serif";
export const PROGRESS_H = 40;
export const BOTTOM_PAD = 52;
export const H_PAD      = 28;

// NOTE: glow anchor cycles per slide so consecutive frames don't share the same blob.
export const GLOW_PRESETS: { x: string; y: string; size: number }[] = [
  { x: '85%', y: '10%', size: 180 },
  { x: '15%', y: '75%', size: 200 },
  { x: '70%', y: '50%', size: 165 },
  { x: '30%', y: '20%', size: 210 },
];

// NOTE: length must match DESIGN_PRESETS for the preview picker.
export const DESIGN_PRESET_COUNT = 20;
