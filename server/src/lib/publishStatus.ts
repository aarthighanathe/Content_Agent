// WHY: extracted from publishWorker.ts to stay under the 400-line cap —
// durable posted / partial / unverified stamps after a live provider call.
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { scheduledPosts } from '../db/schema.js';
import {
  PARTIAL_THREAD_ERROR_PREFIX,
  POSTED_UNVERIFIED_ERROR_PREFIX,
} from './clientErrors.js';
import { logger } from './logger.js';

export interface PartialThreadInfo {
  postedCount: number;
  totalCount: number;
  rootId: string;
  lastId: string;
  postUrl: string;
}

export async function markPosted(
  scheduledPostId: string,
  postUrl: string | null | undefined,
  publishError: string | null = null,
): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: sequential retries with backoff are the point
      const updated = await db!.update(scheduledPosts)
        .set({
          publishStatus: 'posted',
          publishedAt: new Date(),
          postUrl: postUrl ?? null,
          publishError,
        })
        .where(eq(scheduledPosts.id, scheduledPostId))
        .returning({ id: scheduledPosts.id });
      // WHY: 0 rows is not success — row deleted/raced; caller stamps unverified.
      if (updated.length > 0) return true;
      return false;
    } catch (err) {
      logger.warn('[PublishWorker] markPosted failed', {
        scheduledPostId, attempt, error: err instanceof Error ? err.message : String(err),
      });
      // eslint-disable-next-line no-await-in-loop -- WHY: backoff between retries
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  return false;
}

export function partialThreadPublishError(info: PartialThreadInfo): string {
  return `${PARTIAL_THREAD_ERROR_PREFIX} posted ${info.postedCount} of ${info.totalCount} tweets `
    + `(last tweet id ${info.lastId}). Finish the thread manually — do not republish.`;
}

export async function markPartialThread(
  scheduledPostId: string,
  info: PartialThreadInfo,
): Promise<boolean> {
  const publishError = partialThreadPublishError(info);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: sequential retries with backoff are the point
      const updated = await db!.update(scheduledPosts)
        .set({
          publishStatus: 'posted',
          publishedAt: new Date(),
          postUrl: info.postUrl,
          publishError,
        })
        .where(eq(scheduledPosts.id, scheduledPostId))
        .returning({ id: scheduledPosts.id });
      // WHY: 0 rows → stamp partial marker on publishing (same as markPostedUnverified).
      if (updated.length > 0) return true;
      return false;
    } catch (dbErr: unknown) {
      logger.warn('[PublishWorker] markPartialThread failed', {
        scheduledPostId, attempt, error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
      // eslint-disable-next-line no-await-in-loop -- WHY: backoff between retries
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  logger.error('[PublishWorker] Partial thread posted but could not be recorded', {
    scheduledPostId, ...info,
  });
  return false;
}

// WHY: the post is live but status couldn't be written. Stamp a durable marker (row stays
// 'publishing' so the sweep owns the terminal transition and preserves this text) so the
// eventual 'failed' row never reads as "nothing posted, try again".
export async function markPostedUnverified(
  scheduledPostId: string,
  postUrl: string | null | undefined,
): Promise<void> {
  const publishError = `${POSTED_UNVERIFIED_ERROR_PREFIX} the post may be live`
    + `${postUrl ? ` (${postUrl})` : ''}. Check your social account — do not reschedule.`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: sequential retries with backoff are the point
      await db!.update(scheduledPosts)
        .set({ publishError })
        .where(and(
          eq(scheduledPosts.id, scheduledPostId),
          eq(scheduledPosts.publishStatus, 'publishing'),
        ));
      return;
    } catch (err: unknown) {
      logger.warn('[PublishWorker] markPostedUnverified failed', {
        scheduledPostId, attempt, error: err instanceof Error ? err.message : String(err),
      });
      // eslint-disable-next-line no-await-in-loop -- WHY: backoff between retries
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  logger.error('[PublishWorker] Could not persist posted-unverified marker', {
    scheduledPostId, postUrl,
  });
}

// WHY: partial tweets are live but status couldn't be written. Stamp the partial
// prefix while status stays 'publishing' so the sweep preserves it and reschedule
// stays blocked (same pattern as markPostedUnverified).
export async function markPartialThreadUnverified(
  scheduledPostId: string,
  info: PartialThreadInfo,
): Promise<void> {
  const publishError = partialThreadPublishError(info);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: sequential retries with backoff are the point
      await db!.update(scheduledPosts)
        .set({ publishError })
        .where(and(
          eq(scheduledPosts.id, scheduledPostId),
          eq(scheduledPosts.publishStatus, 'publishing'),
        ));
      return;
    } catch (err: unknown) {
      logger.warn('[PublishWorker] markPartialThreadUnverified failed', {
        scheduledPostId, attempt, error: err instanceof Error ? err.message : String(err),
      });
      // eslint-disable-next-line no-await-in-loop -- WHY: backoff between retries
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  logger.error('[PublishWorker] Could not persist partial-thread marker', {
    scheduledPostId, ...info,
  });
}

export async function releaseClaim(scheduledPostId: string): Promise<boolean> {
  try {
    await db!.update(scheduledPosts)
      .set({ publishStatus: 'pending', publishedAt: null })
      .where(and(
        eq(scheduledPosts.id, scheduledPostId),
        eq(scheduledPosts.publishStatus, 'publishing'),
      ));
    return true;
  } catch (relErr: unknown) {
    logger.error('[PublishWorker] Failed to release claim after token lookup error', {
      scheduledPostId, error: relErr instanceof Error ? relErr.message : String(relErr),
    });
    return false;
  }
}
