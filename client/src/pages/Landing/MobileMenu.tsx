import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, X } from 'lucide-react';
import { navLinks } from './navLinks';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';

export interface MobileMenuProps {
  open: boolean;
  isSignedIn: boolean | undefined;
  onClose: () => void;
}

export function MobileMenu({ open, isSignedIn, onClose }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // WHY `open` (not `true`) gates the trap: this component is always mounted —
  // .mobile-menu is toggled via a CSS transform (translateX), not display:none —
  // so its links remain in the DOM (and pass useFocusTrap's offsetParent check)
  // even while closed. Without gating on `open`, the trap would try to steal
  // focus into an off-screen menu on every render.
  useFocusTrap(menuRef, open);

  return (
    <div
      ref={menuRef}
      className={`mobile-menu${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
    >
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
              background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--on-accent)',
              borderRadius: 8,
              boxShadow: '0 0 16px var(--accent-glow)',
            }}
          >
            <Layers size={16} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Content<span style={{ color: 'var(--accent)' }}>Agent</span>
          </span>
        </Link>
        <button
          onClick={onClose}
          aria-label="Close menu"
          style={{
            background: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
            border: '1px solid var(--rule)',
            borderRadius: 9,
            padding: '9px 11px',
            color: 'var(--text-secondary)',
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
          <a
            key={l.href}
            href={l.href}
            className="mobile-menu-link"
            onClick={onClose}
            style={{
              display: 'block',
              padding: '12px 24px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: 15,
              transition: 'color 0.18s, background 0.18s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'color-mix(in srgb, var(--text-primary) 4%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {l.label}
          </a>
        ))}
      </nav>
      <div style={{ padding: '4px 24px 0' }}>
        <ThemeSwitcher />
      </div>
      <Link to={isSignedIn ? '/dashboard' : '/sign-up'} className="mobile-menu-cta" onClick={onClose}>
        {isSignedIn ? 'Go to dashboard' : 'Get started'} <ArrowRight size={16} />
      </Link>
    </div>
  );
}
