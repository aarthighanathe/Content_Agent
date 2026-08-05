// Mirrors server/src/db/schema.ts's collections/collectionJobs tables (server
// and client are separate TS projects with no shared schema import — same
// convention as scheduledPost.ts's ScheduledPost). A collection is a named,
// user-created group; a job can belong to any number of collections
// (many-to-many), unlike the single free-text tag column on contentJobs.
export interface Collection {
  id: string;
  name: string;
  createdAt: string;
  jobCount: number;
}

export interface CollectionListResponse {
  collections: Collection[];
}

export interface CreateCollectionResponse {
  collection: Collection;
}
