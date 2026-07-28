import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, UserButton, useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { OnboardingModal } from './OnboardingModal';
import { ToolsDrawer } from './ToolsDropdown';
import { getProfile } from '../api';
import { useAppStore } from '../store';
import {
  LayoutDashboard, Sparkles, Palette, Clock,
  PanelLeftClose, PanelLeftOpen,
  Lightbulb, Link2, Search, CalendarDays,
} from 'lucide-react';

// Sidebar nav — ordered by user workflow: home → plan → create → review → schedule → settings
const sidebarNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ideate',    icon: Lightbulb,       label: 'Ideate' },
  { to: '/competitor',icon: Search,          label: 'Competitor' },
  { to: '/create',    icon: Sparkles,        label: 'Create' },
  { to: '/repurpose', icon: Link2,           label: 'Repurpose' },
  { to: '/library',   icon: Clock,           label: 'Library' },
  { to: '/calendar',  icon: CalendarDays,    label: 'Calendar' },
  { to: '/brand',     icon: Palette,         label: 'Brand Voice' },
];

// Mobile: 4-item bottom tab bar
const mobileTabItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/create',    icon: Sparkles,        label: 'Create' },
  { to: '/library',   icon: Clock,           label: 'Library' },
  { to: '/brand',     icon: Palette,         label: 'Brand' },
];

export default function AuthLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const { user } = useUser();
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  // WHY fetched here, not just on Dashboard/Brand: userProfile (Zustand) previously
  // only ever got populated by Brand.tsx's own save-success handler, so a returning
  // user who had brand voice configured in a prior session — but hadn't revisited
  // /brand this session — saw Create's "brand voice will be applied" banner claim
  // the wrong thing (FUNCTIONAL_AUDIT_2026-07.md finding #8). This runs once per
  // authenticated session, for every page, using the same ['dashboard','profile']
  // query key Dashboard/Brand already share so a save on Brand still invalidates it.
  const profileQuery = useQuery({ queryKey: ['dashboard', 'profile'], queryFn: getProfile });
  useEffect(() => {
    if (!profileQuery.data) return;
    const { brandName, brandVoice, phrasesUse, phrasesAvoid } = profileQuery.data;
    setUserProfile({ brandName, brandVoice, phrasesUse, phrasesAvoid });
  }, [profileQuery.data, setUserProfile]);

  return (
    <>
      <SignedIn>
        <div className={`min-h-screen bg-dark-900 ${collapsed ? 'sidebar-collapsed-layout' : ''}`}>

          {/* ── Desktop Sidebar ── */}
          <aside className="sidebar-desktop">

            {/* Header: logo + toggle */}
            <div className="sidebar-logo">
              {!collapsed && (
                <Link to="/dashboard" className="sidebar-logo-link">
                  <div className="sidebar-logo-icon">
                    <span style={{ fontSize: 15, fontFamily: "var(--font-mono)", fontWeight: 500 }}>✦</span>
                  </div>
                  <span className="sidebar-logo-text">
                    Content<span style={{ color: '#F59E0B' }}>Agent</span>
                  </span>
                </Link>
              )}

              <button
                className="sidebar-header-toggle"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed
                  ? <PanelLeftOpen size={17} />
                  : <PanelLeftClose size={17} />
                }
              </button>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
              {sidebarNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                  }
                >
                  <item.icon size={15} style={{ minWidth: 15, flexShrink: 0 }} />
                  <span className="sidebar-link-label" style={{ flex: 1 }}>
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </nav>

            {/* User section */}
            <div className="sidebar-user" style={{ justifyContent: collapsed ? 'center' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
              </div>
              {!collapsed && (
                <div className="user-details" style={{ flex: 1, minWidth: 0, marginLeft: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.firstName || 'User'}
                  </p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.26)', fontFamily: "var(--font-mono)", marginTop: 1 }}>
                    Free plan
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* ── Mobile Top Bar (logo only) ── */}
          <header className="mobile-topbar">
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div className="sidebar-logo-icon" style={{ width: 30, height: 30, minWidth: 30, borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 500 }}>✦</span>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                Content<span style={{ color: '#F59E0B' }}>Agent</span>
              </span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
            </div>
          </header>

          {/* ── Mobile Tools Drawer ── */}
          <ToolsDrawer isOpen={mobileToolsOpen} onClose={() => setMobileToolsOpen(false)} />

          {/* ── Mobile Bottom Tab Bar ── */}
          <div className="mobile-tab-bar">
            {mobileTabItems.map((item) => (
              <NavLink
                key={item.to + '-mob'}
                to={item.to}
                className={({ isActive }) =>
                  `mobile-tab ${isActive ? 'mobile-tab-active' : ''}`
                }
              >
                <item.icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              className={`mobile-tab${mobileToolsOpen ? ' mobile-tab-active' : ''}`}
              onClick={() => setMobileToolsOpen(o => !o)}
              aria-label="Tools"
            >
              {/* Wrench icon inline */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 19, height: 19 }}>
                <path d="M14.4 14.4L9.6 9.6M12.6 2.2a2.3 2.3 0 0 1 3.2 3.2l-1.6 1.6a9 9 0 0 0-6.4 6.4l-1.6 1.6a2.3 2.3 0 0 1-3.2-3.2l1.6-1.6A9 9 0 0 0 12.6 2.2z"></path>
              </svg>
              <span>Tools</span>
            </button>
          </div>

          {/* ── First-run onboarding modal ── */}
          <OnboardingModal />

          {/* ── Page content ── */}
          <main className="main-content">
            <div className="main-inner">
              <Outlet />
            </div>
          </main>
        </div>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
