/**
 * Shared Pensieve mark — matches AuthLayout's ✦ so landing and app chrome
 * don't drift between Lucide Layers and the mono diamond.
 */
export interface BrandMarkProps {
  size?: number;
  iconSize?: number;
  radius?: number;
}

export function BrandMark({ size = 34, iconSize = 15, radius = 9 }: BrandMarkProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--on-accent)',
        borderRadius: radius,
        boxShadow: '0 0 20px var(--accent-glow)',
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: iconSize, fontFamily: 'var(--font-mono)', fontWeight: 500, lineHeight: 1 }}>
        ✦
      </span>
    </div>
  );
}
