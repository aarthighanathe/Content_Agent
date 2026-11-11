interface FitEstimateInput {
  width: number;
  height: number;
  padding: number;
  headingSize: number;
  bodySize: number;
  gap: number;
  sectionSpacing: number;
  headline: string;
  body: string;
  pointCount: number;
  /** Labels and descriptions, so a wrapped point list counts toward height. */
  pointCopy?: string;
  points?: { label?: string; desc?: string }[] | null;
  /**
   * Card-grid geometry. PNG export cannot measure the DOM (JavaScript is
   * off), so templates whose points are padded cards pass this instead of
   * the stacked-list guess.
   */
  pointLayout?: PointFitLayout | null;
}

/** How a template's point cards actually stack, in CSS pixels. */
export interface PointFitLayout {
  columns: number;
  cardPadding: number;
  /** Kicker line plus its margin, above the label. */
  kicker: number;
  labelSize: number;
  descSize: number;
  /** Header rule / page label above the headline. */
  header: number;
  /** Footer rule under the points. */
  footer: number;
}

/**
 * Clean Corporate lays points out as a padded 2-column card grid (kicker,
 * wrapping title, wrapping description) plus a header and footer. The
 * stacked-list guess ignores that chrome, reports "it fits", and the PNG
 * clips the bottom row. Preview remeasures with JavaScript, so it looks fine.
 */
export function pointFitLayoutForTemplate(
  templateId: string,
  pointCount: number,
  gap: number,
): PointFitLayout | null {
  if (templateId !== 'clean-corporate') return null;
  return {
    columns: pointCount > 2 ? 2 : 1,
    cardPadding: gap,
    kicker: 20,
    labelSize: 14,
    descSize: 12,
    header: 62,
    footer: 36,
  };
}

/**
 * Rough line count so a long slide can be scaled before layout exists.
 * PNG export screenshots the slide with JavaScript disabled, so this
 * estimate is written into the markup and is what the download uses.
 */
export function slidePointCopy(
  points: { label?: string; desc?: string }[] | null | undefined,
): string {
  if (!points || points.length === 0) return '';
  return points
    .map((point) => `${point.label ?? ''} ${point.desc ?? ''}`.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function lineCount(text: string, size: number, width: number, charFactor = 0.56): number {
  const trimmed = text.trim();
  if (!trimmed || size <= 0) return 0;
  // WHY 0.46 on card grids: Plus Jakarta Sans is narrower than the 0.56
  // fallback. The wider guess wrapped every description an extra line, shrank
  // the PNG too far, and left a blank band above the header.
  const charsPerLine = Math.max(8, Math.floor(width / (size * charFactor)));
  const words = trimmed.split(/\s+/);
  let count = 1;
  let col = 0;
  words.forEach((word) => {
    const wordWidth = word.length;
    if (col > 0 && col + 1 + wordWidth > charsPerLine) {
      count += 1;
      col = wordWidth;
    } else {
      col = col === 0 ? wordWidth : col + 1 + wordWidth;
    }
  });
  return count;
}

function cardGridHeight(
  points: { label?: string; desc?: string }[],
  layout: PointFitLayout,
  innerW: number,
  gap: number,
): number {
  if (points.length === 0) return 0;
  const cols = Math.max(1, Math.min(layout.columns, points.length));
  const colOuter = (innerW - gap * (cols - 1)) / cols;
  const textW = Math.max(40, colOuter - layout.cardPadding * 2);
  const heights = points.map((point) => {
    const labelLines = lineCount(point.label ?? '', layout.labelSize, textW, 0.46);
    const descLines = lineCount(point.desc ?? '', layout.descSize, textW, 0.46);
    if (labelLines === 0 && descLines === 0) return 0;
    return layout.cardPadding * 2
      + layout.kicker
      + labelLines * layout.labelSize * 1.6
      + (descLines > 0 ? 4 : 0)
      + descLines * layout.descSize * 1.6;
  });
  let total = 0;
  const rows = Math.ceil(heights.length / cols);
  for (let row = 0; row < rows; row += 1) {
    let rowHeight = 0;
    for (let col = 0; col < cols; col += 1) {
      const card = heights[row * cols + col] ?? 0;
      if (card > rowHeight) rowHeight = card;
    }
    total += rowHeight;
    if (row > 0) total += gap;
  }
  return total;
}

function estimateCardSlideHeight(
  input: FitEstimateInput,
  layout: PointFitLayout,
  innerW: number,
): number {
  const headingLines = lineCount(input.headline, input.headingSize, innerW, 0.46);
  const bodyLines = lineCount(input.body, input.bodySize, innerW, 0.46);
  const headingH = headingLines === 0 ? 0 : headingLines * input.headingSize * 1.3 + input.gap;
  const bodyH = bodyLines === 0 ? 0 : bodyLines * input.bodySize * 1.6 + input.sectionSpacing;
  const pointsH = cardGridHeight(input.points ?? [], layout, innerW, input.gap);
  return input.padding * 2 + layout.header + headingH + bodyH + pointsH + layout.footer;
}

function estimateStackedSlideHeight(input: FitEstimateInput): number {
  const innerW = Math.max(80, input.width - input.padding * 2);
  const headingLines = lineCount(input.headline, input.headingSize, innerW);
  const bodyLines = lineCount(input.body, input.bodySize, innerW);
  const pointLines = lineCount(input.pointCopy ?? '', input.bodySize, innerW);
  const pointRow = Math.max(input.bodySize + 10, 28) + Math.min(input.gap, 16);
  return input.padding * 2
    + 28
    + headingLines * input.headingSize * 1.22
    + (headingLines > 0 && bodyLines > 0 ? input.gap * 0.6 : 0)
    + bodyLines * input.bodySize * 1.55
    + (input.pointCount > 0 ? input.sectionSpacing * 0.7 : 0)
    + Math.max(input.pointCount * pointRow, pointLines * input.bodySize * 1.45)
    + 28;
}

/** Shrink so the copy stays inside the frame and the template padding stays put. */
function scaleToFit(height: number, padding: number, needed: number): number {
  const contentTarget = Math.max(40, height - padding * 2);
  const contentNeeded = Math.max(1, needed - padding * 2);
  if (contentNeeded <= contentTarget + 1) return 1;
  // WHY 12px: a scale that lands on the clip edge still slices the last line.
  // The live preview measures this gap; the PNG has to bake it in.
  const safeTarget = Math.max(40, contentTarget - 12);
  return Math.max(0.45, safeTarget / contentNeeded);
}

export function estimateFitScale(input: FitEstimateInput): number {
  const layout = input.pointLayout ?? null;
  if (!layout) {
    return scaleToFit(input.height, input.padding, estimateStackedSlideHeight(input));
  }
  // WHY two widths: the PNG lays the copy out at 1/scale and then shrinks it,
  // so a guess made at the final width over-shrinks and leaves a tall empty
  // band. Re-measure at that wider width until the scale stops moving.
  const innerW = Math.max(80, input.width - input.padding * 2);
  let scale = scaleToFit(
    input.height,
    input.padding,
    estimateCardSlideHeight(input, layout, innerW),
  );
  for (let pass = 0; pass < 3 && scale < 0.999; pass += 1) {
    const wider = Math.max(80, innerW / scale);
    const next = scaleToFit(
      input.height,
      input.padding,
      estimateCardSlideHeight(input, layout, wider),
    );
    if (Math.abs(next - scale) < 0.01) return next;
    scale = next;
  }
  return scale;
}
