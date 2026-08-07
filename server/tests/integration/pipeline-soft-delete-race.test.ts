/**
 * lib/pipeline.ts — isSoftDeleted() mid-loop bail regression test.
 *
 * WHY this suite exists: runContentPipeline's write→format→critique while-loop
 * checks `isSoftDeleted(job.id)` before each retry iteration specifically so a
 * job deleted mid-run (DELETE /:jobId sets deleted=1 in jobsMemory/jobStore)
 * stops burning LLM calls on a job nobody will ever read, rather than
 * exhausting all 3 retry attempts regardless. No test exercised the actual
 * delete-during-run race before this — a regression here would either waste
 * Gemini/Tavily quota on deleted jobs, or (via runAndPersistPipeline's own
 * post-loop isSoftDeleted check) let a deleted job get "resurrected" by a
 * late persist.
 *
 * WHY the real jobsMemory Map, not a separate mock: isSoftDeleted() reads
 * directly from jobsMemory (routes/jobs/ownership.js) — flipping a real entry
 * in that same Map, from inside the critic mock's implementation, reproduces
 * the actual race (a DELETE request landing between retry iterations) instead
 * of a synthetic stand-in for the check itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrchestratorResult = {
  taskPlan: 'Create post about time management',
  searchQueries: ['time management tips', 'productivity hacks'],
  platformRules: { format: 'post' },
};
const mockResearchResult = {
  trendingAngles: ['deep work'], keyFacts: ['fact'], suggestedHashtags: ['#tag'],
  competitorHooks: ['hook'], sourceUrls: [], rawResults: [],
};
const mockWriterResult = { hook: 'H', body: 'B', cta: 'C', hashtags: [] };
const mockFormatterResult = { ...mockWriterResult };

const runOrchestrator = vi.fn();
const runResearcher = vi.fn();
const runWriter = vi.fn();
const runFormatter = vi.fn();
const runCritic = vi.fn();
const runPerformancePredictor = vi.fn();
const persistJobToDB = vi.fn();

vi.mock('../../src/agents/orchestrator.js', () => ({ runOrchestrator: (...args: any[]) => runOrchestrator(...args) }));
vi.mock('../../src/agents/researcher.js', () => ({ runResearcher: (...args: any[]) => runResearcher(...args) }));
vi.mock('../../src/agents/writer.js', () => ({ runWriter: (...args: any[]) => runWriter(...args) }));
vi.mock('../../src/agents/formatter.js', () => ({ runFormatter: (...args: any[]) => runFormatter(...args) }));
vi.mock('../../src/agents/critic.js', () => ({ runCritic: (...args: any[]) => runCritic(...args) }));
vi.mock('../../src/agents/performancePredictor.js', () => ({ runPerformancePredictor: (...args: any[]) => runPerformancePredictor(...args) }));
vi.mock('../../src/workers/contentWorker.js', () => ({ getJobFromStore: () => undefined }));
vi.mock('../../src/lib/persistJob.js', () => ({ persistJobToDB: (...args: any[]) => persistJobToDB(...args) }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));
// WHY mocked: routes/jobs/ownership.js (imported for the real jobsMemory Map
// isSoftDeleted() reads from) transitively imports db/index.js, which
// validates the full env schema at module load — none of that is exercised
// by this test's own logic.
vi.mock('../../src/config.js', () => ({
  env: { DATABASE_URL: 'postgres://test', NODE_ENV: 'test' },
}));
vi.mock('../../src/db/index.js', () => ({ db: null }));

const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
const { runContentPipeline, runAndPersistPipeline } = await import('../../src/lib/pipeline.js');

describe('runContentPipeline — mid-loop soft-delete race', () => {
  const mockJob = {
    id: 'soft-delete-job-1',
    userId: 'user-1',
    topic: 'Time management',
    platform: 'linkedin_post',
    tone: 'professional',
    targetAudience: 'professionals',
    brandVoice: 'professional',
    status: 'pending',
    retryCount: 0,
  };

  const emitProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    jobsMemory.clear();
    runOrchestrator.mockResolvedValue(mockOrchestratorResult);
    runResearcher.mockResolvedValue(mockResearchResult);
    runWriter.mockResolvedValue(mockWriterResult);
    runFormatter.mockResolvedValue(mockFormatterResult);
    runPerformancePredictor.mockResolvedValue({ tier: 'medium', confidenceScore: 0.5, topReason: '', improvementSuggestion: '', benchmarkContext: '', estimatedEngagementMultiplier: 1 });
  });

  it('a job marked deleted=1 (in jobsMemory) between retry iterations stops the loop before exhausting all 3 attempts', async () => {
    jobsMemory.set(mockJob.id, { id: mockJob.id, userId: 'user-1', deleted: 0 } as any);

    // First attempt: critic rejects (triggers a retry) AND flips the job to
    // deleted=1, simulating a DELETE /:jobId request landing right after the
    // first critic call returns but before the next loop iteration starts.
    runCritic.mockImplementationOnce(async () => {
      const entry = jobsMemory.get(mockJob.id);
      if (entry) jobsMemory.set(mockJob.id, { ...entry, deleted: 1 });
      return { approved: false, totalScore: 40, scores: {}, feedback: 'weak' };
    });

    await runContentPipeline({ ...mockJob }, emitProgress);

    // WHY exactly 1, not 3: the loop's isSoftDeleted() check runs at the TOP
    // of each iteration — attempt 1 already happened before the flag flipped,
    // so it completes, but the flag must be seen before attempt 2 starts.
    expect(runWriter).toHaveBeenCalledTimes(1);
    expect(runFormatter).toHaveBeenCalledTimes(1);
    expect(runCritic).toHaveBeenCalledTimes(1);
  });

  it('runAndPersistPipeline does not persist a "done" result or call persistJobToDB for a job deleted mid-run', async () => {
    jobsMemory.set(mockJob.id, { id: mockJob.id, userId: 'user-1', deleted: 0 } as any);
    runCritic.mockImplementationOnce(async () => {
      const entry = jobsMemory.get(mockJob.id);
      if (entry) jobsMemory.set(mockJob.id, { ...entry, deleted: 1 });
      return { approved: false, totalScore: 40, scores: {}, feedback: 'weak' };
    });

    const store = { set: vi.fn(), evict: vi.fn() };
    await runAndPersistPipeline({ ...mockJob, retryCount: 0 } as any, emitProgress, store);

    // WHY store.evict, not store.set: runAndPersistPipeline's own
    // post-loop isSoftDeleted check must evict the deleted job from the
    // in-memory store rather than persisting a stale "done"/partial result —
    // a regression here would "resurrect" a soft-deleted job.
    expect(store.evict).toHaveBeenCalledWith(mockJob.id);
    expect(store.set).not.toHaveBeenCalled();
    expect(persistJobToDB).not.toHaveBeenCalled();
  });

  it('a job that is never marked deleted runs the full retry budget when the critic keeps rejecting', async () => {
    jobsMemory.set(mockJob.id, { id: mockJob.id, userId: 'user-1', deleted: 0 } as any);
    runCritic.mockResolvedValue({ approved: false, totalScore: 40, scores: {}, feedback: 'weak' });

    await runContentPipeline({ ...mockJob }, emitProgress);

    expect(runCritic).toHaveBeenCalledTimes(3);
  });
});
