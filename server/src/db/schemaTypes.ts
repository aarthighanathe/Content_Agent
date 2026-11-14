import {
  socialTokens,
  users,
  contentJobs,
  contentOutputs,
  agentLogs,
  scheduledPosts,
  competitorAnalyses,
  collections,
  collectionJobs,
  jobOutputVersions,
  feedMonitors,
} from './schemaTables.js';

// WHY: inferred types extracted so schema.ts stays under the 400-line cap.

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
