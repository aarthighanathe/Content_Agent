// Mirrors server/src/db/schema.ts's scheduledPosts table (server and client
// are separate TS projects with no shared schema import — see social.ts's
// CompetitorAnalysis for the same convention). One row = one job scheduled
// on one date; a job can only be scheduled on one date at a time (enforced
// by the DB's unique constraint on jobId, and by the upsert-on-jobId
// behavior of POST /api/scheduled-posts).
// WHY publishPlatform is a plain 'linkedin' | 'twitter' | null, not shared
// with types/job.ts's Platform union: it's the social account to publish TO
// (a connected OAuth account), not the content platform the job itself was
// generated for (instagram_carousel, linkedin_post, etc.) — a LinkedIn-post
// job could in principle be scheduled to auto-publish to Twitter too, so
// conflating the two would be misleading even though they overlap in name.
export type PublishPlatform = 'linkedin' | 'twitter';
export type PublishStatus = 'pending' | 'posted' | 'failed';

export interface ScheduledPost {
  id: string;
  userId: string;
  jobId: string;
  // WHY string, not Date: a plain YYYY-MM-DD calendar-day key — see
  // calendarHelpers.ts's dateKey format and schema.ts's WHY comment on the
  // scheduledDate column for why this deliberately isn't a real Date/ISO
  // timestamp.
  scheduledDate: string;
  createdAt: string;
  // WHY optional, joined in server-side: GET /api/scheduled-posts includes
  // this so callers that only need topic/platform (e.g. Dashboard's
  // NextScheduledCard) can skip a second per-job GET /jobs/:jobId round trip.
  // Undefined only if the referenced job was hard-deleted out from under a
  // still-existing scheduled_posts row (shouldn't happen — jobs/manage.ts's
  // DELETE cleans up scheduled_posts too — but the type stays honest about it).
  job?: { topic: string; platform: string };
  // WHY added 2026-08-05 (real auto-publish): null means reminder-only,
  // exactly the old behavior — a job only enters the real publish path once
  // a platform is set. See server/src/db/schema.ts's scheduledPosts WHY
  // comment for the full design rationale.
  publishPlatform: PublishPlatform | null;
  publishStatus: PublishStatus;
  publishedAt: string | null;
  postUrl: string | null;
  publishError: string | null;
}

export interface ScheduledPostListResponse {
  scheduledPosts: ScheduledPost[];
}

export interface CreateScheduledPostInput {
  jobId: string;
  scheduledDate: string;
  publishPlatform?: PublishPlatform;
  // WHY sent alongside scheduledDate: scheduledDate is built from the
  // browser's LOCAL calendar day (calendarHelpers.ts), but the server used to
  // interpret it as a UTC calendar day when computing the auto-publish time —
  // "publish at 9am" could fire up to ~16 hours off from the user's actual
  // 9am. JS Date.getTimezoneOffset() convention (minutes to ADD to local time
  // to reach UTC) — see server/src/routes/scheduledPosts.ts's publishDelayMs
  // WHY comment for how this is used.
  timezoneOffsetMinutes?: number;
}

export interface CreateScheduledPostResponse {
  scheduledPost: ScheduledPost;
}
