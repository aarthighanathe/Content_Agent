import { pgTable, text, timestamp, integer, jsonb, uuid, pgEnum, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const platformEnum = pgEnum('platform', [
  'instagram_carousel',
  'linkedin_post',
  'twitter_thread',
  'instagram_caption',
  'video_script',
]);

// WHY these 9, matching schemas/jobs.ts's VALID_TONES exactly: this enum
// previously only had the original 5 values while VALID_TONES (the source of
// truth for createJobSchema, Create's ToneSelector, and Brand's VoiceCard) had
// grown to 9 — a job created with tone 'bold'/'playful'/'minimal'/'direct'
// passed request validation but then failed the Postgres insert with an
// enum-violation error, caught and logged by persistJobToDB's catch block
// with no user-facing surface (the job just never showed as done). Found
// while removing an `any` cast on jobResult in lib/persistJob.ts that had
// been masking the type mismatch between PipelineJob.tone (plain string) and
// this column's narrow literal union.
export const toneEnum = pgEnum('tone', [
  'professional',
  'casual',
  'witty',
  'educational',
  'inspirational',
  'bold',
  'playful',
  'minimal',
  'direct',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'researching',
  'writing',
  'formatting',
  'critiquing',
  'done',
  'failed',
]);

// WHY 'prediction' added 2026-08-04: PerformancePredictor's output was
// previously computed every job but discarded before the DB write (see
// persistJob.ts's old isDBOutputType guard) — the Dashboard "Surface
// PerformancePredictor output" feature needs it durably stored so stats can
// be aggregated across all of a user's jobs, not just the in-memory copy of
// whichever job is currently open. No real prod data exists yet, so this is
// a plain enum addition, not a backward-compatible migration concern.
export const outputTypeEnum = pgEnum('output_type', [
  'research',
  'draft',
  'critique',
  'final',
  'prediction',
]);

// Tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  brandName: text('brand_name').default(''),
  brandVoice: text('brand_voice').default('professional'),
  phrasesUse: text('phrases_use').default(''),
  phrasesAvoid: text('phrases_avoid').default(''),
  industry: text('industry').default(''),
  // WHY jsonb, nullable: Content DNA (writing-style fingerprint from POST
  // /users/analyze-voice) was previously held only in the server's in-memory
  // userProfiles Map — a restart or a different instance handling the request
  // silently reverted a user's analyzed DNA to "not set up" with no warning
  // (FUNCTIONAL_AUDIT_2026-07.md finding #9). Persisting it here fixes that.
  contentDna: jsonb('content_dna'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contentJobs = pgTable('content_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  topic: text('topic').notNull(),
  platform: platformEnum('platform').notNull(),
  tone: toneEnum('tone').notNull(),
  targetAudience: text('target_audience').notNull(),
  tag: text('tag'),
  // WHY nullable, no FK: set by POST /:jobId/multiply when a job is created via
  // Content Multiplication; previously only held on the in-memory job object, so
  // it silently vanished once the source job aged out of memory and had to be
  // reassembled from the DB via assembleJobFromDB (FUNCTIONAL_AUDIT_2026-07.md
  // finding #11 — ContentMultiplier.tsx's "View Original" badge went blank for
  // any multiplied job old enough to hit that path). No FK reference: the source
  // job may itself be deleted later, and this is display metadata, not a join key.
  sourceJobId: uuid('source_job_id'),
  sourcePlatform: platformEnum('source_platform'),
  // WHY nullable, no FK (same pattern as sourceJobId above): set when a job is
  // created via a "Create content →" CTA on the Competitor page (a content gap
  // or suggested angle). Purely display/lineage metadata — the analysis row
  // may itself be soft-deleted later, and this is not a join key. The actual
  // prompt-time effect (competitor gap/angle text injected into the writer's
  // context) happens once, at job-creation time, in routes/jobs/create.ts —
  // this column only lets the UI show "based on competitor analysis of @x"
  // after the fact, mirroring sourceJobId's own WHY above.
  sourceCompetitorAnalysisId: uuid('source_competitor_analysis_id'),
  // WHY nullable text, no FK (same display/lineage pattern as the two source*
  // columns above): set when a job is created via Repurpose's "paste a URL"
  // flow (routes/content/repurpose.ts). Previously only held on the in-memory
  // job object and dropped before the DB write — the original article URL was
  // lost once the job hit the DB or aged out of memory, same class of bug as
  // FUNCTIONAL_AUDIT_2026-07.md finding #11 already fixed for sourceJobId.
  sourceUrl: text('source_url'),
  // WHY nullable text, no enum: carousel template/palette choice from the new
  // template system (client/src/lib/templateSystem.ts's TEMPLATES/ColorPalette).
  // Only meaningful for platform='instagram_carousel'; null for every other
  // platform and for carousels created before this feature shipped (those fall
  // back to the legacy 9-theme/designPreset system on the client — see
  // CLAUDE.md §11). Not an FK/enum because the template catalog lives in
  // client code, not the DB — same reasoning as this table's tag column.
  templateId: text('template_id'),
  paletteId: text('palette_id'),
  status: jobStatusEnum('status').default('pending').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  deleted: integer('deleted').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userActiveIdx: index('idx_content_jobs_user_active').on(table.userId, table.deleted, table.createdAt),
  // WHY this index: backs the new GET /jobs `search`/`platform`/`sort` query
  // params (FUNCTIONAL_AUDIT_2026-07.md finding #4) — topic search and platform
  // filtering both now run in the DB instead of only on the current page's
  // 10 already-fetched rows.
  userPlatformIdx: index('idx_content_jobs_user_platform').on(table.userId, table.platform, table.deleted),
}));

