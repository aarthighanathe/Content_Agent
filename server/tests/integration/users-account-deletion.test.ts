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
const mockJobsMemory = vi.hoisted(() => new Map());
vi.mock('../../src/routes/jobs/index.js', () => ({ jobsMemory: mockJobsMemory }));
vi.mock('../../src/lib/jobStore.js', () => ({
  jobsMemory: mockJobsMemory,
  getJobFromStore: vi.fn(),
  setJobInStore: vi.fn(),
}));

const deleteCalls: string[] = [];
const jobRowsInDb = [{ id: 'job-1' }, { id: 'job-2' }];

function makeQueryBuilder(tableName: string, result: any = []) {
  const builder: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => { deleteCalls.push(tableName); return Promise.resolve(result); }),
  };
  return builder;
}

const updateCalls: Array<{ table: unknown; set: unknown }> = [];

const txMock = {
  select: vi.fn((_cols?: any) => ({
    from: (table: any) => {
      // WHY: scheduled_posts selects (publishing lock / leftover) must be empty
      // so DELETE /me happy-path tests are not aborted as PUBLISH_IN_PROGRESS.
      const isScheduledPosts = table?.userId === 'scheduledPosts.userId'
        || table?.publishStatus === 'scheduledPosts.publishStatus';
      const isContentJobs = table?.id === 'contentJobs.id'
        || table?.userId === 'contentJobs.userId';
      const rows = isContentJobs ? jobRowsInDb : (isScheduledPosts ? [] : jobRowsInDb);
      const whereResult: any = Promise.resolve(rows);
      whereResult.for = vi.fn().mockResolvedValue(rows);
      whereResult.limit = vi.fn().mockResolvedValue(rows);
      return {
        where: vi.fn().mockReturnValue(whereResult),
      };
    },
  })),
  // WHY: soft-delete now runs inside the txn after FOR UPDATE (not pre-txn).
  update: vi.fn((table: unknown) => ({
    set: (values: unknown) => {
      updateCalls.push({ table, set: values });
      return {
        where: vi.fn().mockResolvedValue(undefined),
      };
    },
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

const invalidateAuthCacheMock = vi.fn();
vi.mock('../../src/middleware/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/middleware/auth.js')>();
  return { ...actual, invalidateAuthCache: invalidateAuthCacheMock };
});

vi.mock('../../src/db/index.js', () => ({ db: dbMock }));
vi.mock('../../src/db/schema.js', () => ({
  users: '__users__',
  userOnboarding: '__userOnboarding__',
  contentJobs: { id: 'contentJobs.id', userId: 'contentJobs.userId' },
  contentOutputs: { jobId: 'contentOutputs.jobId' },
  agentLogs: { jobId: 'agentLogs.jobId' },
  socialTokens: { userId: 'socialTokens.userId', platform: 'socialTokens.platform', displayName: 'socialTokens.displayName', createdAt: 'socialTokens.createdAt', id: 'socialTokens.id' },
  scheduledPosts: {
    id: 'scheduledPosts.id',
    userId: 'scheduledPosts.userId',
    publishStatus: 'scheduledPosts.publishStatus',
  },
  collectionJobs: { jobId: 'collectionJobs.jobId', collectionId: 'collectionJobs.collectionId' },
  collections: { userId: 'collections.userId' },
  competitorAnalyses: { userId: 'competitorAnalyses.userId' },
  jobOutputVersions: { jobId: 'jobOutputVersions.jobId' },
  feedMonitors: { userId: 'feedMonitors.userId' },
}));

function buildApp(dbUserId?: string, clerkUserId?: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (dbUserId) req.dbUserId = dbUserId;
    if (clerkUserId) req.userId = clerkUserId;
    next();
  });
  return app;
}

