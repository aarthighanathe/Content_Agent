/**
 * H1 durable-terminal lookup — fail closed on Neon blips.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const selectLimit = vi.fn();
const dbMock = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: selectLimit,
      })),
    })),
  })),
};

vi.mock('../../src/db/index.js', () => ({ db: dbMock }));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const JOB_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('lookupDurableTerminalStatus (H1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns terminal for done / failed / deleted rows', async () => {
    const { lookupDurableTerminalStatus } = await import(
      '../../src/lib/contentJobTerminalCheck.js'
    );
    selectLimit.mockResolvedValueOnce([{ status: 'done', deleted: 0 }]);
    expect(await lookupDurableTerminalStatus(JOB_ID)).toBe('terminal');

    selectLimit.mockResolvedValueOnce([{ status: 'failed', deleted: 0 }]);
    expect(await lookupDurableTerminalStatus(JOB_ID)).toBe('terminal');

    selectLimit.mockResolvedValueOnce([{ status: 'pending', deleted: 1 }]);
    expect(await lookupDurableTerminalStatus(JOB_ID)).toBe('terminal');
  });

  it('returns in_flight for pending non-deleted rows', async () => {
    const { lookupDurableTerminalStatus } = await import(
      '../../src/lib/contentJobTerminalCheck.js'
    );
    selectLimit.mockResolvedValueOnce([{ status: 'pending', deleted: 0 }]);
    expect(await lookupDurableTerminalStatus(JOB_ID)).toBe('in_flight');
  });

  it('returns lookup_failed when the DB query throws (fail closed)', async () => {
    const { lookupDurableTerminalStatus } = await import(
      '../../src/lib/contentJobTerminalCheck.js'
    );
    selectLimit.mockRejectedValueOnce(new Error('neon blip'));
    expect(await lookupDurableTerminalStatus(JOB_ID)).toBe('lookup_failed');
  });
});
