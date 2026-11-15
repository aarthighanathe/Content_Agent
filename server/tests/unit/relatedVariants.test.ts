/**
 * collectRelatedVariants — BFS must fail closed (no partial family → Adapt dup).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const selectWhere = vi.fn();
const dbMock = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: selectWhere,
    })),
  })),
};

vi.mock('../../src/db/index.js', () => ({ db: dbMock }));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  default: { captureException: vi.fn() },
}));
vi.mock('../../src/routes/jobs/ownership.js', () => ({
  lookupOwnedJob: vi.fn().mockResolvedValue(null),
  requireJobOwnership: vi.fn(),
  requireAuthUserId: vi.fn(),
}));

const ROOT_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

describe('collectRelatedVariants BFS fail-closed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the descendant BFS query throws', async () => {
    selectWhere.mockRejectedValueOnce(new Error('db walk failed'));
    const { collectRelatedVariants } = await import('../../src/routes/jobs/related.js');
    const result = await collectRelatedVariants(
      {
        id: ROOT_ID,
        userId: USER_ID,
        topic: 't',
        platform: 'linkedin_post',
        status: 'done',
        sourceJobId: null,
        retryCount: 0,
      } as never,
      USER_ID,
    );
    expect(result).toBeNull();
  });

  it('returns the family when BFS succeeds', async () => {
    selectWhere.mockResolvedValueOnce([]);
    const { collectRelatedVariants } = await import('../../src/routes/jobs/related.js');
    const result = await collectRelatedVariants(
      {
        id: ROOT_ID,
        userId: USER_ID,
        topic: 't',
        platform: 'linkedin_post',
        status: 'done',
        sourceJobId: null,
        retryCount: 0,
      } as never,
      USER_ID,
    );
    expect(result).not.toBeNull();
    expect(result?.rootJobId).toBe(ROOT_ID);
    expect(result?.variants.some((v) => v.jobId === ROOT_ID)).toBe(true);
  });
});
