/**
 * POST /:jobId/export/carousel-png — SEC-003 + ownership + theme/template enums.
 *
 * Mounts the real render router. Asserts:
 * - non-owner → 404 (not 403)
 * - export uses stored final slides (client text ignored; overlay only)
 * - theme / templateId rejected when outside the zod enums
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
    TOKEN_ENCRYPTION_KEY: '0'.repeat(64),
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

const passThrough = (_req: unknown, _res: unknown, next: () => void): void => next();
vi.mock('../../src/middleware/rateLimit.js', () => ({
  exportRateLimit: passThrough,
}));

// WHY mock carousel SSR + jszip: this suite asserts ownership/SEC-003 slide
// resolution and zod enums — not Puppeteer. Capturing the slides array proves
// the route passed resolveExportSlides output into the renderer.
const renderCarouselSlidesSsr = vi.fn();
vi.mock('../../src/lib/carouselSsr.js', () => ({
  renderCarouselSlidesSsr: (...args: unknown[]) => renderCarouselSlidesSsr(...args),
}));

vi.mock('jszip', () => {
  class FakeZip {
    file = vi.fn();
    generateAsync = vi.fn().mockResolvedValue(Buffer.from('PK'));
  }
  return { default: FakeZip };
});

const OWNER = 'owner-user-export';
const ATTACKER = 'attacker-user-export';
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const COLORS = {
  BRAND_PRIMARY: '#6366F1',
  BRAND_LIGHT: '#A5B4FC',
  BRAND_DARK: '#312E81',
  LIGHT_BG: '#F8FAFC',
  LIGHT_BORDER: '#E2E8F0',
  DARK_BG: '#0F172A',
};

function validExportBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    theme: 'aurora',
    designPreset: 0,
    colors: COLORS,
    brandName: 'Pensieve',
    handle: '@pensieve',
    slides: [
      { headline: 'Client A', body: 'should be ignored' },
      { headline: 'Client B', body: 'should be ignored' },
    ],
    ...overrides,
  };
}

async function buildApp(): Promise<{
  app: express.Application;
  jobsMemory: Map<string, unknown>;
}> {
  const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
  const { default: renderRouter } = await import('../../src/routes/jobs/render.js');

  const app = express();
  app.use(express.json({ limit: '3mb' }));
  app.use((req: express.Request, _res, next) => {
    (req as express.Request & { dbUserId?: string }).dbUserId =
      req.header('x-test-user-id') ?? undefined;
    next();
  });
  app.use('/api/jobs', renderRouter);
  return { app, jobsMemory: jobsMemory as Map<string, unknown> };
}

describe('POST /:jobId/export/carousel-png — SEC-003', () => {
  const jobId = '00000000-0000-0000-0000-00000000e003';

  beforeEach(async () => {
    vi.clearAllMocks();
    renderCarouselSlidesSsr.mockImplementation(async (slides: unknown[]) =>
      (slides as unknown[]).map((_, index) => ({
        status: 'fulfilled' as const,
        value: { index, dataUrl: 'data:image/png;base64,AAAA' },
      })),
    );

    const { jobsMemory } = await import('../../src/routes/jobs/ownership.js');
    jobsMemory.clear();
    jobsMemory.set(jobId, {
      id: jobId,
      userId: OWNER,
      deleted: 0,
      status: 'done',
      platform: 'instagram_carousel',
      topic: 'SEC-003 export test',
      retryCount: 0,
      outputs: [
        {
          agentName: 'formatter',
          outputType: 'final',
          content: [
            { headline: 'Stored A', body: 'from db' },
            { headline: 'Stored B', body: 'from db' },
          ],
        },
      ],
      logs: [],
      criticResult: null,
    });
  });

  it('returns 404 (not 403) when the caller does not own the job', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/export/carousel-png`)
      .set('x-test-user-id', ATTACKER)
      .send(validExportBody());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found');
    expect(renderCarouselSlidesSsr).not.toHaveBeenCalled();
  });

  it('returns 401 when auth user id is missing', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/export/carousel-png`)
      .send(validExportBody());

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
    expect(renderCarouselSlidesSsr).not.toHaveBeenCalled();
  });

  it('renders stored final slides, not client-authored headline/body', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/export/carousel-png`)
      .set('x-test-user-id', OWNER)
      .send(
        validExportBody({
          slides: [
            { headline: 'Hijack A', body: 'burn quota', imageDataUrl: TINY_PNG },
            { headline: 'Hijack B', body: 'burn quota' },
          ],
        }),
      );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/zip/);
    expect(renderCarouselSlidesSsr).toHaveBeenCalledTimes(1);

    const slidesArg = renderCarouselSlidesSsr.mock.calls[0]?.[0] as Array<{
      headline?: string;
      body?: string;
      imageDataUrl?: string;
    }>;
    expect(slidesArg).toHaveLength(2);
    expect(slidesArg[0]?.headline).toBe('Stored A');
    expect(slidesArg[0]?.body).toBe('from db');
    expect(slidesArg[0]?.imageDataUrl).toBe(TINY_PNG);
    expect(slidesArg[1]?.headline).toBe('Stored B');
  });

  it('returns 400 NO_CAROUSEL when the job has no saved final carousel', async () => {
    const { app, jobsMemory } = await buildApp();
    jobsMemory.set(jobId, {
      id: jobId,
      userId: OWNER,
      deleted: 0,
      status: 'done',
      platform: 'instagram_carousel',
      topic: 'no final',
      retryCount: 0,
      outputs: [],
      logs: [],
      criticResult: null,
    });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/export/carousel-png`)
      .set('x-test-user-id', OWNER)
      .send(validExportBody());

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_CAROUSEL');
    expect(renderCarouselSlidesSsr).not.toHaveBeenCalled();
  });

  it('rejects an unknown theme (exportThemeEnum)', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/export/carousel-png`)
      .set('x-test-user-id', OWNER)
      .send(validExportBody({ theme: 'not-a-real-theme' }));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(renderCarouselSlidesSsr).not.toHaveBeenCalled();
  });

  it('rejects an unknown templateId (templateIdEnum)', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/export/carousel-png`)
      .set('x-test-user-id', OWNER)
      .send(validExportBody({ templateId: 'made-up-template', theme: 'modern-minimal' }));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(renderCarouselSlidesSsr).not.toHaveBeenCalled();
  });

  it('accepts a valid legacy theme + templateId enum pair', async () => {
    const { app } = await buildApp();
    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/export/carousel-png`)
      .set('x-test-user-id', OWNER)
      .send(
        validExportBody({
          theme: 'violet',
          templateId: 'modern-minimal',
          paletteId: 'mm-default',
        }),
      );

    expect(res.status).toBe(200);
    expect(renderCarouselSlidesSsr).toHaveBeenCalledTimes(1);
    const opts = renderCarouselSlidesSsr.mock.calls[0]?.[1] as {
      templateId?: string;
      paletteId?: string;
    };
    expect(opts.templateId).toBe('modern-minimal');
    expect(opts.paletteId).toBe('mm-default');
  });
});
