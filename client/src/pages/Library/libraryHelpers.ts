export { formatDate } from '../../lib/utils';

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

// Extracted from Library.tsx's inline <style> block to keep the page component under the
// 400-line limit. Pure CSS string — no logic — safe to colocate outside the component file.
export const LIBRARY_STYLES = `
  @keyframes lib-up     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lib-shimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }
  .lib-card { background:var(--bg-raised); border:1px solid var(--rule); border-radius:14px; overflow:hidden; cursor:pointer; transition:border-color .2s, background .2s, box-shadow .2s; animation:lib-up .22s ease both; position:relative; }
  .lib-card:hover { border-color:color-mix(in srgb, var(--accent) 22%, transparent); background:color-mix(in srgb, var(--bg-raised) 100%, var(--text-primary) 4%); box-shadow:0 4px 20px rgba(0,0,0,0.18); }
  .lib-card-inner { padding:14px 18px; display:flex; align-items:center; gap:13px; }
  .lib-search-wrap { display:flex; align-items:center; gap:10px; background:color-mix(in srgb, var(--bg-raised) 85%, transparent); border:1.5px solid var(--rule); border-radius:11px; padding:10px 14px; transition:border-color .2s,box-shadow .2s; }
  .lib-search-wrap:focus-within { border-color:color-mix(in srgb, var(--accent) 40%, transparent); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 7%, transparent); }
  .lib-search-wrap input { background:transparent; border:none; outline:none; color:var(--color-text-primary); font-size:13px; flex:1; font-family:var(--font-sans); min-width:0; }
  .lib-search-wrap input::placeholder { color:var(--text-muted); }
  .lib-tab { padding:8px 16px; border-radius:8px; border:1px solid transparent; background:transparent; cursor:pointer; font-size:12.5px; font-weight:500; font-family:var(--font-sans); transition:all .15s; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; }
  .lib-tab.active { background:color-mix(in srgb, var(--accent) 10%, transparent); border-color:color-mix(in srgb, var(--accent) 30%, transparent); color:var(--accent); }
  .lib-tab:not(.active) { color:var(--text-secondary); }
  .lib-tab:not(.active):hover { color:var(--text-primary); }
  .lib-pill { display:inline-flex; align-items:center; padding:4px 11px; border-radius:20px; font-size:10.5px; cursor:pointer; transition:all .15s; font-family:var(--font-mono); letter-spacing:0.3px; border:1px solid; white-space:nowrap; background:transparent; }
  .lib-tag-chip { display:inline-flex; align-items:center; gap:3px; padding:1px 7px; border-radius:20px; font-size:9.5px; font-family:var(--font-mono); border:1px solid color-mix(in srgb, var(--accent-2) 35%, transparent); background:color-mix(in srgb, var(--accent-2) 8%, transparent); color:var(--accent-2); cursor:pointer; white-space:nowrap; transition:opacity .15s; }
  .lib-tag-chip:hover { opacity:0.75; }
  .lib-lineage-chip { display:inline-flex; align-items:center; gap:3px; padding:1px 7px; border-radius:20px; font-size:9px; font-family:var(--font-mono); border:1px solid color-mix(in srgb, var(--text-muted) 25%, transparent); background:color-mix(in srgb, var(--text-muted) 6%, transparent); color:var(--text-muted); white-space:nowrap; cursor:pointer; transition:opacity .15s; text-decoration:none; }
  .lib-lineage-chip:hover { opacity:0.75; color:var(--text-secondary); }
  .lib-tag-input-wrap { display:flex; align-items:center; gap:6px; padding:6px 10px; border-top:1px solid var(--rule); animation:lib-up .12s ease both; }
  .lib-tag-input { flex:1; background:color-mix(in srgb, var(--bg-raised) 80%, transparent); border:1px solid var(--rule); border-radius:7px; padding:5px 9px; color:var(--text-primary); font-size:12px; font-family:var(--font-mono); outline:none; transition:border-color .15s; }
  .lib-tag-input:focus { border-color:color-mix(in srgb, var(--accent) 40%, transparent); }
  .lib-tag-filters { display:flex; gap:5px; overflow-x:auto; padding:2px 0 4px; scrollbar-width:none; flex-wrap:nowrap; }
  .lib-tag-filters::-webkit-scrollbar { display:none; }
  .lib-tag-filter-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:10px; font-family:var(--font-mono); border:1px solid var(--rule); background:transparent; color:var(--text-muted); cursor:pointer; white-space:nowrap; transition:all .15s; }
  .lib-tag-filter-pill.active { border-color:color-mix(in srgb, var(--accent-2) 45%, transparent); background:color-mix(in srgb, var(--accent-2) 10%, transparent); color:var(--accent-2); }
  .lib-analytics-panel { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:16px; background:var(--bg-raised); border:1px solid var(--rule); border-radius:14px; animation:lib-up .2s ease both; }
  @media (max-width:600px) { .lib-analytics-panel { grid-template-columns:1fr; } }
  .lib-analytics-section { display:flex; flex-direction:column; gap:8px; }
  .lib-analytics-title { font-size:10.5px; font-family:var(--font-mono); color:var(--text-muted); letter-spacing:0.5px; text-transform:uppercase; }
  .lib-bar { display:flex; align-items:center; gap:8px; }
  .lib-bar-label { font-size:10.5px; font-family:var(--font-mono); color:var(--text-secondary); white-space:nowrap; min-width:80px; }
  .lib-bar-track { flex:1; height:6px; border-radius:3px; background:color-mix(in srgb, var(--text-muted) 15%, transparent); overflow:hidden; }
  .lib-bar-fill { height:100%; border-radius:3px; transition:width .4s ease; }
  .lib-sparkline { display:flex; align-items:flex-end; gap:3px; height:36px; }
  .lib-more-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; border:1px solid transparent; background:transparent; color:var(--text-muted); cursor:pointer; flex-shrink:0; transition:all .15s; align-self:center; }
  .lib-more-btn:hover { border-color:var(--rule); background:color-mix(in srgb, var(--text-primary) 6%, transparent); color:var(--text-secondary); }
  .lib-sort-btn { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:20px; border:1px solid var(--rule); background:color-mix(in srgb, var(--text-primary) 3%, transparent); color:var(--text-secondary); font-size:10.5px; cursor:pointer; white-space:nowrap; transition:all .15s; font-family:var(--font-mono); }
  .lib-sort-btn:hover,.lib-sort-btn.active { border-color:color-mix(in srgb, var(--accent) 35%, transparent); color:var(--accent); background:color-mix(in srgb, var(--accent) 7%, transparent); }
  .lib-sort-menu { position:absolute; right:0; top:calc(100% + 5px); width:170px; background:var(--bg-card); border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:11px; box-shadow:0 16px 48px rgba(0,0,0,0.75); z-index:40; overflow:hidden; }
  .lib-sort-item { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 13px; font-size:12px; background:none; border:none; cursor:pointer; transition:background .15s; text-align:left; font-family:var(--font-sans); color:var(--text-secondary); }
  .lib-sort-item:hover { background:color-mix(in srgb, var(--accent) 7%, transparent); }
  .lib-sort-item.sel { color:var(--accent); }
  .lib-menu { position:absolute; right:0; top:calc(100% + 4px); width:170px; background:var(--bg-card); border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:11px; box-shadow:0 16px 48px rgba(0,0,0,0.75); z-index:30; overflow:hidden; }
  .lib-menu-btn { width:100%; display:flex; align-items:center; gap:8px; padding:10px 14px; font-size:12px; background:none; border:none; cursor:pointer; transition:background .15s; text-align:left; font-family:var(--font-sans); }
  .lib-menu-btn:hover { background:color-mix(in srgb, var(--accent) 7%, transparent); }
  .lib-filters { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
  .lib-filters::-webkit-scrollbar { display:none; }
  .lib-collections-panel { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .lib-collection-pill { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border-radius:20px; font-size:11px; font-family:var(--font-mono); border:1px solid var(--rule); background:transparent; color:var(--text-muted); cursor:pointer; white-space:nowrap; transition:all .15s; }
  .lib-collection-pill.active { border-color:color-mix(in srgb, var(--accent) 40%, transparent); background:color-mix(in srgb, var(--accent) 10%, transparent); color:var(--accent); }
  .lib-collection-pill:hover:not(.active) { color:var(--text-secondary); }
  .lib-collection-pill-wrap { display:inline-flex; align-items:center; gap:2px; position:relative; }
  .lib-collection-delete { background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; padding:2px; border-radius:50%; opacity:0; transition:opacity .15s; }
  .lib-collection-pill-wrap:hover .lib-collection-delete { opacity:0.7; }
  .lib-collection-delete:hover { opacity:1 !important; color:var(--color-error); }
  .lib-collection-new-input-wrap { display:flex; align-items:center; gap:6px; }
  .lib-collection-new-input { background:color-mix(in srgb, var(--bg-raised) 80%, transparent); border:1px solid var(--rule); border-radius:20px; padding:5px 12px; color:var(--text-primary); font-size:11px; font-family:var(--font-mono); outline:none; width:140px; transition:border-color .15s; }
  .lib-collection-new-input:focus { border-color:color-mix(in srgb, var(--accent) 40%, transparent); }
  .lib-spin { animation:lib-spin 0.8s linear infinite; }
  @keyframes lib-spin { to { transform:rotate(360deg); } }
  @media (max-width:480px) {
    .lib-card-inner { padding:11px 12px; gap:8px; }
  }
`;
