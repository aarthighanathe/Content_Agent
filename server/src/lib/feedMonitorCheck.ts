import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentJobs, feedMonitors } from '../db/schema.js';
import { isValidPlatform, isValidTone } from './persistJob.js';
import { isValidUUID } from './uuid.js';
import { logger } from './logger.js';

export interface FeedItemLike {
  guid?: unknown;
  link?: unknown;
  pubDate?: unknown;
}

// WHY: match persistJob caps — sourceMaterial is untrusted article text.
const MAX_PERSISTED_SOURCE_MATERIAL = 6000;

export interface AdvanceFeedCursor {
  monitorId: string;
  newGuid: string;
  // WHY: CAS expected value — lock expiry mid-createJobsForPlatforms used to
  // let a second check insert another pending job for the same item (different
  // UUIDs). Update only succeeds when lastItemGuid still matches this.
  expectedOldGuid: string | null;
}

// WHY: a typeof guard, not a bare cast — rss-parser types custom fields as unknown.
export function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// WHY: malformed pubDate yields NaN, which breaks sort's total order; treat as 0.
function parseDate(value: string | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function sortNewestFirst<T extends FeedItemLike>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      parseDate(asOptionalString(b.pubDate)) - parseDate(asOptionalString(a.pubDate)),
  );
}

// WHY: cursor missing from the feed (no cursor, or GUID rotated out) is treated
// as a first run — newest item only — so a stale cursor can't make every later
// tick walk the whole backlog oldest→newest and burn generation budget.
// With a cursor present, take the oldest unseen item so none are skipped.
export function selectNextItem<T extends FeedItemLike>(
  sortedNewestFirst: T[],
  lastItemGuid: string | null,
): T | null {
  if (sortedNewestFirst.length === 0) return null;
  if (!lastItemGuid) return sortedNewestFirst[0] ?? null;
  const cursorIndex = sortedNewestFirst.findIndex((item) => {
    const guid = asOptionalString(item.guid) || asOptionalString(item.link) || '';
    return guid !== '' && guid === lastItemGuid;
  });
  if (cursorIndex === -1) return sortedNewestFirst[0] ?? null;
  if (cursorIndex === 0) return null;
  return sortedNewestFirst[cursorIndex - 1] ?? null;
}

export async function advanceCursor(monitorId: string, newGuid: string): Promise<void> {
  if (!db) return;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: sequential retries with backoff are the point
      await db
        .update(feedMonitors)
        .set({ lastCheckedAt: new Date(), lastItemGuid: newGuid || null, lastError: null })
        .where(eq(feedMonitors.id, monitorId));
      return;
    } catch (err: unknown) {
      lastErr = err;
      // eslint-disable-next-line no-await-in-loop -- WHY: backoff between retries
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  throw lastErr;
}

/**
 * Insert a durable pending content job and advance the feed cursor in one txn.
 * WHY: crash between insert and a separate cursor write used to recreate the
 * same feed item on the next tick.
 */
export async function insertPendingJobAndAdvanceCursor(
  job: {
    id: string;
    userId: string;
    topic: string;
    platform: string;
    tone?: string;
    targetAudience?: string;
    sourceUrl?: string | null;
    sourceMaterial?: string | null;
  },
  cursor: AdvanceFeedCursor,
): Promise<boolean> {
  if (!db || !isValidUUID(job.userId) || !isValidUUID(cursor.monitorId)) return false;
  const toneRaw = job.tone ?? '';
  const platformRaw = job.platform;
  const targetAudience = job.targetAudience;
  // WHY: locals so isValidPlatform/isValidTone narrow for the Drizzle insert.
  if (!isValidPlatform(platformRaw) || !isValidTone(toneRaw) || !targetAudience) {
    return false;
  }
  const sourceMaterial =
    typeof job.sourceMaterial === 'string' && job.sourceMaterial.trim()
      ? job.sourceMaterial.slice(0, MAX_PERSISTED_SOURCE_MATERIAL)
      : null;
  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(contentJobs)
        .values({
          id: job.id,
          userId: job.userId,
          topic: job.topic,
          platform: platformRaw,
          tone: toneRaw,
          targetAudience,
          sourceUrl: job.sourceUrl || null,
          sourceMaterial,
          status: 'pending',
          retryCount: 0,
          deleted: 0,
        })
        .onConflictDoNothing()
        .returning({ id: contentJobs.id });
      // WHY: conflict → do not advance cursor (would skip an unprocessed item).
      if (inserted.length === 0) {
        throw new Error('pending job insert conflict');
      }
      // WHY: durable CAS — even if the Redis check lock expired mid-call and
      // another check raced, only one txn can advance from expectedOldGuid.
      // 0 rows → roll back this insert so two UUIDs cannot land for one item.
      const updated = await tx
        .update(feedMonitors)
        .set({
          lastCheckedAt: new Date(),
          lastItemGuid: cursor.newGuid || null,
          lastError: null,
        })
        .where(and(
          eq(feedMonitors.id, cursor.monitorId),
          sql`${feedMonitors.lastItemGuid} IS NOT DISTINCT FROM ${cursor.expectedOldGuid}`,
        ))
        .returning({ id: feedMonitors.id });
      if (updated.length === 0) {
        throw new Error('feed cursor CAS conflict');
      }
    });
    return true;
  } catch (err: unknown) {
    logger.warn('[FeedMonitor] Pending insert+cursor txn failed', {
      jobId: job.id,
      monitorId: cursor.monitorId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
