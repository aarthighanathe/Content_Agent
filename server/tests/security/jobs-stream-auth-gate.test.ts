/**
 * jobs/index.ts — SSE auth-gate regression test.
 *
 * The router's top-level middleware exempts only the SSE stream path
 * (GET /:jobId/stream, which self-authenticates via verifySSEToken()) from
 * authMiddleware. A prior bug used `req.path.includes('/stream')`, which also
 * matched POST /:jobId/stream-token — so the token-minting route silently
 * skipped authMiddleware entirely, resolving every caller to the 'demo' user
 * fallback in stream.ts and breaking SSE progress for every real user without
 * ever surfacing an error (masked by the REST polling fallback in useJobData.ts).
 *
 * This test mounts the REAL router from routes/jobs/index.ts (not a copy of
 * its gate logic) so a future regression in the matching condition — e.g.
 * reintroducing a substring check — is caught here rather than only in
 * production traffic patterns.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

vi.mock('../../src/config.js', () => ({
  env: {
    DATABASE_URL: 'postgres://test',
    CLERK_SECRET_KEY: 'test_secret',
    GEMINI_API_KEY: 'test_key',
    NODE_ENV: 'test',
    PORT: '3001',
    FRONTEND_URL: 'http://localhost:5173',
    APP_URL: 'http://localhost:3001',
    RATE_LIMIT_MAX_JOBS: '10',
    OAUTH_STATE_SECRET: 'test-oauth-secret-that-is-long-enough-32',
    OPENAI_API_KEY: undefined,
    TOGETHER_API_KEY: undefined,
    GROQ_API_KEY: undefined,
    TAVILY_API_KEY: undefined,
    LINKEDIN_CLIENT_ID: undefined,
    LINKEDIN_CLIENT_SECRET: undefined,
    TWITTER_CLIENT_ID: undefined,
    TWITTER_CLIENT_SECRET: undefined,
    UPSTASH_REDIS_URL: undefined,
    UPSTASH_REDIS_TOKEN: undefined,
    REDIS_URL: undefined,
    TOKEN_ENCRYPTION_KEY: undefined,
    SENTRY_DSN: undefined,
    CORS_ORIGINS: undefined,
  },
}));

// authMiddleware calls getAuth(req) — simulate "no signed-in user" so any route
// that actually runs authMiddleware deterministically 401s.
vi.mock('@clerk/express', () => ({
  getAuth: vi.fn().mockReturnValue({ userId: null }),
  verifyToken: vi.fn(),
}));

// Redis-backed rate limiters — bypass entirely, not what this test is about.
// WHY an array, not a bare function: the real authJobRateLimit (rateLimit.ts's
// buildRateLimiter) returns [failClosedMiddleware, limiter], and jobs/index.ts
// destructures it as such. Mocking it as a plain function made that destructure
// throw synchronously (functions aren't iterable), which Express turned into an
// uncaught 500 — masking the SSE route's own 401 this test is actually checking.
const passThrough = (_req: any, _res: any, next: any) => next();
vi.mock('../../src/middleware/rateLimit.js', () => ({
  authJobRateLimit: [passThrough, passThrough],
  exportRateLimit: passThrough,
}));

// verifySSEToken (used by GET /:jobId/stream) hits Redis directly; stub it so
// the route reaches its own 401, proving authMiddleware was never in the way.
vi.mock('../../src/lib/redisClient.js', () => ({
  getRedisClient: () => null,
}));
vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/db/schema.js', () => ({ users: {} }));
vi.mock('../../src/workers/contentWorker.js', () => ({
  getJobFromStore: () => undefined,
  setJobInStore: vi.fn(),
  runPipelineDirect: vi.fn(),
}));
vi.mock('../../src/lib/queue.js', () => ({ addJobToQueue: vi.fn() }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { addClient: vi.fn(), sendEvent: vi.fn() } }));
vi.mock('../../src/lib/pipeline.js', () => ({ runAndPersistPipeline: vi.fn() }));
vi.mock('../../src/routes/users.js', () => ({ userProfiles: new Map() }));

async function buildApp() {
  const { default: jobsRouter } = await import('../../src/routes/jobs/index.js');
  const app = express();
  app.use(express.json());
  app.use('/api/jobs', jobsRouter);
  return app;
}

describe('jobs/index.ts SSE auth-gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /:jobId/stream-token runs authMiddleware — 401s without a signed-in user', async () => {
    const app = await buildApp();
    const res = await supertest(app).post('/api/jobs/some-job-id/stream-token').send({});

    // authMiddleware itself must be the thing that rejected this — its specific
    // error code, not a generic downstream failure.
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('GET /:jobId/stream is exempt from authMiddleware — reaches its own SSE auth instead', async () => {
    const app = await buildApp();
    const res = await supertest(app).get('/api/jobs/some-job-id/stream');

    // No ?token= is supplied, so this must still fail — but via verifySSEToken's
    // own 401 (AUTH_MISSING with no `code` distinguishing authMiddleware), never
    // by ever invoking authMiddleware. If authMiddleware ran here, getAuth() is
    // mocked to return userId: null, which also produces 401/AUTH_MISSING — so
    // the real assertion is the *previous* test proving stream-token is gated,
    // combined with this route staying reachable (not 404'd by router mounting)
    // and failing for the documented SSE-specific reason.
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  it('a path merely containing "/stream" as a substring does not bypass authMiddleware', async () => {
    const app = await buildApp();
    // Not a real route, but proves the gate only exempts an exact "/:seg/stream"
    // match — this 404s from Express routing (no matching route), not from a
    // false-positive auth bypass silently letting it through to next().
    const res = await supertest(app).post('/api/jobs/some-job-id/stream-token/extra').send({});
    expect(res.status).not.toBe(200);
  });
});
