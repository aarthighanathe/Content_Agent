/**
 * writerCompleteness — video_script cta.text gate (Pass-5 M4).
 */
import { describe, it, expect } from 'vitest';
import { enforceWriterCompleteness } from '../../src/agents/writerCompleteness.js';

describe('enforceWriterCompleteness — video_script cta', () => {
  const base = {
    hook: { text: 'Watch this', duration: '0-3s' },
    segments: [{ number: 1, script: 'Real segment script', duration: '10s' }],
  };

  it('requires non-junk cta.text when requireMinCounts is true', () => {
    expect(() =>
      enforceWriterCompleteness('video_script', { ...base } as never),
    ).toThrow(/cta\.text/);

    expect(() =>
      enforceWriterCompleteness('video_script', {
        ...base,
        cta: { text: 'undefined' },
      } as never),
    ).toThrow(/cta\.text/);
  });

  it('accepts a real cta.text', () => {
    const result = enforceWriterCompleteness('video_script', {
      ...base,
      cta: { text: 'Follow for more tips', duration: '3s' },
    } as never);
    expect(result).toMatchObject({
      hook: { text: 'Watch this' },
      cta: { text: 'Follow for more tips' },
    });
  });

  it('rejects scrubbed-empty cta.text on formatter re-check', () => {
    expect(() =>
      enforceWriterCompleteness(
        'video_script',
        { ...base, cta: { text: 'null' } } as never,
        { requireMinCounts: false },
      ),
    ).toThrow(/cta\.text/);
  });
});