export const contentOutputs = pgTable('content_outputs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => contentJobs.id),
  agentName: text('agent_name').notNull(),
  outputType: outputTypeEnum('output_type').notNull(),
  content: jsonb('content').notNull(),
  qualityScore: integer('quality_score'),
  partial: integer('partial').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  jobIdIdx:   index('idx_content_outputs_job_id').on(table.jobId),
  jobTypeIdx: index('idx_content_outputs_job_type').on(table.jobId, table.outputType),
}));

export const agentLogs = pgTable('agent_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => contentJobs.id),
  agentName: text('agent_name').notNull(),
  action: text('action').notNull(),
  inputSummary: text('input_summary'),
  outputSummary: text('output_summary'),
  tokensUsed: integer('tokens_used').default(0),
  durationMs: integer('duration_ms').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  jobIdIdx: index('idx_agent_logs_job_id').on(table.jobId),
}));

// AUDIT FIX #1 — persistent social OAuth tokens (replaces in-memory socialTokens map)
export const socialTokens = pgTable('social_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  platform: text('platform').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at'),
  displayName: text('display_name'),
  platformUserId: text('platform_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userPlatformIdx: index('idx_social_tokens_user_platform').on(table.userId, table.platform),
}));

// AUDIT FIX #10 — track onboarding completion per user
export const userOnboarding = pgTable('user_onboarding', {
  userId: text('user_id').primaryKey(),
  completed: integer('completed').default(0).notNull(),
  brandName: text('brand_name').default(''),
  preferredTone: text('preferred_tone').default('professional'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// WHY added 2026-08-04 (Calendar server-sync): replaces the previous 100%
// client-side `localStorage` schedule (calendarHelpers.ts's SCHEDULE_KEY) —
// scheduled placements now survive a cleared browser and sync across
// devices.
// WHY scheduledDate is `text` (not a real `date` column): the client's
// dateKey format is a plain `YYYY-MM-DD` string (calendarHelpers.ts) used
// directly as a Map/object key for grouping — storing the identical string
// avoids a timezone-conversion mismatch between Postgres `date` (which drops
// time/zone) and the client's local-calendar-day semantics.
// WHY unique on jobId (not a composite jobId+date key): Calendar.tsx's
// existing `allocate()` enforces one-job-one-date by removing the job from
// every other date before adding it to the new one — a unique constraint on
// jobId alone is the DB-level mirror of that same invariant, and lets the
// route implement "move" as a single upsert keyed on jobId.
//
// WHY publishPlatform/publishStatus/publishedAt/postUrl/publishError added
// 2026-08-05 (real auto-publish): this table previously only tracked "the
// user intends to post this job on this date" (a planning aid, same
// disclosed scope as social.ts's reminder-only POST /api/social/schedule —
// see CLAUDE.md §9). publishPlatform is nullable — scheduling without a
// platform stays exactly the old reminder-only behavior; a job only enters
// the real auto-publish path (see lib/publishQueue.ts,
// workers/publishWorker.ts) once a platform is chosen. WHY not unify with
// social.ts's separate in-memory schedule Map here: that Map tracks a
// platform+exact-datetime+arbitrary-content publish intent with no jobId
// requirement (e.g. posting ad-hoc text), a genuinely different shape from
// this table's job+date model — scoped deliberately to wiring only the
// Calendar's existing table, not merging both concepts (a larger,
// separately-tracked change).
export const publishStatusEnum = pgEnum('publish_status', ['pending', 'posted', 'failed']);

export const scheduledPosts = pgTable('scheduled_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  jobId: uuid('job_id').notNull().references(() => contentJobs.id).unique(),
  scheduledDate: text('scheduled_date').notNull(),
  publishPlatform: text('publish_platform'),
  publishStatus: publishStatusEnum('publish_status').default('pending').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  postUrl: text('post_url'),
  publishError: text('publish_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Backs GET /api/scheduled-posts?month=YYYY-MM (list this user's postings,
  // optionally scoped to a visible month range).
  userDateIdx: index('idx_scheduled_posts_user_date').on(table.userId, table.scheduledDate),
}));

// WHY added 2026-08-04 (Competitor Content Lens persistence): POST
// /api/content/competitor previously returned an analysis with zero
// persistence — a refresh of Competitor.tsx lost it entirely, and there was
// no way to reuse a past analysis's contentGaps/suggestedAngles as ideation
// or job-creation context (see contentJobs.sourceCompetitorAnalysisId and
// content/ideate.ts's competitorAnalysisId above). `analysis` stores the full
// competitorResponseSchema-shaped object as jsonb rather than normalizing
// topThemes/contentGaps/suggestedAngles into their own tables — this is a
// read-mostly, whole-object-at-a-time feature (load one past analysis, show
// it, or splice two fields into a prompt) with no query need to filter WITHIN
// an analysis's sub-arrays, so jsonb avoids a many-table join for no benefit.
export const competitorAnalyses = pgTable('competitor_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  handle: text('handle').notNull(),
  industry: text('industry'),
  analysis: jsonb('analysis').notNull(),
  deleted: integer('deleted').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Backs GET /api/content/competitor/history (most-recent-first, capped list
  // for the requesting user) — same (userId, deleted, createdAt) shape as
  // contentJobs' own userActiveIdx above.
  userActiveIdx: index('idx_competitor_analyses_user_active').on(table.userId, table.deleted, table.createdAt),
}));

// WHY added 2026-08-05 (Library collections/folders): jobs could already be
// tagged (a single free-text label, shipped 2026-08-04) but not grouped into
// named, persistent groupings a user creates and reuses — a tag is a
// one-to-one label per job, while a collection is many-to-many (one job can
// belong to several collections, e.g. both "Q3 Launch" and "Best of"). Two
// tables rather than a jobId array column on contentJobs: an array column
// can't be indexed for "find all collections containing job X" or enforce
// the no-duplicate-membership constraint the unique index below provides.
export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Backs GET /api/collections (list this user's collections, newest first).
  userCreatedIdx: index('idx_collections_user_created').on(table.userId, table.createdAt),
}));

