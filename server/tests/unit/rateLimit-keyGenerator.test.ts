/**
 * middleware/rateLimit.ts — keyGenerator regression test.
 *
 * Prior bug: every rate limiter's keyGenerator called `ipKeyGenerator(req as
 * any)` — passing the whole Express Request object where
 * ipKeyGenerator(ip: string, ...) expects an IP address string.
 * net.isIPv6() on a non-string returns false, so the real implementation fell
 * through to `return ip` and handed back the Request object itself as the
 * rate-limit key, not an actual IP. This was masked for every authenticated
 * request (userId/dbUserId wins the `||` chain first) and only manifested for
 * unauthenticated requests — exactly the case a rate limiter most needs to
 * get right, and exactly the case this test exercises.
 *
 * WHY spy on the real ipKeyGenerator (not mock it away): the bug was about
 * what ARGUMENT gets passed to it, not its own logic — mocking it out would
 * hide exactly the thing being tested. getRedisClient is mocked to null so
 * makeStore() falls back to express-rate-limit's synchronous in-process
 * MemoryStore, keeping this test fast and dependency-free.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// WHY importOriginal + a wrapping spy (not vi.spyOn on the namespace directly):
// ESM module namespaces are read-only/non-configurable, so vi.spyOn() on an
// imported namespace object throws "Cannot redefine property" — the standard
// Vitest workaround is to mock the module and re-export the real
// implementation wrapped in a vi.fn() so calls are still observable.
const ipKeyGeneratorSpy = vi.hoisted(() => vi.fn());
vi.mock('express-rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('express-rate-limit')>();
  return {
    ...actual,
    ipKeyGenerator: (...args: Parameters<typeof actual.ipKeyGenerator>) => {
      ipKeyGeneratorSpy(...args);
      return actual.ipKeyGenerator(...args);
    },
  };
});

// WHY a fake client, not null: failClosedMiddleware (added since this test was
// written) rejects with 503 before the real limiter/keyGenerator ever runs
// when getRedisClient() is falsy. A minimal stub satisfies both
// failClosedMiddleware's truthiness check and makeStore()'s call-binding at
// module load time, letting the request reach the real ipKeyGenerator.
const fakeRedisClient = vi.hoisted(() => ({
  call: vi.fn().mockResolvedValue(0),
}));
vi.mock('../../src/lib/redisClient.js', () => ({ getRedisClient: () => fakeRedisClient }));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../src/config.js', () => ({
  env: { RATE_LIMIT_MAX_JOBS: '10' },
}));

describe('rate limiter keyGenerator — ipKeyGenerator argument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the real ipKeyGenerator with a string (req.ip), never the Request object, for an unauthenticated request', async () => {
    const { demoJobRateLimit } = await import('../../src/middleware/rateLimit.js');

    // WHY POST, not GET: demoJobRateLimit's own `skip: (req) => req.method ===
    // 'GET'` means keyGenerator never runs at all for a GET request — POST is
    // required to actually exercise the keyGenerator this test is about.
    const app = express();
    app.post('/test', demoJobRateLimit, (_req, res) => res.json({ ok: true }));

    await supertest(app).post('/test').send({});

    expect(ipKeyGeneratorSpy).toHaveBeenCalled();
    const calledWith = ipKeyGeneratorSpy.mock.calls[0][0];
    // The core regression check: it must be a string (an IP), never an object
    // (which is what `req as any` used to pass).
    expect(typeof calledWith).toBe('string');
    expect(calledWith).not.toBe('[object Object]');
  });

  it('authJobRateLimit also passes a string to ipKeyGenerator when userId/dbUserId are both absent', async () => {
    const { authJobRateLimit } = await import('../../src/middleware/rateLimit.js');

    const app = express();
    // No auth middleware here — req.userId/req.dbUserId are undefined,
    // forcing the keyGenerator's `||` chain down to the ipKeyGenerator branch
    // (the exact path the original bug only manifested on).
    app.post('/test', authJobRateLimit, (_req, res) => res.json({ ok: true }));

    await supertest(app).post('/test').send({});

    expect(ipKeyGeneratorSpy).toHaveBeenCalled();
    const calledWith = ipKeyGeneratorSpy.mock.calls[0][0];
    expect(typeof calledWith).toBe('string');
  });
});
