import type { ReactNode } from 'react';

interface CardHeaderProps {
  icon: ReactNode;
  accentVar?: string; // CSS custom property name, e.g. '--accent' or '--accent-2'
  title: ReactNode;
  trailing?: ReactNode;
}

// WHY extracted: the "26×26 icon badge + label" card-header block was
// hand-copied across InsightsCards.tsx (×2), PredictionInsights.tsx, and
// QualityTrendChart.tsx with only the icon and accent color swapped — a
// design tweak (badge size, border-radius) needed 4 coordinated edits, and
// it was easy to update 3 of 4 and leave one silently inconsistent.
export function CardHeader({ icon, accentVar = '--accent', title, trailing }: CardHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <span
          style={{
            width: 26, height: 26,
            background: `color-mix(in srgb, var(${accentVar}) 10%, transparent)`,
            border: `1px solid color-mix(in srgb, var(${accentVar}) 22%, transparent)`,
            borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {icon}
        </span>
        {title}
      </div>
      {trailing}
    </div>
  );
}