export const collectionJobs = pgTable('collection_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => collections.id),
  jobId: uuid('job_id').notNull().references(() => contentJobs.id),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // WHY unique on (collectionId, jobId): the DB-level mirror of "adding an
  // already-present job to a collection is a no-op," same pattern as
  // scheduledPosts' unique-on-jobId invariant — lets the route implement
  // "add" as a single onConflictDoNothing insert instead of a check-then-insert.
  collectionJobUnique: uniqueIndex('idx_collection_jobs_unique').on(table.collectionId, table.jobId),
  jobIdx: index('idx_collection_jobs_job').on(table.jobId),
}));

// WHY added 2026-08-05 (RSS/feed monitoring — FUTURE_FEATURES.md §Repurpose item 2):
// Lets users subscribe a public RSS/Atom feed URL so the feedMonitorWorker
// (workers/feedMonitorWorker.ts) periodically checks it and auto-creates a
// Repurpose job for each new item it hasn't seen yet. One row per user×feed.
// lastItemGuid prevents re-processing an already-seen item across restarts;
// lastCheckedAt backs the worker's per-feed throttle so a high-frequency feed
// doesn't hammer the AI pipeline faster than once per interval.
// WHY no FK on userId (text, not uuid): the worker runs outside a request
// context and always re-fetches the matching users row by clerkId, same
// pattern as social_tokens — userId here is the DB uuid of the users table,
// stored as text to avoid a migration type change to this new table later.
export const feedMonitors = pgTable('feed_monitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  // WHY text not uuid FK: the same "display/lineage" stance already used by
  // socialTokens.userId — avoids coupling this new table to the users table's
  // specific uuid PK type during what is already a multi-table migration.
  userId: text('user_id').notNull(),
  feedUrl: text('feed_url').notNull(),
  platform: platformEnum('platform').notNull(),
  tone: toneEnum('tone').notNull(),
  targetAudience: text('target_audience').notNull(),
  active: boolean('active').default(true).notNull(),
  // WHY nullable: null means "never checked" (the monitor was just created).
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  // WHY nullable: tracks the guid/link of the most-recently-processed item.
  // null = "no item processed yet" (first run will process the latest item
  // without back-filling the entire feed history).
  lastItemGuid: text('last_item_guid'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userActiveIdx: index('idx_feed_monitors_user_active').on(table.userId, table.active),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(contentJobs),
  collections: many(collections),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, { fields: [collections.userId], references: [users.id] }),
  collectionJobs: many(collectionJobs),
}));

