// WHY extracted from exportDownloaders: the PDF writer needs real typography
// (label / headline / body / points) and Unicode sanitization. Keeping that
// here stops exportDownloaders from growing past the line-cap again.
import type { jsPDF } from 'jspdf';
import type { SlideData } from './content/carousel/IGSlide';
import type { ContentJob } from '../../../types/job';
import type { ResultContent as ExportContent } from './ContentColumn';

interface PdfWriteContext {
  doc: jsPDF;
  margin: number;
  maxW: number;
  pageBottom: number;
  y: number;
}

/** Helvetica is WinAnsi — curly quotes/dashes from the LLM stretch or vanish in Preview. */
export function pdfSafeText(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2000-\u200A\u202F\u205F]/g, ' ')
    // WHY delete ZWSP/ZWNJ rather than space: a zero-width char becoming a
    // real space changes wrap points and can look like stretched tracking.
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function ensureSpace(ctx: PdfWriteContext, needed: number): void {
  if (ctx.y + needed <= ctx.pageBottom) return;
  ctx.doc.addPage();
  ctx.y = ctx.margin;
}

function writeLines(
  ctx: PdfWriteContext,
  text: string,
  opts: { font: 'bold' | 'normal'; size: number; color: number; lineH: number },
): void {
  const safe = pdfSafeText(text);
  if (!safe) return;
  ctx.doc.setFont('helvetica', opts.font);
  ctx.doc.setFontSize(opts.size);
  ctx.doc.setTextColor(opts.color);
  // WHY split then draw one string at a time: passing a character-spread array
  // to doc.text() is what produces the stretched letter-spacing in Preview.
  const lines = ctx.doc.splitTextToSize(safe, ctx.maxW) as string[];
  lines.forEach((line) => {
    const row = typeof line === 'string' ? line : String(line);
    ensureSpace(ctx, opts.lineH);
    ctx.doc.text(row, ctx.margin, ctx.y);
    ctx.y += opts.lineH;
  });
}

function writeBlockGap(ctx: PdfWriteContext, gap: number): void {
  ctx.y += gap;
}

function writeCarouselSlide(ctx: PdfWriteContext, slide: SlideData, index: number): void {
  const label = `Slide ${index + 1}${slide.type ? ` - ${slide.type}` : ''}`.toUpperCase();
  // Leave room for label + headline + a couple body lines before breaking.
  ensureSpace(ctx, 72);
  writeLines(ctx, label, { font: 'bold', size: 9, color: 100, lineH: 12 });
  writeBlockGap(ctx, 4);
  if (slide.headline) {
    writeLines(ctx, slide.headline, { font: 'bold', size: 13, color: 20, lineH: 18 });
    writeBlockGap(ctx, 4);
  }
  if (slide.body) {
    writeLines(ctx, slide.body, { font: 'normal', size: 11, color: 40, lineH: 16 });
    writeBlockGap(ctx, 4);
  }
  const points = Array.isArray(slide.points) ? slide.points : [];
  points.forEach((point, pointIndex) => {
    const labelText = pdfSafeText(point.label ?? '');
    const descText = pdfSafeText(point.desc ?? '');
    if (!labelText && !descText) return;
    const bullet = descText
      ? `${pointIndex + 1}. ${labelText} - ${descText}`
      : `${pointIndex + 1}. ${labelText}`;
    writeLines(ctx, bullet, { font: 'normal', size: 10, color: 50, lineH: 14 });
  });
  if (slide.cta?.action || slide.cta?.handle) {
    writeBlockGap(ctx, 2);
    const cta = [slide.cta.action, slide.cta.handle ? `@${slide.cta.handle}` : '']
      .filter((part) => part && part.length > 0)
      .join(' ');
    writeLines(ctx, cta, { font: 'bold', size: 10, color: 60, lineH: 14 });
  }
  writeBlockGap(ctx, 16);
}

function writeLabeledSection(ctx: PdfWriteContext, label: string, body: string): void {
  const safeBody = pdfSafeText(body);
  if (!safeBody) return;
  ensureSpace(ctx, 40);
  writeLines(ctx, label.toUpperCase(), { font: 'bold', size: 9, color: 100, lineH: 12 });
  writeBlockGap(ctx, 4);
  writeLines(ctx, safeBody, { font: 'normal', size: 11, color: 40, lineH: 16 });
  writeBlockGap(ctx, 14);
}

export async function buildContentPdf(
  content: ExportContent | undefined,
  jobData: ContentJob | null,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ctx: PdfWriteContext = {
    doc,
    margin,
    maxW: pageW - margin * 2,
    pageBottom: pageH - margin,
    y: margin + 12,
  };

  writeLines(ctx, jobData?.topic || 'Content', {
    font: 'bold',
    size: 18,
    color: 20,
    lineH: 24,
  });
  writeBlockGap(ctx, 6);
  // WHY ASCII separator: middot (·) is stripped by pdfSafeText / Helvetica.
  const meta = [jobData?.platform, jobData?.tone, jobData?.targetAudience]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' | ');
  if (meta) {
    writeLines(ctx, meta, { font: 'normal', size: 10, color: 120, lineH: 14 });
    writeBlockGap(ctx, 18);
  } else {
    writeBlockGap(ctx, 12);
  }

  if (content && Array.isArray(content)) {
    content.forEach((slide, index) => writeCarouselSlide(ctx, slide, index));
  } else if (content && 'segments' in content) {
    const hookText = typeof content.hook === 'string' ? content.hook : content.hook?.text || '';
    writeLabeledSection(ctx, 'Hook', hookText);
    (content.segments || []).forEach((segment) => {
      writeLabeledSection(ctx, `Segment ${segment.number ?? ''}`.trim(), segment.script || '');
    });
    const ctaText = typeof content.cta === 'string' ? content.cta : content.cta?.text || '';
    writeLabeledSection(ctx, 'CTA', ctaText);
    if (content.hashtags?.length) {
      writeLabeledSection(ctx, 'Hashtags', content.hashtags.join(' '));
    }
  } else if (content && 'tweets' in content && Array.isArray(content.tweets)) {
    content.tweets.forEach((tweet, index) => {
      writeLabeledSection(ctx, `Tweet ${index + 1}`, tweet.text || '');
    });
  } else if (content) {
    if (content.hook) writeLabeledSection(ctx, 'Hook', content.hook);
    if (content.body) writeLabeledSection(ctx, 'Body', content.body);
    if (content.cta) writeLabeledSection(ctx, 'CTA', content.cta);
    if (content.caption) writeLabeledSection(ctx, 'Caption', content.caption);
    if (content.hashtags?.length) {
      writeLabeledSection(ctx, 'Hashtags', content.hashtags.join(' '));
    }
  }

  return doc;
}
