// WHY: libraryStyles CSS exceeded the 400-line cap — part A (page chrome / filters).
export const LIBRARY_STYLES_A = `
  @keyframes lib-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lib-spin { to { transform:rotate(360deg); } }

  .lib-page { display:flex; flex-direction:column; gap:1.15rem; }

  /* Header */
  .lib-page-hd { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .lib-page-hd-main { display:flex; align-items:flex-start; min-width:0; }
  .lib-page-title {
    margin:0; font-family:var(--font-heading); font-size:clamp(20px,5vw,28px);
    font-weight:700; line-height:1.1; color:var(--text-primary); letter-spacing:-0.02em;
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
    display:flex; flex-direction:column; gap:10px; padding:12px;
    border-radius:14px; background:var(--bg-raised); border:1px solid var(--rule);
  }
  .lib-controls-top { display:flex; align-items:center; gap:10px; }
  .lib-search-wrap {
    display:flex; align-items:center; gap:10px; flex:1; min-width:0;
    background:color-mix(in srgb, var(--bg-card) 90%, transparent);
    border:1.5px solid var(--rule); border-radius:12px; padding:9px 12px;
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
  .lib-manage-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
  .lib-manage-select {
    display:inline-flex; align-items:center; gap:6px; background:none; border:none;
    cursor:pointer; color:var(--text-secondary); font-size:12px; padding:0; font-weight:550;
  }
  .lib-manage-select:hover:not(:disabled) { color:var(--text-primary); }
  .lib-manage-select.subtle { font-weight:500; color:var(--text-muted); }
  .lib-manage-select:disabled { opacity:0.6; cursor:default; }
  .lib-manage-select-all {
    display:inline-flex; align-items:center; background:none; border:none; cursor:pointer;
    color:var(--accent); font-size:12px; padding:0; font-weight:600; text-decoration:underline;
    text-underline-offset:2px;
  }
  .lib-manage-select-all:hover { color:var(--text-primary); }
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
    overflow:visible; cursor:pointer; position:relative; height:100%;
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
  .lib-card-inner { padding:14px 14px; display:flex; align-items:center; gap:12px; height:100%; box-sizing:border-box; }
  .lib-card-topic {
    margin:0; font-size:14px; font-weight:650; color:var(--text-primary); line-height:1.35;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }

  /* WHY: one column: a two-column grid left single pieces at half width
     beside full-width topic groups. Every card uses the same width. */
  .lib-feed { display:grid; grid-template-columns:minmax(0, 1fr); gap:10px; }
`;
