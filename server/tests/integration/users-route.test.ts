/**
 * routes/users — Integration Tests (P2)
 * Brand voice save/merge, analyze-voice validation, /me stats computation.
 * Uses in-memory profile store (db mocked as null, non-UUID userId).
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// ─── Mock all transitive deps before any dynamic import ─────────────────────

const mockJobsMemory = vi.hoisted(() => new Map<string, any>());

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
      NODE_ENV: 'test',
      PORT: '3001',
      CORS_ORIGINS: undefined,
      RATE_LIMIT_MAX_JOBS: '10',
    };
  },
}));

vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn() }));
vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/db/schema.js', () => ({ users: Symbol('users_table'), userOnboarding: Symbol('userOnboarding') }));
vi.mock('../../src/middleware/auth.js', () => ({}));
// Redis-backed rate limiter — bypass entirely, not what this test is about.
vi.mock('../../src/middleware/rateLimit.js', () => ({
  contentRateLimit: (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../../src/routes/jobs/index.js', () => ({
  jobsMemory: mockJobsMemory,
  default: {},
}));
vi.mock('../../src/lib/persistJob.js', () => ({ persistJobToDB: vi.fn() }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

// ─── Module-level access ─────────────────────────────────────────────────────

let usersRouter: express.Router;
let userProfiles: Map<string, any>;
let mockGenerateWithAI: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  const usersModule = await import('../../src/routes/users.js');
  usersRouter = usersModule.default as unknown as express.Router;
  userProfiles = usersModule.userProfiles as Map<string, any>;

  const aiModule = await import('../../src/lib/ai.js');
  mockGenerateWithAI = vi.mocked(aiModule.generateWithAI);
});

beforeEach(() => {
  userProfiles.clear();
  mockJobsMemory.clear();
  vi.clearAllMocks();
});

// ─── App factory ──────────────────────────────────────────────────────────────

let userCounter = 0;
function buildApp(userId?: string) {
  const uid = userId ?? `test-user-${++userCounter}`;
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = uid;
    req.dbUserId = uid;
    next();
  });
  app.use('/api/users', usersRouter);
  return { app, uid };
}

// ─── Stats computation (unit tests with inline logic) ────────────────────────

describe('stats: avgScore computation', () => {
  it('returns 0 when there are no completed jobs', () => {
    const scores: number[] = [];
    const avg = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    expect(avg).toBe(0);
  });

  it('rounds average score to the nearest integer', () => {
    const scores = [75, 80, 85];
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    expect(avg).toBe(80);
  });

  it('rounds up correctly (e.g. 76.5 → 77)', () => {
    const scores = [76, 77];
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    expect(avg).toBe(77);
  });
});

describe('stats: mostUsedPlatform computation', () => {
  it('returns platform with the most jobs', () => {
    const platformCounts: Record<string, number> = {
      linkedin_post: 5,
      twitter_thread: 2,
      instagram_carousel: 1,
    };
    const best = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'none';
    expect(best).toBe('linkedin_post');
  });

  it('returns "none" when no jobs', () => {
    const platformCounts: Record<string, number> = {};
    const best = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'none';
    expect(best).toBe('none');
  });
});

// ─── POST /brand-voice ────────────────────────────────────────────────────────

describe('POST /api/users/brand-voice', () => {
  it('returns 200 with success and profile', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/brand-voice')
      .send({ brandName: 'Acme Corp', brandVoice: 'professional' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile).toBeDefined();
  });

  it('saves brandName to profile', async () => {
    const { app } = buildApp();
    await supertest(app)
      .post('/api/users/brand-voice')
      .send({ brandName: 'TechStartup' });
    const getRes = await supertest(app).get('/api/users/me');
    expect(getRes.body.brandName).toBe('TechStartup');
  });

  it('partial update preserves existing brandVoice when omitted', async () => {
    const { app } = buildApp();
    // Set initial voice
    await supertest(app)
      .post('/api/users/brand-voice')
      .send({ brandVoice: 'casual' });
    // Update only brandName
    await supertest(app)
      .post('/api/users/brand-voice')
      .send({ brandName: 'Updated Brand' });
    const meRes = await supertest(app).get('/api/users/me');
    expect(meRes.body.brandVoice).toBe('casual');
    expect(meRes.body.brandName).toBe('Updated Brand');
  });

  it('defaults brandVoice to "professional" when never set', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/brand-voice')
      .send({ brandName: 'Test' });
    expect(res.body.profile.brandVoice).toBe('professional');
  });

  it('saves phrasesUse, phrasesAvoid, and industry', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/brand-voice')
      .send({
        phrasesUse: 'Let me show you, Here is the thing',
        phrasesAvoid: 'leverage, synergy',
        industry: 'SaaS',
      });
    expect(res.body.profile.phrasesUse).toBe('Let me show you, Here is the thing');
    expect(res.body.profile.phrasesAvoid).toBe('leverage, synergy');
    expect(res.body.profile.industry).toBe('SaaS');
  });

  it('profile includes updatedAt timestamp', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/brand-voice')
      .send({ brandName: 'Test' });
    expect(res.body.profile.updatedAt).toBeTruthy();
  });
});

// ─── POST /analyze-voice ──────────────────────────────────────────────────────

describe('POST /api/users/analyze-voice', () => {
  it('returns 400 when samples is shorter than 50 characters', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/analyze-voice')
      .send({ samples: 'Too short.' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when samples is empty string', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/analyze-voice')
      .send({ samples: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when samples is null', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/analyze-voice')
      .send({ samples: null });
    expect(res.status).toBe(400);
  });

  it('returns 400 when samples is not a string (number)', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/analyze-voice')
      .send({ samples: 12345 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when samples is missing from body', async () => {
    const { app } = buildApp();
    const res = await supertest(app)
      .post('/api/users/analyze-voice')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 with contentDna when AI returns valid JSON', async () => {
    const { app } = buildApp();
    const fakeDna = {
      avgSentenceWords: 12,
      hookPattern: 'Question hook',
      emojiFrequency: 'Sparse (1-2)',
      ctaStyle: 'Direct question',
      structuralSignature: 'Short punchy paragraphs',
      vocabularyLevel: 'Professional & formal',
      writingPersonality: 'Data-driven thought leader',
      keyPhrasePatterns: ['Here is the thing', 'Let me break this down'],
    };
    mockGenerateWithAI.mockResolvedValueOnce(JSON.stringify(fakeDna));

    const validSamples = 'Here are some sample posts that are long enough to meet the minimum requirement for analysis.';
    const res = await supertest(app)
      .post('/api/users/analyze-voice')
      .send({ samples: validSamples });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.contentDna).toBeDefined();
    expect(res.body.contentDna.hookPattern).toBe('Question hook');
  });

  it('accepts JSON wrapped in markdown code fence', async () => {
    const { app } = buildApp();
    const fakeDna = { hookPattern: 'Bold claim', avgSentenceWords: 8 };
    mockGenerateWithAI.mockResolvedValueOnce(
      '```json\n' + JSON.stringify(fakeDna) + '\n```'
    );

    const validSamples = 'A' .repeat(60);
    const res = await supertest(app)
      .post('/api/users/analyze-voice')
      .send({ samples: validSamples });
    expect(res.status).toBe(200);
    expect(res.body.contentDna.hookPattern).toBe('Bold claim');
  });
});

// ─── GET /me ──────────────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('returns 200 with profile and stats', async () => {
    const { app } = buildApp();
    const res = await supertest(app).get('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
  });

  it('stats.totalPosts is 0 when no jobs exist', async () => {
    const { app } = buildApp();
    const res = await supertest(app).get('/api/users/me');
    expect(res.body.stats.totalPosts).toBe(0);
  });

  it('stats.avgScore is 0 when no completed jobs', async () => {
    const { app } = buildApp();
    const res = await supertest(app).get('/api/users/me');
    expect(res.body.stats.avgScore).toBe(0);
  });

  it('stats.mostUsedPlatform is "none" when no jobs', async () => {
    const { app } = buildApp();
    const res = await supertest(app).get('/api/users/me');
    expect(res.body.stats.mostUsedPlatform).toBe('none');
  });

  it('stats.quickTips is an array of max 3 strings', async () => {
    const { app } = buildApp();
    const res = await supertest(app).get('/api/users/me');
    expect(Array.isArray(res.body.stats.quickTips)).toBe(true);
    expect(res.body.stats.quickTips.length).toBeLessThanOrEqual(3);
    expect(res.body.stats.quickTips.every((t: any) => typeof t === 'string')).toBe(true);
  });

  it('stats.platformBreakdown is an array', async () => {
    const { app } = buildApp();
    const res = await supertest(app).get('/api/users/me');
    expect(Array.isArray(res.body.stats.platformBreakdown)).toBe(true);
  });

  it('returns brand voice profile fields in response', async () => {
    const { app } = buildApp();
    // Set a profile first
    await supertest(app)
      .post('/api/users/brand-voice')
      .send({ brandName: 'Contoso', brandVoice: 'witty', industry: 'Tech' });

    const res = await supertest(app).get('/api/users/me');
    expect(res.body.brandName).toBe('Contoso');
    expect(res.body.brandVoice).toBe('witty');
    expect(res.body.industry).toBe('Tech');
  });

  it('computes totalPosts from completed jobs in jobsMemory', async () => {
    const uid = `stats-user-${++userCounter}`;
    const { app } = buildApp(uid);

    // Inject completed jobs into mockJobsMemory
    mockJobsMemory.set('job-1', {
      id: 'job-1',
      userId: uid,
      status: 'done',
      platform: 'linkedin_post',
      deleted: 0,
    });
    mockJobsMemory.set('job-2', {
      id: 'job-2',
      userId: uid,
      status: 'done',
      platform: 'twitter_thread',
      deleted: 0,
    });
    mockJobsMemory.set('job-3', {
      id: 'job-3',
      userId: uid,
      status: 'pending',
      platform: 'linkedin_post',
      deleted: 0,
    });

    const res = await supertest(app).get('/api/users/me');
    expect(res.body.stats.totalPosts).toBe(2); // only 'done' jobs
  });

  it('mostUsedPlatform reflects platform with most completed jobs', async () => {
    const uid = `best-plat-${++userCounter}`;
    const { app } = buildApp(uid);

    for (let i = 0; i < 3; i++) {
      mockJobsMemory.set(`lp-${i}`, {
        id: `lp-${i}`,
        userId: uid,
        status: 'done',
        platform: 'linkedin_post',
        deleted: 0,
      });
    }
    mockJobsMemory.set('tt-1', {
      id: 'tt-1',
      userId: uid,
      status: 'done',
      platform: 'twitter_thread',
      deleted: 0,
    });

    const res = await supertest(app).get('/api/users/me');
    expect(res.body.stats.mostUsedPlatform).toBe('linkedin_post');
  });
});

// ─── GET /me/export & DELETE /me (db unavailable in this test file) ─────────

describe('GET /api/users/me/export', () => {
  it('returns 503 when database is not configured', async () => {
    const { app } = buildApp();
    const res = await supertest(app).get('/api/users/me/export');
    expect(res.status).toBe(503);
  });
});

describe('DELETE /api/users/me', () => {
  it('returns 503 when database is not configured', async () => {
    const { app } = buildApp();
    const res = await supertest(app).delete('/api/users/me');
    expect(res.status).toBe(503);
  });
});
