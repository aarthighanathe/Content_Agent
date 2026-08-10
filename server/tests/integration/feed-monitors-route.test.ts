/**
 * routes/feedMonitors — Integration Tests
 *
 * Regression coverage for AUDIT_FINDINGS_2026-08-10.md #2 (bug-hunt, High):
 * every route in this file used to hang with zero response ever sent when
 * `db` was unavailable, because the old local `requireUserId()` guard never
 * checked `db` at all (`if (!userId || !db) return;` silently no-op'd).
 * The fix replaced it with the shared `requireDbUser()` (also used by
 * scheduledPosts.ts/collections.ts) which writes a real 503 response, and
 * added the `isValidUUID(:id)` pre-check those two files already had.
 *
 * This file previously had zero test coverage (angle-08 finding).
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

vi.mock('../../src/db/schema.js', () => ({
  feedMonitors: { id: 'feedMonitors.id', userId: 'feedMonitors.userId', active: 'feedMonitors.active' },
}));

vi.mock('../../src/middleware/rateLimit.js', () => ({
  contentRateLimit: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/workers/feedMonitorWorker.js', () => ({
  checkFeedMonitor: vi.fn().mockResolvedValue(undefined),
}));

interface FakeRow { id: string; userId: string; feedUrl: string; platform: string; tone: string; targetAudience: string; active: boolean }

const rows = vi.hoisted(() => [] as FakeRow[]);

const USER_ID = '22222222-2222-2222-2222-222222222222';

function resetFakeDb() {
  rows.length = 0;
  rows.push({ id: '11111111-1111-1111-1111-111111111111', userId: USER_ID, feedUrl: 'https://example.com/feed.xml', platform: 'linkedin', tone: 'professional', targetAudience: 'devs', active: true });
}

const fakeDb = {
  select: () => ({
    from: (_table: unknown) => ({
      where: async (_cond: unknown) => rows,
    }),
  }),
};

// WHY a module-level flag: each test controls whether `db` resolves to the
// fake db or null, to exercise both the happy path and the DB-unavailable
// path this regression targets.
let dbAvailable = true;
vi.mock('../../src/db/index.js', () => ({
  get db() { return dbAvailable ? fakeDb : null; },
}));

async function buildApp(userId: string | undefined) {
  const { default: feedMonitorsRouter } = await import('../../src/routes/feedMonitors.js');
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (userId) req.dbUserId = userId;
    next();
  });
  app.use('/api/feed-monitors', feedMonitorsRouter);
  return app;
}

beforeEach(() => {
  resetFakeDb();
  dbAvailable = true;
  vi.clearAllMocks();
});

describe('GET /api/feed-monitors', () => {
  it('returns 503 DB_UNAVAILABLE (not a hang) when db is unavailable', async () => {
    dbAvailable = false;
    const app = await buildApp(USER_ID);
    const res = await supertest(app).get('/api/feed-monitors');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  it('returns 503 DB_UNAVAILABLE when there is no dbUserId', async () => {
    const app = await buildApp(undefined);
    const res = await supertest(app).get('/api/feed-monitors');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  it('lists this user\'s monitors when db is available', async () => {
    const app = await buildApp(USER_ID);
    const res = await supertest(app).get('/api/feed-monitors');
    expect(res.status).toBe(200);
    expect(res.body.monitors).toHaveLength(1);
  });
});

describe(':id-scoped routes', () => {
  it('PATCH rejects a non-UUID id with 400 before touching the db', async () => {
    const app = await buildApp(USER_ID);
    const res = await supertest(app).patch('/api/feed-monitors/not-a-uuid').send({ active: false });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('DELETE rejects a non-UUID id with 400', async () => {
    const app = await buildApp(USER_ID);
    const res = await supertest(app).delete('/api/feed-monitors/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /:id/check rejects a non-UUID id with 400', async () => {
    const app = await buildApp(USER_ID);
    const res = await supertest(app).post('/api/feed-monitors/not-a-uuid/check');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /:id/check returns 503 (not a hang) when db is unavailable, before rate-limit/UUID checks matter', async () => {
    dbAvailable = false;
    const app = await buildApp(USER_ID);
    const res = await supertest(app).post('/api/feed-monitors/11111111-1111-1111-1111-111111111111/check');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });
});
