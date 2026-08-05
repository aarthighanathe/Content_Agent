/**
 * routes/users — getUserProfile / saveUserProfile (data-consistency fix)
 *
 * Prior bug: POST /brand-voice, /analyze-voice, and the onboarding brand-name/
 * tone persist wrote to the in-memory userProfiles Map unconditionally, then
 * best-effort wrote to the DB with only a console.error on failure — so a
 * transient DB failure (e.g. a documented Neon cold-start stall) left the Map
 * looking consistent while the DB silently never got the update, and the next
 * restart or a request to a different instance served stale data with no
 * error anywhere. Separately, content-generation routes read
 * `userProfiles.get(userId) || {}` directly with no DB fallback on a Map
 * miss, unlike GET /me.
 *
 * This suite verifies the fix directly against the exported helpers:
 * - getUserProfile() falls back to the DB on a Map miss (matches GET /me)
 * - saveUserProfile() is cache-aside: the Map is updated only after a
 *   confirmed successful DB write; on DB failure it returns
 *   { success: false } and leaves the Map untouched, with the failure logged
 *   to Sentry.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn() }));
vi.mock('../../src/routes/jobs/index.js', () => ({ jobsMemory: new Map() }));
vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));

const findFirstMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();

const dbMock = {
  query: {
    users: { findFirst: findFirstMock },
  },
  update: vi.fn(() => ({
    set: (...args: unknown[]) => {
      updateSetMock(...args);
      return { where: updateWhereMock };
    },
  })),
};

vi.mock('../../src/db/index.js', () => ({ db: dbMock }));
vi.mock('../../src/db/schema.js', () => ({
  users: '__users__',
  userOnboarding: '__userOnboarding__',
  contentJobs: { id: 'contentJobs.id', userId: 'contentJobs.userId' },
  contentOutputs: { jobId: 'contentOutputs.jobId' },
  agentLogs: { jobId: 'agentLogs.jobId' },
  socialTokens: { userId: 'socialTokens.userId', platform: 'socialTokens.platform', displayName: 'socialTokens.displayName', createdAt: 'socialTokens.createdAt', id: 'socialTokens.id' },
}));

const REAL_USER_ID = '11111111-1111-1111-1111-111111111111';

describe('getUserProfile / saveUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateWhereMock.mockResolvedValue(undefined);
  });

  describe('getUserProfile — DB fallback on Map miss', () => {
    it('falls back to the DB when the Map has no entry (matches GET /me behavior)', async () => {
      findFirstMock.mockResolvedValueOnce({
        id: REAL_USER_ID,
        brandName: 'Acme Corp',
        brandVoice: 'witty',
        phrasesUse: 'game-changer',
        phrasesAvoid: 'synergy',
        contentDna: { hookPattern: 'Question hook' },
      });

      const { getUserProfile, userProfiles } = await import('../../src/routes/users.js');
      userProfiles.clear();

      const profile = await getUserProfile(REAL_USER_ID);

      expect(findFirstMock).toHaveBeenCalledTimes(1);
      expect(profile.brandName).toBe('Acme Corp');
      expect(profile.brandVoice).toBe('witty');
      expect(profile.contentDna).toEqual({ hookPattern: 'Question hook' });
    });

    it('populates the Map after a DB fallback so the next read is a cache hit', async () => {
      findFirstMock.mockResolvedValueOnce({
        id: REAL_USER_ID,
        brandName: 'Acme Corp',
        brandVoice: 'witty',
        phrasesUse: '',
        phrasesAvoid: '',
        contentDna: null,
      });

      const { getUserProfile, userProfiles } = await import('../../src/routes/users.js');
      userProfiles.clear();

      await getUserProfile(REAL_USER_ID);
      await getUserProfile(REAL_USER_ID);

      // Only one DB round-trip — the second call was served from the Map.
      expect(findFirstMock).toHaveBeenCalledTimes(1);
    });

    it('returns a default empty profile when the DB has no matching row (never throws)', async () => {
      findFirstMock.mockResolvedValueOnce(undefined);

      const { getUserProfile, userProfiles } = await import('../../src/routes/users.js');
      userProfiles.clear();

      const profile = await getUserProfile(REAL_USER_ID);

      expect(profile).toEqual({
        brandName: '',
        brandVoice: 'professional',
        phrasesUse: '',
        phrasesAvoid: '',
        industry: '',
      });
    });

    it('does not hit the DB for a non-UUID userId (e.g. the demo fallback)', async () => {
      const { getUserProfile, userProfiles } = await import('../../src/routes/users.js');
      userProfiles.clear();

      const profile = await getUserProfile('demo');

      expect(findFirstMock).not.toHaveBeenCalled();
      expect(profile.brandVoice).toBe('professional');
    });
  });

  describe('saveUserProfile — cache-aside write', () => {
    it('updates the Map only after a confirmed successful DB write', async () => {
      const { saveUserProfile, userProfiles } = await import('../../src/routes/users.js');
      userProfiles.clear();

      const result = await saveUserProfile(REAL_USER_ID, { brandName: 'New Name' });

      expect(result.success).toBe(true);
      expect(updateWhereMock).toHaveBeenCalledTimes(1);
      expect(userProfiles.get(REAL_USER_ID)?.brandName).toBe('New Name');
    });

    it('on DB write failure: returns { success: false }, leaves the Map untouched, and reports to Sentry', async () => {
      const Sentry = await import('@sentry/node');
      const { saveUserProfile, userProfiles } = await import('../../src/routes/users.js');
      userProfiles.clear();
      userProfiles.set(REAL_USER_ID, {
        brandName: 'Original Name',
        brandVoice: 'professional',
        phrasesUse: '',
        phrasesAvoid: '',
        industry: '',
      });

      updateWhereMock.mockRejectedValueOnce(new Error('connection terminated (Neon cold start)'));

      const result = await saveUserProfile(REAL_USER_ID, { brandName: 'Attempted New Name' });

      expect(result.success).toBe(false);
      // WHY this is the core regression check: the old code set the Map
      // unconditionally BEFORE attempting the DB write, so a DB failure still
      // left the Map holding the new (unpersisted) value. The fix must leave
      // the Map holding the last DURABLE value instead.
      expect(userProfiles.get(REAL_USER_ID)?.brandName).toBe('Original Name');
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it('writes through the Map directly for a non-UUID userId (no DB identity exists to write to)', async () => {
      const { saveUserProfile, userProfiles } = await import('../../src/routes/users.js');
      userProfiles.clear();

      const result = await saveUserProfile('demo', { brandName: 'Demo Brand' });

      expect(result.success).toBe(true);
      expect(dbMock.update).not.toHaveBeenCalled();
      expect(userProfiles.get('demo')?.brandName).toBe('Demo Brand');
    });
  });
});
