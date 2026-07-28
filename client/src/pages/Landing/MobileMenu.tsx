import { Link } from 'react-router-dom';
import { ArrowRight, Layers, X } from 'lucide-react';
import { navLinks } from './navLinks';

export interface MobileMenuProps {
  open: boolean;
  isSignedIn: boolean | undefined;
  onClose: () => void;
}

export function MobileMenu({ open, isSignedIn, onClose }: MobileMenuProps) {
  return (
    <div className={`mobile-menu${open ? ' open' : ''}`}>
      <div className="mobile-menu-top">
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          onClick={onClose}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg,#F59E0B,#FBBF24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#030310',
              borderRadius: 8,
              boxShadow: '0 0 16px rgba(245,158,11,0.38)',
            }}
          >
            <Layers size={16} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#fff' }}>
            Content<span style={{ color: '#F59E0B' }}>Agent</span>
          </span>
        </Link>
        <button
          onClick={onClose}
          aria-label="Close menu"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 9,
            padding: '9px 11px',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} />
        </button>
      </div>
      <nav className="mobile-menu-links">
        {navLinks.map((l) => (
          <a key={l.href} href={l.href} className="mobile-menu-link" onClick={onClose}>
            {l.label}
          </a>
        ))}
      </nav>
      <Link to={isSignedIn ? '/dashboard' : '/sign-up'} className="mobile-menu-cta" onClick={onClose}>
        {isSignedIn ? 'Go to dashboard' : 'Get started'} <ArrowRight size={16} />
      </Link>
    </div>
  );
}
