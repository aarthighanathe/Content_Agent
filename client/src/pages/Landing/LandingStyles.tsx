// WHY: the page-wide <style> block (scroll-reveal, nav, hero decorations, responsive breakpoints)
// applies across every section component below via shared classNames (.rv, .q-bar-fill, etc.) —
// kept as one global stylesheet rather than split per-section since many rules are cross-cutting
// (e.g. .section padding overrides apply to Features/HowItWorks/QualityDemo/LiveDemo alike).
export function LandingStyles() {
  return (
    <style>{`
      /* ── Scroll-reveal ── */
      .rv { opacity:0; transform:translateY(32px); transition:opacity .7s ease, transform .7s ease; }
      .rv.rv-visible { opacity:1; transform:translateY(0); }

      /* ── Sticky nav ── */
      .lnav { display:flex; justify-content:space-between; align-items:center; padding:18px 72px; position:fixed; top:0; left:0; right:0; z-index:500; transition:all .4s; }
      .lnav.scrolled { background:color-mix(in srgb, var(--bg-base) 96%, transparent); backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px); border-bottom:1px solid color-mix(in srgb, var(--accent-2) 18%, transparent); }

      /* ── Nav links ── */
      /* WHY raised from 0.4 (#42): nav link text at rgba(255,255,255,0.4) on a near-black
         background can fall below 4.5:1 WCAG AA. 0.55 clears the threshold while keeping
         the intentional "quiet" look against the active/hover state. */
      .lnav-link { color:var(--text-secondary); font-size:13.5px; padding:8px 14px; border-radius:8px; text-decoration:none; transition:color .2s; font-weight:400; }
      .lnav-link:hover { color:var(--color-text-primary); }

      /* ── Hamburger button ── */
      .lnav-hamburger { display:none; background:color-mix(in srgb, var(--text-primary) 4%, transparent); border:1px solid color-mix(in srgb, var(--text-primary) 10%, transparent); border-radius:9px; padding:9px 11px; color:color-mix(in srgb, var(--text-primary) 70%, transparent); cursor:pointer; align-items:center; justify-content:center; transition:background .2s; }
      .lnav-hamburger:hover { background:color-mix(in srgb, var(--text-primary) 8%, transparent); }

      /* ── Mobile menu overlay ── */
      .mobile-menu { position:fixed; top:0; left:0; right:0; bottom:0; z-index:600; background:color-mix(in srgb, var(--bg-base) 98%, transparent); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); display:flex; flex-direction:column; padding:22px 24px 40px; transform:translateX(100%); transition:transform .3s cubic-bezier(.16,1,.3,1); }
      .mobile-menu.open { transform:translateX(0); }
      .mobile-menu-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; }
      .mobile-menu-links { display:flex; flex-direction:column; gap:4px; flex:1; }
      .mobile-menu-link { color:color-mix(in srgb, var(--text-primary) 60%, transparent); font-size:22px; font-weight:600; padding:14px 4px; text-decoration:none; border-bottom:1px solid var(--rule); transition:color .18s; letter-spacing:-0.4px; font-family:var(--font-display); }
      .mobile-menu-link:hover { color:var(--accent); }
      .mobile-menu-cta { margin-top:28px; background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:var(--on-accent); font-weight:700; font-size:16px; padding:17px 28px; border-radius:12px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; }

      /* ── Hero grid lines ── */
      .hero-grid { position:absolute; inset:0; background-image:linear-gradient(color-mix(in srgb, var(--accent-2) 8%, transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb, var(--accent-2) 8%, transparent) 1px,transparent 1px); background-size:72px 72px; mask-image:radial-gradient(ellipse 92% 80% at 50% 50%,black 0%,transparent 100%); -webkit-mask-image:radial-gradient(ellipse 92% 80% at 50% 50%,black 0%,transparent 100%); pointer-events:none; }

      /* ── Hero dot-grid ── */
      .hero-dots { position:absolute; inset:0; background-image:radial-gradient(circle, color-mix(in srgb, var(--text-primary) 29%, transparent) 1.5px, transparent 1.5px); background-size:72px 72px; mask-image:radial-gradient(ellipse 82% 68% at 50% 50%, black 0%, transparent 72%); -webkit-mask-image:radial-gradient(ellipse 82% 68% at 50% 50%, black 0%, transparent 72%); pointer-events:none; opacity:0.28; }

      /* ── Aurora orbs ── */
      .aurora-orb { position:absolute; border-radius:50%; filter:blur(100px); pointer-events:none; }
      @keyframes floatA { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-26px) scale(1.04)} }
      @keyframes floatB { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(20px) scale(0.96)} }
      .orb-float-a { animation:floatA 10s ease-in-out infinite; }
      .orb-float-b { animation:floatB 14s ease-in-out infinite 2.5s; }
      .orb-float-c { animation:floatA 18s ease-in-out infinite 6s; }

      /* ── Eyebrow pill ── */
      .eyebrow { display:inline-flex; align-items:center; gap:10px; font-family:var(--font-mono); font-size:10.5px; color:var(--accent); letter-spacing:2.5px; text-transform:uppercase; border:1px solid color-mix(in srgb, var(--accent) 22%, transparent); background:color-mix(in srgb, var(--accent) 7%, transparent); padding:8px 18px; border-radius:30px; margin-bottom:36px; animation:fadeUp .8s ease both; }
      .eyebrow-dot { width:5px; height:5px; background:var(--accent); border-radius:50%; animation:blink 2s infinite; box-shadow:0 0 8px var(--accent-glow); }

      /* ── Keyframes ── */
      @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.15} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
      @keyframes spin   { to{transform:rotate(360deg)} }

      /* ── Quality bars ── */
      .q-bar-fill { height:100%; background:linear-gradient(90deg,currentColor,color-mix(in srgb, var(--text-primary) 20%, transparent)); transform-origin:left; transform:scaleX(0); transition:transform 1.4s cubic-bezier(.16,1,.3,1); border-radius:3px; }

      /* ── Demo input ── */
      .demo-input { width:100%; background:var(--bg-raised); border:1.5px solid var(--rule); border-radius:11px; color:color-mix(in srgb, var(--text-primary) 90%, transparent); font-size:14px; font-family:var(--font-sans); padding:14px 18px; outline:none; transition:border-color .2s,box-shadow .2s; box-sizing:border-box; }
      .demo-input:focus { border-color:color-mix(in srgb, var(--accent) 45%, transparent); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent); }
      .demo-input::placeholder { color:color-mix(in srgb, var(--text-primary) 20%, transparent); }
      .demo-plat-btn { background:color-mix(in srgb, var(--text-primary) 4%, transparent); border:1px solid var(--rule); border-radius:8px; padding:8px 14px; color:color-mix(in srgb, var(--text-primary) 42%, transparent); font-size:12px; font-family:var(--font-sans); cursor:pointer; transition:all .18s; display:flex; align-items:center; gap:6px; }
      .demo-plat-btn.active { background:color-mix(in srgb, var(--accent) 10%, transparent); border-color:color-mix(in srgb, var(--accent) 35%, transparent); color:var(--accent); }
      @keyframes demo-fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

      /* ── Feature icons ── */
      /* WHY feat-num-ghost rule removed (#44): the ghost numeral divs were removed from
         Features.tsx — 100px numerals at 0.032 opacity that added DOM complexity for
         near-zero visible payoff. The hover rule below is now dead. */
      .feat-icon-badge { width:42px; height:42px; display:flex; align-items:center; justify-content:center; border-radius:10px; flex-shrink:0; }
      .feat-new { position:relative; background:var(--bg-raised); padding:32px 28px; overflow:hidden; }

      /* ── Step number badges ── */
      .step-num-badge { width:46px; height:46px; border-radius:13px; display:inline-flex; align-items:center; justify-content:center; font-family:var(--font-mono); font-size:13px; font-weight:700; letter-spacing:0.5px; flex-shrink:0; transition:transform .22s; }
      .step-badge-wrap { margin-bottom:18px; flex-shrink:0; }
      .step-item-content { flex:1; min-width:0; }
      .step-item { position:relative; }
      .step-item:hover .step-num-badge { transform:scale(1.08); }

      /* ── Hero stats strip ── */
      /* WHY raised from 0.26 (#42): hero stat items were below WCAG AA at 0.26; 0.45 remains
         visibly subdued against the hero background while clearing minimum contrast. */
      .hero-stats { display:flex; align-items:center; flex-wrap:wrap; justify-content:center; margin-top:34px; animation:fadeUp .8s .52s ease both; }
      .hero-stat-item { display:flex; align-items:center; gap:7px; font-family:var(--font-mono); font-size:11px; color:var(--text-muted); letter-spacing:0.4px; padding:0 16px; }
      .hero-stat-item:not(:last-child) { border-right:1px solid var(--rule); }
      .hero-stat-live { width:6px; height:6px; border-radius:50%; background:var(--color-success); box-shadow:0 0 8px rgba(16,185,129,0.7); animation:blink 2s infinite; flex-shrink:0; }

      /* ── Shimmer headline ── */
      @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
      .hero-shimmer { background:linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 70%, white) 32%,var(--accent-2) 60%,var(--accent)); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:shimmer 5s linear infinite; font-style:italic; }

      /* ── Responsive ── */
      @media (max-width:1280px) { .lnav{padding:16px 48px} }
      @media (max-width:1100px) { .hero-section{padding:100px 48px 70px !important} }

      /* Tablet & small laptop — switch to hamburger */
      @media (max-width:1024px) {
        .lnav{padding:14px 28px}
        .lnav-links-desktop{display:none !important}
        .lnav-hamburger{display:flex !important}
      }

      /* Large phone / portrait tablet */
      @media (max-width:768px) {
        .lnav{padding:14px 20px}
        .hero-section{padding:88px 22px 56px !important}
        .hero-section h1{font-size:2.4rem !important; line-height:1.05 !important}
        .hero-section p{font-size:14px !important}
        .hero-actions{flex-direction:column; width:100%; gap:10px !important}
        .hero-actions a,.hero-actions button{width:100%; justify-content:center; font-size:13px !important; padding:13px 20px !important}
        .features-grid{grid-template-columns:1fr 1fr !important; gap:1px}
        .steps-row{grid-template-columns:1fr 1fr !important; gap:10px !important; background:transparent !important}
        .step-item{border-left:none !important; border:1px solid color-mix(in srgb, var(--accent-2) 14%, transparent) !important; border-radius:14px !important; background:var(--bg-raised) !important; padding:22px 18px !important; transition:none !important}
        .hero-section h1{letter-spacing:-1.5px !important}
        .hero-stats{gap:0; margin-top:22px}
        .hero-stat-item{padding:0 10px; font-size:10.5px}
        .quality-wrap{grid-template-columns:1fr !important; gap:44px}
        .cta-banner{grid-template-columns:1fr !important; text-align:center; margin:0 20px 56px !important; padding:44px 32px !important; gap:32px !important}
        .cta-banner a{margin:0 auto; width:100% !important; justify-content:center !important; box-sizing:border-box}
        .cta-banner-eyebrow{justify-content:center !important}
        .section{padding:72px 22px !important}
        .divider-line{padding:0 22px !important}
        .mockup-section{padding:0 22px !important}
        .mockup-cards{grid-template-columns:1fr 1fr !important; gap:1px !important}
        .mockup-card-hide-sm{display:none !important}
        .mockup-cards > div{padding:20px 18px !important}
        .eyebrow{font-size:9px; padding:6px 12px; margin-bottom:24px}
        .aurora-orb{display:none}
        .demo-section{padding:60px 22px !important}
        .demo-platforms{gap:6px !important}
        .demo-plat-btn{padding:7px 10px; font-size:11px}
        .demo-result-footer{flex-direction:column !important; align-items:flex-start !important; gap:12px !important}
        .demo-result-footer a{width:100% !important; text-align:center}
        .quality-wrap{padding:40px 28px !important}
        .lnav-footer{padding:22px 22px !important; flex-direction:column; text-align:center}
      }

      /* Small phone */
      @media (max-width:480px) {
        .lnav{padding:12px 16px}
        .hero-section{padding:76px 18px 44px !important}
        .hero-section h1{font-size:2rem !important; margin-bottom:16px !important}
        .section{padding:56px 18px !important}
        .features-grid{grid-template-columns:1fr !important}
        .steps-row{grid-template-columns:1fr !important; gap:8px !important}
        .step-item{padding:16px !important; display:flex !important; flex-direction:row !important; align-items:flex-start !important; gap:14px !important}
        .step-badge-wrap{margin-bottom:0 !important}
        .hero-section h1{letter-spacing:-0.5px !important}
        .hero-stats{gap:0; margin-top:18px}
        .hero-stat-item{padding:0 8px; font-size:10px}
        .cta-banner{margin:0 14px 40px !important; padding:32px 20px !important; border-radius:14px !important; gap:24px !important}
        .mockup-section{padding:0 18px !important}
        .mockup-cards{grid-template-columns:1fr !important; gap:14px !important; background:transparent !important}
        .mockup-cards > div{padding:18px 16px !important; border:1px solid color-mix(in srgb, var(--accent-2) 14%, transparent) !important; border-radius:12px !important}
        .demo-section{padding:48px 18px !important}
        .demo-box{padding:20px 18px !important}
        .demo-platforms{flex-direction:column !important}
        .demo-plat-btn{width:100%; justify-content:center}
        .quality-wrap{padding:28px 18px !important}
        .lnav-footer{padding:20px 18px !important}
      }
    `}</style>
  );
}
