/**
 * routes/social — dbUpsertToken atomic-upsert coverage.
 *
 * WHY this file exists: social-route.test.ts always mocks `db: null`, so it
 * exercises only the in-memory fallback store and never the real Drizzle
 * `db.insert(socialTokens).values(...).onConflictDoUpdate(...)` path added to
 * fix the token-upsert race (two concurrent OAuth callbacks for the same
 * user+platform could previously both miss an existing row and both INSERT,
 * creating silent duplicate rows — see schema.ts's WHY comment on
 * idx_social_tokens_user_platform). This drives the real GET
 * /api/social/callback/:platform route end-to-end against a fake db that
 * mimics Drizzle's real conflict-detection semantics (keyed by
 * userId+platform, matching the new unique index), to prove a second
 * callback for the same user+platform upserts in place rather than creating
 * a second row.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { createHmac } from 'crypto';

const OAUTH_STATE_SECRET = 'test-oauth-secret-that-is-long-enough-32';

vi.mock('../../src/config.js', () => ({
  env: {
    DATABASE_URL: 'postgres://test',
    CLERK_SECRET_KEY: 'test_secret',
    GEMINI_API_KEY: 'test_key',
    OAUTH_STATE_SECRET,
    APP_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
    LINKEDIN_CLIENT_ID: 'test-linkedin-client-id',
    LINKEDIN_CLIENT_SECRET: 'test-linkedin-client-secret',
    TWITTER_CLIENT_ID: undefined,
    TWITTER_CLIENT_SECRET: undefined,
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
  },
}));

vi.mock('../../src/lib/tokenEncryption.js', () => ({
  encryptTokenOptional: (t: string | undefined) => t,
  decryptTokenOptional: (t: string | undefined) => t,
}));

vi.mock('../../src/middleware/rateLimit.js', () => ({
  socialRateLimit: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/db/schema.js', () => ({
  socialTokens: { userId: 'userId', platform: 'platform' },
}));

// WHY mock drizzle-orm's eq/and: reduces columns to their plain FakeRow
// property names (matching the schema mock above), so the fake db below can
// interpret conditions directly against FakeRow objects — same approach as
// tests/integration/competitor-route.test.ts.
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (column: string, value: unknown) => ({ column, value }),
    and: (...conditions: Array<{ column: string; value: unknown }>) => conditions,
  };
});

interface FakeTokenRow {
  id: string;
  userId: string;
  platform: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  displayName: string | null;
  platformUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const rows = vi.hoisted(() => [] as FakeTokenRow[]);
let idCounter = 0;

function resetFakeDb() {
  rows.length = 0;
  idCounter = 0;
}

// WHY this mimics Drizzle's real onConflictDoUpdate semantics (not just a
// blind push): the whole point of this test is proving the unique
// (userId, platform) constraint is honored atomically — a fake that always
// inserted would hide the exact duplicate-row bug being tested for.
const fakeDb = {
  select: () => ({
    from: (_table: unknown) => ({
      where: async (conditions: Array<{ column: keyof FakeTokenRow; value: unknown }> | { column: keyof FakeTokenRow; value: unknown }) => {
        const condList = Array.isArray(conditions) ? conditions : [conditions];
        return rows.filter((row) => condList.every((c) => row[c.column] === c.value));
      },
    }),
  }),
  insert: (_table: unknown) => ({
    values: (val: { userId: string; platform: string; accessToken: string; refreshToken?: string | null; expiresAt?: number; displayName?: string; platformUserId?: string }) => ({
      onConflictDoUpdate: async (opts: { set: Partial<FakeTokenRow> }) => {
        const existing = rows.find((r) => r.userId === val.userId && r.platform === val.platform);
        if (existing) {
          Object.assign(existing, opts.set);
        } else {
          rows.push({
            id: `token-${++idCounter}`,
            refreshToken: null,
            expiresAt: null,
            displayName: null,
            platformUserId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...val,
          });
        }
      },
    }),
  }),
  delete: (_table: unknown) => ({
    where: async (conditions: Array<{ column: keyof FakeTokenRow; value: unknown }>) => {
      const before = rows.length;
      const keep = rows.filter((row) => !conditions.every((c) => row[c.column] === c.value));
      rows.length = 0;
      rows.push(...keep);
      return { rowCount: before - rows.length };
    },
  }),
};

vi.mock('../../src/db/index.js', () => ({
  get db() { return fakeDb; },
}));

function signOAuthState(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = createHmac('sha256', OAUTH_STATE_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

async function buildApp() {
  const { default: socialRouter } = await import('../../src/routes/social.js');
  const app = express();
  app.use(express.json());
  app.use('/api/social', socialRouter);
  return app;
}

const USER_ID = 'user-linkedin-1';

beforeEach(() => {
  resetFakeDb();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('accessToken')) {
      return { json: async () => ({ access_token: 'token-abc', expires_in: 3600 }) } as Response;
    }
    if (url.includes('api.linkedin.com/v2/me')) {
      return { json: async () => ({ localizedFirstName: 'Ada', localizedLastName: 'Lovelace' }) } as Response;
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));
});

describe('GET /api/social/callback/linkedin — atomic token upsert', () => {
  it('creates exactly one row on first connect', async () => {
    const app = await buildApp();
    const state = signOAuthState({ userId: USER_ID, platform: 'linkedin', nonce: 'n1' });

    const res = await supertest(app).get('/api/social/callback/linkedin').query({ code: 'code1', state });

    expect(res.status).toBe(302);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(USER_ID);
    expect(rows[0].platform).toBe('linkedin');
    expect(rows[0].accessToken).toBe('token-abc');
  });

  it('a second callback for the same user+platform updates in place — no duplicate row', async () => {
    const app = await buildApp();
    const state = signOAuthState({ userId: USER_ID, platform: 'linkedin', nonce: 'n1' });

    await supertest(app).get('/api/social/callback/linkedin').query({ code: 'code1', state });
    expect(rows).toHaveLength(1);
    const firstId = rows[0].id;

    // WHY a second real callback (not a hand-called upsert): reproduces the
    // exact scenario the fix targets — an OAuth callback retry, or the user
    // reconnecting the same platform — hitting the real route a second time.
    await supertest(app).get('/api/social/callback/linkedin').query({ code: 'code2', state });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(firstId);
  });

  it('concurrent callbacks for the same user+platform resolve to one row, not two', async () => {
    const app = await buildApp();
    const state = signOAuthState({ userId: USER_ID, platform: 'linkedin', nonce: 'n1' });

    // WHY Promise.all, not sequential awaits: this is the exact race the fix
    // closes — two upserts for the same (userId, platform) landing
    // concurrently. The fake db's onConflictDoUpdate is synchronous JS (no
    // real interleaving), so this mainly guards against a future regression
    // reintroducing a two-step select-then-branch shape that *would* race.
    await Promise.all([
      supertest(app).get('/api/social/callback/linkedin').query({ code: 'codeA', state }),
      supertest(app).get('/api/social/callback/linkedin').query({ code: 'codeB', state }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(USER_ID);
    expect(rows[0].platform).toBe('linkedin');
  });

  it('GET /connections reflects the upserted row via the real db.select() path', async () => {
    const app = await buildApp();
    const state = signOAuthState({ userId: USER_ID, platform: 'linkedin', nonce: 'n1' });
    await supertest(app).get('/api/social/callback/linkedin').query({ code: 'code1', state });

    const app2 = express();
    app2.use(express.json());
    app2.use((req: any, _res, next) => { req.dbUserId = USER_ID; next(); });
    const { default: socialRouter } = await import('../../src/routes/social.js');
    app2.use('/api/social', socialRouter);

    const res = await supertest(app2).get('/api/social/connections');
    expect(res.status).toBe(200);
    expect(res.body.connections).toHaveLength(1);
    expect(res.body.connections[0]).toMatchObject({ platform: 'linkedin', connected: true });
  });
});
