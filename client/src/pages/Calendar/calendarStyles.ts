// Extracted from Calendar.tsx's inline <style> block (same pattern as Library's
// LIBRARY_STYLES in libraryHelpers.ts) to keep the page component under the 400-line
// limit. Pure CSS string — no logic — safe to colocate outside the component file.
export const CALENDAR_STYLES = `
  .sc-sidebar { width:280px; min-width:240px; background:#07071A; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:0; flex-shrink:0; transition:width .25s; overflow:hidden; }
  .sc-sidebar.closed { width:0; min-width:0; }
  .sc-sidebar-inner { width:280px; min-width:240px; display:flex; flex-direction:column; height:100%; overflow:hidden; }
  .sc-sidebar-hd { padding:18px 16px 12px; border-bottom:1px solid rgba(255,255,255,0.05); }
  .sc-card { border-radius:10px; background:#0B0B22; border:1px solid rgba(255,255,255,0.07); padding:10px 12px; display:flex; align-items:flex-start; gap:10px; cursor:grab; transition:all .15s; user-select:none; }
  .sc-card:active { cursor:grabbing; }
  .sc-card:hover { border-color:rgba(245,158,11,0.3); background:rgba(245,158,11,0.04); }
  .sc-card.dragging { opacity:0.35; border-color:rgba(245,158,11,0.5); }
  .sc-cal { flex:1; display:flex; flex-direction:column; gap:16px; padding:20px; overflow:auto; }
  .sc-cal-hd { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.05); }
  .sc-nav-btn { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.45); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .sc-nav-btn:hover { background:rgba(245,158,11,0.1); border-color:rgba(245,158,11,0.3); color:#F59E0B; }
  .sc-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; }
  .sc-day-lbl { text-align:center; font-family:var(--font-mono); font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.22); padding:6px 0 10px; }
  .sc-cell { min-height:100px; border-radius:10px; background:#07071A; border:1.5px solid rgba(255,255,255,0.05); padding:7px 8px; display:flex; flex-direction:column; gap:3px; transition:all .15s; cursor:pointer; position:relative; }
  .sc-cell:hover { border-color:rgba(245,158,11,0.25); background:rgba(245,158,11,0.03); }
  .sc-cell.today { border-color:rgba(245,158,11,0.45); background:rgba(245,158,11,0.05); }
  .sc-cell.selected { border-color:rgba(245,158,11,0.65); background:rgba(245,158,11,0.09); }
  .sc-cell.drag-over { border-color:#F59E0B !important; background:rgba(245,158,11,0.12) !important; box-shadow:0 0 0 2px rgba(245,158,11,0.18); }
  .sc-cell.empty { background:transparent; border-color:transparent; cursor:default; pointer-events:none; }
  .sc-num { font-family:var(--font-mono); font-size:11px; color:rgba(255,255,255,0.3); line-height:1; margin-bottom:2px; }
  .sc-num.is-today { color:#F59E0B; font-weight:700; }
  .sc-pill { display:flex; align-items:center; gap:3px; border-radius:5px; padding:2px 5px; font-size:9px; font-family:var(--font-mono); overflow:hidden; white-space:nowrap; }
  .sc-drop-hint { position:absolute; inset:0; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:10px; color:rgba(245,158,11,0.6); font-family:var(--font-mono); letter-spacing:1px; pointer-events:none; opacity:0; transition:opacity .15s; }
  .sc-cell.drag-over .sc-drop-hint { opacity:1; }
  .sc-detail { background:#08081C; border:1px solid rgba(245,158,11,0.18); border-radius:14px; padding:18px 20px; animation:fadeUp .2s ease both; }
  .sc-detail-job { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
  .sc-detail-job:last-child { border-bottom:none; }
  .sc-btn-ghost { background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:6px; padding:4px; transition:all .15s; }
  .sc-btn-ghost:hover { background:rgba(255,255,255,0.07); }
  .sc-toggle { width:30px; height:30px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.45); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
  .sc-toggle:hover { background:rgba(245,158,11,0.1); border-color:rgba(245,158,11,0.3); color:#F59E0B; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

  /* ── Schedule… button on each unscheduled card (#12) ── */
  /* WHY: this is the primary keyboard/touch scheduling trigger.
     Small enough to not crowd the card, but distinct from the card itself
     so it's clearly interactive. Amber accent links it visually to the calendar. */
  .sc-schedule-btn { display:inline-flex; align-items:center; gap:4px; flex-shrink:0; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.22); color:rgba(245,158,11,0.75); border-radius:7px; padding:4px 8px; font-size:10px; font-family:var(--font-mono); cursor:pointer; transition:all .15s; white-space:nowrap; }
  .sc-schedule-btn:hover,.sc-schedule-btn:focus-visible { background:rgba(245,158,11,0.14); border-color:rgba(245,158,11,0.45); color:#F59E0B; outline:2px solid rgba(245,158,11,0.5); outline-offset:2px; }

  /* ── SchedulePicker mini date-grid (#12) ── */
  .sc-picker { background:#08081C; border:1px solid rgba(245,158,11,0.28); border-radius:12px; padding:12px 12px 10px; margin-top:4px; animation:fadeUp .18s ease both; }
  .sc-picker-hd { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .sc-picker-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
  .sc-picker-lbl { text-align:center; font-family:var(--font-mono); font-size:8px; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,0.22); padding:3px 0 6px; }
  .sc-picker-day { width:100%; aspect-ratio:1; border-radius:6px; border:none; background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.55); font-size:10px; font-family:var(--font-mono); cursor:pointer; transition:all .12s; display:flex; align-items:center; justify-content:center; }
  .sc-picker-day:hover,.sc-picker-day:focus-visible { background:rgba(245,158,11,0.2); color:#F59E0B; outline:2px solid rgba(245,158,11,0.5); outline-offset:1px; }
  .sc-picker-day.is-today { border:1px solid rgba(245,158,11,0.55); color:#F59E0B; font-weight:700; }
  .sc-picker-day.has-content { background:rgba(34,211,238,0.08); color:rgba(34,211,238,0.7); }
  .sc-picker-day.has-content:hover,.sc-picker-day.has-content:focus-visible { background:rgba(34,211,238,0.18); color:#22D3EE; }
  .sc-picker-day.is-past { opacity:0.4; }

  /* ── DayDetailPanel "Add content" affordance (#12) ── */
  .sc-add-btn { display:inline-flex; align-items:center; gap:5px; background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.25); color:rgba(139,92,246,0.8); border-radius:8px; padding:5px 10px; font-size:11px; font-family:var(--font-mono); cursor:pointer; transition:all .15s; }
  .sc-add-btn:hover,.sc-add-btn:focus-visible { background:rgba(139,92,246,0.15); color:#A78BFA; outline:2px solid rgba(139,92,246,0.4); outline-offset:2px; }
  .sc-add-list { background:#07071A; border:1px solid rgba(255,255,255,0.07); border-radius:10px; overflow:hidden; margin-bottom:12px; max-height:220px; overflow-y:auto; animation:fadeUp .15s ease both; }
  .sc-add-item { width:100%; display:flex; align-items:center; gap:10px; padding:9px 12px; background:none; border:none; border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer; transition:background .12s; text-align:left; }
  .sc-add-item:last-child { border-bottom:none; }
  .sc-add-item:hover,.sc-add-item:focus-visible { background:rgba(139,92,246,0.07); outline:none; }

  /* ── Mobile bottom-sheet drawer (#12) ── */
  /* WHY a separate element rather than moving the sidebar (#12): the sidebar's
     desktop layout (fixed-width flex column) and the mobile sheet's layout (full-width,
     slides from bottom) are too different to share gracefully. Rendering both and
     showing only the appropriate one via CSS lets the desktop and mobile paths be
     styled independently without media-query hacks inside the component. */
  .sc-mobile-sheet { position:fixed; bottom:0; left:0; right:0; z-index:200; background:#07071A; border-top:1px solid rgba(245,158,11,0.2); border-radius:20px 20px 0 0; height:70vh; display:flex; flex-direction:column; transform:translateY(100%); transition:transform .3s cubic-bezier(.16,1,.3,1); display:none; }
  .sc-mobile-sheet.open { transform:translateY(0); }
  .sc-mobile-sheet-handle { width:36px; height:4px; background:rgba(255,255,255,0.15); border-radius:2px; margin:12px auto 0; flex-shrink:0; }
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
