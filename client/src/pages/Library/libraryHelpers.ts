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

function getContentTotalScore(content: unknown): number | null {
  if (
    typeof content === 'object' &&
    content !== null &&
    'totalScore' in content &&
    typeof (content as { totalScore?: unknown }).totalScore === 'number'
  ) {
    return (content as { totalScore: number }).totalScore;
  }
  return null;
}

export function getQualityScore(job: LibraryJob): number | null {
  const critique = job.outputs?.find((o) => o.outputType === 'critique');
  return critique?.qualityScore ?? getContentTotalScore(critique?.content) ?? null;
}

export interface LibraryJobGroup {
  key: string;
  topic: string;
  jobs: LibraryJob[];
}

function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Groups Adapt-family siblings (via sourceJobId) and same-topic generations so
 * Library can show one cluster per research thread instead of flat duplicates.
 * Only uses jobs on the current page — siblings on other pages still appear
 * there; Open on Result uses GET /related for the full tree.
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

// Extracted from Library.tsx's inline <style> block to keep the page component under the
// 400-line limit. Pure CSS string — no logic — safe to colocate outside the component file.
export const LIBRARY_STYLES = `
  @keyframes lib-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lib-spin { to { transform:rotate(360deg); } }

  .lib-page { display:flex; flex-direction:column; gap:1.15rem; }

  /* Header */
  .lib-page-hd { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .lib-page-hd-main { display:flex; align-items:flex-start; gap:12px; min-width:0; }
  .lib-page-hd-icon {
    width:40px; height:40px; border-radius:12px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    color:var(--accent);
    background:linear-gradient(145deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent-2) 10%, transparent));
    border:1px solid color-mix(in srgb, var(--accent) 22%, transparent);
    box-shadow:0 0 20px color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .lib-page-title {
    margin:0; font-family:var(--font-heading); font-size:clamp(20px,4.5vw,26px);
    font-weight:700; line-height:1.15; color:var(--text-primary); letter-spacing:-0.02em;
  }
  .lib-page-sub { margin:5px 0 0; font-size:12.5px; color:var(--text-muted); line-height:1.4; }
  .lib-page-actions { display:flex; gap:8px; flex-shrink:0; flex-wrap:wrap; }
  .lib-hd-btn {
    display:inline-flex; align-items:center; gap:6px; padding:9px 14px;
    border-radius:10px; cursor:pointer; font-size:12px; font-weight:500;
    background:color-mix(in srgb, var(--text-primary) 4%, transparent);
    border:1px solid var(--rule); color:var(--text-secondary); transition:all .15s;
  }
  .lib-hd-btn:hover { color:var(--text-primary); border-color:color-mix(in srgb, var(--text-primary) 18%, var(--rule)); }
  .lib-hd-btn.on { background:color-mix(in srgb, var(--accent-2) 10%, transparent); border-color:color-mix(in srgb, var(--accent-2) 35%, transparent); color:var(--accent-2); }
  .lib-hd-btn.on.accent { background:color-mix(in srgb, var(--accent) 10%, transparent); border-color:color-mix(in srgb, var(--accent) 35%, transparent); color:var(--accent); }
  .lib-hd-create { white-space:nowrap; }

  /* Folders — toolbar dropdown (no permanent empty rail) */
  .lib-filter-tools { display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .lib-folders-wrap { position:relative; }
  .lib-folders-btn {
    display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:9px;
    font-size:11.5px; font-family:var(--font-mono); border:1px solid var(--rule);
    background:color-mix(in srgb, var(--bg-card) 55%, transparent); color:var(--text-muted);
    cursor:pointer; white-space:nowrap; transition:all .15s;
  }
  .lib-folders-btn:hover, .lib-folders-btn.on {
    color:var(--text-secondary); border-color:color-mix(in srgb, var(--accent) 28%, var(--rule));
  }
  .lib-folders-btn.on {
    color:var(--accent); background:color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .lib-folders-count {
    font-size:9.5px; padding:1px 6px; border-radius:999px;
    background:color-mix(in srgb, var(--text-primary) 8%, transparent); color:var(--text-muted);
  }
  .lib-folders-menu {
    position:absolute; top:calc(100% + 6px); right:0; z-index:40; min-width:220px;
    padding:6px; border-radius:12px; border:1px solid var(--rule);
    background:var(--bg-raised); box-shadow:0 12px 32px rgba(0,0,0,0.35);
    display:flex; flex-direction:column; gap:2px; animation:lib-up .12s ease both;
  }
  .lib-folders-row { display:flex; align-items:center; gap:2px; }
  .lib-folders-item {
    flex:1; min-width:0; display:flex; align-items:center; gap:8px;
    padding:8px 10px; border:none; border-radius:8px; background:transparent;
    color:var(--text-secondary); font-size:12px; font-family:var(--font-sans);
    cursor:pointer; text-align:left; transition:background .12s;
  }
  .lib-folders-item:hover { background:color-mix(in srgb, var(--text-primary) 5%, transparent); }
  .lib-folders-item.sel { color:var(--accent); background:color-mix(in srgb, var(--accent) 8%, transparent); }
  .lib-folders-item.new { color:var(--text-muted); font-family:var(--font-mono); font-size:11.5px; }
  .lib-folders-item-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .lib-folders-item-n { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); }
  .lib-folders-del {
    width:28px; height:28px; border:none; border-radius:8px; background:transparent;
    color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center;
    opacity:0; transition:opacity .12s, color .12s;
  }
  .lib-folders-row:hover .lib-folders-del, .lib-folders-row:focus-within .lib-folders-del { opacity:0.7; }
  .lib-folders-del:hover { opacity:1 !important; color:var(--color-error); }
  @media (hover: none) { .lib-folders-del { opacity:0.55; } }
  .lib-folders-hint {
    margin:4px 10px 6px; font-size:11px; color:var(--text-muted); line-height:1.4;
  }
  .lib-folders-create { display:flex; align-items:center; gap:6px; padding:6px; }
  .lib-folders-input {
    flex:1; background:var(--bg-card); border:1px solid var(--rule); border-radius:8px;
    padding:7px 10px; color:var(--text-primary); font-size:12px; font-family:var(--font-mono);
    outline:none;
  }
  .lib-folders-input:focus { border-color:color-mix(in srgb, var(--accent) 40%, transparent); }
  .lib-folders-add {
    padding:7px 11px; border-radius:8px; border:1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    background:color-mix(in srgb, var(--accent) 12%, transparent); color:var(--accent);
    font-size:11px; font-family:var(--font-mono); cursor:pointer;
  }
  .lib-folders-add:disabled { opacity:0.5; cursor:default; }

  /* Controls surface */
  .lib-controls {
    display:flex; flex-direction:column; gap:12px; padding:14px;
    border-radius:14px; background:var(--bg-raised); border:1px solid var(--rule);
  }
  .lib-search-wrap {
    display:flex; align-items:center; gap:10px;
    background:color-mix(in srgb, var(--bg-card) 90%, transparent);
    border:1.5px solid var(--rule); border-radius:12px; padding:11px 14px;
    transition:border-color .2s, box-shadow .2s;
  }
  .lib-search-wrap:focus-within {
    border-color:color-mix(in srgb, var(--accent) 42%, transparent);
    box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .lib-search-wrap input {
    background:transparent; border:none; outline:none; color:var(--color-text-primary);
    font-size:13.5px; flex:1; font-family:var(--font-sans); min-width:0;
  }
  .lib-search-wrap input::placeholder { color:var(--text-muted); }
  .lib-search-clear {
    background:color-mix(in srgb, var(--text-primary) 6%, transparent); border:none;
    cursor:pointer; color:var(--text-muted); padding:4px; border-radius:6px;
    display:flex; align-items:center;
  }
  .lib-search-clear:hover { color:var(--text-primary); }

  .lib-manage-bar {
    display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
    background:color-mix(in srgb, var(--accent) 6%, transparent);
    border:1px solid color-mix(in srgb, var(--accent) 22%, transparent);
    border-radius:11px; padding:10px 14px; animation:lib-up .18s ease both;
  }
  .lib-manage-left { display:flex; align-items:center; gap:10px; }
  .lib-manage-select {
    display:flex; align-items:center; gap:6px; background:none; border:none;
    cursor:pointer; color:var(--text-secondary); font-size:12px; padding:0;
  }
  .lib-manage-select:disabled { opacity:0.6; cursor:default; }
  .lib-manage-count { font-size:11.5px; color:var(--text-muted); font-family:var(--font-mono); }
  .lib-manage-actions { display:flex; gap:8px; }
  .lib-manage-export {
    display:inline-flex; align-items:center; gap:6px; padding:7px 13px;
    background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25);
    border-radius:8px; cursor:pointer; color:var(--color-success); font-size:12px; font-weight:500;
  }
  .lib-manage-export:disabled { opacity:0.6; cursor:default; }
  .lib-manage-delete {
    display:inline-flex; align-items:center; gap:6px; padding:7px 13px;
    background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25);
    border-radius:8px; cursor:pointer; color:var(--color-error); font-size:12px; font-weight:500;
  }

  .lib-filter-row { display:flex; align-items:center; gap:10px; }
  .lib-filters { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; flex:1; min-width:0; }
  .lib-filters::-webkit-scrollbar { display:none; }
  .lib-pill {
    display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border-radius:999px;
    font-size:11px; cursor:pointer; transition:all .15s; font-family:var(--font-mono);
    letter-spacing:0.2px; border:1px solid var(--rule); white-space:nowrap;
    background:color-mix(in srgb, var(--bg-card) 40%, transparent); color:var(--text-muted);
  }
  .lib-pill:hover { color:var(--text-secondary); }
  .lib-pill.on { font-weight:600; }
  .lib-pill-count { opacity:0.55; font-size:9.5px; margin-left:2px; }

  .lib-sort-wrap { position:relative; flex-shrink:0; }
  .lib-sort-btn {
    display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:999px;
    border:1px solid var(--rule); background:color-mix(in srgb, var(--bg-card) 50%, transparent);
    color:var(--text-secondary); font-size:11px; cursor:pointer; white-space:nowrap;
    transition:all .15s; font-family:var(--font-mono);
  }
  .lib-sort-btn:hover,.lib-sort-btn.active {
    border-color:color-mix(in srgb, var(--accent) 35%, transparent);
    color:var(--accent); background:color-mix(in srgb, var(--accent) 7%, transparent);
  }
  .lib-sort-menu {
    position:absolute; right:0; top:calc(100% + 6px); width:178px;
    background:var(--bg-card); border:1px solid color-mix(in srgb, var(--accent) 18%, var(--rule));
    border-radius:12px; box-shadow:0 16px 48px rgba(0,0,0,0.55); z-index:40; overflow:hidden;
  }
  .lib-sort-item {
    width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px;
    padding:10px 13px; font-size:12px; background:none; border:none; cursor:pointer;
    transition:background .15s; text-align:left; font-family:var(--font-sans); color:var(--text-secondary);
  }
  .lib-sort-item:hover { background:color-mix(in srgb, var(--accent) 7%, transparent); }
  .lib-sort-item.sel { color:var(--accent); }

  .lib-tag-filters { display:flex; gap:6px; overflow-x:auto; padding:2px 0; scrollbar-width:none; flex-wrap:nowrap; }
  .lib-tag-filters::-webkit-scrollbar { display:none; }
  .lib-tag-filter-pill {
    display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px;
    font-size:10px; font-family:var(--font-mono); border:1px solid var(--rule);
    background:transparent; color:var(--text-muted); cursor:pointer; white-space:nowrap; transition:all .15s;
  }
  .lib-tag-filter-pill.active {
    border-color:color-mix(in srgb, var(--accent-2) 45%, transparent);
    background:color-mix(in srgb, var(--accent-2) 10%, transparent); color:var(--accent-2);
  }

  /* Job cards */
  .lib-card {
    background:var(--bg-raised); border:1px solid var(--rule); border-radius:12px;
    overflow:visible; cursor:pointer; position:relative;
    transition:border-color .2s, background .2s, box-shadow .2s;
    animation:lib-up .22s ease both;
  }
  .lib-card:hover {
    border-color:color-mix(in srgb, var(--accent) 28%, transparent);
    background:color-mix(in srgb, var(--bg-raised) 96%, var(--accent) 4%);
    box-shadow:0 6px 20px rgba(0,0,0,0.18), inset 2px 0 0 color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .lib-card:focus-visible {
    outline:2px solid color-mix(in srgb, var(--accent) 50%, transparent); outline-offset:2px;
  }
  .lib-card-inner { padding:12px 14px; display:flex; align-items:center; gap:12px; }

  /* Family — compact chip row */
  .lib-family {
    background:var(--bg-raised); border:1px solid var(--rule); border-radius:12px;
    /* WHY visible overflow — chip action menus position below the chip */
    overflow:visible; animation:lib-up .22s ease both;
    padding:12px 14px; display:flex; flex-direction:column; gap:10px;
  }
  .lib-family:hover { border-color:color-mix(in srgb, var(--accent) 18%, var(--rule)); }
  .lib-family-hd {
    display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
  }
  .lib-family-title {
    margin:0; font-size:13px; font-weight:650; color:var(--text-primary);
    line-height:1.4; letter-spacing:-0.015em; flex:1; min-width:0;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }
  .lib-family-side {
    flex-shrink:0; display:flex; align-items:center; gap:8px; padding-top:1px;
  }
  .lib-family-count {
    font-family:var(--font-mono); font-size:10px; font-weight:600; color:var(--accent);
    min-width:20px; height:20px; padding:0 6px; border-radius:999px;
    display:inline-flex; align-items:center; justify-content:center;
    background:color-mix(in srgb, var(--accent) 12%, transparent);
    border:1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .lib-family-ago {
    font-family:var(--font-mono); font-size:10px; color:var(--text-muted);
  }
  .lib-family-chips {
    display:flex; flex-wrap:wrap; gap:6px; align-items:center;
  }
  .lib-chip {
    display:inline-flex; align-items:stretch; border:1px solid var(--rule);
    border-radius:999px; background:color-mix(in srgb, var(--bg-card) 70%, transparent);
    /* WHY no overflow:hidden — the ⋯ popover must escape the chip */
    transition:border-color .15s, background .15s, transform .12s;
  }
  .lib-chip:hover {
    transform:translateY(-1px);
    background:color-mix(in srgb, var(--bg-card) 85%, var(--accent) 15%);
  }
  .lib-chip.on, .lib-chip.menu-on {
    background:color-mix(in srgb, var(--accent) 8%, var(--bg-card));
  }
  .lib-chip-main {
    display:inline-flex; align-items:center; gap:6px; padding:5px 8px 5px 9px;
    border:none; background:transparent; cursor:pointer; color:inherit;
  }
  .lib-chip-main:focus-visible {
    outline:2px solid color-mix(in srgb, var(--accent) 50%, transparent); outline-offset:-2px;
  }
  .lib-chip-check { display:flex; }
  .lib-chip-label {
    font-family:var(--font-mono); font-size:11px; font-weight:650; letter-spacing:0.01em;
  }
  .lib-chip-score {
    font-family:var(--font-mono); font-size:10.5px; font-weight:700;
    min-width:1.4em; text-align:right;
  }
  .lib-chip-more {
    width:26px; height:100%; min-height:28px; border:none;
    border-left:1px solid color-mix(in srgb, var(--rule) 80%, transparent);
    border-radius:0 999px 999px 0;
    background:transparent; color:var(--text-muted); cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:color .12s, background .12s;
  }
  .lib-chip-more:hover { color:var(--text-primary); background:color-mix(in srgb, var(--text-primary) 5%, transparent); }

  /* Portaled to body — fixed so it never sits under the next card */
  .lib-job-menu {
    position:fixed; z-index:10000; min-width:188px;
    padding:5px; border-radius:11px; border:1px solid var(--rule);
    background:var(--bg-raised); box-shadow:0 14px 36px rgba(0,0,0,0.45);
    display:flex; flex-direction:column; gap:1px;
  }
  .lib-job-menu-item {
    display:flex; align-items:center; gap:9px; width:100%; padding:8px 10px;
    border:none; border-radius:8px; background:transparent; cursor:pointer;
    color:var(--text-secondary); font-size:12.5px; font-family:var(--font-sans);
    text-align:left; transition:background .12s, color .12s;
  }
  .lib-job-menu-item:hover { background:color-mix(in srgb, var(--text-primary) 6%, transparent); color:var(--text-primary); }
  .lib-job-menu-item.danger { color:var(--color-error); }
  .lib-job-menu-item.danger:hover { background:rgba(239,68,68,0.1); }
  .lib-job-menu-meta {
    margin-left:auto; font-family:var(--font-mono); font-size:10px; color:var(--text-muted);
    max-width:72px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .lib-job-menu-sep { height:1px; margin:3px 6px; background:var(--rule); }
  .lib-job-menu-panel { display:flex; flex-direction:column; gap:8px; padding:6px 4px 4px; }
  .lib-job-menu-panel-title {
    margin:0 6px; font-family:var(--font-mono); font-size:10px; letter-spacing:0.05em;
    text-transform:uppercase; color:var(--text-muted);
  }
  .lib-job-menu-input {
    margin:0 2px; background:var(--bg-card); border:1px solid var(--rule); border-radius:8px;
    padding:8px 10px; color:var(--text-primary); font-size:12.5px; font-family:var(--font-mono);
    outline:none;
  }
  .lib-job-menu-input:focus { border-color:color-mix(in srgb, var(--accent) 40%, transparent); }
  .lib-job-menu-panel-actions { display:flex; justify-content:flex-end; gap:6px; padding:0 2px; }
  .lib-job-menu-ghost {
    padding:6px 10px; border:none; border-radius:7px; background:transparent;
    color:var(--text-muted); font-size:11.5px; font-family:var(--font-mono); cursor:pointer;
  }
  .lib-job-menu-ghost:hover { color:var(--text-secondary); }
  .lib-job-menu-primary {
    padding:6px 12px; border-radius:7px;
    border:1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    background:color-mix(in srgb, var(--accent) 12%, transparent); color:var(--accent);
    font-size:11.5px; font-family:var(--font-mono); cursor:pointer;
  }
  .lib-job-menu-primary:disabled { opacity:0.5; cursor:default; }
  .lib-job-menu-empty {
    margin:0 6px 4px; font-size:11.5px; color:var(--text-muted); line-height:1.4;
  }
  .lib-job-menu-folders { display:flex; flex-direction:column; gap:1px; max-height:180px; overflow-y:auto; }
  .lib-job-menu-folder-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .lib-tag-chip {
    display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:999px;
    font-size:9.5px; font-family:var(--font-mono);
    border:1px solid color-mix(in srgb, var(--accent-2) 35%, transparent);
    background:color-mix(in srgb, var(--accent-2) 8%, transparent); color:var(--accent-2);
    cursor:pointer; white-space:nowrap; transition:opacity .15s;
  }
  .lib-tag-chip:hover { opacity:0.8; }
  .lib-lineage-chip {
    display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:999px;
    font-size:9px; font-family:var(--font-mono);
    border:1px solid color-mix(in srgb, var(--text-muted) 25%, transparent);
    background:color-mix(in srgb, var(--text-muted) 6%, transparent); color:var(--text-muted);
    white-space:nowrap; cursor:pointer; transition:opacity .15s; text-decoration:none;
  }
  .lib-lineage-chip:hover { opacity:0.8; color:var(--text-secondary); }
  .lib-tag-input-wrap {
    display:flex; align-items:center; gap:6px; padding:8px 12px;
    border-top:1px solid var(--rule); animation:lib-up .12s ease both;
    background:color-mix(in srgb, var(--bg-card) 40%, transparent);
  }
  .lib-tag-input {
    flex:1; background:var(--bg-card); border:1px solid var(--rule); border-radius:8px;
    padding:6px 10px; color:var(--text-primary); font-size:12px; font-family:var(--font-mono);
    outline:none; transition:border-color .15s;
  }
  .lib-tag-input:focus { border-color:color-mix(in srgb, var(--accent) 40%, transparent); }

  /* Compact insights strip — one short band above the feed */
  .lib-analytics {
    display:flex; flex-direction:column; gap:10px; padding:10px 12px;
    background:var(--bg-raised); border:1px solid var(--rule); border-radius:12px;
    animation:lib-up .2s ease both;
  }
  .lib-analytics-top {
    display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;
  }
  .lib-analytics-brand {
    display:flex; align-items:center; gap:8px; min-width:0;
  }
  .lib-analytics-icon {
    width:24px; height:24px; border-radius:7px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center; color:var(--accent);
    background:color-mix(in srgb, var(--accent) 12%, transparent);
    border:1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .lib-analytics-heading {
    font-size:12.5px; font-weight:650; color:var(--text-primary); letter-spacing:-0.01em;
  }
  .lib-analytics-sub {
    font-size:10.5px; color:var(--text-muted); font-family:var(--font-mono);
  }
  .lib-analytics-kpis { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .lib-kpi {
    display:inline-flex; align-items:baseline; gap:4px;
    padding:4px 9px; border-radius:999px; font-size:10.5px; font-family:var(--font-mono);
    color:var(--text-muted); border:1px solid var(--rule);
    background:color-mix(in srgb, var(--bg-card) 60%, transparent);
  }
  .lib-kpi strong { font-size:12px; font-weight:700; color:var(--text-primary); }
  .lib-kpi.accent {
    border-color:color-mix(in srgb, var(--accent) 32%, var(--rule));
    background:color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .lib-kpi.accent strong { color:var(--accent); }

  .lib-analytics-body {
    display:grid; grid-template-columns:1.2fr 1fr minmax(140px, 0.7fr);
    gap:10px; align-items:stretch;
  }
  @media (max-width:900px) {
    .lib-analytics-body { grid-template-columns:1fr 1fr; }
    .lib-analytics-block--trend { grid-column:1 / -1; }
  }
  @media (max-width:560px) {
    .lib-analytics-body { grid-template-columns:1fr; }
    .lib-analytics-block--trend { grid-column:auto; }
  }
  .lib-analytics-block {
    display:flex; flex-direction:column; gap:6px; min-width:0;
    padding:8px 9px; border-radius:9px;
    background:color-mix(in srgb, var(--bg-card) 50%, transparent);
    border:1px solid color-mix(in srgb, var(--rule) 85%, transparent);
  }
  .lib-analytics-block-lbl {
    font-size:9.5px; font-family:var(--font-mono); font-weight:600;
    letter-spacing:0.06em; text-transform:uppercase; color:var(--text-muted);
  }
  .lib-analytics-empty { margin:0; font-size:11px; color:var(--text-muted); }

  .lib-stack-bar {
    display:flex; height:10px; border-radius:999px; overflow:hidden;
    background:color-mix(in srgb, var(--text-muted) 10%, transparent);
    gap:2px;
  }
  .lib-stack-seg {
    min-width:4px; border-radius:2px;
    transition:flex-grow .35s ease;
  }
  .lib-stack-legend {
    display:flex; flex-wrap:wrap; gap:4px 10px;
  }
  .lib-stack-leg {
    display:inline-flex; align-items:center; gap:4px;
    font-family:var(--font-mono); font-size:10px; color:var(--text-secondary);
  }
  .lib-stack-leg i {
    width:6px; height:6px; border-radius:50%; display:inline-block;
  }
  .lib-stack-leg b { font-weight:700; color:var(--text-primary); }
  .lib-stack-leg.mute { opacity:0.35; }

  .lib-plat-pills { display:flex; flex-wrap:wrap; gap:5px; }
  .lib-plat-pill {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 8px; border-radius:999px; border:1px solid;
    font-family:var(--font-mono); font-size:10.5px; font-weight:600;
  }
  .lib-plat-pill em {
    font-style:normal; font-weight:700; opacity:0.75; font-size:10px;
  }

  .lib-trend {
    display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto;
    column-gap:8px; row-gap:2px; align-items:center; flex:1;
  }
  .lib-trend-meta {
    display:flex; flex-direction:column; align-items:flex-start; gap:3px;
    grid-row:1 / 3;
  }
  .lib-trend-now {
    font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--text-primary);
    letter-spacing:-0.03em; line-height:1;
  }
  .lib-trend-delta {
    font-family:var(--font-mono); font-size:9.5px; font-weight:650;
    padding:1px 6px; border-radius:999px; color:var(--text-secondary);
    background:color-mix(in srgb, var(--text-muted) 10%, transparent);
    border:1px solid var(--rule);
  }
  .lib-trend-delta.up {
    color:#34D399; background:rgba(52,211,153,0.1); border-color:rgba(52,211,153,0.28);
  }
  .lib-trend-delta.down {
    color:#F87171; background:rgba(248,113,113,0.1); border-color:rgba(248,113,113,0.28);
  }
  .lib-trend-svg { width:100%; height:36px; display:block; grid-column:2; }
  .lib-trend-dot { fill:var(--accent); }
  .lib-trend-range {
    grid-column:2; display:flex; justify-content:space-between;
    font-family:var(--font-mono); font-size:9px; color:var(--text-muted);
  }

  .lib-more-btn {
    display:flex; align-items:center; justify-content:center; width:30px; height:30px;
    border-radius:9px; border:1px solid transparent; background:transparent;
    color:var(--text-muted); cursor:pointer; flex-shrink:0; transition:all .15s; align-self:center;
  }
  .lib-more-btn:hover {
    border-color:var(--rule); background:color-mix(in srgb, var(--text-primary) 6%, transparent);
    color:var(--text-secondary);
  }

  /* Pagination */
  .lib-pagination {
    display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap;
    padding:6px 0 2px;
  }
  .lib-page-btn {
    padding:8px 14px; border-radius:9px; font-size:12px; cursor:pointer;
    border:1px solid var(--rule); background:var(--bg-raised); color:var(--text-secondary);
    transition:all .15s;
  }
  .lib-page-btn:hover:not(:disabled) { color:var(--text-primary); border-color:color-mix(in srgb, var(--accent) 30%, var(--rule)); }
  .lib-page-btn:disabled { opacity:0.4; cursor:default; }
  .lib-page-nums { display:flex; gap:4px; }
  .lib-page-num {
    width:34px; height:34px; border-radius:9px; font-size:12px; cursor:pointer;
    font-family:var(--font-mono); border:1px solid var(--rule);
    background:transparent; color:var(--text-muted); transition:all .15s;
  }
  .lib-page-num:hover { color:var(--text-primary); }
  .lib-page-num.on {
    border-color:color-mix(in srgb, var(--accent) 40%, transparent);
    background:color-mix(in srgb, var(--accent) 12%, transparent); color:var(--accent); font-weight:600;
  }

  .lib-spin { animation:lib-spin 0.8s linear infinite; }

  @media (max-width:640px) {
    .lib-page-hd-icon { width:36px; height:36px; border-radius:10px; }
    .lib-controls { padding:12px; gap:10px; }
    .lib-card-inner { padding:12px; gap:10px; }
    .lib-filter-row { flex-direction:column; align-items:stretch; }
    .lib-filter-tools { align-self:flex-end; }
  }
`;
