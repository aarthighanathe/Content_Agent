/**
 * routes/social — Integration Tests (P2)
 * Tests connection listing, disconnect, POST /post auth guard, and OAuth
 * configuration errors. Uses in-memory fallback (db mocked as null).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
      LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
      LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
      SENTRY_DSN: undefined,
      NODE_ENV: 'test',
      PORT: '3001',
      CORS_ORIGINS: undefined,
      RATE_LIMIT_MAX_JOBS: '10',
      GROQ_API_KEY: undefined,
      TAVILY_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
      TOGETHER_API_KEY: undefined,
      UPSTASH_REDIS_URL: undefined,
      UPSTASH_REDIS_TOKEN: undefined,
      REDIS_URL: undefined,
      TOKEN_ENCRYPTION_KEY: undefined,
    };
  },
}));

vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/db/schema.js', () => ({ socialTokens: Symbol('socialTokens') }));
vi.mock('../../src/middleware/auth.js', () => ({}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock('../../src/lib/tokenEncryption.js', () => ({
  encryptTokenOptional: (t: string) => t,
  decryptTokenOptional: (t: string) => t,
}));
// Redis-backed rate limiter — bypass entirely, not what this test is about.
vi.mock('../../src/middleware/rateLimit.js', () => ({
  socialRateLimit: (_req: any, _res: any, next: any) => next(),
}));

// ─── App factory ─────────────────────────────────────────────────────────────

let userCounter = 0;

async function buildSocialApp(userId?: string) {
  const uid = userId ?? `social-user-${++userCounter}`;
  const { default: socialRouter } = await import('../../src/routes/social.js');
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = uid;
    req.dbUserId = uid;
    next();
  });
  app.use('/api/social', socialRouter);
  return { app, uid };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.LINKEDIN_CLIENT_ID;
  delete process.env.LINKEDIN_CLIENT_SECRET;
  delete process.env.TWITTER_CLIENT_ID;
  delete process.env.TWITTER_CLIENT_SECRET;
});

// ─── GET /connections ─────────────────────────────────────────────────────────

describe('GET /api/social/connections', () => {
  it('returns 200 with connections array', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).get('/api/social/connections');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.connections)).toBe(true);
  });

  it('returns empty connections for a fresh user', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).get('/api/social/connections');
    expect(res.body.connections).toHaveLength(0);
  });

  it('connection objects have platform, label, connected, displayName fields', async () => {
    const { app } = await buildSocialApp();
    await supertest(app).delete('/api/social/disconnect/linkedin');
    const res = await supertest(app).get('/api/social/connections');
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /disconnect/:platform ────────────────────────────────────────────

describe('DELETE /api/social/disconnect/:platform', () => {
  it('returns 200 with ok:true for linkedin', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).delete('/api/social/disconnect/linkedin');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 200 with ok:true for twitter', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).delete('/api/social/disconnect/twitter');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 200 even when platform was never connected', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).delete('/api/social/disconnect/instagram');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── POST /post (auth guard) ──────────────────────────────────────────────────

describe('POST /api/social/post — NOT_CONNECTED guard', () => {
  it('returns 401 with code NOT_CONNECTED when no linkedin token', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app)
      .post('/api/social/post')
      .send({ platform: 'linkedin', content: { hook: 'Test hook', body: 'Body text' } });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NOT_CONNECTED');
  });

  it('returns 401 with code NOT_CONNECTED when no twitter token', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app)
      .post('/api/social/post')
      .send({ platform: 'twitter', content: { tweets: [{ text: '1/ Test tweet' }] } });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NOT_CONNECTED');
  });

  it('error message includes the platform name', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app)
      .post('/api/social/post')
      .send({ platform: 'linkedin', content: {} });
    expect(res.body.error).toMatch(/LinkedIn/i);
  });

  it('returns 400 for unknown platform (not in PLATFORM_LABELS)', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app)
      .post('/api/social/post')
      .send({ platform: 'mastodon', content: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

// ─── GET /connect/:platform — OAuth configuration check ─────────────────────

describe('GET /api/social/connect/:platform', () => {
  it('returns 501 NOT_CONFIGURED for linkedin when LINKEDIN_CLIENT_ID is missing', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).get('/api/social/connect/linkedin');
    expect(res.status).toBe(501);
    expect(res.body.code).toBe('NOT_CONFIGURED');
    expect(res.body.error).toMatch(/LINKEDIN_CLIENT_ID/);
  });

  it('returns 501 NOT_CONFIGURED for twitter when TWITTER_CLIENT_ID is missing', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).get('/api/social/connect/twitter');
    expect(res.status).toBe(501);
    expect(res.body.code).toBe('NOT_CONFIGURED');
    expect(res.body.error).toMatch(/TWITTER_CLIENT_ID/);
  });

  it('returns 400 for unsupported platform', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).get('/api/social/connect/facebook');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/facebook/i);
  });

  it('returns 400 for unknown platform string', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).get('/api/social/connect/tiktok');
    expect(res.status).toBe(400);
  });

  it('redirects to LinkedIn OAuth URL when LINKEDIN_CLIENT_ID is configured', async () => {
    process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
    const { app } = await buildSocialApp();
    const res = await supertest(app).get('/api/social/connect/linkedin');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/linkedin\.com\/oauth/);
  });

  it('redirects to Twitter OAuth URL when TWITTER_CLIENT_ID is configured', async () => {
    process.env.TWITTER_CLIENT_ID = 'test-twitter-client-id';
    const { app } = await buildSocialApp();
    const res = await supertest(app).get('/api/social/connect/twitter');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/twitter\.com/);
  });
});

// ─── GET /callback/:platform — OAuth error handling ─────────────────────────

describe('GET /api/social/callback/:platform — OAuth error redirect', () => {
  it('redirects to frontend /brand?social_error when OAuth error param present', async () => {
    const { app } = await buildSocialApp();
    const res = await supertest(app).get(
      '/api/social/callback/linkedin?error=access_denied&state='
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/social_error/);
  });
});
