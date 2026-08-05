import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useRef, useState } from 'react';
import { LandingStyles } from './Landing/LandingStyles';
import { MobileMenu } from './Landing/MobileMenu';
import { Nav } from './Landing/Nav';
import { Hero } from './Landing/Hero';
import { Features } from './Landing/Features';
import { HowItWorks } from './Landing/HowItWorks';
import { QualityDemo } from './Landing/QualityDemo';
import { LiveDemo } from './Landing/LiveDemo';
import { CtaFooter } from './Landing/CtaFooter';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const qBarsRef = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  if (isLoaded && isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
      <LandingStyles />

      <MobileMenu open={mobileOpen} isSignedIn={isSignedIn} onClose={() => setMobileOpen(false)} />
      <Nav isSignedIn={isSignedIn} onOpenMobileMenu={() => setMobileOpen(true)} />

      <Hero isSignedIn={isSignedIn} />
      <Features />
      <HowItWorks />
      <QualityDemo />
      <LiveDemo />
      <CtaFooter isSignedIn={isSignedIn} />
    </div>
  );
}
