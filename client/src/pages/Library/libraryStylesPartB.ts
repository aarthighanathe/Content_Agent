// WHY: libraryStyles CSS exceeded the 400-line cap — part B (cards / menus / responsive).
export const LIBRARY_STYLES_B = `
  /* Family — compact chip row */
  .lib-family {
    background:var(--bg-raised); border:1px solid var(--rule); border-radius:12px;
    /* WHY: visible overflow — chip action menus position below the chip */
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
    border-radius:999px;
    /* WHY: no overflow:hidden — the ⋯ popover must escape the chip */
    transition:border-color .15s, background .15s, transform .12s, box-shadow .15s;
  }
  .lib-chip:hover {
    transform:translateY(-1px);
    box-shadow:0 4px 14px rgba(0,0,0,0.18);
    filter:brightness(1.08);
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
    font-family:var(--font-mono); font-size:11px; font-weight:600;
    letter-spacing:0.01em; color:var(--text-secondary);
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
    .lib-controls { padding:12px; gap:10px; }
    .lib-controls-top { flex-direction:column; align-items:stretch; }
    .lib-card-inner { padding:12px; gap:10px; }
    .lib-filter-row { flex-direction:column; align-items:stretch; }
    .lib-filter-tools { align-self:flex-end; }
  }
`;
