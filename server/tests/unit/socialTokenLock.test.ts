import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisMock = vi.hoisted(() => ({
  client: null as null | { set: ReturnType<typeof vi.fn>; eval: ReturnType<typeof vi.fn> },
}));

vi.mock('../../src/lib/redisClient.js', () => ({
  getRedisClient: () => redisMock.client,
}));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { tryAcquireSocialTokenLock } from '../../src/lib/socialTokenLock.js';

describe('socialTokenLock', () => {
  beforeEach(() => {
    redisMock.client = { set: vi.fn(), eval: vi.fn().mockResolvedValue(1) };
  });

  it('uses the local lock only when Redis is not configured', async () => {
    redisMock.client = null;
    const first = await tryAcquireSocialTokenLock('user-local', 'twitter');
    const second = await tryAcquireSocialTokenLock('user-local', 'twitter');
    expect(first.status).toBe('acquired');
    expect(second).toEqual({ status: 'held' });
    if (first.status !== 'acquired') return;
    await first.lock.release();
    const third = await tryAcquireSocialTokenLock('user-local', 'twitter');
    expect(third.status).toBe('acquired');
  });

  it('reports held when SET NX loses', async () => {
    redisMock.client?.set.mockResolvedValue(null);
    expect(await tryAcquireSocialTokenLock('user-held', 'twitter')).toEqual({ status: 'held' });
  });

  it('fails closed when Redis SET throws — does not take the local lock', async () => {
    redisMock.client?.set.mockRejectedValue(new Error('down'));
    expect(await tryAcquireSocialTokenLock('user-down', 'twitter')).toEqual({ status: 'unavailable' });
    expect(await tryAcquireSocialTokenLock('user-down', 'twitter')).toEqual({ status: 'unavailable' });
  });

  it('acquires and releases with compare-and-delete', async () => {
    redisMock.client?.set.mockResolvedValue('OK');
    const res = await tryAcquireSocialTokenLock('user-ok', 'twitter');
    expect(res.status).toBe('acquired');
    if (res.status !== 'acquired') return;
    await res.lock.release();
    expect(redisMock.client?.eval).toHaveBeenCalledTimes(1);
  });
});
