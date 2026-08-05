import * as Sentry from '@sentry/node';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../lib/logger.js';
// WHY lib/uuid.js, not jobs/ownership.js: ownership.ts transitively pulls in
// workers/contentWorker.ts (BullMQ Worker, real Redis connection setup),
// which is heavier than this file needs and isn't mocked by every test that
// imports routes/users.ts. lib/uuid.ts has zero imports, so importing it here
// carries none of that weight while still sharing one implementation instead
// of redeclaring it (see lib/uuid.ts's own comment for the full call-site list).
import { isValidUUID } from '../../lib/uuid.js';

// User profile store (in-memory read-through cache) — exported so other routes
// can read brand voice settings. Do NOT write to this Map directly from other
// files; use saveUserProfile() so a DB write failure can't leave the cache
// claiming a value the DB never actually persisted (see saveUserProfile below).
export const userProfiles = new Map<string, UserProfile>();

export interface UserProfile {
  brandName: string;
  brandVoice: string;
  phrasesUse: string;
  phrasesAvoid: string;
  industry: string;
  contentDna?: unknown;
  updatedAt?: string;
}

function defaultProfile(): UserProfile {
  return {
    brandName: '',
    brandVoice: 'professional',
    phrasesUse: '',
    phrasesAvoid: '',
    industry: '',
  };
}

// WHY this exists: every content-generation route (POST /create, /batch,
// /regenerate, /multiply, /ideate, /repurpose) used to read
// `userProfiles.get(userId) || {}` directly — a Map miss (fresh restart, or a
// request landing on a replica that never got seeded) silently fell back to an
// EMPTY profile even when the DB had the user's real brand voice, degrading
// the "brand voice learning" value prop with no error anywhere. GET /me was
// the only route that correctly fell back to the DB on a Map miss; this
// extracts that exact pattern into one shared helper so every read path gets
// the same guarantee instead of duplicating (and inevitably drifting from)
// the DB-fallback logic a third or fourth time.
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const cached = userProfiles.get(userId);
  if (cached) return cached;

  if (db && isValidUUID(userId)) {
    try {
      const dbUser = await db.query.users.findFirst({ where: (u, { eq: ueq }) => ueq(u.id, userId) });
      if (dbUser) {
        const profile: UserProfile = {
          brandName: dbUser.brandName || '',
          brandVoice: dbUser.brandVoice || 'professional',
          phrasesUse: dbUser.phrasesUse || '',
          phrasesAvoid: dbUser.phrasesAvoid || '',
          industry: dbUser.industry || '',
          contentDna: dbUser.contentDna || undefined,
        };
        userProfiles.set(userId, profile);
        return profile;
      }
    } catch (dbErr) {
      logger.error('[DB] Failed to load user profile', { userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
      Sentry.captureException(dbErr, { tags: { route: 'getUserProfile', action: 'db-read' } });
    }
  }

  return defaultProfile();
}

// WHY cache-aside (DB write first, Map updated only on confirmed success)
// instead of the old write-first pattern: writing to the Map unconditionally
// and only best-effort writing to the DB meant a transient DB failure (e.g. a
// documented Neon cold-start stall) left the Map looking consistent while the
// DB silently never got the update — the next restart, or a request landing
// on a different instance, would then serve/generate with stale data and no
// error surfaced anywhere. Making the DB the source of truth for the write
// means the Map can only ever reflect what's actually durable.
//
// Returns { success: true, profile } on a durable write, or
// { success: false } if the DB write failed — callers must surface this to
// the client rather than responding 200 regardless (as the old code did).
export async function saveUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<{ success: true; profile: UserProfile } | { success: false }> {
  const current = userProfiles.get(userId) || (await getUserProfile(userId));
  const updatedProfile: UserProfile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // No DB configured, or userId isn't a real DB UUID (e.g. the 'demo' fallback
  // used when auth/DB is unavailable): the Map is the only store that exists
  // for this identity, so it's the correct source of truth here — write
  // through directly rather than reporting failure for a DB write that was
  // never possible in the first place.
  if (!db || !isValidUUID(userId)) {
    userProfiles.set(userId, updatedProfile);
    return { success: true, profile: updatedProfile };
  }

  try {
    await db.update(users)
      .set({
        brandName: updatedProfile.brandName,
        brandVoice: updatedProfile.brandVoice,
        phrasesUse: updatedProfile.phrasesUse,
        phrasesAvoid: updatedProfile.phrasesAvoid,
        industry: updatedProfile.industry,
        ...(updates.contentDna !== undefined ? { contentDna: updates.contentDna } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (dbErr) {
    logger.error('[DB] Failed to persist user profile', { userId, error: dbErr instanceof Error ? dbErr.message : String(dbErr) });
    Sentry.captureException(dbErr, { tags: { route: 'saveUserProfile', action: 'db-write' } });
    return { success: false };
  }

  userProfiles.set(userId, updatedProfile);
  return { success: true, profile: updatedProfile };
}

export async function seedUserProfilesFromDB(): Promise<void> {
  if (!db) return;
  try {
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      userProfiles.set(user.id, {
        brandName:    user.brandName    || '',
        brandVoice:   user.brandVoice   || 'professional',
        phrasesUse:   user.phrasesUse   || '',
        phrasesAvoid: user.phrasesAvoid || '',
        industry:     user.industry     || '',
        contentDna:   user.contentDna   || undefined,
      });
    }
    logger.info('[users] Seeded user profiles from DB', { count: allUsers.length });
  } catch (err) {
    console.warn('[users] Could not seed profiles from DB:', err);
  }
}
