import { relations } from 'drizzle-orm';
import {
  users,
  contentJobs,
  contentOutputs,
  agentLogs,
  collections,
  collectionJobs,
  jobOutputVersions,
  competitorAnalyses,
  scheduledPosts,
} from './schemaTables.js';

// WHY: this file is the drizzle.config + app import barrel: tables/enums/types
// live in sibling modules so each stays under the 400-line cap.

export {
  platformEnum,
  toneEnum,
  jobStatusEnum,
  outputTypeEnum,
  publishStatusEnum,
} from './schemaEnums.js';

export {
  users,
  contentJobs,
  contentOutputs,
  agentLogs,
  socialTokens,
  userOnboarding,
  scheduledPosts,
  competitorAnalyses,
  collections,
  collectionJobs,
  feedMonitors,
  jobOutputVersions,
} from './schemaTables.js';

export type {
  SocialToken,
  NewSocialToken,
  User,
  NewUser,
  ContentJob,
  NewContentJob,
  ContentOutput,
  NewContentOutput,
  AgentLog,
  NewAgentLog,
  ScheduledPost,
  NewScheduledPost,
  CompetitorAnalysisRow,
  NewCompetitorAnalysisRow,
  Collection,
  NewCollection,
  CollectionJob,
  NewCollectionJob,
  JobOutputVersion,
  NewJobOutputVersion,
  FeedMonitor,
  NewFeedMonitor,
} from './schemaTypes.js';

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
