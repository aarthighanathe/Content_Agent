import type { ReactNode } from 'react';

interface SectionLabelProps {
  icon?: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
  withRule?: boolean;
}

export function SectionLabel({ icon, children, trailing, withRule = true }: SectionLabelProps) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 'clamp(9px,2vw,10px)',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: '#F59E0B',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {icon}
      {children}
      {withRule && (
        <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(245,158,11,0.2),transparent)' }} />
      )}
      {trailing}
    </div>
  );
}
