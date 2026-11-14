/**
 * Stable user-facing error strings — never echo Error.message / provider text.
 * SECURITY: CLAUDE.md forbids returning raw err.message to clients; log details
 * server-side and use these (or toClientFetchFailureMessage) instead.
 */

export const CLIENT_PIPELINE_FAILURE =
  'Content generation failed. Please try again or start a new job.';

export const CLIENT_BATCH_ITEM_FAILURE =
  'Failed to start this item — please try again';

export const CLIENT_BATCH_URL_FAILURE =
  'Failed to process this URL — please check it and try again';

export const CLIENT_FEED_JOB_FAILURE =
  'Failed to create a job for this feed item — will retry on the next check';

export const CLIENT_PUBLISH_FAILURE =
  'Publishing failed — please reconnect the account or try again';

/** Map publish-worker failures to Calendar-safe copy (publishError column). */
export function toClientPublishError(message: string): string {
  const trimmed = message.trim();
  if (trimmed.startsWith('Not connected to')) return trimmed;
  if (trimmed === 'Source job unavailable') return trimmed;
  if (trimmed === 'No final content to publish') {
    return 'This job has no publishable content';
  }
  return CLIENT_PUBLISH_FAILURE;
}
