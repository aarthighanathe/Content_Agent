/**
 * POST /api/jobs/create — pending-row insert gate (CORR-001).
 *
 * WHY: insertPendingJobRow swallows DB errors and returns false; enqueueing
 * anyway would run a full pipeline with no durable row. The route must 503
 * and never call addJobToQueue / setJobInStore.
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

vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/db/schema.js', () => ({ competitorAnalyses: {} }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));
vi.mock('../../src/lib/pipeline.js', () => ({ runAndPersistPipeline: vi.fn() }));

const insertPendingJobRow = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock('../../src/lib/persistJob.js', () => ({
  insertPendingJobRow: (...args: unknown[]) => insertPendingJobRow(...args),
}));

const jobsMemoryMock = vi.hoisted(() => new Map());
const setJobInStore = vi.hoisted(() =>
  vi.fn((jobId: string, data: unknown) => {
    if (data === undefined) jobsMemoryMock.delete(jobId);
    else jobsMemoryMock.set(jobId, data);
  }),
);
vi.mock('../../src/routes/jobs/ownership.js', () => ({
  setJobInStore: (...args: unknown[]) => setJobInStore(...args),
  getJobFromStore: (jobId: string) => jobsMemoryMock.get(jobId),
  jobsMemory: jobsMemoryMock,
  requireAuthUserId: (
    req: { dbUserId?: string },
    res: { status: (n: number) => { json: (b: unknown) => void } },
  ) => {
    if (!req.dbUserId) {
      res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING', retryable: false });
      return null;
    }
    return req.dbUserId;
  },
}));

vi.mock('../../src/middleware/rateLimit.js', () => ({
  authJobRateLimit: [
    (_req: unknown, _res: unknown, next: () => void) => next(),
    (_req: unknown, _res: unknown, next: () => void) => next(),
  ],
  reserveGenerationBudget: vi.fn().mockResolvedValue({ allowed: true, reserved: 0 }),
  releaseGenerationBudget: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/routes/users.js', () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    brandVoice: 'professional',
    phrasesUse: '',
    phrasesAvoid: '',
    contentDna: null,
  }),
}));

const addJobToQueue = vi.fn();
vi.mock('../../src/lib/queue.js', () => ({
  addJobToQueue: (...args: unknown[]) => addJobToQueue(...args),
}));

async function buildApp(): Promise<express.Application> {
  const { default: createRouter } = await import('../../src/routes/jobs/create.js');
  const app = express();
  app.use(express.json());
  app.use((req: express.Request, _res, next) => {
    (req as express.Request & { dbUserId?: string }).dbUserId = 'user-1';
    next();
  });
  app.use('/api/jobs', createRouter);
  return app;
}

const validBody = {
  topic: 'AI trends in marketing',
  platform: 'linkedin_post',
  tone: 'professional',
  targetAudience: 'marketers',
};

describe('POST /api/jobs/create (pending insert gate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobsMemoryMock.clear();
    insertPendingJobRow.mockResolvedValue(true);
    addJobToQueue.mockResolvedValue(false);
  });

  it('returns 503 and does not enqueue when insertPendingJobRow returns false', async () => {
    insertPendingJobRow.mockResolvedValue(false);
    const app = await buildApp();

    const res = await supertest(app).post('/api/jobs/create').send(validBody);

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
    });
    expect(addJobToQueue).not.toHaveBeenCalled();
    expect(setJobInStore).not.toHaveBeenCalled();
    expect(jobsMemoryMock.size).toBe(0);
  });

  it('returns 201 and enqueues when the pending row insert succeeds', async () => {
    const app = await buildApp();

    const res = await supertest(app).post('/api/jobs/create').send(validBody);

    expect(res.status).toBe(201);
    expect(typeof res.body.jobId).toBe('string');
    expect(insertPendingJobRow).toHaveBeenCalledOnce();
    expect(setJobInStore).toHaveBeenCalledOnce();
    expect(addJobToQueue).toHaveBeenCalledOnce();
  });
});
