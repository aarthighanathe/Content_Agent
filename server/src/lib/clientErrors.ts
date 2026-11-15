/**
 * Stable user-facing error strings — never echo Error.message / provider text.
 * SECURITY: CLAUDE.md forbids returning raw err.message to clients; log details
 * server-side and use these (or toClientFetchFailureMessage) instead.
 */

export const CLIENT_PIPELINE_FAILURE =
  'Content generation failed. Please try again or start a new job.';

// WHY: agent logs (action/outputSummary) are shown in LoadingView / GET /:jobId —
// never embed provider err.message there (same rule as CLIENT_PIPELINE_FAILURE).
export const CLIENT_WRITER_DRAFT_REJECTED =
  'Draft REJECTED — requesting revision';

export const CLIENT_CRITIC_REVIEW_FAILED =
  'Formatter or critic failed — delivering best earlier draft';

export const CLIENT_BATCH_ITEM_FAILURE =
  'Failed to start this item — please try again';

export const CLIENT_BATCH_URL_FAILURE =
  'Failed to process this URL — please check it and try again';

export const CLIENT_FEED_JOB_FAILURE =
  'Failed to create a job for this feed item — will retry on the next check';

export const CLIENT_PUBLISH_FAILURE =
  'Publishing failed — please reconnect the account or try again';

// WHY: marker on scheduled_posts.publishError for a Twitter thread that stopped
// midway; scheduledPosts route refuses to re-arm such rows (duplicate-thread guard).
export const PARTIAL_THREAD_ERROR_PREFIX = 'Partial thread:';
// WHY: shared literal so publishWorker writes what persistJobSweeps' CASE preserves.
export const POSTED_UNVERIFIED_ERROR_PREFIX = 'posted-unverified:';

/** Map publish-worker failures to Calendar-safe copy (publishError column). */
export function toClientPublishError(message: string): string {
  const trimmed = message.trim();
  if (trimmed.startsWith('Not connected to')) return trimmed;
  if (trimmed === 'Source job unavailable') return trimmed;
  if (trimmed === 'No final content to publish') {
    return 'This job has no publishable content';
  }
  // WHY: Twitter refresh rotated tokens but DB upsert exhausted — Calendar must
  // say reconnect, not a generic retry that would use a dead refresh token.
  if (trimmed.startsWith('Twitter reconnect required')) {
    return 'Twitter reconnect required — please reconnect the account';
  }
  return CLIENT_PUBLISH_FAILURE;
}
