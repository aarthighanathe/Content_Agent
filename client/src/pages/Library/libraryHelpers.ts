import { getLatestQualityScore } from '../../lib/qualityScore';

export const statusConfig: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',    color: '#F59E0B' },
  processing: { label: 'Processing', color: '#60A5FA' },
  done:       { label: 'Done',       color: 'var(--color-success)' },
  failed:     { label: 'Failed',     color: 'var(--color-error)' },
};

export type SortKey = 'date' | 'score' | 'platform';

export const SORT_OPTS: { key: SortKey; label: string }[] = [
  { key: 'date',     label: 'Date (newest)'   },
  { key: 'score',    label: 'Score (high→low)' },
  { key: 'platform', label: 'Platform'         },
];

// WHY content: unknown — an output's content shape varies by outputType; matches the
// canonical JobOutput in types/job.ts. getQualityScore narrows it via a type guard below
// instead of assuming shape (same pattern as Dashboard/dashboardTypes.ts).
export interface JobOutput {
  outputType: string;
  qualityScore?: number | null;
  content?: unknown;
}

export interface LibraryJob {
  id: string;
  topic: string;
  platform: string;
  status: string;
  createdAt: string;
  outputs?: JobOutput[] | null;
  // WHY optional: only set on jobs created via Repurpose's "paste a URL" flow
  sourceUrl?: string | null;
  // WHY optional: tag column is nullable; the PATCH /:jobId/tag endpoint writes it
  // (tagJobSchema: 1–30 chars). Jobs with no tag simply omit this field.
  tag?: string | null;
  // WHY optional: only set on multiply/repurpose-origin jobs (sourceJobId
  // exists in the DB but may be null for jobs created directly via Create).
  sourceJobId?: string | null;
  sourcePlatform?: string | null;
}

export function getQualityScore(job: LibraryJob): number | null {
  // WHY last final/critique (CORR-004): critic retries append multiple rows —
  // .find() picked the first (often lower) score while Result used the last.
  return getLatestQualityScore(job.outputs);
}

export interface LibraryJobGroup {
  key: string;
  topic: string;
  jobs: LibraryJob[];
}

function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, ' ');
}

// WHY topic-based, not job-based: Library cards collapse Adapt siblings and
// same-topic generations into one row, so paging by raw jobs (10) often showed
// only a handful of topics. Paginate the grouped list at this size instead.
export const TOPICS_PER_PAGE = 10;

/**
 * Groups Adapt-family siblings (via sourceJobId) and same-topic generations so
 * Library can show one cluster per research thread instead of flat duplicates.
 * Callers that page by topic should group the full filtered set first, then
 * slice with `jobsForTopicPage` — siblings split across job-pages would
 * otherwise render as separate cards. Open on Result uses GET /related for
 * the full tree when a parent is missing from the loaded set.
 */
export function groupLibraryJobs(jobs: LibraryJob[]): LibraryJobGroup[] {
  if (jobs.length === 0) return [];

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let cur = parent.get(id) ?? id;
    while ((parent.get(cur) ?? cur) !== cur) {
      cur = parent.get(cur) ?? cur;
    }
    parent.set(id, cur);
    return cur;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const j of jobs) parent.set(j.id, j.id);

  const byId = new Map(jobs.map((j) => [j.id, j]));

  // Connect Adapt children to parents when both are on this page.
  for (const j of jobs) {
    if (j.sourceJobId && byId.has(j.sourceJobId)) {
      union(j.id, j.sourceJobId);
    }
  }

  // Siblings that share an off-page sourceJobId (e.g. Caption + Twitter both
  // adapted from a Carousel not on this page).
  const byOffPageSource = new Map<string, string[]>();
  for (const j of jobs) {
    if (!j.sourceJobId || byId.has(j.sourceJobId)) continue;
    const list = byOffPageSource.get(j.sourceJobId) ?? [];
    list.push(j.id);
    byOffPageSource.set(j.sourceJobId, list);
  }
  for (const ids of byOffPageSource.values()) {
    for (let i = 1; i < ids.length; i++) {
      union(ids[0]!, ids[i]!);
    }
  }

  // Same topic → one group (Create + Adapt variants of that topic).
  const byTopic = new Map<string, string[]>();
  for (const j of jobs) {
    const k = normalizeTopicKey(j.topic || '');
    if (!k) continue;
    const list = byTopic.get(k) ?? [];
    list.push(j.id);
    byTopic.set(k, list);
  }
  for (const ids of byTopic.values()) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i++) {
      union(ids[0]!, ids[i]!);
    }
  }

  const buckets = new Map<string, LibraryJob[]>();
  for (const j of jobs) {
    const root = find(j.id);
    const list = buckets.get(root) ?? [];
    list.push(j);
    buckets.set(root, list);
  }

  const groups: LibraryJobGroup[] = [];
  for (const [key, members] of buckets) {
    const sorted = [...members].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const first = sorted[0];
    if (!first) continue;
    groups.push({ key, topic: first.topic, jobs: sorted });
  }

  groups.sort((a, b) => {
    const aT = new Date(a.jobs[0]?.createdAt ?? 0).getTime();
    const bT = new Date(b.jobs[0]?.createdAt ?? 0).getTime();
    return bT - aT;
  });
  return groups;
}

/** Slice grouped topics for Library pagination (10 topics per page). */
export function jobsForTopicPage(
  jobs: LibraryJob[],
  page: number,
  perPage: number = TOPICS_PER_PAGE,
): { pageJobs: LibraryJob[]; totalPages: number } {
  const groups = groupLibraryJobs(jobs);
  const totalPages = Math.max(1, Math.ceil(groups.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageJobs = groups
    .slice((safePage - 1) * perPage, safePage * perPage)
    .flatMap((g) => g.jobs);
  return { pageJobs, totalPages };
}
