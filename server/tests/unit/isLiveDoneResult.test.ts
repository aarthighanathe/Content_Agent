/**
 * isLiveDoneResult — shared helper used by pipeline failure catch and
 * backgroundRepersist. Must stay exported: a private-only copy left
 * pipeline.ts calling an undefined binding (ReferenceError before failed
 * persist/SSE).
 */
import { describe, it, expect } from 'vitest';
import { isLiveDoneResult, isLiveFailedResult } from '../../src/lib/pipelineRepersist.js';
import type { PipelineJob, PersistedJobResult } from '../../src/lib/pipelineTypes.js';

function baseJob(overrides: Partial<PipelineJob> = {}): PipelineJob {
  return {
    id: 'job-1',
    userId: 'user-1',
    topic: 't',
    platform: 'linkedin',
    status: 'processing',
    retryCount: 0,
    ...overrides,
  };
}

describe('isLiveDoneResult', () => {
  it('returns true for done + final output', () => {
    const live: PersistedJobResult = {
      ...baseJob({ status: 'done' }),
      status: 'done',
      outputs: [
        { agentName: 'writer', outputType: 'final', content: { body: 'x' } },
      ],
      logs: [],
      criticResult: null,
    };
    expect(isLiveDoneResult(live)).toBe(true);
  });

  it('returns false when status is done but no final output', () => {
    const live: PersistedJobResult = {
      ...baseJob({ status: 'done' }),
      status: 'done',
      outputs: [
        { agentName: 'researcher', outputType: 'research', content: {} },
      ],
      logs: [],
      criticResult: null,
    };
    expect(isLiveDoneResult(live)).toBe(false);
  });

  it('returns false for failed / in-flight jobs', () => {
    expect(isLiveDoneResult(baseJob({ status: 'failed' }))).toBe(false);
    expect(isLiveDoneResult(baseJob({ status: 'processing' }))).toBe(false);
  });
});

describe('isLiveFailedResult', () => {
  it('returns true for failed + outputs array (incl. empty prior finals)', () => {
    const live: PersistedJobResult = {
      ...baseJob({ status: 'failed' }),
      status: 'failed',
      outputs: [],
      logs: [],
      criticResult: null,
    };
    expect(isLiveFailedResult(live)).toBe(true);
  });

  it('returns false for done / in-flight', () => {
    expect(isLiveFailedResult(baseJob({ status: 'done' }))).toBe(false);
    expect(isLiveFailedResult(baseJob({ status: 'pending' }))).toBe(false);
  });
});
