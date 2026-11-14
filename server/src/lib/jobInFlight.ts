/**
 * Shared in-flight status predicate for content_jobs / memory snapshots.
 * WHY: PATCH content, version restore, and regenerate must agree on which
 * statuses mean "still generating" — DB mid-pipeline rows use
 * researching|writing|formatting|critiquing (via updateJobStageInDb), not
 * only pending|processing.
 */
export function isJobInFlightStatus(status: string): boolean {
  return status === 'pending'
    || status === 'processing'
    || status === 'researching'
    || status === 'writing'
    || status === 'formatting'
    || status === 'critiquing';
}
