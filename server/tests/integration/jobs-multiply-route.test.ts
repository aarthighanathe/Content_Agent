/**
 * POST /api/jobs/:jobId/multiply — Adapt lock fail-closed → 503.
 *
 * WHY: when Redis multiply lock is `unavailable` and Redis is configured,
 * createMultiplyAdaptJob must refuse Adapt (not fall open to process-local
 * only). This suite mocks tryAcquireRedisLock and mounts the real regenerate
 * router so the 503 SERVICE_UNAVAILABLE mapping stays covered.
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
    // WHY: mustFailClosedOnMultiplyLockUnavailable() is true when Redis is
    // configured — without this the unavailable lock would fall open to the
    // process-local Set in NODE_ENV=test.
    REDIS_URL: 'redis://127.0.0.1:6379',
    TOKEN_ENCRYPTION_KEY: '0'.repeat(64),
    SENTRY_DSN: undefined,
    CORS_ORIGINS: undefined,
  },
}));

vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/db/schema.js', () => ({
  contentJobs: {},
  contentOutputs: {},
  jobOutputVersions: {},
}));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));
vi.mock('../../src/lib/pipeline.js', () => ({ runAndPersistPipeline: vi.fn() }));

const insertPendingJobRow = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock('../../src/lib/persistJob.js', () => ({
  insertPendingJobRow: (...args: unknown[]) => insertPendingJobRow(...args),
  isValidTone: (tone: string) => typeof tone === 'string' && tone.length > 0,
}));

const tryAcquireRedisLock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ status: 'unavailable' }),
);
vi.mock('../../src/lib/contentJobLock.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/contentJobLock.js')>();
  return {
    ...actual,
    tryAcquireRedisLock: (...args: unknown[]) => tryAcquireRedisLock(...args),
  };
});

vi.mock('../../src/middleware/rateLimit.js', () => ({
  authJobRateLimit: [
    (_req: unknown, _res: unknown, next: () => void) => next(),
    (_req: unknown, _res: unknown, next: () => void) => next(),
  ],
}));

vi.mock('../../src/routes/users.js', () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    brandVoice: 'professional',
    phrasesUse: '',
    phrasesAvoid: '',
    contentDna: null,
  }),
}));

const addJobToQueueDetailed = vi.fn();
vi.mock('../../src/lib/queue.js', () => ({
  addJobToQueueDetailed: (...args: unknown[]) => addJobToQueueDetailed(...args),
  addJobToQueue: vi.fn(),
}));

vi.mock('../../src/routes/jobs/pipelineDirect.js', () => ({
  runPipelineDirect: vi.fn().mockResolvedValue(undefined),
}));

const OWNER = '11111111-1111-1111-1111-111111111111';
const JOB_ID = '00000000-0000-0000-0000-00000000a001';

function researchOutputs(): unknown[] {
  return [
    {
      agentName: 'researcher',
      outputType: 'research',
      content: {
        trendingAngles: ['angle-a'],
        keyFacts: ['fact-a'],
        suggestedHashtags: ['#ai'],
        competitorHooks: [],
        sourceUrls: ['https://example.com'],
        rawResults: [],
      },
    },
    {
      agentName: 'orchestrator',
      outputType: 'plan',
      content: {
        taskPlan: 'Write a LinkedIn post about AI',
        platformRules: { maxLength: 3000 },
      },
    },
  ];
}

async function buildApp(): Promise<{
  app: express.Application;
  jobsMemory: Map<string, unknown>;
}> {
  const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
  const { default: regenerateRouter } = await import('../../src/routes/jobs/regenerate.js');

  const app = express();
  app.use(express.json());
  app.use((req: express.Request, _res, next) => {
    (req as express.Request & { dbUserId?: string }).dbUserId = OWNER;
    next();
  });
  app.use('/api/jobs', regenerateRouter);
  return { app, jobsMemory: jobsMemory as Map<string, unknown> };
}

describe('POST /api/jobs/:jobId/multiply — lock fail-closed', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    insertPendingJobRow.mockResolvedValue(true);
    tryAcquireRedisLock.mockResolvedValue({ status: 'unavailable' });
    addJobToQueueDetailed.mockResolvedValue('queued');

    const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
    jobsMemory.clear();
    jobsMemory.set(JOB_ID, {
      id: JOB_ID,
      userId: OWNER,
      deleted: 0,
      status: 'done',
      platform: 'linkedin_post',
      topic: 'AI trends for founders',
      tone: 'professional',
      targetAudience: 'founders',
      brandVoice: 'professional',
      phrasesUse: '',
      phrasesAvoid: '',
      contentDna: null,
      retryCount: 0,
      outputs: researchOutputs(),
      logs: [],
      criticResult: null,
    });
  });

  it('returns 503 SERVICE_UNAVAILABLE when the multiply Redis lock is unavailable', async () => {
    const { app } = await buildApp();

    const res = await supertest(app)
      .post(`/api/jobs/${JOB_ID}/multiply`)
      .send({ targetPlatform: 'twitter_thread' });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
    });
    expect(tryAcquireRedisLock).toHaveBeenCalled();
    expect(insertPendingJobRow).not.toHaveBeenCalled();
    expect(addJobToQueueDetailed).not.toHaveBeenCalled();
  });
});
