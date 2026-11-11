import { describe, expect, it } from 'vitest';
import { flattenContentToText } from '../../lib/contentFlattener';

describe('flattenContentToText', () => {
  it('labels carousel slides as Slide N of M with type, points, and CTA', () => {
    const text = flattenContentToText([
      {
        type: 'cover',
        headline: 'Stop Losing Reach',
        body: 'Keep users in the feed.',
      },
      {
        type: 'content',
        headline: 'Zero-Click Engine',
        body: 'Four steps to activate.',
        points: [
          { label: 'Audit posts', desc: 'Remove outbound links.' },
          { label: 'Hook first', desc: '' },
        ],
        cta: { action: 'Save this guide', handle: 'brand' },
      },
    ]);

    expect(text).toContain('Slide 1 of 2 — Cover');
    expect(text).toContain('Stop Losing Reach');
    expect(text).toContain('Slide 2 of 2 — Content');
    expect(text).toContain('1. Audit posts — Remove outbound links.');
    expect(text).toContain('2. Hook first');
    expect(text).toContain('Save this guide · @brand');
    expect(text).not.toContain('[cover]');
    expect(text).not.toContain('[content]');
  });
});
