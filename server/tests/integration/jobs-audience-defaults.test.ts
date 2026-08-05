/**
 * routes/jobs/insights — GET /jobs/audience-defaults — Integration Tests
 *
 * Exercises the real Express router end-to-end (supertest) against a fake
 * in-memory `db` that mimics db.query.contentJobs.findMany — no live Postgres
 * is reachable in this sandbox. Covers: most-frequent-audience-per-platform
 * computation, user-scoping, and the no-DB/no-history empty-response case.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  contentJobs: { userId: 'userId', deleted: 'deleted', status: 'status', createdAt: 'createdAt', platform: 'platform' },
}));

interface FakeJobRow { userId: string; platform: string; targetAudience: string }

const jobRows = vi.hoisted(() => [] as FakeJobRow[]);
let currentUserId = '';

function resetFakeDb() {
  jobRows.length = 0;
}

const fakeDb = {
  query: {
    contentJobs: {
      findMany: async () => jobRows.filter((r) => r.userId === currentUserId),
    },
  },
};

vi.mock('../../src/db/index.js', () => ({
  get db() { return fakeDb; },
}));

const OWNER = '00000000-0000-0000-0000-0000000000a1';

async function buildApp(userId: string | undefined) {
  const { default: insightsRouter } = await import('../../src/routes/jobs/insights.js');
  currentUserId = userId || '';
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (userId) req.dbUserId = userId;
    next();
  });
  app.use('/api/jobs', insightsRouter);
  return app;
}

beforeEach(() => {
  resetFakeDb();
});

describe('GET /api/jobs/audience-defaults', () => {
  it('returns the most-frequent targetAudience per platform', async () => {
    jobRows.push(
      { userId: OWNER, platform: 'linkedin_post', targetAudience: 'B2B SaaS founders' },
      { userId: OWNER, platform: 'linkedin_post', targetAudience: 'B2B SaaS founders' },
      { userId: OWNER, platform: 'linkedin_post', targetAudience: 'marketing managers' },
      { userId: OWNER, platform: 'twitter_thread', targetAudience: 'indie hackers' },
    );
    const app = await buildApp(OWNER);
    const res = await supertest(app).get('/api/jobs/audience-defaults');
    expect(res.status).toBe(200);
    expect(res.body.audienceDefaults.linkedin_post).toBe('B2B SaaS founders');
    expect(res.body.audienceDefaults.twitter_thread).toBe('indie hackers');
  });

  it('omits platforms the user has no completed job history for', async () => {
    jobRows.push({ userId: OWNER, platform: 'linkedin_post', targetAudience: 'B2B SaaS founders' });
    const app = await buildApp(OWNER);
    const res = await supertest(app).get('/api/jobs/audience-defaults');
    expect(res.body.audienceDefaults.instagram_carousel).toBeUndefined();
  });

  it('only reflects the requesting user\'s own jobs (no cross-user leakage)', async () => {
    const OTHER = '00000000-0000-0000-0000-0000000000a2';
    jobRows.push(
      { userId: OTHER, platform: 'linkedin_post', targetAudience: 'someone else\'s audience' },
    );
    const app = await buildApp(OWNER);
    const res = await supertest(app).get('/api/jobs/audience-defaults');
    expect(res.body.audienceDefaults).toEqual({});
  });

  it('returns an empty object (200, not an error) when no dbUserId is resolved', async () => {
    const app = await buildApp(undefined);
    const res = await supertest(app).get('/api/jobs/audience-defaults');
    expect(res.status).toBe(200);
    expect(res.body.audienceDefaults).toEqual({});
  });

  it('ignores blank/whitespace-only targetAudience values', async () => {
    jobRows.push(
      { userId: OWNER, platform: 'video_script', targetAudience: '   ' },
      { userId: OWNER, platform: 'video_script', targetAudience: 'gen z creators' },
    );
    const app = await buildApp(OWNER);
    const res = await supertest(app).get('/api/jobs/audience-defaults');
    expect(res.body.audienceDefaults.video_script).toBe('gen z creators');
  });
});
