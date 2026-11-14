/**
 * resolveExportSlides — SEC-003 unit coverage.
 *
 * Export must render the job's stored final carousel, not a fully
 * client-authored deck. Client slides may only contribute imageDataUrl
 * overlays when length matches; otherwise stored wins unchanged.
 */
import { describe, it, expect } from 'vitest';
import { resolveExportSlides } from '../../src/routes/jobs/exportSlides.js';
import type { MemoryJob } from '../../src/routes/jobs/ownership.js';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function jobWithFinal(slides: unknown[]): MemoryJob {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    userId: 'owner',
    topic: 'export slides unit',
    platform: 'instagram_carousel',
    status: 'done',
    retryCount: 0,
    deleted: 0,
    outputs: [{ agentName: 'formatter', outputType: 'final', content: slides }],
    logs: [],
    criticResult: null,
  };
}

describe('resolveExportSlides (SEC-003)', () => {
  it('returns null when the job has no final output', () => {
    const job = jobWithFinal([]);
    job.outputs = [{ agentName: 'writer', outputType: 'draft', content: [{ headline: 'x' }] }];
    expect(resolveExportSlides(job, [{ headline: 'client' }])).toBeNull();
  });

  it('returns null when final content is not a valid slide array', () => {
    const job = jobWithFinal([{ headline: 'x' }]);
    (job.outputs![0] as { content: unknown }).content = { hook: 'not slides' };
    expect(resolveExportSlides(job, [{ headline: 'client' }])).toBeNull();
  });

  it('returns stored slides when client length mismatches (never invents from body)', () => {
    const stored = [
      { headline: 'Stored A', body: 'from db' },
      { headline: 'Stored B', body: 'from db' },
    ];
    const job = jobWithFinal(stored);
    const client = [
      { headline: 'Attacker headline', body: 'burn puppeteer' },
    ];

    const result = resolveExportSlides(job, client);
    expect(result).toEqual(stored);
    expect(result?.[0]?.headline).toBe('Stored A');
  });

  it('merges only imageDataUrl overlays when lengths match', () => {
    const stored = [
      { headline: 'Stored A', body: 'keep me' },
      { headline: 'Stored B', body: 'keep me too' },
    ];
    const job = jobWithFinal(stored);
    const client = [
      { headline: 'Ignore me', body: 'ignore', imageDataUrl: TINY_PNG },
      { headline: 'Also ignore', body: 'ignore' },
    ];

    const result = resolveExportSlides(job, client);
    expect(result).toHaveLength(2);
    expect(result?.[0]?.headline).toBe('Stored A');
    expect(result?.[0]?.body).toBe('keep me');
    expect(result?.[0]?.imageDataUrl).toBe(TINY_PNG);
    expect(result?.[1]?.headline).toBe('Stored B');
    expect(result?.[1]?.imageDataUrl).toBeUndefined();
  });

  it('does not take client headline/body even when lengths match', () => {
    const stored = [{ headline: 'Canonical', body: 'server truth' }];
    const job = jobWithFinal(stored);
    const client = [{ headline: 'Hijacked', body: 'client authored', imageDataUrl: TINY_PNG }];

    const result = resolveExportSlides(job, client);
    expect(result?.[0]?.headline).toBe('Canonical');
    expect(result?.[0]?.body).toBe('server truth');
    expect(result?.[0]?.imageDataUrl).toBe(TINY_PNG);
  });
});
