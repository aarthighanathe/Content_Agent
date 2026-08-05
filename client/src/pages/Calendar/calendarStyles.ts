// Extracted from Calendar.tsx's inline <style> block (same pattern as Library's
// LIBRARY_STYLES in libraryHelpers.ts) to keep the page component under the 400-line
// limit. Pure CSS string — no logic — safe to colocate outside the component file.
//
// WHY var(--bg-*)/var(--accent) instead of the previous hardcoded navy (#07071A/#0B0B22/
// #08081C) + amber (#F59E0B/rgba(245,158,11,...)): those were fixed values with no
// connection to a real brand/status/badge-class identity — just the original Aurora
// theme's own palette baked in directly, so every other theme rendered this whole page
// with the wrong (Aurora) colors regardless of the user's selection. Re-themed to track
// the active [data-theme]'s tokens, matching how Library/Dashboard's own extracted
// styles (LIBRARY_STYLES, DASHBOARD_STYLES) already do this.
export const CALENDAR_STYLES = `
  .sc-sidebar { width:280px; min-width:240px; background:var(--bg-raised); border-right:1px solid var(--rule); display:flex; flex-direction:column; gap:0; flex-shrink:0; transition:width .25s; overflow:hidden; }
  .sc-sidebar.closed { width:0; min-width:0; }
  .sc-sidebar-inner { width:280px; min-width:240px; display:flex; flex-direction:column; height:100%; overflow:hidden; }
  .sc-sidebar-hd { padding:18px 16px 12px; border-bottom:1px solid var(--rule); }
  .sc-card { border-radius:10px; background:var(--bg-raised); border:1px solid var(--rule); padding:10px 12px; display:flex; align-items:flex-start; gap:10px; cursor:grab; transition:all .15s; user-select:none; }
  .sc-card:active { cursor:grabbing; }
  .sc-card:hover { border-color:color-mix(in srgb, var(--accent) 30%, transparent); background:color-mix(in srgb, var(--accent) 4%, var(--bg-raised)); }
  .sc-card.dragging { opacity:0.35; border-color:color-mix(in srgb, var(--accent) 50%, transparent); }
  .sc-cal { flex:1; display:flex; flex-direction:column; gap:16px; padding:20px; overflow:auto; }
  .sc-cal-hd { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-bottom:16px; border-bottom:1px solid var(--rule); }
  .sc-nav-btn { width:32px; height:32px; border-radius:8px; background:color-mix(in srgb, var(--text-primary) 4%, transparent); border:1px solid var(--rule); color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .sc-nav-btn:hover { background:color-mix(in srgb, var(--accent) 10%, transparent); border-color:color-mix(in srgb, var(--accent) 30%, transparent); color:var(--accent); }
  .sc-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; }
  .sc-day-lbl { text-align:center; font-family:var(--font-mono); font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-muted); padding:6px 0 10px; }
  .sc-cell { min-height:100px; border-radius:10px; background:var(--bg-raised); border:1.5px solid var(--rule); padding:7px 8px; display:flex; flex-direction:column; gap:3px; transition:all .15s; cursor:pointer; position:relative; }
  .sc-cell:hover { border-color:color-mix(in srgb, var(--accent) 25%, transparent); background:color-mix(in srgb, var(--accent) 3%, transparent); }
  .sc-cell.today { border-color:color-mix(in srgb, var(--accent) 45%, transparent); background:color-mix(in srgb, var(--accent) 5%, transparent); }
  .sc-cell.selected { border-color:color-mix(in srgb, var(--accent) 65%, transparent); background:color-mix(in srgb, var(--accent) 9%, transparent); }
  .sc-cell.drag-over { border-color:var(--accent) !important; background:color-mix(in srgb, var(--accent) 12%, transparent) !important; box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent); }
  .sc-cell.empty { background:transparent; border-color:transparent; cursor:default; pointer-events:none; }
  .sc-num { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); line-height:1; margin-bottom:2px; }
  .sc-num.is-today { color:var(--accent); font-weight:700; }
  .sc-pill { display:flex; align-items:center; gap:3px; border-radius:5px; padding:2px 5px; font-size:9px; font-family:var(--font-mono); overflow:hidden; white-space:nowrap; }
  .sc-drop-hint { position:absolute; inset:0; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:10px; color:color-mix(in srgb, var(--accent) 60%, transparent); font-family:var(--font-mono); letter-spacing:1px; pointer-events:none; opacity:0; transition:opacity .15s; }
  .sc-cell.drag-over .sc-drop-hint { opacity:1; }
  .sc-detail { background:var(--bg-raised); border:1px solid color-mix(in srgb, var(--accent) 18%, transparent); border-radius:14px; padding:18px 20px; animation:fadeUp .2s ease both; }
  .sc-detail-job-wrap { border-bottom:1px solid var(--rule); }
  .sc-detail-job-wrap:last-child { border-bottom:none; }
  .sc-detail-job { display:flex; align-items:center; gap:12px; padding:11px 0; }
  .sc-publish-menu { position:absolute; left:0; top:calc(100% + 4px); width:160px; background:var(--bg-card); border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:10px; box-shadow:0 16px 48px rgba(0,0,0,0.75); z-index:30; overflow:hidden; }
  .sc-publish-menu-item { width:100%; display:flex; align-items:center; padding:8px 12px; font-size:11px; background:none; border:none; cursor:pointer; transition:background .15s; text-align:left; color:var(--text-secondary); }
  .sc-publish-menu-item:hover { background:color-mix(in srgb, var(--accent) 7%, transparent); color:var(--text-primary); }
  @keyframes sc-spin { to{transform:rotate(360deg)} }
  .sc-btn-ghost { background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:6px; padding:4px; transition:all .15s; }
  .sc-btn-ghost:hover { background:color-mix(in srgb, var(--text-primary) 7%, transparent); }
  .sc-toggle { width:30px; height:30px; border-radius:8px; border:1px solid var(--rule); background:color-mix(in srgb, var(--text-primary) 4%, transparent); color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
  .sc-toggle:hover { background:color-mix(in srgb, var(--accent) 10%, transparent); border-color:color-mix(in srgb, var(--accent) 30%, transparent); color:var(--accent); }
  @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

  /* ── Schedule… button on each unscheduled card (#12) ── */
  /* WHY: this is the primary keyboard/touch scheduling trigger.
     Small enough to not crowd the card, but distinct from the card itself
     so it's clearly interactive. Accent color links it visually to the calendar. */
  .sc-schedule-btn { display:inline-flex; align-items:center; gap:4px; flex-shrink:0; background:color-mix(in srgb, var(--accent) 8%, transparent); border:1px solid color-mix(in srgb, var(--accent) 22%, transparent); color:color-mix(in srgb, var(--accent) 75%, transparent); border-radius:7px; padding:4px 8px; font-size:10px; font-family:var(--font-mono); cursor:pointer; transition:all .15s; white-space:nowrap; }
  .sc-schedule-btn:hover,.sc-schedule-btn:focus-visible { background:color-mix(in srgb, var(--accent) 14%, transparent); border-color:color-mix(in srgb, var(--accent) 45%, transparent); color:var(--accent); outline:2px solid color-mix(in srgb, var(--accent) 50%, transparent); outline-offset:2px; }

  /* ── SchedulePicker mini date-grid (#12) ── */
  .sc-picker { background:var(--bg-card); border:1px solid color-mix(in srgb, var(--accent) 28%, transparent); border-radius:12px; padding:12px 12px 10px; margin-top:4px; animation:fadeUp .18s ease both; }
  .sc-picker-hd { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .sc-picker-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
  .sc-picker-lbl { text-align:center; font-family:var(--font-mono); font-size:8px; letter-spacing:1px; text-transform:uppercase; color:var(--text-muted); padding:3px 0 6px; }
  .sc-picker-day { width:100%; aspect-ratio:1; border-radius:6px; border:none; background:color-mix(in srgb, var(--text-primary) 4%, transparent); color:var(--text-secondary); font-size:10px; font-family:var(--font-mono); cursor:pointer; transition:all .12s; display:flex; align-items:center; justify-content:center; }
  .sc-picker-day:hover,.sc-picker-day:focus-visible { background:color-mix(in srgb, var(--accent) 20%, transparent); color:var(--accent); outline:2px solid color-mix(in srgb, var(--accent) 50%, transparent); outline-offset:1px; }
  .sc-picker-day.is-today { border:1px solid color-mix(in srgb, var(--accent) 55%, transparent); color:var(--accent); font-weight:700; }
  .sc-picker-day.has-content { background:color-mix(in srgb, var(--accent-2) 8%, transparent); color:color-mix(in srgb, var(--accent-2) 70%, transparent); }
  .sc-picker-day.has-content:hover,.sc-picker-day.has-content:focus-visible { background:color-mix(in srgb, var(--accent-2) 18%, transparent); color:var(--accent-2); }
  .sc-picker-day.is-past { opacity:0.4; }

  /* ── DayDetailPanel "Add content" affordance (#12) ── */
  .sc-add-btn { display:inline-flex; align-items:center; gap:5px; background:color-mix(in srgb, var(--accent-2) 8%, transparent); border:1px solid color-mix(in srgb, var(--accent-2) 25%, transparent); color:color-mix(in srgb, var(--accent-2) 80%, transparent); border-radius:8px; padding:5px 10px; font-size:11px; font-family:var(--font-mono); cursor:pointer; transition:all .15s; }
  .sc-add-btn:hover,.sc-add-btn:focus-visible { background:color-mix(in srgb, var(--accent-2) 15%, transparent); color:var(--accent-2); outline:2px solid color-mix(in srgb, var(--accent-2) 40%, transparent); outline-offset:2px; }
  .sc-add-list { background:var(--bg-raised); border:1px solid var(--rule); border-radius:10px; overflow:hidden; margin-bottom:12px; max-height:220px; overflow-y:auto; animation:fadeUp .15s ease both; }
  .sc-add-item { width:100%; display:flex; align-items:center; gap:10px; padding:9px 12px; background:none; border:none; border-bottom:1px solid var(--rule); cursor:pointer; transition:background .12s; text-align:left; }
  .sc-add-item:last-child { border-bottom:none; }
  .sc-add-item:hover,.sc-add-item:focus-visible { background:color-mix(in srgb, var(--accent-2) 7%, transparent); outline:none; }

  /* ── Mobile bottom-sheet drawer (#12) ── */
  /* WHY a separate element rather than moving the sidebar (#12): the sidebar's
     desktop layout (fixed-width flex column) and the mobile sheet's layout (full-width,
     slides from bottom) are too different to share gracefully. Rendering both and
     showing only the appropriate one via CSS lets the desktop and mobile paths be
     styled independently without media-query hacks inside the component. */
  .sc-mobile-sheet { position:fixed; bottom:0; left:0; right:0; z-index:200; background:var(--bg-raised); border-top:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:20px 20px 0 0; height:70vh; display:flex; flex-direction:column; transform:translateY(100%); transition:transform .3s cubic-bezier(.16,1,.3,1); display:none; }
  .sc-mobile-sheet.open { transform:translateY(0); }
  .sc-mobile-sheet-handle { width:36px; height:4px; background:color-mix(in srgb, var(--text-primary) 15%, transparent); border-radius:2px; margin:12px auto 0; flex-shrink:0; }
  .sc-mobile-scrim { position:fixed; inset:0; z-index:199; background:rgba(0,0,0,0.55); }

  @media(max-width:900px){
    .sc-sidebar{width:220px;min-width:180px;}
    .sc-sidebar.closed{width:0;min-width:0;}
    .sc-sidebar-inner{width:220px;min-width:180px;}
    .sc-cell{min-height:70px;}
  }
  @media(max-width:640px){
    /* WHY sidebar stays at 0 on mobile (#12): instead of fighting this rule, we render
       a separate .sc-mobile-sheet element (bottom drawer) that replaces the sidebar on
       touch-sized screens. The existing .sc-sidebar stays collapsed — the mobile path
       routes entirely through the sheet, which is toggled by the same GripVertical
       button in the CalendarGrid header. */
    .sc-sidebar{width:0!important;min-width:0!important;}
    .sc-cell{min-height:52px;padding:5px;}
    .sc-pill{display:none;}
    .sc-grid{gap:3px;}
    .sc-mobile-sheet{display:flex;}
  }
`;
