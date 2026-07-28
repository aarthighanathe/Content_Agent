/**
 * routes/imageGen — Integration Tests (P2)
 * Prompt validation, all-providers-fail → 500, and provider fallback chain.
 * Mocks global fetch to avoid real HTTP calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// Mock config so env reads from process.env at request time (not cached at import)
vi.mock('../../src/config.js', () => ({
  get env() {
    return {
      DATABASE_URL: process.env.DATABASE_URL || 'postgres://test',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'test_secret',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'test_key',
      OAUTH_STATE_SECRET: process.env.OAUTH_STATE_SECRET || 'test-oauth-secret-that-is-long-enough-32',
      APP_URL: process.env.APP_URL || 'http://localhost:3001',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      TOGETHER_API_KEY: process.env.TOGETHER_API_KEY,
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
      NODE_ENV: 'test',
      PORT: '3001',
      CORS_ORIGINS: undefined,
      RATE_LIMIT_MAX_JOBS: '10',
    };
  },
}));

// imageGen.ts only imports { Router } from 'express' — no external deps to mock.
async function buildImageGenApp() {
  const { default: imageGenRouter } = await import('../../src/routes/imageGen.js');
  const app = express();
  app.use(express.json());
  app.use('/api/images', imageGenRouter);
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOkFetchResponse(body: any, contentType = 'application/json') {
  return {
    ok: true,
    status: 200,
    headers: { get: (h: string) => (h === 'content-type' ? contentType : null) },
    json: () => Promise.resolve(body),
    arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data').buffer),
  } as unknown as Response;
}

function makeFailFetchResponse(status = 503) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve({ error: { message: 'Service unavailable' } }),
  } as unknown as Response;
}

// ─── Saved env vars ───────────────────────────────────────────────────────────

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  savedEnv.TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
  savedEnv.GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Start each test with NO API keys to prevent real calls
  delete process.env.OPENAI_API_KEY;
  delete process.env.TOGETHER_API_KEY;
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  // Restore
  Object.entries(savedEnv).forEach(([key, val]) => {
    if (val !== undefined) process.env[key] = val;
    else delete process.env[key];
  });
  vi.restoreAllMocks();
});

// ─── Prompt validation ───────────────────────────────────────────────────────

describe('POST /api/images/generate — prompt validation', () => {
  it('returns 400 when prompt is missing', async () => {
    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ mode: 'background' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when prompt is empty string', async () => {
    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when prompt is whitespace only', async () => {
    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: '   ' });
    expect(res.status).toBe(400);
  });
});

// ─── All providers fail → 500 ─────────────────────────────────────────────────

describe('POST /api/images/generate — all providers fail', () => {
  it('returns 500 when Pollinations also fails (no API keys, mocked fetch)', async () => {
    // No API keys set → only Pollinations runs
    vi.spyOn(global, 'fetch').mockResolvedValue(makeFailFetchResponse(503));

    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'abstract background for marketing' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/image generation failed/i);
  });

  it('error message suggests setting OPENAI_API_KEY', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(makeFailFetchResponse(503));

    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'dark abstract' });
    expect(res.body.error).toMatch(/OPENAI_API_KEY/i);
  });
});

// ─── Successful provider responses ───────────────────────────────────────────

describe('POST /api/images/generate — provider success', () => {
  it('returns image and source when OpenAI gpt-image-1 succeeds', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeOkFetchResponse({ data: [{ b64_json: 'SGVsbG8=' }] })
    );

    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'professional marketing background' });
    expect(res.status).toBe(200);
    expect(res.body.image).toMatch(/^data:image\/png;base64,/);
    expect(res.body.source).toBe('gpt-image-1');
  });

  it('falls through to DALL-E 3 when gpt-image-1 returns no b64_json', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    let callCount = 0;
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      callCount++;
      const urlStr = String(url);

      // First OpenAI call (gpt-image-1): ok but no b64_json
      if (callCount === 1) {
        return makeOkFetchResponse({ data: [{ url: undefined }] });
      }
      // Second OpenAI call (DALL-E 3 generation): returns a URL
      if (callCount === 2 && urlStr.includes('openai')) {
        return makeOkFetchResponse({ data: [{ url: 'https://fake-image.example.com/img.png' }] });
      }
      // Third call: download the image URL
      return {
        ok: true,
        status: 200,
        headers: { get: (h: string) => (h === 'content-type' ? 'image/png' : null) },
        arrayBuffer: () => Promise.resolve(Buffer.from('png-data').buffer),
        json: () => Promise.resolve({}),
      } as unknown as Response;
    });

    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'marketing slide' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('dalle3');
  });

  it('returns image from Together AI when OpenAI key not set and Together key is', async () => {
    process.env.TOGETHER_API_KEY = 'test-together-key';
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeOkFetchResponse({ data: [{ b64_json: 'VG9nZXRoZXI=' }] })
    );

    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'colorful abstract' });
    expect(res.status).toBe(200);
    expect(res.body.image).toMatch(/^data:image\/jpeg;base64,/);
    expect(res.body.source).toBe('together');
  });

  it('returns image from Pollinations when no API keys and fetch succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'image/jpeg' : null) },
      arrayBuffer: () => Promise.resolve(Buffer.from('pollinations-data').buffer),
      json: () => Promise.resolve({}),
    } as unknown as Response);

    const app = await buildImageGenApp();
    const res = await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'marketing image' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('pollinations');
  });
});

// ─── Prompt enhancement modes ─────────────────────────────────────────────────

describe('POST /api/images/generate — prompt enhancement', () => {
  it('mode=full_slide includes English legibility requirements', async () => {
    let capturedBody: any;
    process.env.OPENAI_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockImplementation(async (_url, opts) => {
      if (opts?.body) capturedBody = JSON.parse(opts.body as string);
      return makeOkFetchResponse({ data: [{ b64_json: 'AAAA' }] });
    });

    const app = await buildImageGenApp();
    await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'slide background', mode: 'full_slide' });

    expect(capturedBody?.prompt).toMatch(/English/);
    expect(capturedBody?.prompt).toMatch(/legible/i);
  });

  it('default mode (no mode=full_slide) includes "no text" instruction', async () => {
    let capturedBody: any;
    process.env.OPENAI_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockImplementation(async (_url, opts) => {
      if (opts?.body) capturedBody = JSON.parse(opts.body as string);
      return makeOkFetchResponse({ data: [{ b64_json: 'BBBB' }] });
    });

    const app = await buildImageGenApp();
    await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'marketing background' });

    expect(capturedBody?.prompt).toMatch(/no text/i);
    expect(capturedBody?.prompt).toMatch(/no words/i);
  });

  it('original prompt is included in enhanced prompt', async () => {
    let capturedBody: any;
    process.env.OPENAI_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockImplementation(async (_url, opts) => {
      if (opts?.body) capturedBody = JSON.parse(opts.body as string);
      return makeOkFetchResponse({ data: [{ b64_json: 'CCCC' }] });
    });

    const app = await buildImageGenApp();
    await supertest(app)
      .post('/api/images/generate')
      .send({ prompt: 'sunset over mountains with purple sky' });

    expect(capturedBody?.prompt).toContain('sunset over mountains');
  });
});
