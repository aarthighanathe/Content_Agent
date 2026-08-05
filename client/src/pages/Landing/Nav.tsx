import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Menu } from 'lucide-react';
import { navLinks } from './navLinks';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';

export interface NavProps {
  isSignedIn: boolean | undefined;
  onOpenMobileMenu: () => void;
}

export function Nav({ isSignedIn, onOpenMobileMenu }: NavProps) {
  return (
    <nav className="lnav" id="lnav">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div
          style={{
            width: 34,
            height: 34,
            background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--on-accent)',
            borderRadius: 9,
            boxShadow: '0 0 20px var(--accent-glow)',
          }}
        >
          <Layers size={17} />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          Content<span style={{ color: 'var(--accent)' }}>Agent</span>
        </span>
      </Link>

      {/* Desktop links */}
      <div className="lnav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {navLinks.map((l) => (
          <a key={l.href} href={l.href} className="lnav-link">
            {l.label}
          </a>
        ))}
        <ThemeSwitcher />
        <Link
          to={isSignedIn ? '/dashboard' : '/sign-up'}
          style={{
            marginLeft: 4,
            background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
            color: 'var(--on-accent)',
            fontWeight: 700,
            fontSize: 13.5,
            padding: '10px 22px',
            borderRadius: 9,
            letterSpacing: 0.2,
            textDecoration: 'none',
            boxShadow: '0 4px 18px var(--accent-glow)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            transition: 'transform .2s,box-shadow .2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 26px var(--accent-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '0 4px 18px var(--accent-glow)';
          }}
        >
          {isSignedIn ? 'Dashboard' : 'Get started'} <ArrowRight size={13} />
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button className="lnav-hamburger" onClick={onOpenMobileMenu} aria-label="Open menu">
        <Menu size={20} />
      </button>
    </nav>
  );
}
