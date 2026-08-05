import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';

export interface CtaFooterProps {
  isSignedIn: boolean | undefined;
}

export function CtaFooter({ isSignedIn }: CtaFooterProps) {
  return (
    <>
      {/* ══════════ CTA BANNER ══════════ */}
      <div
        className="cta-banner rv"
        style={{ margin: '0 72px 88px', background: 'linear-gradient(135deg,var(--bg-card) 0%,var(--bg-base) 100%)', border: '1px solid color-mix(in srgb, var(--accent-2) 28%, transparent)', borderRadius: 18, padding: '64px 72px', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 64, position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, width: '450px', height: '100%', background: 'radial-gradient(circle at 100% 50%,color-mix(in srgb, var(--accent-2) 8%, transparent),transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '320px', height: '100%', background: 'radial-gradient(circle at 0% 100%,color-mix(in srgb, var(--accent) 6%, transparent),transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <div className="cta-banner-eyebrow" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 18, height: 1, background: 'var(--accent-2)', display: 'inline-block' }} />
            Get started today
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(26px,3.5vw,46px)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.08 }}>
            Research. Write. Predict.<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Multiply. Ship.</em>
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.65 }}>
            5 AI agents working together — from research to performance prediction to cross-platform distribution.
          </div>
        </div>

        <Link
          to={isSignedIn ? '/dashboard' : '/sign-up'}
          style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: 'var(--on-accent)', fontWeight: 700, fontSize: 15, padding: '17px 40px', borderRadius: 11, whiteSpace: 'nowrap', letterSpacing: 0.2, textDecoration: 'none', boxShadow: '0 6px 32px var(--accent-glow)', transition: 'transform .2s,box-shadow .2s', display: 'inline-flex', alignItems: 'center', gap: 9, position: 'relative' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 44px var(--accent-glow)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 32px var(--accent-glow)'; }}
        >
          Get started <ArrowRight size={15} />
        </Link>
      </div>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="lnav-footer" style={{ borderTop: '1px solid var(--rule)', padding: '28px 72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)' }}>
            <Layers size={13} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
            Content<span style={{ color: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}>Agent</span>
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'color-mix(in srgb, var(--text-primary) 16%, transparent)', letterSpacing: 0.8 }}>
          © 2025 ContentAgent. All rights reserved.
        </div>
      </footer>
    </>
  );
}
