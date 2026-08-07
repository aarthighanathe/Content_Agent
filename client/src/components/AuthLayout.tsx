import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { OnboardingModal } from './OnboardingModal';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ToolsDrawer } from './ToolsDropdown';
import { getProfile } from '../api';
import { useAppStore } from '../store';
import {
  LayoutDashboard, Sparkles, Palette, Clock,
  PanelLeftClose, PanelLeftOpen,
  Lightbulb, Link2, Search, CalendarDays,
  MoreHorizontal,
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

// Mobile: 4 direct tabs + a trailing "More" tab that opens ToolsDrawer's bottom
// sheet (Ideate, Competitor, Repurpose, Calendar — see ToolsDropdown.tsx's own
// toolsItems). Those 4 pages have no other mobile entry point, so More must
// stay reachable, not just the 4 tabs here.
const mobileTabItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/create',    icon: Sparkles,        label: 'Create' },
  { to: '/library',   icon: Clock,           label: 'Library' },
  { to: '/brand',     icon: Palette,         label: 'Brand' },
];

export default function AuthLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user } = useUser();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const location = useLocation();
  const moreActive = ['/ideate', '/competitor', '/repurpose', '/calendar'].some((p) => location.pathname.startsWith(p));

  // WHY fetched here, not just on Dashboard/Brand: userProfile (Zustand) previously
  // only ever got populated by Brand.tsx's own save-success handler, so a returning
  // user who had brand voice configured in a prior session — but hadn't revisited
  // /brand this session — saw Create's "brand voice will be applied" banner claim
  // the wrong thing (FUNCTIONAL_AUDIT_2026-07.md finding #8). This runs once per
  // authenticated session, for every page, using the same ['dashboard','profile']
  // query key Dashboard/Brand already share so a save on Brand still invalidates it.
  // WHY enabled: authLoaded && isSignedIn — without this, the query fires the instant
  // AuthLayout mounts, before Clerk has hydrated window.Clerk.session. api.ts's request
  // interceptor then finds no session, sends no Authorization header, and the server
  // 401s. Gating on Clerk's own loaded/signed-in state means getToken() always has a
  // real session to read from by the time this request goes out.
  const profileQuery = useQuery({
    queryKey: ['dashboard', 'profile'],
    queryFn: getProfile,
    enabled: authLoaded && isSignedIn,
  });
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
                    Content<span style={{ color: 'var(--accent)' }}>Agent</span>
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
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                  }
                >
                  <item.icon size={15} style={{ minWidth: 15, flexShrink: 0 }} />
                  <span className="sidebar-link-label" style={{ flex: 1 }}>
                    {item.label}
                  </span>
                  {collapsed && (
                    <span className="sidebar-tooltip" style={{
                      position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
                      marginLeft: 8, background: 'var(--bg-card)', border: '1px solid var(--rule)',
                      borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', opacity: 0, pointerEvents: 'none', transition: 'opacity .15s',
                      zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}>
                      {item.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Theme switcher — stays visible collapsed via icon-only trigger */}
            <div style={{ padding: collapsed ? '0 0 8px' : '0 10px 8px', display: 'flex', justifyContent: collapsed ? 'center' : undefined }}>
              <ThemeSwitcher collapsed={collapsed} align="up" />
            </div>

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
                  {/* WHY var(--text-muted): was hardcoded white-alpha, which reads as too dim
                      (or wrong-tinted) against non-aurora themes' warmer/cooler backgrounds. */}
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", marginTop: 1 }}>
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
              <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                Content<span style={{ color: 'var(--accent)' }}>Agent</span>
              </span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThemeSwitcher collapsed align="down" />
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
            </div>
          </header>

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
            {/* WHY a button, not a NavLink: More has no route of its own — it
                opens ToolsDrawer's bottom sheet in place, same interaction
                pattern as the desktop sidebar's Tools dropdown trigger. */}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`mobile-tab ${moreActive ? 'mobile-tab-active' : ''}`}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={19} />
              <span>More</span>
            </button>
          </div>

          <ToolsDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />

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
