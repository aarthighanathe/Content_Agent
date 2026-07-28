import { pgTable, text, timestamp, integer, jsonb, uuid, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const platformEnum = pgEnum('platform', [
  'instagram_carousel',
  'linkedin_post',
  'twitter_thread',
  'instagram_caption',
  'video_script',
]);

export const toneEnum = pgEnum('tone', [
  'professional',
  'casual',
  'witty',
  'educational',
  'inspirational',
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

export const outputTypeEnum = pgEnum('output_type', [
  'research',
  'draft',
  'critique',
  'final',
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

// AUDIT FIX #1 — persistent template storage (replaces in-memory templateStore)
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  platform: text('platform').notNull(),
  topic: text('topic').default(''),
  hookStyle: text('hook_style').default(''),
  structure: text('structure').default(''),
  ctaPattern: text('cta_pattern').default(''),
  contentSample: text('content_sample'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_templates_user_id').on(table.userId),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(contentJobs),
}));

export const contentJobsRelations = relations(contentJobs, ({ one, many }) => ({
  user: one(users, { fields: [contentJobs.userId], references: [users.id] }),
  outputs: many(contentOutputs),
  logs: many(agentLogs),
}));

export const contentOutputsRelations = relations(contentOutputs, ({ one }) => ({
  job: one(contentJobs, { fields: [contentOutputs.jobId], references: [contentJobs.id] }),
}));

export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
  job: one(contentJobs, { fields: [agentLogs.jobId], references: [contentJobs.id] }),
}));

// Types
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
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
