// Standalone UUID-format check with zero imports — deliberately lightweight
// so it can be imported from files that need to avoid pulling in
// routes/jobs/ownership.ts's transitive BullMQ/Redis import chain (worker
// setup, real Redis connections), which isn't mocked by every test that
// imports routes/users.ts or lib/persistJob.ts. Single source of truth for
// this check — every call site that validates a userId/jobId looks the same
// way (jobs/ownership.ts, lib/persistJob.ts, routes/users/profileStore.ts,
// routes/scheduledPosts.ts) should import this rather than redeclaring it,
// since a future correctness fix (e.g. UUID v7 support) would otherwise need
// to be found and applied in each copy independently.
export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
