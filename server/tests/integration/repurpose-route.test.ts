/**
 * routes/content/repurpose — Integration Tests (multi-platform fan-out)
 *
 * Exercises the real Express router end-to-end (supertest), mocking the
 * network fetch (article HTML), generateWithAI (topic summary), and job
 * creation (jobsMemory/runPipelineDirect/addJobToQueue) — no live network,
 * LLM, or queue is reachable in this sandbox.
 *
 * Covers: single-platform (unchanged call shape), multi-platform fan-out
 * from one fetch (the actual feature under test — generateWithAI/global
 * fetch called exactly once regardless of platform count), per-platform job
 * creation, and the existing single-fetch error paths (invalid URL, SSRF,
 * fetch failure, insufficient content) still applying before any fan-out.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// WHY mocked: repurpose.ts imports stripScriptsAndEventHandlers from
// lib/carousel.js, which transitively imports lib/browserPool.ts, which (as
// of the 2026-08-10 fix routing its raw process.env reads through config.ts)
// imports config.ts at module scope — config.ts's parseEnv() runs for real
// on import and throws if required vars are unset, which they are here.
vi.mock('../../src/config.js', () => ({
  env: {
    DATABASE_URL: 'postgres://test',
    CLERK_SECRET_KEY: 'test_secret',
    CLERK_PUBLISHABLE_KEY: 'test_publishable',
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
    TOKEN_ENCRYPTION_KEY: '0'.repeat(64),
    SENTRY_DSN: undefined,
    CORS_ORIGINS: undefined,
    PUPPETEER_EXECUTABLE_PATH: undefined,
    RENDER: undefined,
  },
}));

const generateWithAIMock = vi.fn();
vi.mock('../../src/lib/ai.js', () => ({
  generateWithAI: (...args: unknown[]) => generateWithAIMock(...args),
}));

const jobsMemoryMock = vi.hoisted(() => new Map());
const runPipelineDirectMock = vi.fn();
vi.mock('../../src/routes/jobs/index.js', () => ({
  jobsMemory: jobsMemoryMock,
  runPipelineDirect: (...args: unknown[]) => { runPipelineDirectMock(...args); return Promise.resolve(); },
}));

const addJobToQueueMock = vi.fn().mockResolvedValue(true);
vi.mock('../../src/lib/queue.js', () => ({
  addJobToQueue: (...args: unknown[]) => addJobToQueueMock(...args),
}));

vi.mock('../../src/routes/users.js', () => ({
  getUserProfile: vi.fn().mockResolvedValue({ brandVoice: 'professional', phrasesUse: '', phrasesAvoid: '', contentDna: null }),
}));

const ARTICLE_HTML = `<html><body><p>${'This is a real article with plenty of readable text content. '.repeat(5)}</p></body></html>`;

async function buildApp(userId: string | undefined) {
  const { default: repurposeRouter } = await import('../../src/routes/content/repurpose.js');
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (userId) req.dbUserId = userId;
    next();
  });
  app.use('/api/content', repurposeRouter);
  return app;
}

const OWNER = '00000000-0000-0000-0000-0000000000a1';

beforeEach(() => {
  jobsMemoryMock.clear();
  vi.clearAllMocks();
  generateWithAIMock.mockResolvedValue('A punchy topic sentence');
  addJobToQueueMock.mockResolvedValue(true);
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
    text: async () => ARTICLE_HTML,
  }) as unknown as typeof fetch;
});

describe('POST /api/content/repurpose', () => {
  it('single-platform request creates exactly one job (unchanged call shape)', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'https://example.com/article', platform: 'linkedin_post', tone: 'professional', targetAudience: 'founders',
    });
    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.topic).toBe('A punchy topic sentence');
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].platform).toBe('linkedin_post');
    expect(generateWithAIMock).toHaveBeenCalledTimes(1);
  });

  it('multi-platform request fetches the article and summarizes the topic exactly once', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'https://example.com/article',
      platform: 'linkedin_post',
      platforms: ['linkedin_post', 'twitter_thread', 'instagram_caption'],
      tone: 'professional', targetAudience: 'founders',
    });
    expect(res.status).toBe(201);
    expect(res.body.jobs).toHaveLength(3);
    expect(res.body.jobs.map((j: { platform: string }) => j.platform).sort()).toEqual(
      ['instagram_caption', 'linkedin_post', 'twitter_thread'].sort(),
    );
    // The actual point of this feature: one fetch, one summary, N jobs.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(generateWithAIMock).toHaveBeenCalledTimes(1);
  });

  it('creates a separate job per platform, each with its own jobId', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'https://example.com/article',
      platform: 'linkedin_post',
      platforms: ['linkedin_post', 'twitter_thread'],
      tone: 'professional', targetAudience: 'founders',
    });
    const jobIds = res.body.jobs.map((j: { jobId: string }) => j.jobId);
    expect(new Set(jobIds).size).toBe(2);
    expect(jobsMemoryMock.size).toBe(2);
  });

  it('every fanned-out job carries the same sourceUrl', async () => {
    const app = await buildApp(OWNER);
    await supertest(app).post('/api/content/repurpose').send({
      url: 'https://example.com/article',
      platform: 'linkedin_post',
      platforms: ['linkedin_post', 'twitter_thread'],
      tone: 'professional', targetAudience: 'founders',
    });
    const jobs = Array.from(jobsMemoryMock.values()) as Array<{ sourceUrl?: string }>;
    expect(jobs).toHaveLength(2);
    for (const job of jobs) expect(job.sourceUrl).toBe('https://example.com/article');
  });

  it('rejects an invalid URL before any fetch (still a single check, fan-out or not)', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'not-a-url', platform: 'linkedin_post', tone: 'professional', targetAudience: 'founders',
    });
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a private/SSRF-risk hostname before any fetch', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'http://localhost/admin', platform: 'linkedin_post', tone: 'professional', targetAudience: 'founders',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns FETCH_FAILED when the article URL is unreachable, before any job is created', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' }) as unknown as typeof fetch;
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'https://example.com/missing', platform: 'linkedin_post', tone: 'professional', targetAudience: 'founders',
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('FETCH_FAILED');
    expect(jobsMemoryMock.size).toBe(0);
  });

  it('returns INSUFFICIENT_CONTENT when the page has too little readable text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => '<html><body>too short</body></html>',
    }) as unknown as typeof fetch;
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'https://example.com/thin', platform: 'linkedin_post', tone: 'professional', targetAudience: 'founders',
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_CONTENT');
  });

  it('returns FETCH_FAILED when the URL responds with a non-text content type (e.g. a PDF)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      text: async () => '%PDF-1.4 binary noise',
    }) as unknown as typeof fetch;
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'https://example.com/whitepaper.pdf', platform: 'linkedin_post', tone: 'professional', targetAudience: 'founders',
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('FETCH_FAILED');
    expect(jobsMemoryMock.size).toBe(0);
  });

  it('rejects more than 5 platforms (schema cap)', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/content/repurpose').send({
      url: 'https://example.com/article',
      platform: 'linkedin_post',
      platforms: ['linkedin_post', 'twitter_thread', 'instagram_caption', 'instagram_carousel', 'video_script', 'linkedin_post'],
      tone: 'professional', targetAudience: 'founders',
    });
    expect(res.status).toBe(400);
  });
});
