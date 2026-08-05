/**
 * routes/content/ideate — Integration Tests (I1 regenerate-one, I2 Tavily grounding)
 *
 * Mocks lib/ai.js (generateWithAI + searchTavily) and routes/users.js's
 * getUserProfile, following the same supertest-against-the-real-router
 * pattern as tests/integration/content-routes.test.ts and
 * tests/integration/competitor-route.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

vi.mock('../../src/lib/ai.js', () => ({
  generateWithAI: vi.fn(),
  searchTavily: vi.fn().mockResolvedValue({ results: [] }),
}));

vi.mock('../../src/routes/users.js', () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    brandName: 'Acme',
    brandVoice: 'professional',
    phrasesUse: '',
    phrasesAvoid: '',
    industry: 'SaaS',
  }),
}));

vi.mock('../../src/db/index.js', () => ({ db: null }));

async function buildApp(userId: string | undefined = 'user-1') {
  const { default: ideateRouter } = await import('../../src/routes/content/ideate.js');
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.dbUserId = userId;
    next();
  });
  app.use('/api/content', ideateRouter);
  return app;
}

const SINGLE_IDEA_JSON = JSON.stringify({
  title: 'The Future of SaaS Onboarding',
  platform: 'linkedin_post',
  angle: 'Contrarian take on friction-free onboarding',
  why: 'Recent search shows onboarding friction is the #1 churn driver this year.',
  sourceUrl: 'https://example.com/onboarding-trends',
  prediction: { tier: 'high', topReason: 'Timely + contrarian angle' },
});

const BATCH_IDEAS_JSON = JSON.stringify({
  ideas: [
    { title: 'Idea A', platform: 'linkedin_post', angle: 'Angle A', why: 'Why A', prediction: { tier: 'medium', topReason: 'Reason A' } },
    { title: 'Idea B', platform: 'twitter_thread', angle: 'Angle B', why: 'Why B', prediction: { tier: 'low', topReason: 'Reason B' } },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/content/ideate — I2 Tavily grounding', () => {
  it('calls searchTavily and returns ideas grounded in the response', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.searchTavily).mockResolvedValue({
      results: [{ title: 'SaaS Trend 2026', content: 'Onboarding friction is rising.', url: 'https://example.com/trend' }],
    });
    vi.mocked(aiModule.generateWithAI).mockResolvedValue(BATCH_IDEAS_JSON);

    const app = await buildApp();
    const res = await supertest(app).post('/api/content/ideate').send({ count: 2 });

    expect(res.status).toBe(200);
    expect(aiModule.searchTavily).toHaveBeenCalled();
    expect(res.body.ideas).toHaveLength(2);
  });

  it('splices Tavily search result content into the ideation prompt', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.searchTavily).mockResolvedValue({
      results: [{ title: 'Distinctive Trend Title', content: 'Distinctive trend body.', url: 'https://example.com/t' }],
    });
    vi.mocked(aiModule.generateWithAI).mockResolvedValue(BATCH_IDEAS_JSON);

    const app = await buildApp();
    await supertest(app).post('/api/content/ideate').send({ count: 2 });

    const promptArg = vi.mocked(aiModule.generateWithAI).mock.calls[0][0];
    expect(promptArg).toContain('Distinctive Trend Title');
    expect(promptArg).toContain('Distinctive trend body');
  });

  it('degrades gracefully (still 200) when all Tavily searches return empty', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.searchTavily).mockResolvedValue({ results: [] });
    vi.mocked(aiModule.generateWithAI).mockResolvedValue(BATCH_IDEAS_JSON);

    const app = await buildApp();
    const res = await supertest(app).post('/api/content/ideate').send({ count: 2 });

    expect(res.status).toBe(200);
    expect(res.body.ideas).toHaveLength(2);
  });

  it('returns ideas carrying an I4 prediction tier when the model supplies one', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.searchTavily).mockResolvedValue({ results: [] });
    vi.mocked(aiModule.generateWithAI).mockResolvedValue(BATCH_IDEAS_JSON);

    const app = await buildApp();
    const res = await supertest(app).post('/api/content/ideate').send({ count: 2 });

    expect(res.body.ideas[0].prediction.tier).toBe('medium');
    expect(res.body.ideas[1].prediction.tier).toBe('low');
  });
});

describe('POST /api/content/ideate/regenerate-one — I1', () => {
  it('returns a single idea object (not wrapped in an ideas array)', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.searchTavily).mockResolvedValue({ results: [] });
    vi.mocked(aiModule.generateWithAI).mockResolvedValue(SINGLE_IDEA_JSON);

    const app = await buildApp();
    const res = await supertest(app).post('/api/content/ideate/regenerate-one').send({});

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('The Future of SaaS Onboarding');
    expect(res.body.ideas).toBeUndefined();
  });

  it('includes excludeTitles in the prompt so the model avoids near-duplicates', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.searchTavily).mockResolvedValue({ results: [] });
    vi.mocked(aiModule.generateWithAI).mockResolvedValue(SINGLE_IDEA_JSON);

    const app = await buildApp();
    await supertest(app)
      .post('/api/content/ideate/regenerate-one')
      .send({ excludeTitles: ['Existing Idea One', 'Existing Idea Two'] });

    const promptArg = vi.mocked(aiModule.generateWithAI).mock.calls[0][0];
    expect(promptArg).toContain('Existing Idea One');
    expect(promptArg).toContain('Existing Idea Two');
  });

  it('rejects more than 10 excludeTitles (schema cap)', async () => {
    const app = await buildApp();
    const res = await supertest(app)
      .post('/api/content/ideate/regenerate-one')
      .send({ excludeTitles: Array.from({ length: 11 }, (_, i) => `Title ${i}`) });

    expect(res.status).toBe(400);
  });

  it('carries sourceUrl and prediction through when present in the model response', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.searchTavily).mockResolvedValue({ results: [] });
    vi.mocked(aiModule.generateWithAI).mockResolvedValue(SINGLE_IDEA_JSON);

    const app = await buildApp();
    const res = await supertest(app).post('/api/content/ideate/regenerate-one').send({});

    expect(res.body.sourceUrl).toBe('https://example.com/onboarding-trends');
    expect(res.body.prediction.tier).toBe('high');
  });

  it('returns 500 with a clear error when the model response is unparseable', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.searchTavily).mockResolvedValue({ results: [] });
    vi.mocked(aiModule.generateWithAI).mockResolvedValue('not valid json at all {{{');

    const app = await buildApp();
    const res = await supertest(app).post('/api/content/ideate/regenerate-one').send({});

    expect(res.status).toBe(500);
  });
});
