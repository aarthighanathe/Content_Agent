import { describe, expect, it } from 'vitest';
import { buildContentPdf, pdfSafeText } from '../../pages/Result/components/exportPdf';
import type { SlideData } from '../../pages/Result/components/content/carousel/IGSlide';
import type { ContentJob } from '../../types/job';

function pdfContains(doc: { output: (type: 'arraybuffer') => ArrayBuffer }, needle: string): boolean {
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  const ascii = Array.from(bytes, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ' ')).join('');
  return ascii.includes(needle);
}

describe('pdfSafeText', () => {
  it('converts curly quotes and dashes to Helvetica-safe ASCII', () => {
    expect(pdfSafeText('Instagram\u2019s \u201Czero-click\u201D \u2014 40\u201360%')).toBe(
      'Instagram\'s "zero-click" - 40-60%',
    );
  });

  it('strips unsupported glyphs that stretch Preview spacing', () => {
    expect(pdfSafeText('Hello\u200Bworld\u2022x')).toBe('Helloworldx');
  });
});

describe('buildContentPdf', () => {
  it('renders every carousel slide with a bold headline separate from the body', async () => {
    const slides: SlideData[] = [
      {
        type: 'problem',
        headline: 'The Algorithm Penalty',
        body: "When you add a URL, Instagram's algorithm suppresses your reach by 40-60%.",
        points: [
          { icon: '', label: 'Audit links', desc: 'Remove outbound URLs from the first comment.' },
        ],
      },
      {
        type: 'solution',
        headline: 'Value-First Content Loops',
        body: 'Deliver the entire value proposition inside the post.',
      },
    ];

    const job = {
      id: 'job-1',
      topic: 'Designing Zero-Click Content',
      platform: 'instagram_carousel',
      tone: 'professional',
      targetAudience: 'creators',
      status: 'completed',
    } as ContentJob;

    const doc = await buildContentPdf(slides, job);

    expect(pdfContains(doc, 'Designing Zero-Click Content')).toBe(true);
    expect(pdfContains(doc, 'SLIDE 1 - PROBLEM')).toBe(true);
    expect(pdfContains(doc, 'The Algorithm Penalty')).toBe(true);
    expect(pdfContains(doc, 'Value-First Content Loops')).toBe(true);
    expect(pdfContains(doc, 'Audit links')).toBe(true);
    expect(pdfContains(doc, 'SLIDE 2 - SOLUTION')).toBe(true);
  });
});
