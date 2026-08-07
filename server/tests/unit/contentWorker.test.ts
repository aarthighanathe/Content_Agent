/**
 * workers/contentWorker.ts — processContentJob unit tests (real module).
 *
 * WHY this suite exists: contentWorker.ts was entirely excluded from the
 * vitest coverage config and had zero test files referencing it — the review
 * flagged malformed-BullMQ-payload handling and emitProgress's read-through
 * merge (itself a fix for a prior "status:done with no outputs forever" bug)
 * as untested branches. This imports the real processContentJob and drives it
 * with a minimal { data } stand-in for BullMQ's Job, mocking only
 * runAndPersistPipeline/sseManager/the job store — the actual dependencies
 * processContentJob touches.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';

const runAndPersistPipeline = vi.fn();
const sendEvent = vi.fn();

// WHY mocked: contentWorker.ts imports createRedisConnection from lib/queue.js
// at module load time, which pulls in config.ts's env schema validation — none
// of that machinery is exercised by processContentJob's own logic (payload
// narrowing, emitProgress merge, error swallowing), so it's stubbed out the
// same way tests/unit/ai-abort-on-timeout.test.ts stubs config.js.
vi.mock('../../src/config.js', () => ({
  env: { UPSTASH_REDIS_URL: undefined, REDIS_URL: undefined, NODE_ENV: 'test' },
}));
vi.mock('../../src/lib/queue.js', () => ({ createRedisConnection: vi.fn() }));
vi.mock('../../src/lib/pipeline.js', () => ({
  runAndPersistPipeline: (...args: unknown[]) => runAndPersistPipeline(...args),
}));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: (...args: unknown[]) => sendEvent(...args) } }));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function makeJob(data: unknown): Job {
  return { data } as Job;
}

describe('processContentJob (real module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runAndPersistPipeline.mockResolvedValue(undefined);
  });

  it('narrows a well-formed job.data payload and forwards it to runAndPersistPipeline', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await processContentJob(makeJob({
      jobId: 'job-1', userId: 'user-1', topic: 'AI trends', platform: 'linkedin_post',
      tone: 'professional', targetAudience: 'marketers',
    }));

    expect(runAndPersistPipeline).toHaveBeenCalledTimes(1);
    const [jobArg] = runAndPersistPipeline.mock.calls[0];
    expect(jobArg).toMatchObject({
      id: 'job-1', userId: 'user-1', topic: 'AI trends', platform: 'linkedin_post',
      tone: 'professional', targetAudience: 'marketers', status: 'pending', retryCount: 0,
    });
  });

  it('a malformed job.data (not an object) is handled without throwing — fields default to empty strings', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await expect(processContentJob(makeJob('not-an-object'))).resolves.toBeUndefined();

    const [jobArg] = runAndPersistPipeline.mock.calls[0];
    expect(jobArg).toMatchObject({ id: '', userId: '', topic: '', platform: '' });
  });

  it('a malformed job.data (null) is handled without throwing', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await expect(processContentJob(makeJob(null))).resolves.toBeUndefined();
    expect(runAndPersistPipeline).toHaveBeenCalledTimes(1);
  });

  it('non-string fields in job.data (e.g. a number where topic should be) are dropped, not passed through', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await processContentJob(makeJob({ jobId: 'job-2', topic: 12345, platform: { nested: true } }));

    const [jobArg] = runAndPersistPipeline.mock.calls[0];
    expect(jobArg.topic).toBe('');
    expect(jobArg.platform).toBe('');
    expect(jobArg.id).toBe('job-2');
  });

  it('emits a "Job picked up by worker" progress event immediately, before the pipeline runs', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await processContentJob(makeJob({ jobId: 'job-3' }));

    expect(sendEvent).toHaveBeenCalledWith('job-3', expect.objectContaining({
      type: 'progress', stage: 'planning', message: expect.stringContaining('picked up'),
    }));
  });

  it('emitProgress merges onto the current store snapshot instead of overwriting it', async () => {
    const { processContentJob, setJobInStore, getJobFromStore } = await import('../../src/workers/contentWorker.js');

    // Simulate a richer snapshot already in the store (e.g. one with `outputs`
    // attached by a previous emitProgress call or a partial persist) before
    // the pipeline's own emitProgress call fires again.
    setJobInStore('job-4', {
      id: 'job-4', userId: 'u', topic: 't', platform: 'linkedin_post',
      status: 'processing', retryCount: 0,
      outputs: [{ agentName: 'writer', outputType: 'draft', content: {} }],
    } as never);

    // Capture the emitProgress function the worker passes to runAndPersistPipeline
    // and invoke it directly, the way the real pipeline would mid-run.
    runAndPersistPipeline.mockImplementationOnce(async (_job, emitProgress) => {
      emitProgress('writing', 50, 'writer', 'Drafting…');
    });

    await processContentJob(makeJob({ jobId: 'job-4', userId: 'u', topic: 't', platform: 'linkedin_post' }));

    const stored = getJobFromStore('job-4') as unknown as { outputs: unknown[]; stage: string; progress: number };
    // WHY this matters: a regression here would silently drop `outputs` off
    // the stored snapshot, reproducing the "status:done with no outputs
    // forever" bug this merge pattern was written to fix.
    expect(stored.outputs).toHaveLength(1);
    expect(stored.stage).toBe('writing');
    expect(stored.progress).toBe(50);
  });

  it('a pipeline failure is swallowed, not rethrown (runAndPersistPipeline already persisted "failed" + emitted the terminal SSE event)', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    runAndPersistPipeline.mockRejectedValueOnce(new Error('pipeline exploded'));

    await expect(processContentJob(makeJob({ jobId: 'job-5' }))).resolves.toBeUndefined();
  });
});
