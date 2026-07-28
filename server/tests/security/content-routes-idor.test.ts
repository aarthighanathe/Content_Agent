/**
 * /api/content/:outputId/* — IDOR test (S-3)
 *
 * These routes derive jobId from outputId and call requireJobOwnership()
 * before touching any data (see routes/content.ts). This test exercises the
 * real Express router end-to-end (supertest) against the real jobsMemory
 * singleton, proving a user who doesn't own the job's parent jobId gets 404
 * on every route — not just that the ownership helper itself is correct
 * (already covered by tests/security/ownership.test.ts).
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

vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/db/schema.js', () => ({ contentOutputs: {} }));
vi.mock('../../src/workers/contentWorker.js', () => ({
  getJobFromStore: () => undefined,
  setJobInStore: vi.fn(),
}));
vi.mock('../../src/lib/queue.js', () => ({ addJobToQueue: vi.fn().mockResolvedValue(false) }));
vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn().mockResolvedValue('{}') }));
vi.mock('../../src/routes/users.js', () => ({ userProfiles: new Map() }));
vi.mock('../../src/routes/jobs/index.js', async () => {
  const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
  return { jobsMemory, runPipelineDirect: vi.fn() };
});

const OWNER = 'owner-user-1';
const ATTACKER = 'attacker-user-2';

async function buildApp() {
  const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
  const { default: contentRouter } = await import('../../src/routes/content.js');

  const app = express();
  app.use(express.json());
  // Stand-in for authMiddleware: real auth is tested separately
  // (tests/security/auth.test.ts) — here we only need req.dbUserId populated.
  app.use((req: any, _res, next) => {
    req.dbUserId = req.header('x-test-user-id');
    next();
  });
  app.use('/api/content', contentRouter);
  return { app, jobsMemory };
}

describe('IDOR — /api/content/:outputId/*', () => {
  let jobId: string;
  let outputId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
    jobId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`;
    outputId = `${jobId}-0`;
    jobsMemory.set(jobId, {
      id: jobId,
      userId: OWNER,
      deleted: 0,
      status: 'done',
      platform: 'linkedin_post',
      topic: 'IDOR test job',
      outputs: [
        { agentName: 'writer', outputType: 'final', content: { hook: 'H', body: 'B', cta: 'C', hashtags: [] }, qualityScore: 82 },
      ],
    });
  });

  it('owner can read their own output (sanity check, expect 200)', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .get(`/api/content/${outputId}`)
      .set('x-test-user-id', OWNER);
    expect(res.status).toBe(200);
  });

  it('GET /:outputId → 404 for non-owner', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .get(`/api/content/${outputId}`)
      .set('x-test-user-id', ATTACKER);
    expect(res.status).toBe(404);
  });

  it('POST /:outputId/regenerate → 404 for non-owner', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .post(`/api/content/${outputId}/regenerate`)
      .set('x-test-user-id', ATTACKER)
      .send({ custom_feedback: 'hacked' });
    expect(res.status).toBe(404);
  });

  it('GET /:outputId/export/pdf → 404 for non-owner', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .get(`/api/content/${outputId}/export/pdf`)
      .set('x-test-user-id', ATTACKER);
    expect(res.status).toBe(404);
  });

  it('GET /:outputId/export/text → 404 for non-owner', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .get(`/api/content/${outputId}/export/text`)
      .set('x-test-user-id', ATTACKER);
    expect(res.status).toBe(404);
  });

  it('POST /:outputId/slides/:index → 404 for non-owner (cannot mutate another user\'s slide)', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .post(`/api/content/${outputId}/slides/0`)
      .set('x-test-user-id', ATTACKER)
      .send({ headline: 'HACKED', body: 'HACKED' });
    expect(res.status).toBe(404);
  });

  it('slide mutation is rejected before content is modified — owner content is untouched by the attacker attempt', async () => {
    const { app, jobsMemory } = await buildApp();
    await supertest(app)
      .post(`/api/content/${outputId}/slides/0`)
      .set('x-test-user-id', ATTACKER)
      .send({ headline: 'HACKED', body: 'HACKED' });

    const job = jobsMemory.get(jobId);
    expect(JSON.stringify(job.outputs)).not.toContain('HACKED');
  });

  it('all IDOR failures return 404, never 403 (prevents existence enumeration)', async () => {
    const { app } = await buildApp();
    const routes: Array<[string, string]> = [
      ['get', `/api/content/${outputId}`],
      ['post', `/api/content/${outputId}/regenerate`],
      ['get', `/api/content/${outputId}/export/pdf`],
      ['get', `/api/content/${outputId}/export/text`],
      ['post', `/api/content/${outputId}/slides/0`],
    ];
    for (const [method, path] of routes) {
      const res = await (supertest(app) as any)[method](path)
        .set('x-test-user-id', ATTACKER)
        .send({});
      expect(res.status).not.toBe(403);
      expect(res.status).toBe(404);
    }
  });
});
