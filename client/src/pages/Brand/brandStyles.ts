// Extracted from Brand.tsx's inline <style> block to keep the page component under the
// 400-line limit (same pattern as Dashboard/dashboardStyles.ts, Calendar/calendarStyles.ts).
// Pure CSS string — no logic — safe to colocate outside the component file.
export const BRAND_STYLES = `
  .brand-page-container {
    padding: 0 20px;
  }
  .brand-card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  @media (max-width: 768px) {
    .brand-card-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .brand-page-container {
      padding: 0 16px !important;
    }
  }
  @media (max-width: 375px) {
    .brand-page-container {
      padding: 0 12px !important;
    }
    .brand-card-grid {
      gap: 12px !important;
    }
  }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes fadeInUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
`;
