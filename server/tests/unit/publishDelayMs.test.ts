/**
 * routes/scheduledPosts.ts — publishDelayMs()
 *
 * Regression coverage for AUDIT_FINDINGS_2026-08-10.md #3 (bug-hunt, High):
 * CalendarGrid.tsx builds scheduledDate from the browser's LOCAL calendar
 * day, but publishDelayMs() used to always interpret it as a UTC calendar
 * day — for a non-UTC user, "publish at 9am" could fire up to ~16 hours off
 * from their actual 9am. The fix adds an optional timezoneOffsetMinutes
 * parameter (JS Date.getTimezoneOffset() convention) so the computed publish
 * instant reflects 9am in the caller's own timezone on that calendar day.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/db/schema.js', () => ({ scheduledPosts: {} }));
vi.mock('../../src/routes/jobs/ownership.js', () => ({ requireJobOwnership: vi.fn(), requireDbUser: vi.fn(), isValidUUID: () => true }));
vi.mock('../../src/lib/publishQueue.js', () => ({ queuePublishJob: vi.fn(), cancelPublishJob: vi.fn() }));

describe('publishDelayMs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to interpreting scheduledDate as a UTC calendar day when no offset is given', async () => {
    const { publishDelayMs } = await import('../../src/routes/scheduledPosts.js');
    const delay = publishDelayMs('2026-08-15');
    const expectedPublishAt = Date.UTC(2026, 7, 15, 9, 0, 0);
    expect(delay).toBe(expectedPublishAt - Date.now());
  });

  it('shifts the publish instant later for a positive offset (behind UTC, e.g. US Eastern UTC-5 = +300)', async () => {
    const { publishDelayMs } = await import('../../src/routes/scheduledPosts.js');
    const utcDelay = publishDelayMs('2026-08-15', 0);
    const estDelay = publishDelayMs('2026-08-15', 300);
    // 9am EST is 14:00 UTC — 5 hours (300 min) later than 9am UTC.
    expect(estDelay - utcDelay).toBe(300 * 60_000);
  });

  it('shifts the publish instant earlier for a negative offset (ahead of UTC, e.g. India UTC+5:30 = -330)', async () => {
    const { publishDelayMs } = await import('../../src/routes/scheduledPosts.js');
    const utcDelay = publishDelayMs('2026-08-15', 0);
    const istDelay = publishDelayMs('2026-08-15', -330);
    // 9am IST is 03:30 UTC — 5.5 hours (330 min) earlier than 9am UTC.
    expect(istDelay - utcDelay).toBe(-330 * 60_000);
  });

  it('a same-day local 9am near midnight UTC no longer lands on the wrong UTC calendar day', async () => {
    // WHY this case specifically: this is the failure mode the audit called
    // out as worse than "off by some hours" — near a calendar-day boundary,
    // the old UTC-only interpretation could publish on an entirely different
    // day than the one the user selected in their own timezone.
    const { publishDelayMs } = await import('../../src/routes/scheduledPosts.js');
    // A user at UTC+13 (offset -780) selecting "2026-08-15" means 9am on
    // 2026-08-15 in their own timezone, which is 2026-08-14T20:00:00Z —
    // the previous day in UTC.
    const delay = publishDelayMs('2026-08-15', -780);
    const publishAt = Date.now() + delay;
    const publishDate = new Date(publishAt);
    expect(publishDate.toISOString()).toBe('2026-08-14T20:00:00.000Z');
  });
});