export const collectionJobsRelations = relations(collectionJobs, ({ one }) => ({
  collection: one(collections, { fields: [collectionJobs.collectionId], references: [collections.id] }),
  job: one(contentJobs, { fields: [collectionJobs.jobId], references: [contentJobs.id] }),
}));

// WHY added 2026-08-05 (Library per-job version history): persistJobToDB
// (lib/persistJob.ts) unconditionally DELETEs a job's contentOutputs rows
// before re-inserting on every persist — including a regenerate — so the
// previous 'final' output was destroyed in-place with no way to compare or
// revert. Rather than changing persistJobToDB itself (the single write path
// EVERY job completion goes through, not just regenerates — a riskier,
// broader change), this table is populated by a single snapshot step at the
// one call site that actually needs history: POST /:jobId/regenerate
// (routes/jobs/manage.ts), which copies the about-to-be-overwritten 'final'
// output here immediately before calling into the pipeline. No FK cascade
// (no ON DELETE CASCADE anywhere else in this schema) — a version row
// intentionally outlives its job if the job itself is later hard-deleted,
// same "display/lineage metadata, not enforced referential integrity"
// stance as contentJobs.sourceJobId.
export const jobOutputVersions = pgTable('job_output_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => contentJobs.id),
  content: jsonb('content').notNull(),
  qualityScore: integer('quality_score'),
  // WHY a free-text label, not an enum: "before regenerate #3", "before
  // feedback: <truncated>" — the only writer today is the regenerate route,
  // but the shape doesn't assume regenerate is the only future producer of a
  // version snapshot.
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Backs GET /:jobId/versions (list a job's history, newest first).
  jobCreatedIdx: index('idx_job_output_versions_job_created').on(table.jobId, table.createdAt),
}));

export const jobOutputVersionsRelations = relations(jobOutputVersions, ({ one }) => ({
  job: one(contentJobs, { fields: [jobOutputVersions.jobId], references: [contentJobs.id] }),
}));

export const competitorAnalysesRelations = relations(competitorAnalyses, ({ one }) => ({
  user: one(users, { fields: [competitorAnalyses.userId], references: [users.id] }),
}));

export const contentJobsRelations = relations(contentJobs, ({ one, many }) => ({
  user: one(users, { fields: [contentJobs.userId], references: [users.id] }),
  outputs: many(contentOutputs),
  logs: many(agentLogs),
}));

export const contentOutputsRelations = relations(contentOutputs, ({ one }) => ({
  job: one(contentJobs, { fields: [contentOutputs.jobId], references: [contentJobs.id] }),
}));

export const scheduledPostsRelations = relations(scheduledPosts, ({ one }) => ({
  user: one(users, { fields: [scheduledPosts.userId], references: [users.id] }),
  job: one(contentJobs, { fields: [scheduledPosts.jobId], references: [contentJobs.id] }),
}));

export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
  job: one(contentJobs, { fields: [agentLogs.jobId], references: [contentJobs.id] }),
}));

// Types
export type SocialToken = typeof socialTokens.$inferSelect;
export type NewSocialToken = typeof socialTokens.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ContentJob = typeof contentJobs.$inferSelect;
export type NewContentJob = typeof contentJobs.$inferInsert;
export type ContentOutput = typeof contentOutputs.$inferSelect;
export type NewContentOutput = typeof contentOutputs.$inferInsert;
export type AgentLog = typeof agentLogs.$inferSelect;
export type NewAgentLog = typeof agentLogs.$inferInsert;
export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type NewScheduledPost = typeof scheduledPosts.$inferInsert;
export type CompetitorAnalysisRow = typeof competitorAnalyses.$inferSelect;
export type NewCompetitorAnalysisRow = typeof competitorAnalyses.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type CollectionJob = typeof collectionJobs.$inferSelect;
export type NewCollectionJob = typeof collectionJobs.$inferInsert;
export type JobOutputVersion = typeof jobOutputVersions.$inferSelect;
export type NewJobOutputVersion = typeof jobOutputVersions.$inferInsert;
export type FeedMonitor = typeof feedMonitors.$inferSelect;
export type NewFeedMonitor = typeof feedMonitors.$inferInsert;
