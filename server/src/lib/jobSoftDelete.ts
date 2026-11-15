// WHY: extracted from manage.ts DELETE so that route stays under the 400-line
// cap; owns the transactional soft-delete + publishing guard.
import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentJobs, scheduledPosts, collectionJobs } from '../db/schema.js';

export class PublishInProgressError extends Error {
  constructor() {
    super('PUBLISH_IN_PROGRESS');
    this.name = 'PublishInProgressError';
  }
}

/**
 * Soft-delete a job and clean calendar/collection rows in one transaction.
 * Throws PublishInProgressError when a related scheduled_posts row is publishing.
 * @returns scheduled post ids to cancel in Redis after commit
 */
export async function softDeleteJobWithCleanup(
  jobId: string,
  userId: string,
): Promise<string[]> {
  if (!db) return [];
  return db.transaction(async (tx) => {
    // WHY: FOR UPDATE serializes against publishWorker's pending→publishing
    // claim under READ COMMITTED — a plain SELECT can miss a claim that
    // commits in the gap before DELETE and then wipe a live publish row.
    const locked = await tx
      .select({
        id: scheduledPosts.id,
        publishStatus: scheduledPosts.publishStatus,
      })
      .from(scheduledPosts)
      .where(and(eq(scheduledPosts.jobId, jobId), eq(scheduledPosts.userId, userId)))
      .for('update');

    if (locked.some((row) => row.publishStatus === 'publishing')) {
      throw new PublishInProgressError();
    }

    await tx.update(contentJobs).set({ deleted: 1 })
      .where(and(eq(contentJobs.id, jobId), eq(contentJobs.userId, userId)));

    // WHY: never DELETE a publishing row — exclude + leftover abort rolls back
    // the soft-delete if a claim still wins the race somehow.
    const deleted = await tx
      .delete(scheduledPosts)
      .where(and(
        eq(scheduledPosts.jobId, jobId),
        eq(scheduledPosts.userId, userId),
        ne(scheduledPosts.publishStatus, 'publishing'),
      ))
      .returning({ id: scheduledPosts.id });

    const leftover = await tx
      .select({ id: scheduledPosts.id })
      .from(scheduledPosts)
      .where(and(
        eq(scheduledPosts.jobId, jobId),
        eq(scheduledPosts.userId, userId),
        eq(scheduledPosts.publishStatus, 'publishing'),
      ))
      .limit(1);
    if (leftover.length > 0) {
      throw new PublishInProgressError();
    }

    await tx.delete(collectionJobs).where(eq(collectionJobs.jobId, jobId));
    return deleted.map((row) => row.id);
  });
}
