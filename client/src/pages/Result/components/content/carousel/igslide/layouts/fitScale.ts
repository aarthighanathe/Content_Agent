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

export function estimateFitScale(input: FitEstimateInput): number {
  const innerW = Math.max(80, input.width - input.padding * 2);
  const lineCount = (text: string, size: number): number => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    const charsPerLine = Math.max(8, Math.floor(innerW / (size * 0.56)));
    const words = trimmed.split(/\s+/);
    let count = 1;
    let col = 0;
    words.forEach((word) => {
      const width = word.length;
      if (col > 0 && col + 1 + width > charsPerLine) {
        count += 1;
        col = width;
      } else {
        col = col === 0 ? width : col + 1 + width;
      }
    });
    return count;
  };

  const headingLines = lineCount(input.headline, input.headingSize);
  const bodyLines = lineCount(input.body, input.bodySize);
  const pointLines = lineCount(input.pointCopy ?? '', input.bodySize);
  const pointRow = Math.max(input.bodySize + 10, 28) + Math.min(input.gap, 16);
  const needed = input.padding * 2
    + 28
    + headingLines * input.headingSize * 1.22
    + (headingLines > 0 && bodyLines > 0 ? input.gap * 0.6 : 0)
    + bodyLines * input.bodySize * 1.55
    + (input.pointCount > 0 ? input.sectionSpacing * 0.7 : 0)
    + Math.max(input.pointCount * pointRow, pointLines * input.bodySize * 1.45)
    + 28;
  // WHY the padding is not scaled: a tall slide used to shrink from the center,
  // so its inset grew while a short slide kept the template padding.
  const contentTarget = Math.max(40, input.height - input.padding * 2);
  const contentNeeded = Math.max(1, needed - input.padding * 2);
  if (contentNeeded <= contentTarget + 1) return 1;
  return Math.max(0.45, contentTarget / contentNeeded);
}
