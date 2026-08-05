// Mirrors server/src/db/schema.ts's jobOutputVersions table (server and
// client are separate TS projects with no shared schema import — same
// convention as scheduledPost.ts's ScheduledPost). Content is intentionally
// omitted from the list shape — GET /:jobId/versions returns metadata only
// (id/score/label/createdAt); the full content only round-trips through the
// restore endpoint, never rendered as a diff client-side.
export interface JobOutputVersionSummary {
  id: string;
  qualityScore: number | null;
  label: string;
  createdAt: string;
}

export interface JobVersionListResponse {
  versions: JobOutputVersionSummary[];
}