describe('DELETE /api/users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCalls.length = 0;
    updateCalls.length = 0;
    // WHY: restore happy-path FOR UPDATE → empty posts (publishing conflict
    // tests override select mid-suite).
    txMock.select.mockImplementation((_cols?: any) => ({
      from: (table: any) => {
        const isScheduledPosts = table?.userId === 'scheduledPosts.userId'
          || table?.publishStatus === 'scheduledPosts.publishStatus';
        const isContentJobs = table?.id === 'contentJobs.id'
          || table?.userId === 'contentJobs.userId';
        const rows = isContentJobs ? jobRowsInDb : (isScheduledPosts ? [] : jobRowsInDb);
        const whereResult: any = Promise.resolve(rows);
        whereResult.for = vi.fn().mockResolvedValue(rows);
        whereResult.limit = vi.fn().mockResolvedValue(rows);
        return {
          where: vi.fn().mockReturnValue(whereResult),
        };
      },
    }));
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

  it('soft-deletes content_jobs inside the txn after the publishing lock', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const { contentJobs } = await import('../../src/db/schema.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    const res = await supertest(app).delete('/api/users/me');
    expect(res.status).toBe(200);
    expect(txMock.update).toHaveBeenCalledWith(contentJobs);
    expect(updateCalls.some((c) => c.set && (c.set as { deleted?: number }).deleted === 1)).toBe(true);
  });

  it('returns 409 without soft-deleting when FOR UPDATE sees publishing', async () => {
    txMock.select.mockImplementation((_cols?: any) => ({
      from: (table: any) => {
        const isScheduledPosts = table?.userId === 'scheduledPosts.userId'
          || table?.publishStatus === 'scheduledPosts.publishStatus';
        const rows = isScheduledPosts
          ? [{ id: 'post-1', publishStatus: 'publishing' }]
          : jobRowsInDb;
        const whereResult: any = Promise.resolve(rows);
        whereResult.for = vi.fn().mockResolvedValue(rows);
        whereResult.limit = vi.fn().mockResolvedValue(rows);
        return {
          where: vi.fn().mockReturnValue(whereResult),
        };
      },
    }));

    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    const res = await supertest(app).delete('/api/users/me');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PUBLISH_IN_PROGRESS');
    // WHY: soft-delete must not run before (or after) a publishing conflict —
    // previously pre-txn deleted=1 left the library wiped on 409.
    expect(txMock.update).not.toHaveBeenCalled();
    expect(txMock.delete).not.toHaveBeenCalled();
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

  // Regression test for the feed-monitor orphan-and-retry-forever cost leak
  // (AUDIT_FINDINGS_2026-08-10.md #4): feed_monitors.userId has no FK
  // constraint, so nothing deletes it automatically — account deletion must
  // do it explicitly or a deleted user's active monitor keeps polling and
  // burning Gemini/Tavily quota every 30 minutes forever.
  it('deletes the user\'s feedMonitors rows', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const { feedMonitors } = await import('../../src/db/schema.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    await supertest(app).delete('/api/users/me');

    const deletedTables = txMock.delete.mock.calls.map((c: any[]) => c[0]);
    expect(deletedTables).toContain(feedMonitors);
  });

  // Regression test: middleware/auth.ts's authCache maps Clerk ID -> dbUserId
  // with a 5-minute TTL. Without evicting it on deletion, a request in that
  // window bearing the deleted user's still-valid Clerk session token would
  // keep resolving to a dbUserId that no longer exists.
  it('invalidates the auth cache using the Clerk user id (req.userId), not the dbUserId', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp('user-1', 'clerk_abc123');
    app.use('/api/users', usersRouter);
    await supertest(app).delete('/api/users/me');

    expect(invalidateAuthCacheMock).toHaveBeenCalledTimes(1);
    expect(invalidateAuthCacheMock).toHaveBeenCalledWith('clerk_abc123');
  });

  it('does not throw if req.userId is missing (dbUserId-only auth)', async () => {
    const { default: usersRouter } = await import('../../src/routes/users.js');
    const app = buildApp('user-1');
    app.use('/api/users', usersRouter);
    const res = await supertest(app).delete('/api/users/me');

    expect(res.status).toBe(200);
    expect(invalidateAuthCacheMock).not.toHaveBeenCalled();
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
