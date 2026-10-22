import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { LandingStyles } from './Landing/LandingStyles';
import { MobileMenu } from './Landing/MobileMenu';
import { Nav } from './Landing/Nav';
import { Hero } from './Landing/Hero';
import { LiveDemo } from './Landing/LiveDemo';
import { Features } from './Landing/Features';
import { HowItWorks } from './Landing/HowItWorks';
import { QualityDemo } from './Landing/QualityDemo';
import { SocialProof } from './Landing/SocialProof';
import { CtaFooter } from './Landing/CtaFooter';

const SIGNED_IN_BANNER_KEY = 'ca_landing_signed_in_banner_dismissed';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const qBarsRef = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SIGNED_IN_BANNER_KEY) === '1';
    } catch {
      return false;
    }
  });

  /* ── Scroll-reveal observer (page-wide: watches every .rv element across all sections) ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('rv-visible');
            if (e.target.closest('.quality-wrap') && !qBarsRef.current) {
              qBarsRef.current = true;
              document.querySelectorAll('.q-bar-fill').forEach(
                (b) => ((b as HTMLElement).style.transform = 'scaleX(1)')
              );
            }
          }
        }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.rv').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* ── Sticky nav shadow (page-wide scroll listener) ── */
  useEffect(() => {
    const handler = () => {
      const nav = document.getElementById('lnav');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  /* ── Lock body scroll when mobile menu is open ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  function dismissBanner(): void {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem(SIGNED_IN_BANNER_KEY, '1');
    } catch { /* ignore */ }
  }

  // WHY soft banner (not Navigate): signed-in users sharing / or the live demo
  // used to get hard-redirected to /dashboard before they could try the demo (L13/F14).
  const showSignedInBanner = Boolean(isLoaded && isSignedIn && !bannerDismissed);

  return (
    <div
      className={showSignedInBanner ? 'has-signed-banner' : undefined}
      style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}
    >
      <LandingStyles />

      <div className="lnav-shell">
        {showSignedInBanner && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              padding: '10px 20px',
              background: 'color-mix(in srgb, var(--accent) 14%, var(--bg-raised))',
              borderBottom: '1px solid var(--rule)',
              fontSize: 13,
              color: 'var(--text-primary)',
              textAlign: 'center',
            }}
          >
            <span>You&apos;re signed in — open the app anytime, or stay and try the live demo.</span>
            <Link
              to="/dashboard"
              style={{
                color: 'var(--accent)',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Go to dashboard →
            </Link>
            <button
              type="button"
              aria-label="Dismiss signed-in banner"
              onClick={dismissBanner}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <Nav isSignedIn={isSignedIn} onOpenMobileMenu={() => setMobileOpen(true)} />
      </div>

      <MobileMenu open={mobileOpen} isSignedIn={isSignedIn} onClose={() => setMobileOpen(false)} />

      {/* WHY demo before features: the live sample is the strongest proof —
          burying it under Features/How/Quality made visitors bounce before trying. */}
      <Hero isSignedIn={isSignedIn} />
      <LiveDemo />
      <Features />
      <HowItWorks />
      <QualityDemo />
      <SocialProof />
      <CtaFooter isSignedIn={isSignedIn} />
    </div>
  );
}
