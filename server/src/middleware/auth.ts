import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  userId?: string;    // Clerk's external user ID (e.g. "user_abc123")
  dbUserId?: string;  // Our internal UUID from the users table
}

// WHY: clerkMiddleware() already verifies the JWT signature globally. Here we
// only need to translate the Clerk ID → our internal DB UUID for ownership checks.
// Caching this lookup avoids a DB round-trip on every authenticated request.
const authCache = new Map<string, { dbUserId: string; expiresAt: number }>();
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — balanced between freshness and DB load

// WHY a hard cap: authCache is otherwise never bounded — it only ever grows with
// total distinct signups, since entries are read/set but never deleted on their
// own. A Map preserves insertion order, so the oldest entry is always
// `authCache.keys().next().value`; evicting it on overflow gives simple LRU-ish
// behavior without a dependency, and 10k entries is generously above what a
// single process needs resident at once for a 5-minute TTL cache.
const AUTH_CACHE_MAX_SIZE = 10_000;

function setAuthCacheEntry(clerkUserId: string, dbUserId: string): void {
  if (authCache.size >= AUTH_CACHE_MAX_SIZE) {
    const oldestKey = authCache.keys().next().value;
    if (oldestKey !== undefined) authCache.delete(oldestKey);
  }
  authCache.set(clerkUserId, { dbUserId, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

// WHY exported: no caller exists yet (there's no user-deletion route today), but
// any future account-deletion/deactivation path MUST be able to evict a stale
// Clerk ID → dbUserId mapping immediately rather than waiting out the 5-minute
// TTL — otherwise a deleted user's requests would keep resolving to a dbUserId
// that other checks (e.g. requireJobOwnership) may no longer expect to be valid.
export function invalidateAuthCache(clerkUserId: string): void {
  authCache.delete(clerkUserId);
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // clerkMiddleware() (applied globally in index.ts) populates req.auth
    const { userId: clerkUserId } = getAuth(req);

    if (!clerkUserId) {
      res.status(401).json({ error: 'Unauthorized', code: 'AUTH_MISSING', retryable: false });
      return;
    }

    req.userId = clerkUserId;

    // Cache hit: skip DB lookup if we've seen this Clerk ID recently
    const cached = authCache.get(clerkUserId);
    if (cached && cached.expiresAt > Date.now()) {
      req.dbUserId = cached.dbUserId;
    } else {
      // Cache miss: resolve Clerk ID → internal UUID, creating the user row on first sign-in
      try {
        const db = getDb();
        const existingUser = await db.query.users.findFirst({
          where: eq(users.clerkId, clerkUserId),
        });
        const dbId = existingUser
          ? existingUser.id
          : (await db.insert(users).values({ clerkId: clerkUserId, email: '' }).returning())[0].id;
        req.dbUserId = dbId;
        setAuthCacheEntry(clerkUserId, dbId);
      } catch {
        // SECURITY: DB unavailable — fail closed. Falling back to the raw Clerk ID
        // string creates an identity mismatch: jobs store userId as the resolved DB
        // UUID, so subsequent requireJobOwnership() lookups would never match and
        // every route would return 404 for every job. A transient DB hiccup during
        // auth must not silently break all downstream operations.
        res.status(503).json({ error: 'Authentication service unavailable', code: 'SERVICE_UNAVAILABLE', retryable: true });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Auth error', code: 'AUTH_ERROR', retryable: true });
  }
}
