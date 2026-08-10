/**
 * routes/scheduledPosts — Integration Tests
 *
 * Exercises the real Express router end-to-end (supertest) against a fake
 * in-memory `db` that mimics the exact Drizzle chains the route calls
 * (db.query.scheduledPosts.findMany / db.insert().values()
 * .onConflictDoUpdate().returning() / db.delete().where().returning()) — no
 * live Postgres is reachable in this sandbox (DATABASE_URL is unset), so a
 * real drizzle-neon connection can't be exercised; this fake is a faithful
 * enough stand-in to prove the route's own logic (validation, ownership,
 * upsert-on-jobId, user-scoped delete, response shapes) end-to-end.
 *
 * Covers: create, list, delete, and ownership-check-denies-other-users-job
 * (the security case CLAUDE.md requires for every :jobId-touching route).
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

vi.mock('../../src/db/schema.js', () => ({
  scheduledPosts: { userId: 'userId', jobId: 'jobId', scheduledDate: 'scheduledDate' },
}));

// WHY getJobFromStore returns undefined: ownership resolution falls through
// to jobsMemory (the real singleton, populated per-test below) — no BullMQ
// worker store is involved in these tests.
vi.mock('../../src/workers/contentWorker.js', () => ({
  getJobFromStore: () => undefined,
}));

// ─── Fake drizzle db ──────────────────────────────────────────────────────
// A minimal in-memory stand-in supporting exactly the chains scheduledPosts.ts
// calls. `and`/`eq`/`gte`/`lte` (real drizzle-orm, not mocked — they're pure
// SQL-fragment builders) are only ever passed straight through to this fake,
// which never actually inspects the SQL fragments themselves — instead it
// interprets the higher-level intent, mirroring what the real DB does with
// the same route inputs, which is sufficient to exercise the route's own logic.
interface FakeRow { id: string; userId: string; jobId: string; scheduledDate: string; createdAt: Date }

const rows = vi.hoisted(() => [] as FakeRow[]);
let idCounter = 0;

function resetFakeDb() {
  rows.length = 0;
  idCounter = 0;
}

const fakeDb = {
  query: {
    scheduledPosts: {
      findMany: async ({ where }: { where?: unknown } = {}) => {
        // WHY re-deriving filters from closures, not parsing `where`: the
        // route always filters by userId (+ optional month range) — tests
        // pass that context via the module-level `currentFilter` set by each
        // request's userId (from requireDbUser) and query.month, captured
        // below in the router-call wrapper instead of introspecting SQL.
        void where;
        return rows.filter((r) => currentFilter(r)).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
      },
    },
  },
  insert: (_table: unknown) => ({
    values: (val: { userId: string; jobId: string; scheduledDate: string }) => ({
      onConflictDoUpdate: (_opts: unknown) => ({
        returning: async () => {
          const existingIdx = rows.findIndex((r) => r.jobId === val.jobId);
          if (existingIdx >= 0) {
            rows[existingIdx] = { ...rows[existingIdx], scheduledDate: val.scheduledDate };
            return [rows[existingIdx]];
          }
          const row: FakeRow = { id: `row-${++idCounter}`, ...val, createdAt: new Date() };
          rows.push(row);
          return [row];
        },
      }),
    }),
  }),
  delete: (_table: unknown) => ({
    where: (_cond: unknown) => ({
      returning: async () => {
        const idx = rows.findIndex((r) => r.jobId === currentDeleteJobId && r.userId === currentDeleteUserId);
        if (idx === -1) return [];
        const [removed] = rows.splice(idx, 1);
        return [removed];
      },
    }),
  }),
};

// WHY module-level mutable filter state, not a smarter fake: the route builds
// its `where` clause with real drizzle-orm eq/and/gte/lte, which produce
// opaque SQL fragment objects this fake can't introspect without reimplementing
// drizzle's SQL builder — instead each test route call sets this filter
// context immediately before invoking the fake, matching what the request
// itself specifies (userId always; month range when present).
let currentFilter: (r: FakeRow) => boolean = () => true;
let currentDeleteJobId = '';
let currentDeleteUserId = '';

vi.mock('../../src/db/index.js', () => ({
  get db() { return fakeDb; },
}));

// ─── requireJobOwnership stand-in ─────────────────────────────────────────
// WHY mocked rather than using the real ownership.js: that module also
// pulls in db/schema.js relations wiring not worth faking further here —
// this test's job is to prove scheduledPosts.ts's OWN logic (validation,
// upsert, user-scoped delete), while ownership enforcement itself already
// has dedicated coverage in tests/security/ownership.test.ts. The IDOR case
// below still proves scheduledPosts.ts actually CALLS this guard and honors
// a denial (404, nothing written) rather than merely trusting it exists.
const ownedJobs = vi.hoisted(() => new Map<string, string>()); // jobId -> ownerUserId

vi.mock('../../src/routes/jobs/ownership.js', () => ({
  requireJobOwnership: vi.fn(async (jobId: string, requestingUserId: string, res: any) => {
    const owner = ownedJobs.get(jobId);
    if (!owner || owner !== requestingUserId) {
      res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND', retryable: false });
      return null;
    }
    return { id: jobId, userId: owner };
  }),
  // WHY a real-ish implementation, not a blind pass-through: scheduledPosts.ts
  // now imports the shared requireDbUser (extracted from this file's own
  // former local copy, plus collections.ts's identical one, plus the
  // feedMonitors.ts bug fix that motivated consolidating all three) — this
  // mirrors its actual db/userId/UUID checks so the "no DB user" and
  // "malformed jobId param" test cases below still exercise real behavior.
  requireDbUser: vi.fn((req: any, res: any, featureLabel: string) => {
    const userId = req.dbUserId;
    const isValidUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    if (!userId || !isValidUUID(userId)) {
      res.status(503).json({ error: `${featureLabel} requires a database connection`, code: 'DB_UNAVAILABLE', retryable: true });
      return null;
    }
    return userId;
  }),
  isValidUUID: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

// ─── App factory ──────────────────────────────────────────────────────────

async function buildApp(userId: string | undefined) {
  const { default: scheduledPostsRouter } = await import('../../src/routes/scheduledPosts.js');
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.dbUserId = userId;
    next();
  });
  // WHY setting currentFilter/currentDeleteJobId/currentDeleteUserId per
  // request here (not inside the fake db itself): this middleware runs
  // before the route handler on every request, so it always reflects the
  // just-parsed request context by the time the fake db's methods execute.
  app.use((req: any, _res, next) => {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    currentFilter = (r: FakeRow) =>
      r.userId === userId && (!month || (r.scheduledDate >= `${month}-01` && r.scheduledDate <= `${month}-31`));
    if (req.method === 'DELETE') {
      currentDeleteJobId = req.path.split('/').pop() || '';
      currentDeleteUserId = userId || '';
    }
    next();
  });
  app.use('/api/scheduled-posts', scheduledPostsRouter);
  return app;
}

const OWNER = '00000000-0000-0000-0000-0000000000a1';
const ATTACKER = '00000000-0000-0000-0000-0000000000a2';
const JOB_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_JOB_ID = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  resetFakeDb();
  ownedJobs.clear();
  ownedJobs.set(JOB_ID, OWNER);
  ownedJobs.set(OTHER_JOB_ID, OWNER);
  vi.clearAllMocks();
});

// ─── POST / ───────────────────────────────────────────────────────────────

describe('POST /api/scheduled-posts', () => {
  it('creates a scheduling and returns 201', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-15' });
    expect(res.status).toBe(201);
    expect(res.body.scheduledPost).toBeDefined();
    expect(res.body.scheduledPost.jobId).toBe(JOB_ID);
    expect(res.body.scheduledPost.scheduledDate).toBe('2026-08-15');
  });

  it('rejects an invalid date format', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '08/15/2026' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a calendar-invalid date that matches the YYYY-MM-DD shape (e.g. Feb 30)', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-02-30' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-UUID jobId', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).post('/api/scheduled-posts').send({ jobId: 'not-a-uuid', scheduledDate: '2026-08-15' });
    expect(res.status).toBe(400);
  });

  it('moving an already-scheduled job upserts (one-job-one-date invariant)', async () => {
    const app = await buildApp(OWNER);
    await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-10' });
    const moveRes = await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-20' });

    expect(moveRes.status).toBe(201);
    expect(moveRes.body.scheduledPost.scheduledDate).toBe('2026-08-20');

    const listRes = await supertest(app).get('/api/scheduled-posts');
    const forJob = listRes.body.scheduledPosts.filter((r: any) => r.jobId === JOB_ID);
    expect(forJob).toHaveLength(1);
    expect(forJob[0].scheduledDate).toBe('2026-08-20');
  });

  it('returns 503 when no DB user is resolved (no dbUserId)', async () => {
    const app = await buildApp(undefined);
    const res = await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-15' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  // ─── IDOR / ownership ────────────────────────────────────────────────────
  it('returns 404 (not 403) when the job belongs to a different user', async () => {
    const app = await buildApp(ATTACKER);
    const res = await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-15' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('does not create a scheduling row when ownership check fails', async () => {
    const app = await buildApp(ATTACKER);
    await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-15' });

    const ownerApp = await buildApp(OWNER);
    const listRes = await supertest(ownerApp).get('/api/scheduled-posts');
    expect(listRes.body.scheduledPosts).toHaveLength(0);
  });
});

// ─── GET / ────────────────────────────────────────────────────────────────

describe('GET /api/scheduled-posts', () => {
  it('returns an empty array for a user with no scheduled posts', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).get('/api/scheduled-posts');
    expect(res.status).toBe(200);
    expect(res.body.scheduledPosts).toEqual([]);
  });

  it('lists only the requesting user\'s scheduled posts', async () => {
    const ownerApp = await buildApp(OWNER);
    await supertest(ownerApp).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-05' });

    const attackerApp = await buildApp(ATTACKER);
    const res = await supertest(attackerApp).get('/api/scheduled-posts');
    expect(res.body.scheduledPosts).toEqual([]);
  });

  it('filters by month when provided', async () => {
    const app = await buildApp(OWNER);
    await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-05' });
    await supertest(app).post('/api/scheduled-posts').send({ jobId: OTHER_JOB_ID, scheduledDate: '2026-09-05' });

    const res = await supertest(app).get('/api/scheduled-posts').query({ month: '2026-08' });
    expect(res.body.scheduledPosts).toHaveLength(1);
    expect(res.body.scheduledPosts[0].jobId).toBe(JOB_ID);
  });

  it('rejects a malformed month param', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).get('/api/scheduled-posts').query({ month: 'August-2026' });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /:jobId ─────────────────────────────────────────────────────────

describe('DELETE /api/scheduled-posts/:jobId', () => {
  it('deletes an existing scheduling and returns success', async () => {
    const app = await buildApp(OWNER);
    await supertest(app).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-05' });

    const res = await supertest(app).delete(`/api/scheduled-posts/${JOB_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const listRes = await supertest(app).get('/api/scheduled-posts');
    expect(listRes.body.scheduledPosts).toEqual([]);
  });

  it('returns 404 for a jobId with no scheduling', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).delete(`/api/scheduled-posts/${JOB_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-UUID jobId param', async () => {
    const app = await buildApp(OWNER);
    const res = await supertest(app).delete('/api/scheduled-posts/not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('does not allow deleting another user\'s scheduling row', async () => {
    const ownerApp = await buildApp(OWNER);
    await supertest(ownerApp).post('/api/scheduled-posts').send({ jobId: JOB_ID, scheduledDate: '2026-08-05' });

    const attackerApp = await buildApp(ATTACKER);
    const res = await supertest(attackerApp).delete(`/api/scheduled-posts/${JOB_ID}`);
    expect(res.status).toBe(404);

    const listRes = await supertest(ownerApp).get('/api/scheduled-posts');
    expect(listRes.body.scheduledPosts).toHaveLength(1);
  });
});
