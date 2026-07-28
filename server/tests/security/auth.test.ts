/**
 * authMiddleware — Security test for the Clerk JWT → DB UUID resolution.
 *
 * Verifies:
 * - Returns 401 when no Clerk JWT is present
 * - Returns 503 when DB is unavailable (fail-closed — does not silently
 *   substitute Clerk ID for DB UUID, which would cause 404s downstream)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

const mockGetDb = vi.hoisted(() => vi.fn());

vi.mock('../../src/db/schema.js', () => ({}));
vi.mock('../../src/db/index.js', () => ({
  getDb: mockGetDb,
}));
vi.mock('@clerk/express', () => ({
  getAuth: vi.fn(),
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
  },
}));

describe('authMiddleware', () => {
  let req: any;
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {}, headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('returns 401 when no Clerk JWT is present', async () => {
    const { getAuth } = await import('@clerk/express');
    vi.mocked(getAuth).mockReturnValue({ userId: null } as any);

    const { authMiddleware } = await import('../../src/middleware/auth.js');
    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 503 when DB is unavailable (fail-closed for production safety)', async () => {
    const mockGetDbLocal = mockGetDb;
    mockGetDbLocal.mockImplementation(() => { throw new Error('DB connection failed'); });

    const { getAuth } = await import('@clerk/express');
    vi.mocked(getAuth).mockReturnValue({ userId: 'user_test123' } as any);

    const { authMiddleware } = await import('../../src/middleware/auth.js');
    await authMiddleware(req as Request, res as Response, next);

    // SECURITY: On DB lookup failure, middleware must fail closed (503) rather
    // than silently substituting the raw Clerk ID as dbUserId. Substituting
    // causes all downstream requireJobOwnership() calls to 404 because jobs
    // store userId as the resolved DB UUID, not the Clerk ID string.
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SERVICE_UNAVAILABLE' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
