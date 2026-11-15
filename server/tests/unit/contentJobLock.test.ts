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

import {
  tryAcquireRedisLock, contentRunLockKey, multiplyLockKey, isContentRunLockLost,
} from '../../src/lib/contentJobLock.js';

describe('contentJobLock', () => {
  beforeEach(() => {
    redisMock.client = { set: vi.fn(), eval: vi.fn().mockResolvedValue(1) };
  });

  it('builds namespaced keys', () => {
    expect(contentRunLockKey('abc')).toBe('content:run:abc');
    expect(multiplyLockKey('root', 'twitter')).toBe('multiply:root:twitter');
  });

  it('is unavailable without Redis', async () => {
    redisMock.client = null;
    expect(await tryAcquireRedisLock('k', 10, 1000)).toEqual({ status: 'unavailable' });
  });

  it('reports held when SET NX loses', async () => {
    redisMock.client?.set.mockResolvedValue(null);
    expect(await tryAcquireRedisLock('k', 10, 1000)).toEqual({ status: 'held' });
  });

  it('is unavailable (not thrown) when SET errors', async () => {
    redisMock.client?.set.mockRejectedValue(new Error('down'));
    expect(await tryAcquireRedisLock('k', 10, 1000)).toEqual({ status: 'unavailable' });
  });

  it('acquires and releases exactly once with compare-and-delete', async () => {
    redisMock.client?.set.mockResolvedValue('OK');
    const res = await tryAcquireRedisLock('k', 10, 1000);
    expect(res.status).toBe('acquired');
    if (res.status !== 'acquired') return;
    expect(redisMock.client?.set).toHaveBeenCalledWith('k', res.lock.token, 'EX', 10, 'NX');
    await res.lock.release();
    await res.lock.release();
    expect(redisMock.client?.eval).toHaveBeenCalledTimes(1);
  });

  it('tracks lock loss by token so a new holder is not poisoned', async () => {
    vi.useFakeTimers();
    try {
      redisMock.client?.set.mockResolvedValue('OK');
      // First renew returns 0 → mark A lost; later renews succeed for B.
      redisMock.client?.eval
        .mockResolvedValueOnce(0)
        .mockResolvedValue(1);

      const first = await tryAcquireRedisLock('content:run:job', 1, 1000);
      expect(first.status).toBe('acquired');
      if (first.status !== 'acquired') return;

      await vi.advanceTimersByTimeAsync(1000);
      expect(first.lock.isLost()).toBe(true);
      expect(first.lock.signal.aborted).toBe(true);
      expect(isContentRunLockLost(first.lock.token)).toBe(true);

      const second = await tryAcquireRedisLock('content:run:job', 1, 1000);
      expect(second.status).toBe('acquired');
      if (second.status !== 'acquired') return;

      expect(second.lock.isLost()).toBe(false);
      expect(second.lock.signal.aborted).toBe(false);
      expect(isContentRunLockLost(second.lock.token)).toBe(false);
      // WHY: A's token stays lost; B must not see A's loss via key-based lookup.
      expect(isContentRunLockLost(first.lock.token)).toBe(true);

      await first.lock.release();
      expect(isContentRunLockLost(first.lock.token)).toBe(false);
      expect(isContentRunLockLost(second.lock.token)).toBe(false);

      await second.lock.release();
    } finally {
      vi.useRealTimers();
    }
  });
});
