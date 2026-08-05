import { z } from 'zod';

// WHY a regex plus a calendar-validity check, not z.string().date(): the
// client's dateKey format (calendarHelpers.ts) is a plain local-calendar-day
// string used directly as a Map key — z.string().date() would accept the
// same YYYY-MM-DD shape but this needs the exact same string round-trip
// behavior the client relies on, so the shape check stays a regex. The regex
// alone accepts calendar-invalid values like "2026-02-30" or "2026-13-45"
// (never sent by the real Calendar UI, which only ever builds dateKeys from
// real days-in-month, but reachable via a direct API call) — the refine below
// rejects those so scheduled_posts can't accumulate a date no calendar view
// will ever render.
const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDate(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const scheduledPostDateSchema = z
  .string()
  .trim()
  .regex(DATE_KEY_REGEX, 'scheduledDate must be in YYYY-MM-DD format')
  .refine(isRealCalendarDate, 'scheduledDate must be a real calendar date');

// WHY a loose regex, not z.string().uuid(): zod's built-in UUID validator
// enforces the RFC 4122 version/variant nibbles, but this codebase's existing
// UUID convention (lib/uuid.ts's isValidUUID, the single shared runtime
// check) is any 8-4-4-4-12 hex string — matching that here keeps this schema
// consistent with every other UUID check in the app.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const jobIdSchema = z.string().regex(UUID_REGEX, 'jobId must be a valid UUID');

// WHY optional, nullable-via-absence: a job can be scheduled with no publish
// platform (stays exactly the old reminder-only behavior) or with one (enters
// the real auto-publish path — see lib/publishQueue.ts). Only linkedin/twitter
// are supported, matching social.ts's own postSocialSchema platform enum —
// posting to instagram isn't implemented anywhere in this codebase yet.
export const publishPlatformSchema = z.enum(['linkedin', 'twitter']);

export const createScheduledPostSchema = z.object({
  jobId: jobIdSchema,
  scheduledDate: scheduledPostDateSchema,
  publishPlatform: publishPlatformSchema.optional(),
});

export const listScheduledPostsQuerySchema = z.object({
  // WHY optional: GET with no `month` returns all of the user's scheduled
  // posts (used by the Dashboard "next scheduled post" card, which needs to
  // look across month boundaries to find the nearest future date).
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format')
    .optional(),
});
