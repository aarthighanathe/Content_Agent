/**
 * requireJobOwnership — Security test for the ownership guard function.
 *
 * Verifies:
 * - Returns the job when userId matches (memory hit)
 * - Returns null + sends 404 when userId does not match (memory)
 * - Returns null + sends 404 when job is soft-deleted (deleted=1)
 * - Returns null + sends 404 when userId does not match (DB fallback)
 * - Returns 404 (not 403) on every mismatch — prevents IDOR enumeration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';

vi.mock('../../src/db/schema.js', () => ({}));
vi.mock('../../src/workers/contentWorker.js', () => ({
  getJobFromStore: vi.fn(),
}));
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

describe('requireJobOwnership', () => {
  let res: Response;

  beforeEach(async () => {
    vi.resetModules();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
  });

  it('returns the job when userId matches (memory hit)', async () => {
    const { jobsMemory, requireJobOwnership } = await import('../../src/routes/jobs/ownership.js');
    const jobId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-1';
    jobsMemory.set(jobId, { id: jobId, userId, deleted: 0, topic: 'test', status: 'pending' });

    const result = await requireJobOwnership(jobId, userId, res);

    expect(result).not.toBeNull();
    expect(result.id).toBe(jobId);
    expect(result.userId).toBe(userId);
    expect(res.status).not.toHaveBeenCalled();
    jobsMemory.delete(jobId);
  });

  it('returns null + 404 when userId does not match (memory)', async () => {
    const { jobsMemory, requireJobOwnership } = await import('../../src/routes/jobs/ownership.js');
    const jobId = '00000000-0000-0000-0000-000000000002';
    const ownerUserId = 'user-owner';
    const attackerUserId = 'user-attacker';
    jobsMemory.set(jobId, { id: jobId, userId: ownerUserId, deleted: 0, topic: 'test', status: 'done' });

    const result = await requireJobOwnership(jobId, attackerUserId, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(404);
    jobsMemory.delete(jobId);
  });

  it('returns null + 404 when job is soft-deleted (deleted=1)', async () => {
    const { jobsMemory, requireJobOwnership } = await import('../../src/routes/jobs/ownership.js');
    const jobId = '00000000-0000-0000-0000-000000000003';
    const userId = 'user-1';
    jobsMemory.set(jobId, { id: jobId, userId, deleted: 1, topic: 'test', status: 'done' });

    const result = await requireJobOwnership(jobId, userId, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(404);
    jobsMemory.delete(jobId);
  });

  it('returns 404 (not 403) on ownership mismatch — prevents IDOR enumeration', async () => {
    const { jobsMemory, requireJobOwnership } = await import('../../src/routes/jobs/ownership.js');
    const jobId = '00000000-0000-0000-0000-000000000004';
    const ownerUserId = 'user-owner';
    const attackerUserId = 'user-attacker';
    jobsMemory.set(jobId, { id: jobId, userId: ownerUserId, deleted: 0, topic: 'secret', status: 'done' });

    const result = await requireJobOwnership(jobId, attackerUserId, res);

    expect(result).toBeNull();
    const statusArg = (res.status as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // SECURITY: 404 confirms nothing about existence; 403 would leak that the job exists
    expect(statusArg).toBe(404);
    expect(jsonArg.error).toBe('Job not found');
    expect(jsonArg.error).not.toMatch(/belongs|owner|exist|deleted/i);
    jobsMemory.delete(jobId);
  });

  it('returns null + 404 when job does not exist in memory or DB', async () => {
    const { requireJobOwnership } = await import('../../src/routes/jobs/ownership.js');
    const jobId = '00000000-0000-0000-0000-000000009999';
    const userId = 'user-1';

    const result = await requireJobOwnership(jobId, userId, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
