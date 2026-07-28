/**
 * TC-010 through TC-012, TC-052 through TC-054
 * Demo route integration tests — no auth required.
 * Mocks generateWithAI so no real LLM calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// ─── Mock the AI module before any imports ────────────────────────────────────
vi.mock('../../src/lib/ai.js', () => ({
  generateWithAI: vi.fn(),
  searchTavily: vi.fn().mockResolvedValue({ results: [] }),
}));

// ─── Build a minimal Express app with just the demo router ───────────────────
async function buildDemoApp() {
  const { default: demoRouter } = await import('../../src/routes/demo.js');
  const app = express();
  app.use(express.json());
  app.use('/api/demo', demoRouter);
  return app;
}

const VALID_PLATFORMS = [
  'instagram_carousel',
  'linkedin_post',
  'twitter_thread',
  'instagram_caption',
  'video_script',
];

describe('POST /api/demo/generate', () => {
  let app: express.Application;
  let mockGenerateWithAI: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const aiModule = await import('../../src/lib/ai.js');
    mockGenerateWithAI = vi.mocked(aiModule.generateWithAI);
    app = await buildDemoApp();
  });

  // ── Validation tests ──────────────────────────────────────────────────────

  it('TC-010 — missing topic returns 400', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ platform: 'linkedin_post' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('TC-054 — whitespace-only topic returns 400', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: '   ', platform: 'linkedin_post' });
    expect(res.status).toBe(400);
  });

  it('missing platform returns 400', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'AI marketing' });
    expect(res.status).toBe(400);
  });

  it('TC-011 — invalid platform returns 400', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'AI marketing', platform: 'tiktok' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  // ── Successful generation ─────────────────────────────────────────────────

  it('TC-012 — no auth header required (public route)', async () => {
    mockGenerateWithAI.mockResolvedValue(JSON.stringify([
      { slideNumber: 1, headline: 'Hook', body: 'Body text here.' },
    ]));
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'AI marketing', platform: 'instagram_carousel' });
    // No 401, should succeed or return AI content
    expect(res.status).not.toBe(401);
  });

  it('TC-053 — response includes truncated: true flag', async () => {
    mockGenerateWithAI.mockResolvedValue(JSON.stringify([
      { slideNumber: 1, headline: 'Hook', body: 'Body.' },
    ]));
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'AI marketing', platform: 'instagram_carousel' });
    expect(res.status).toBe(200);
    expect(res.body.truncated).toBe(true);
  });

  it('TC-052 — topic truncated to 200 chars in response', async () => {
    const longTopic = 'x'.repeat(300);
    mockGenerateWithAI.mockResolvedValue(JSON.stringify([
      { slideNumber: 1, headline: 'H', body: 'B.' },
    ]));
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: longTopic, platform: 'instagram_carousel' });
    expect(res.status).toBe(200);
    expect(res.body.topic.length).toBeLessThanOrEqual(200);
  });

  it('response includes platform echo', async () => {
    mockGenerateWithAI.mockResolvedValue(JSON.stringify({ hook: 'Hook', body: 'Body.' }));
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'Growth marketing', platform: 'linkedin_post' });
    expect(res.status).toBe(200);
    expect(res.body.platform).toBe('linkedin_post');
  });

  it('AI parse failure returns 500', async () => {
    mockGenerateWithAI.mockResolvedValue('not valid json %%%');
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'AI', platform: 'linkedin_post' });
    expect(res.status).toBe(500);
  });

  it('AI total failure returns 500', async () => {
    mockGenerateWithAI.mockRejectedValue(new Error('All providers failed'));
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'AI', platform: 'linkedin_post' });
    expect(res.status).toBe(500);
  });

  // All 5 valid platforms are accepted
  VALID_PLATFORMS.forEach(platform => {
    it(`accepts platform: ${platform}`, async () => {
      const mockContent: Record<string, any> = {
        instagram_carousel: [{ slideNumber: 1, headline: 'H', body: 'B.' }],
        linkedin_post: { hook: 'Hook', body: 'Body.' },
        twitter_thread: { tweets: [{ number: 1, text: 'Tweet.' }] },
        instagram_caption: { caption: 'Cap.', hashtags: ['#test'] },
        video_script: { hook: { text: 'Hook', duration: '0-3s' }, segments: [] },
      };
      mockGenerateWithAI.mockResolvedValue(JSON.stringify(mockContent[platform]));
      const res = await supertest(app)
        .post('/api/demo/generate')
        .send({ topic: 'Test topic', platform });
      expect(res.status).toBe(200);
      expect(res.body.platform).toBe(platform);
    });
  });
});
