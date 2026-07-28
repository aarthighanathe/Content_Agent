import { Target } from 'lucide-react';

const label = {
  display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.28)',
  marginBottom: 7, fontFamily: "var(--font-mono)", letterSpacing: 0.4,
} as const;

interface IdentityCardProps {
  brandName: string;
  onBrandNameChange: (v: string) => void;
  industry: string;
  onIndustryChange: (v: string) => void;
  website: string;
  onWebsiteChange: (v: string) => void;
}

export function IdentityCard({
  brandName, onBrandNameChange, industry, onIndustryChange, website, onWebsiteChange,
}: IdentityCardProps) {
  return (
    <div className="card" style={{ borderLeft: '3px solid rgba(245,158,11,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', flexShrink: 0 }}><Target size={16} /></div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Identity</div>
      </div>
      <label style={label}>Brand name</label>
      <input type="text" className="input" placeholder="Your brand name" value={brandName} onChange={e => onBrandNameChange(e.target.value)} style={{ marginBottom: 14 }} />
      <label style={label}>Industry</label>
      <input type="text" className="input" placeholder="e.g., SaaS, E-commerce, Education" value={industry} onChange={e => onIndustryChange(e.target.value)} style={{ marginBottom: 14 }} />
      <label style={label}>Website</label>
      <input type="text" className="input" placeholder="https://yourbrand.com" value={website} onChange={e => onWebsiteChange(e.target.value)} />
    </div>
  );
}
