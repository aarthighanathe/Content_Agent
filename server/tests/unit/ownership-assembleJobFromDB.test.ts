/**
 * routes/jobs/ownership.ts — assembleJobFromDB() happy-path tests (real module).
 *
 * WHY this suite exists: assembleJobFromDB's DB-fallback reconstruction path
 * was only exercised indirectly via ownership-mismatch/not-found test cases
 * (which never reach this function with real relational data) — no test
 * asserted the full AssembledJob shape a genuine "job aged out of memory,
 * reassembled correctly from DB" happy path produces. CLAUDE.md's own comment
 * on `sourceCompetitorAnalysisId` documents this exact bug class already
 * happening once (a DB column added to persistJob.ts's INSERT but never
 * added to this DTO, silently dropping lineage data once a job aged out of
 * jobsMemory) — this test specifically covers every optional/lineage field,
 * not just the required core ones.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: { DATABASE_URL: 'postgres://test', NODE_ENV: 'test' },
}));
vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/workers/contentWorker.js', () => ({ getJobFromStore: () => undefined }));

const { assembleJobFromDB } = await import('../../src/routes/jobs/ownership.js');

// WHY derived via Parameters<>, not a hand-declared interface or `as any`:
// assembleJobFromDB's real parameter type (DBJobWithRelations) isn't exported
// from ownership.ts, but its shape can still be captured exactly — without a
// cast — by pulling it straight off the real function's signature. Any drift
// between this test's fake row shape and the real DB row shape now surfaces
// as a compile error here instead of an unchecked `any`.
type DbJobRow = Parameters<typeof assembleJobFromDB>[0];

function makeDbJob(overrides: Partial<DbJobRow> = {}): DbJobRow {
  return {
    id: 'job-1',
    userId: 'user-1',
    topic: 'AI tools for marketers',
    platform: 'linkedin_post',
    tone: 'professional',
    targetAudience: 'marketers',
    tag: 'campaign-a',
    sourceJobId: 'source-job-1',
    sourcePlatform: 'twitter_thread',
    sourceCompetitorAnalysisId: 'analysis-1',
    sourceUrl: 'https://example.com/article',
    templateId: 'modern-minimal',
    paletteId: 'palette-1',
    status: 'done',
    retryCount: 1,
    deleted: 0,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:05:00Z'),
    outputs: [
      { agentName: 'writer', outputType: 'final', content: { hook: 'H', body: 'B', cta: 'C' }, qualityScore: 82, partial: 0 },
      { agentName: 'critic', outputType: 'critique', content: { totalScore: 82, approved: true }, qualityScore: 82, partial: 0 },
    ],
    logs: [
      { agentName: 'writer', action: 'Initial draft created', inputSummary: 'Creating initial draft', outputSummary: 'Draft generated', durationMs: 1200 },
    ],
    ...overrides,
  };
}

describe('assembleJobFromDB (real module) — happy path', () => {
  it('maps every scalar field from the DB row onto the AssembledJob shape, including lineage fields', () => {
    const dbJob = makeDbJob();
    const assembled = assembleJobFromDB(dbJob);

    expect(assembled).toMatchObject({
      id: 'job-1',
      userId: 'user-1',
      topic: 'AI tools for marketers',
      platform: 'linkedin_post',
      tone: 'professional',
      targetAudience: 'marketers',
      tag: 'campaign-a',
      sourceJobId: 'source-job-1',
      sourcePlatform: 'twitter_thread',
      // WHY asserted explicitly: this is the exact field CLAUDE.md documents
      // as having been silently dropped once already — a regression that
      // forgets to map it here would resurrect that bug.
      sourceCompetitorAnalysisId: 'analysis-1',
      sourceUrl: 'https://example.com/article',
      templateId: 'modern-minimal',
      paletteId: 'palette-1',
      status: 'done',
      retryCount: 1,
      deleted: 0,
    });
  });

  it('maps outputs, converting the DB\'s partial (0|1) column to a real boolean', () => {
    const assembled = assembleJobFromDB(makeDbJob());

    expect(assembled.outputs).toHaveLength(2);
    const finalOutput = assembled.outputs.find((o) => o.outputType === 'final');
    expect(finalOutput).toMatchObject({
      agentName: 'writer', outputType: 'final', qualityScore: 82, partial: false,
    });
    expect((finalOutput?.content as { hook: string }).hook).toBe('H');
  });

  it('finds the critique output and surfaces its content as criticResult', () => {
    const assembled = assembleJobFromDB(makeDbJob());
    expect(assembled.criticResult).toMatchObject({ totalScore: 82, approved: true });
  });

  it('maps logs, defaulting nullable inputSummary/outputSummary/durationMs to empty/zero', () => {
    const dbJob = makeDbJob({
      logs: [{ agentName: 'critic', action: 'Content APPROVED', inputSummary: null, outputSummary: null, durationMs: null }],
    });
    const assembled = assembleJobFromDB(dbJob);

    expect(assembled.logs).toEqual([
      { agentName: 'critic', action: 'Content APPROVED', inputSummary: '', outputSummary: '', durationMs: 0 },
    ]);
  });

  it('a job with no outputs/logs relations at all assembles with empty arrays and null criticResult, not a throw', () => {
    const dbJob = makeDbJob({ outputs: [], logs: [] });
    const assembled = assembleJobFromDB(dbJob);

    expect(assembled.outputs).toEqual([]);
    expect(assembled.logs).toEqual([]);
    expect(assembled.criticResult).toBeNull();
  });

  it('a lightweight output row (content column omitted, per the list-endpoint query shape) maps content to undefined, not a crash', () => {
    const dbJob = makeDbJob({
      outputs: [{ agentName: 'writer', outputType: 'final', qualityScore: 70, partial: 0 }],
    });
    const assembled = assembleJobFromDB(dbJob);

    expect(assembled.outputs[0].content).toBeUndefined();
    expect(assembled.outputs[0].qualityScore).toBe(70);
  });

  it('null lineage fields (a job with no source/template lineage) pass through as null, not undefined or a crash', () => {
    const dbJob = makeDbJob({
      sourceJobId: null, sourcePlatform: null, sourceCompetitorAnalysisId: null,
      sourceUrl: null, templateId: null, paletteId: null, tag: null,
    });
    const assembled = assembleJobFromDB(dbJob);

    expect(assembled.sourceJobId).toBeNull();
    expect(assembled.sourceCompetitorAnalysisId).toBeNull();
    expect(assembled.sourceUrl).toBeNull();
    expect(assembled.templateId).toBeNull();
  });
});
