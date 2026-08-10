/**
 * middleware/rateLimit.ts — real 429/503 enforcement tests.
 *
 * WHY this suite exists: rateLimit-keyGenerator.test.ts only asserts the
 * ARGUMENT passed to ipKeyGenerator is a string — it stubs Redis with a fake
 * client whose `.call()` always resolves `0` (i.e. "not rate limited yet"),
 * so the limiter's actual counting/threshold/429-response logic never fires
 * in that test. This suite implements a minimal in-memory fake Redis client
 * that actually honors rate-limit-redis's real protocol (SCRIPT LOAD +
 * EVALSHA of its increment Lua script, returning [totalHits, ttl]), so the
 * real counting logic runs end-to-end — a regression that breaks max
 * enforcement, or that makes failClosedMiddleware fall through to next()
 * instead of rejecting when Redis is down, would be caught here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../src/config.js', () => ({
  env: { RATE_LIMIT_MAX_JOBS: '10' },
}));

// WHY a real (if minimal) implementation of the increment script's contract,
// not a stub that always returns a fixed count: rate-limit-redis calls
// `SCRIPT LOAD` once, then `EVALSHA <sha> 1 <key> <resetOnChange> <windowMs>`
// on every request — an in-memory Map keyed by the rate-limit key gives each
// distinct client (userId/IP) its own real, incrementing counter, exactly
// like production Redis would, without needing an actual Redis server in CI.
function createFakeRedisClient() {
  const hitCounts = new Map<string, number>();
  const SCRIPT_SHA = 'fake-increment-script-sha';

  return {
    hitCounts,
    call: vi.fn(async (...args: string[]) => {
      const [cmd] = args;
      if (cmd === 'SCRIPT' && args[1] === 'LOAD') {
        return SCRIPT_SHA;
      }
      if (cmd === 'EVALSHA' && args[1] === SCRIPT_SHA) {
        const key = args[3];
        const nextCount = (hitCounts.get(key) || 0) + 1;
        hitCounts.set(key, nextCount);
        return [nextCount, 60_000];
      }
      throw new Error(`Unexpected command in fake Redis client: ${args.join(' ')}`);
    }),
  };
}

describe('rate limiter — real 429 enforcement', () => {
  it('the (max+1)th request from the same key gets 429 with the documented error shape', async () => {
    const fakeClient = createFakeRedisClient();
    vi.doMock('../../src/lib/redisClient.js', () => ({ getRedisClient: () => fakeClient }));
    vi.resetModules();

    const { exportRateLimit } = await import('../../src/middleware/rateLimit.js');
    const app = express();
    app.post('/test', exportRateLimit, (_req, res) => res.json({ ok: true }));

    // exportRateLimit's max is small enough to exhaust quickly — read it
    // indirectly by firing requests until the first 429, rather than hardcoding
    // the configured max (which could legitimately change without this test
    // needing to track the exact number).
    let lastStatus = 200;
    let lastBody: Record<string, unknown> = {};
    for (let i = 0; i < 50 && lastStatus !== 429; i++) {
      const res = await supertest(app).post('/test').send({});
      lastStatus = res.status;
      lastBody = res.body;
    }

    expect(lastStatus).toBe(429);
    expect(lastBody).toMatchObject({ code: 'RATE_LIMITED', retryable: false });
    expect(typeof lastBody.error).toBe('string');
    // Regression coverage for AUDIT_FINDINGS_2026-08-10.md #19 (TESTING_PROMPT,
    // High): the client's countdown UI (Create/errorMessages.ts) was already
    // built to consume this field but the server never sent it — the 429
    // handler now reads req.rateLimit.resetTime (populated by express-rate-limit
    // itself before the handler runs) to compute it.
    expect(typeof lastBody.retryAfterMs).toBe('number');
    expect(lastBody.retryAfterMs as number).toBeGreaterThanOrEqual(0);
  });

  it('requests from a different key are not affected by another key exhausting its limit', async () => {
    const fakeClient = createFakeRedisClient();
    vi.doMock('../../src/lib/redisClient.js', () => ({ getRedisClient: () => fakeClient }));
    vi.resetModules();

    const { exportRateLimit } = await import('../../src/middleware/rateLimit.js');
    const app = express();
    app.post('/test', (req: express.Request & { userId?: string }, res, next) => {
      req.userId = req.header('x-user-id') || undefined;
      next();
    }, exportRateLimit, (_req, res) => res.json({ ok: true }));

    // Exhaust user-A's limit.
    let statusA = 200;
    for (let i = 0; i < 50 && statusA !== 429; i++) {
      const res = await supertest(app).post('/test').set('x-user-id', 'user-A').send({});
      statusA = res.status;
    }
    expect(statusA).toBe(429);

    // user-B, a distinct rate-limit key, should still succeed.
    const resB = await supertest(app).post('/test').set('x-user-id', 'user-B').send({});
    expect(resB.status).toBe(200);
  });

  it('failClosedMiddleware rejects with 503 RATE_LIMITER_UNAVAILABLE when Redis is down, rather than silently falling through to an in-memory limiter', async () => {
    vi.doMock('../../src/lib/redisClient.js', () => ({ getRedisClient: () => null }));
    vi.resetModules();

    const { exportRateLimit } = await import('../../src/middleware/rateLimit.js');
    const app = express();
    app.post('/test', exportRateLimit, (_req, res) => res.json({ ok: true }));

    const res = await supertest(app).post('/test').send({});

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      code: 'RATE_LIMITER_UNAVAILABLE',
      retryable: true,
    });
  });

  it('the skip: GET bypass means GET requests never hit the counting logic at all, even past what would otherwise be the limit', async () => {
    const fakeClient = createFakeRedisClient();
    vi.doMock('../../src/lib/redisClient.js', () => ({ getRedisClient: () => fakeClient }));
    vi.resetModules();

    const { contentRateLimit } = await import('../../src/middleware/rateLimit.js');
    const app = express();
    app.get('/test', contentRateLimit, (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 40; i++) {
      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    }
    // No EVALSHA calls should have been made for any GET request.
    const evalCalls = fakeClient.call.mock.calls.filter((c) => c[0] === 'EVALSHA');
    expect(evalCalls.length).toBe(0);
  });
});
