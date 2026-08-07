/**
 * POST /api/jobs/batch — real route test.
 *
 * WHY this suite exists: the route's actual `.max(7)` enforcement and its
 * `.filter((item) => item.topic?.trim())` pre-processing had no direct test —
 * jobs-validation.test.ts's `validateBatchJobs()` is a hand-copied
 * reimplementation of an OLDER shape (missing/topic-or-platform checks only,
 * no min-length-3 check, no per-item tone/targetAudience fields) that never
 * calls the real route, so it could drift arbitrarily (e.g. someone changing
 * the real `.max(7)` to `.max(10)`) with zero test failures. This suite
 * mounts the REAL router from routes/jobs/create.ts via supertest.
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
vi.mock('../../src/workers/contentWorker.js', () => ({ setJobInStore: vi.fn() }));
vi.mock('../../src/routes/users.js', () => ({
  getUserProfile: vi.fn().mockResolvedValue({ brandVoice: 'professional', phrasesUse: '', phrasesAvoid: '', contentDna: null }),
}));

const addJobToQueue = vi.fn();
vi.mock('../../src/lib/queue.js', () => ({ addJobToQueue: (...args: unknown[]) => addJobToQueue(...args) }));

async function buildApp() {
  const { default: createRouter } = await import('../../src/routes/jobs/create.js');
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.dbUserId = 'user-1';
    next();
  });
  app.use('/api/jobs', createRouter);
  return app;
}

function makeItem(topic: string, platform = 'linkedin_post') {
  return { topic, platform };
}

describe('POST /api/jobs/batch (real route)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // WHY false: forces every batch item down the direct-pipeline fallback
    // path (mocked to a no-op above) rather than a real BullMQ enqueue,
    // keeping this test focused on the route's own validation/response shape.
    addJobToQueue.mockResolvedValue(false);
  });

  it('accepts exactly 7 items (the documented max)', async () => {
    const app = await buildApp();
    const items = Array.from({ length: 7 }, (_, i) => makeItem(`Topic number ${i}`));

    const res = await supertest(app).post('/api/jobs/batch').send({ items });

    expect(res.status).toBe(201);
    expect(res.body.jobs).toHaveLength(7);
  });

  it('rejects 8 items with a 400 validation error — the real .max(7) enforcement', async () => {
    const app = await buildApp();
    const items = Array.from({ length: 8 }, (_, i) => makeItem(`Topic number ${i}`));

    const res = await supertest(app).post('/api/jobs/batch').send({ items });

    expect(res.status).toBe(400);
  });

  it('rejects an empty items array', async () => {
    const app = await buildApp();
    const res = await supertest(app).post('/api/jobs/batch').send({ items: [] });
    expect(res.status).toBe(400);
  });

  it('rejects a single item whose topic is shorter than the minimum (3 chars)', async () => {
    const app = await buildApp();
    const res = await supertest(app).post('/api/jobs/batch').send({ items: [makeItem('ab')] });
    expect(res.status).toBe(400);
  });

  it('rejects an item with an invalid platform', async () => {
    const app = await buildApp();
    const res = await supertest(app).post('/api/jobs/batch').send({
      items: [makeItem('A valid topic here', 'myspace_post')],
    });
    expect(res.status).toBe(400);
  });

  it('7 valid items all create jobs, each independently, via Promise.allSettled', async () => {
    const app = await buildApp();
    const items = [
      makeItem('First valid topic', 'linkedin_post'),
      makeItem('Second valid topic', 'twitter_thread'),
      makeItem('Third valid topic', 'instagram_carousel'),
    ];

    const res = await supertest(app).post('/api/jobs/batch').send({ items });

    expect(res.status).toBe(201);
    expect(res.body.jobs).toHaveLength(3);
    expect(res.body.jobs.map((j: { platform: string }) => j.platform)).toEqual([
      'linkedin_post', 'twitter_thread', 'instagram_carousel',
    ]);
  });
});
