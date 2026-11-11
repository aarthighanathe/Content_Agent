import { describe, expect, it } from 'vitest';
import { buildSlideOutlineHtml } from '../../pages/Result/components/exportHtmlOutline';
import type { SlideData } from '../../pages/Result/components/content/carousel/IGSlide';
import type { ContentJob } from '../../types/job';

describe('buildSlideOutlineHtml', () => {
  it('centers a reading document with toc, points, and escaped HTML', () => {
    const slides: SlideData[] = [
      {
        type: 'cover',
        headline: 'Stop Losing Reach <now>',
        body: 'Keep users in-feed & growing.',
        points: [{ icon: '', label: 'Hook first', desc: 'Promise a payoff' }],
        cta: { action: 'Save this', handle: 'brand' },
      },
      {
        type: 'content',
        headline: 'Second slide',
        body: 'More body copy.',
      },
    ];
    const job = {
      id: 'job-1',
      topic: 'Zero-Click Content',
      platform: 'instagram_carousel',
      tone: 'professional',
      targetAudience: 'creators',
      status: 'completed',
    } as ContentJob;

    const html = buildSlideOutlineHtml(slides, job);

    expect(html).toContain('class="shell"');
    expect(html).toContain('Contents');
    expect(html).toContain('href="#slide-1"');
    expect(html).toContain('href="#slide-2"');
    expect(html).toContain('Stop Losing Reach &lt;now&gt;');
    expect(html).toContain('Keep users in-feed &amp; growing.');
    expect(html).toContain('Hook first');
    expect(html).toContain('@brand');
    expect(html).toContain('2 slides');
  });
});
