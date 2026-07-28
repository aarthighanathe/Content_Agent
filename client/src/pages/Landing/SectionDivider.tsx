// WHY: the "── LABEL ──" divider markup repeats identically between every major section;
// colocating it here avoids duplicating the same JSX six times across section components.
export interface SectionDividerProps {
  label: string;
  padding?: string;
}

export function SectionDivider({ label, padding = '0 72px' }: SectionDividerProps) {
  return (
    <div className="rv divider-line" style={{ display: 'flex', alignItems: 'center', gap: 28, padding }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06) 60%,transparent)' }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06) 60%,transparent)' }} />
    </div>
  );
}
