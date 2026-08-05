import { Target } from 'lucide-react';

const label = {
  display: 'block', fontSize: 11.5, color: 'var(--text-muted)',
  marginBottom: 7, fontFamily: "var(--font-mono)", letterSpacing: 0.4,
} as const;

interface IdentityCardProps {
  brandName: string;
  onBrandNameChange: (v: string) => void;
  industry: string;
  onIndustryChange: (v: string) => void;
}

export function IdentityCard({
  brandName, onBrandNameChange, industry, onIndustryChange,
}: IdentityCardProps) {
  return (
    <div className="card" style={{ borderLeft: '3px solid color-mix(in srgb, var(--accent) 40%, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 36, height: 36, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}><Target size={16} /></div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Identity</div>
      </div>
      <label style={label}>Brand name</label>
      <input type="text" className="input" placeholder="Your brand name" value={brandName} onChange={e => onBrandNameChange(e.target.value)} style={{ marginBottom: 14 }} />
      <label style={label}>Industry</label>
      <input type="text" className="input" placeholder="e.g., SaaS, E-commerce, Education" value={industry} onChange={e => onIndustryChange(e.target.value)} />
    </div>
  );
}
