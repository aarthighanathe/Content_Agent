/**
 * persistJobSweeps — M2 live-pipeline guard + abandoned-job reclaim.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const LIVE_ID = '11111111-1111-4111-8111-111111111111';
const DONE_ID = '22222222-2222-4222-8222-222222222222';
const PENDING_ID = '33333333-3333-4333-8333-333333333333';
const DEAD_ID = '44444444-4444-4444-8444-444444444444';

const selectWhere = vi.fn();
const dbMock = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: selectWhere,
    })),
  })),
  update: vi.fn(),
};

vi.mock('../../src/db/index.js', () => ({ db: dbMock }));
vi.mock('../../src/lib/sse.js', () => ({
  sseManager: { sendEvent: vi.fn() },
}));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('isActivelyProcessingInMemory / sweepStaleInFlightJobs (M2)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { jobsMemory, setJobInStore } = await import('../../src/lib/jobStore.js');
    const ids = [...jobsMemory.keys(), LIVE_ID, DONE_ID, PENDING_ID, DEAD_ID];
    for (const id of ids) {
      setJobInStore(id, undefined);
    }
  });

  it('isActivelyProcessingInMemory is true for processing + stage progress', async () => {
    const { setJobInStore } = await import('../../src/lib/jobStore.js');
    const { isActivelyProcessingInMemory } = await import('../../src/lib/persistJobSweeps.js');

    setJobInStore(LIVE_ID, {
      id: LIVE_ID,
      userId: 'u1',
      topic: 't',
      platform: 'linkedin_post',
      status: 'processing',
      retryCount: 0,
      stage: 'writing',
      progress: 40,
    });

    expect(isActivelyProcessingInMemory(LIVE_ID)).toBe(true);
    expect(isActivelyProcessingInMemory('missing')).toBe(false);
  });

  it('isActivelyProcessingInMemory is false for terminal or bare pending', async () => {
    const { setJobInStore } = await import('../../src/lib/jobStore.js');
    const { isActivelyProcessingInMemory } = await import('../../src/lib/persistJobSweeps.js');

    setJobInStore(DONE_ID, {
      id: DONE_ID,
      userId: 'u1',
      topic: 't',
      platform: 'linkedin_post',
      status: 'done',
      retryCount: 0,
      outputs: [],
      logs: [],
      criticResult: null,
    });
    setJobInStore(PENDING_ID, {
      id: PENDING_ID,
      userId: 'u1',
      topic: 't',
      platform: 'linkedin_post',
      status: 'pending',
      retryCount: 0,
    });

    expect(isActivelyProcessingInMemory(DONE_ID)).toBe(false);
    expect(isActivelyProcessingInMemory(PENDING_ID)).toBe(false);
  });

  it('sweepStaleInFlightJobs skips live memory jobs and marks abandoned ones', async () => {
    const { setJobInStore } = await import('../../src/lib/jobStore.js');
    const { sseManager } = await import('../../src/lib/sse.js');
    const { sweepStaleInFlightJobs } = await import('../../src/lib/persistJobSweeps.js');

    setJobInStore(LIVE_ID, {
      id: LIVE_ID,
      userId: 'u1',
      topic: 't',
      platform: 'linkedin_post',
      status: 'processing',
      retryCount: 0,
      stage: 'writing',
      progress: 50,
    });

    selectWhere.mockResolvedValue([
      { id: LIVE_ID },
      { id: DEAD_ID },
    ]);

    const updateWhere = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: DEAD_ID }]),
    });
    dbMock.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: updateWhere,
      }),
    });

    const swept = await sweepStaleInFlightJobs(1);
    expect(swept).toBe(1);
    expect(sseManager.sendEvent).toHaveBeenCalledTimes(1);
    expect(sseManager.sendEvent).toHaveBeenCalledWith(
      DEAD_ID,
      expect.objectContaining({ stage: 'failed' }),
    );
  });
});
