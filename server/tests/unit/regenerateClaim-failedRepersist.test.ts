/**
 * regenerateClaim — memory-failed + DB pending must not 409 forever;
 * Adapt sibling check must not treat memory-failed as generating.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const JOB_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const USER_ID = '11111111-2222-3333-4444-555555555555';

const returning = vi.fn();
const updateWhere = vi.fn(() => ({ returning }));
const dbMock = {
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: updateWhere,
    })),
  })),
};

const markJobFailedIfInFlight = vi.fn();

vi.mock('../../src/db/index.js', () => ({ db: dbMock }));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../src/lib/persistJobSweeps.js', () => ({
  markJobFailedIfInFlight: (...args: unknown[]) => markJobFailedIfInFlight(...args),
}));

describe('claimJobForRegenerate + isSiblingActivelyGenerating (failed-repersist)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { setJobInStore, jobsMemory } = await import('../../src/lib/jobStore.js');
    for (const id of [...jobsMemory.keys(), JOB_ID]) {
      setJobInStore(id, undefined);
    }
  });

  it('reclaims after syncing memory-failed onto a still-pending DB row', async () => {
    const { setJobInStore } = await import('../../src/lib/jobStore.js');
    const { claimJobForRegenerate } = await import('../../src/lib/regenerateClaim.js');

    setJobInStore(JOB_ID, {
      id: JOB_ID,
      userId: USER_ID,
      topic: 't',
      platform: 'linkedin_post',
      status: 'failed',
      retryCount: 0,
      outputs: [],
      logs: [],
      criticResult: null,
    });

    // First claim: 0 rows (DB still pending). Second claim after mark: success.
    returning
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: JOB_ID }]);
    markJobFailedIfInFlight.mockResolvedValueOnce(true);

    await expect(claimJobForRegenerate(JOB_ID, USER_ID)).resolves.toBe('claimed');
    expect(markJobFailedIfInFlight).toHaveBeenCalledWith(
      JOB_ID,
      expect.stringContaining('memory-failed'),
    );
    expect(returning).toHaveBeenCalledTimes(2);
  });

  it('isSiblingActivelyGenerating is false when memory holds failed', async () => {
    const { setJobInStore } = await import('../../src/lib/jobStore.js');
    const { isSiblingActivelyGenerating } = await import('../../src/lib/regenerateClaim.js');

    setJobInStore(JOB_ID, {
      id: JOB_ID,
      userId: USER_ID,
      topic: 't',
      platform: 'twitter',
      status: 'failed',
      retryCount: 0,
      outputs: [],
      logs: [],
      criticResult: null,
    });

    expect(isSiblingActivelyGenerating(JOB_ID, 'pending')).toBe(false);
  });

  it('isSiblingActivelyGenerating is true for pending with no memory-failed', async () => {
    const { isSiblingActivelyGenerating } = await import('../../src/lib/regenerateClaim.js');
    expect(isSiblingActivelyGenerating(JOB_ID, 'pending')).toBe(true);
  });
});
