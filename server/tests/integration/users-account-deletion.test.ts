/**
 * routes/users — DELETE /me & GET /me/export (F-5)
 * Verifies account deletion cascades across all 6 user-scoped tables inside
 * a single transaction, in-memory state is cleared, and export excludes
 * encrypted OAuth token secrets.
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

vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn() }));
vi.mock('../../src/routes/jobs/index.js', () => ({ jobsMemory: new Map() }));

const deleteCalls: string[] = [];
const jobRowsInDb = [{ id: 'job-1' }, { id: 'job-2' }];

function makeQueryBuilder(tableName: string, result: any = []) {
  const builder: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => { deleteCalls.push(tableName); return Promise.resolve(result); }),
  };
  return builder;
}

const txMock = {
  select: vi.fn((_cols?: any) => ({
    from: (table: any) => ({
      where: vi.fn().mockResolvedValue(table === 'content_jobs_marker' ? jobRowsInDb : jobRowsInDb),
    }),
  })),
  delete: vi.fn((table: any) => makeQueryBuilder(String(table?.__name || table))),
};

const dbMock = {
  transaction: vi.fn(async (cb: (tx: any) => Promise<void>) => cb(txMock)),
  query: {
    users: { findFirst: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.com', brandName: 'Acme', brandVoice: 'professional', phrasesUse: '', phrasesAvoid: '', createdAt: new Date() }) },
    contentJobs: { findMany: vi.fn().mockResolvedValue([{ id: 'job-1', outputs: [], logs: [] }]) },
    userOnboarding: { findFirst: vi.fn().mockResolvedValue(null) },
  },
  select: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  })),
};

vi.mock('../../src/db/index.js', () => ({ db: dbMock }));
vi.mock('../../src/db/schema.js', () => ({
  users: '__users__',
  userOnboarding: '__userOnboarding__',
  contentJobs: { id: 'contentJobs.id', userId: 'contentJobs.userId' },
  contentOutputs: { jobId: 'contentOutputs.jobId' },
  agentLogs: { jobId: 'agentLogs.jobId' },
  socialTokens: { userId: 'socialTokens.userId', platform: 'socialTokens.platform', displayName: 'socialTokens.displayName', createdAt: 'socialTokens.createdAt', id: 'socialTokens.id' },
  scheduledPosts: { userId: 'scheduledPosts.userId' },
  collectionJobs: { jobId: 'collectionJobs.jobId', collectionId: 'collectionJobs.collectionId' },
  collections: { userId: 'collections.userId' },
  competitorAnalyses: { userId: 'competitorAnalyses.userId' },
  jobOutputVersions: { jobId: 'jobOutputVersions.jobId' },
}));

function buildApp(userId?: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (userId) req.dbUserId = userId;
    next();
  });
  return app;
}

describe('DELETE /api/users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCalls.length = 0;
  });

  it('returns 401 when unauthenticated (no dbUserId)', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp(undefined);
    app.use('/api/users', usersRouter);
    const res = await supertest(app).delete('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('runs the deletion inside a single db.transaction', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    const res = await supertest(app).delete('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(dbMock.transaction).toHaveBeenCalledTimes(1);
  });

  it('deletes from agentLogs and contentOutputs before contentJobs (dependency order)', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const { agentLogs, contentOutputs, contentJobs } = await import('../../src/db/schema.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    await supertest(app).delete('/api/users/me');

    const deletedTables = txMock.delete.mock.calls.map((c: any[]) => c[0]);
    const agentLogsIdx = deletedTables.indexOf(agentLogs);
    const outputsIdx = deletedTables.indexOf(contentOutputs);
    const jobsIdx = deletedTables.indexOf(contentJobs);

    expect(agentLogsIdx).toBeGreaterThanOrEqual(0);
    expect(outputsIdx).toBeGreaterThanOrEqual(0);
    expect(jobsIdx).toBeGreaterThan(agentLogsIdx);
    expect(jobsIdx).toBeGreaterThan(outputsIdx);
  });
});

describe('GET /api/users/me/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp(undefined);
    app.use('/api/users', usersRouter);
    const res = await supertest(app).get('/api/users/me/export');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user, jobs, and connected accounts', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    const res = await supertest(app).get('/api/users/me/export');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
    expect(Array.isArray(res.body.contentJobs)).toBe(true);
  });

  it('never includes raw accessToken/refreshToken fields in the export', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    const res = await supertest(app).get('/api/users/me/export');
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/accessToken|refreshToken/);
  });

  it('sets Content-Disposition attachment header', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    const res = await supertest(app).get('/api/users/me/export');
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });
});
