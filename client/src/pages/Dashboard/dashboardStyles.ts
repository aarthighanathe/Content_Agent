// Extracted from Dashboard.tsx's inline <style> block to keep the page component under the
// 400-line limit. Pure CSS string — no logic — safe to colocate outside the component file.
export const DASHBOARD_STYLES = `
  .dash-job-row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px 16px;
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    border-radius: 13px;
    cursor: pointer;
    transition: background .18s, border-color .2s, box-shadow .2s;
    overflow: hidden;
  }
  .dash-job-row:hover {
    background: color-mix(in srgb, var(--bg-raised) 80%, var(--text-primary) 4%);
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  }

  .dash-stat-card {
    background: var(--bg-raised);
    border: 1px solid var(--rule);
    border-radius: 16px;
    padding: 22px 20px;
    position: relative;
    overflow: hidden;
    transition: border-color .22s, box-shadow .22s;
  }
  .dash-stat-card:hover {
    border-color: color-mix(in srgb, var(--rule) 100%, var(--text-primary) 6%);
    box-shadow: 0 8px 40px rgba(0,0,0,0.45);
  }

  .kebab-menu {
    position: absolute;
    right: 0;
    top: 34px;
    width: 188px;
    background: var(--bg-card);
    border: 1px solid color-mix(in srgb, var(--accent-2) 22%, transparent);
    border-radius: 12px;
    box-shadow: 0 18px 56px rgba(0,0,0,0.7);
    z-index: 20;
    overflow: hidden;
  }

  @media (max-width:480px) {
    .dash-job-row { padding:11px 12px; gap:8px; }
    .dash-stat-card { padding:18px 16px; }
  }
`;
