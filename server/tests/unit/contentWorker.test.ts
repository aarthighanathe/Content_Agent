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
const loggerWarn = vi.fn();

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
  logger: { info: vi.fn(), warn: (...args: unknown[]) => loggerWarn(...args), error: vi.fn() },
}));
// WHY db null: H1 terminal-status lookup is skipped so unit tests focus on
// payload validation + emitProgress without a Neon connection.
vi.mock('../../src/db/index.js', () => ({ db: null }));

const VALID_JOB_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const VALID_USER_ID = '11111111-2222-3333-4444-555555555555';

function makeJob(data: unknown): Job {
  return { data, id: 'bull-1' } as Job;
}

describe('processContentJob (real module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runAndPersistPipeline.mockResolvedValue(undefined);
  });

  it('narrows a well-formed job.data payload and forwards it to runAndPersistPipeline', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await processContentJob(makeJob({
      jobId: VALID_JOB_ID, userId: VALID_USER_ID, topic: 'AI trends', platform: 'linkedin_post',
      tone: 'professional', targetAudience: 'marketers',
    }));

    expect(runAndPersistPipeline).toHaveBeenCalledTimes(1);
    const [jobArg] = runAndPersistPipeline.mock.calls[0];
    expect(jobArg).toMatchObject({
      id: VALID_JOB_ID, userId: VALID_USER_ID, topic: 'AI trends', platform: 'linkedin_post',
      tone: 'professional', targetAudience: 'marketers', status: 'pending', retryCount: 0,
    });
  });

  it('rejects a malformed job.data (not an object) without running the pipeline (M8)', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await expect(processContentJob(makeJob('not-an-object'))).resolves.toBeUndefined();
    expect(runAndPersistPipeline).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalled();
  });

  it('rejects a malformed job.data (null) without running the pipeline (M8)', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await expect(processContentJob(makeJob(null))).resolves.toBeUndefined();
    expect(runAndPersistPipeline).not.toHaveBeenCalled();
  });

  it('rejects non-UUID jobId / missing required fields without running the pipeline (M8)', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await processContentJob(makeJob({ jobId: 'job-2', topic: 12345, platform: { nested: true } }));
    expect(runAndPersistPipeline).not.toHaveBeenCalled();
  });

  it('emits a "Job picked up by worker" progress event immediately, before the pipeline runs', async () => {
    const { processContentJob } = await import('../../src/workers/contentWorker.js');
    await processContentJob(makeJob({
      jobId: VALID_JOB_ID, userId: VALID_USER_ID, topic: 't', platform: 'linkedin_post',
    }));

    expect(sendEvent).toHaveBeenCalledWith(VALID_JOB_ID, expect.objectContaining({
      type: 'progress', stage: 'planning', message: expect.stringContaining('picked up'),
    }));
  });

  it('emitProgress merges onto the current store snapshot instead of overwriting it', async () => {
    const { processContentJob, setJobInStore, getJobFromStore } = await import('../../src/workers/contentWorker.js');

    // Simulate a richer snapshot already in the store (e.g. one with `outputs`
    // attached by a previous emitProgress call or a partial persist) before
    // the pipeline's own emitProgress call fires again.
    setJobInStore(VALID_JOB_ID, {
      id: VALID_JOB_ID, userId: VALID_USER_ID, topic: 't', platform: 'linkedin_post',
      status: 'processing', retryCount: 0,
      outputs: [{ agentName: 'writer', outputType: 'draft', content: {} }],
    } as never);

    // Capture the emitProgress function the worker passes to runAndPersistPipeline
    // and invoke it directly, the way the real pipeline would mid-run.
    runAndPersistPipeline.mockImplementationOnce(async (_job, emitProgress) => {
      emitProgress('writing', 50, 'writer', 'Drafting…');
    });

    await processContentJob(makeJob({
      jobId: VALID_JOB_ID, userId: VALID_USER_ID, topic: 't', platform: 'linkedin_post',
    }));

    const stored = getJobFromStore(VALID_JOB_ID) as unknown as {
      outputs: unknown[];
      stage: string;
      progress: number;
    };
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

    await expect(processContentJob(makeJob({
      jobId: VALID_JOB_ID, userId: VALID_USER_ID, topic: 't', platform: 'linkedin_post',
    }))).resolves.toBeUndefined();
  });
});
