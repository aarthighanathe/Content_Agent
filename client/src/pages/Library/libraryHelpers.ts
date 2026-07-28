export { formatDate } from '../../lib/utils';

export const statusConfig: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',    color: '#F59E0B' },
  processing: { label: 'Processing', color: '#60A5FA' },
  done:       { label: 'Done',       color: 'var(--color-success)' },
  failed:     { label: 'Failed',     color: 'var(--color-error)' },
};

export type Tab = 'content' | 'templates';
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

export interface LibraryTemplate {
  id: string;
  name: string;
  platform: string;
  topic?: string | null;
  hookStyle?: string | null;
  ctaPattern?: string | null;
  createdAt: string;
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
  .lib-card { background:#08081A; border:1px solid rgba(255,255,255,0.05); border-radius:14px; overflow:hidden; cursor:pointer; transition:border-color .18s,background .18s; animation:lib-up .2s ease both; }
  .lib-card:hover { border-color:rgba(255,255,255,0.1); background:#0A0A1F; }
  .lib-card-inner { padding:14px 16px; display:flex; align-items:center; gap:12px; }
  .lib-search-wrap { display:flex; align-items:center; gap:10px; background:rgba(8,8,26,0.85); border:1.5px solid rgba(255,255,255,0.07); border-radius:11px; padding:10px 14px; transition:border-color .2s,box-shadow .2s; }
  .lib-search-wrap:focus-within { border-color:rgba(245,158,11,0.4); box-shadow:0 0 0 3px rgba(245,158,11,0.07); }
  .lib-search-wrap input { background:transparent; border:none; outline:none; color:var(--color-text-primary); font-size:13px; flex:1; font-family:'Inter',sans-serif; min-width:0; }
  .lib-search-wrap input::placeholder { color:rgba(255,255,255,0.22); }
  .lib-tab { padding:8px 16px; border-radius:8px; border:1px solid transparent; background:transparent; cursor:pointer; font-size:12.5px; font-weight:500; font-family:'Inter',sans-serif; transition:all .15s; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; }
  .lib-tab.active { background:rgba(245,158,11,0.1); border-color:rgba(245,158,11,0.3); color:#F59E0B; }
  .lib-tab:not(.active) { color:rgba(255,255,255,0.4); }
  .lib-tab:not(.active):hover { color:rgba(255,255,255,0.65); }
  .lib-pill { padding:4px 11px; border-radius:20px; font-size:10.5px; cursor:pointer; transition:all .15s; font-family:var(--font-mono); letter-spacing:0.3px; border:1px solid; white-space:nowrap; background:transparent; }
  .lib-sort-btn { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); font-size:10.5px; cursor:pointer; white-space:nowrap; transition:all .15s; font-family:var(--font-mono); }
  .lib-sort-btn:hover,.lib-sort-btn.active { border-color:rgba(245,158,11,0.35); color:#F59E0B; background:rgba(245,158,11,0.07); }
  .lib-sort-menu { position:absolute; right:0; top:calc(100% + 5px); width:170px; background:#0D0D24; border:1px solid rgba(245,158,11,0.2); border-radius:11px; box-shadow:0 16px 48px rgba(0,0,0,0.75); z-index:40; overflow:hidden; }
  .lib-sort-item { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 13px; font-size:12px; background:none; border:none; cursor:pointer; transition:background .15s; text-align:left; font-family:'Inter',sans-serif; color:rgba(255,255,255,0.65); }
  .lib-sort-item:hover { background:rgba(245,158,11,0.07); }
  .lib-sort-item.sel { color:#F59E0B; }
  .lib-menu { position:absolute; right:0; top:calc(100% + 4px); width:170px; background:#0D0D24; border:1px solid rgba(245,158,11,0.2); border-radius:11px; box-shadow:0 16px 48px rgba(0,0,0,0.75); z-index:30; overflow:hidden; }
  .lib-menu-btn { width:100%; display:flex; align-items:center; gap:8px; padding:10px 14px; font-size:12px; background:none; border:none; cursor:pointer; transition:background .15s; text-align:left; font-family:'Inter',sans-serif; }
  .lib-menu-btn:hover { background:rgba(245,158,11,0.07); }
  .lib-filters { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
  .lib-filters::-webkit-scrollbar { display:none; }
  .lib-tmpl-card { background:#08081A; border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:16px; transition:border-color .2s; animation:lib-up .2s ease both; }
  .lib-tmpl-card:hover { border-color:rgba(255,255,255,0.1); }
  @media (max-width:480px) {
    .lib-card-inner { padding:11px 12px; gap:8px; }
  }
`;
