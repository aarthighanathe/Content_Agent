# ContentAgent — UI/UX Documentation
> Generated: 2026-06-14 | Codebase: post-Phase-4, all planned features shipped

---

## Table of Contents

1. [Design System — Colors](#section-1-design-system--colors)
2. [Typography System](#section-2-typography-system)
3. [Spacing & Layout System](#section-3-spacing--layout-system)
4. [Component Design Tokens](#section-4-component-design-tokens)
5. [Iconography System](#section-5-iconography-system)
6. [Page-by-Page UI Documentation](#section-6-page-by-page-ui-documentation)
7. [Navigation Design](#section-7-navigation-design)
8. [Interaction & Animation Patterns](#section-8-interaction--animation-patterns)
9. [Responsive Behavior](#section-9-responsive-behavior)
10. [Visual Consistency Audit](#section-10-visual-consistency-audit)
11. [Design Differentiation Analysis](#section-11-design-differentiation-analysis)
12. [Quick Reference](#quick-reference-core-design-values)

---

## SECTION 1: DESIGN SYSTEM — COLORS

### 1A. CSS Custom Properties (Design Tokens)

All tokens are defined in `client/src/index.css` inside `@theme {}` (Tailwind 4 syntax). They become available as Tailwind utility classes (e.g., `bg-dark-900`, `text-accent-purple`).

| Token | Value | Type | Used For |
|---|---|---|---|
| `--color-dark-900` | `#030310` | Solid hex | Primary page background, body bg |
| `--color-dark-800` | `#07071C` | Solid hex | Card backgrounds, `.card`, `.card-glow` |
| `--color-dark-700` | `#0B0B26` | Solid hex | Deeper card alternative |
| `--color-dark-600` | `rgba(124, 58, 237, 0.10)` | Alpha violet | Violet-tinted surface |
| `--color-dark-500` | `rgba(245, 158, 11, 0.10)` | Alpha gold | Gold-tinted surface |
| `--color-dark-400` | `rgba(245, 158, 11, 0.24)` | Alpha gold | Stronger gold surface |
| `--color-dark-300` | `rgba(255, 255, 255, 0.22)` | Alpha white | Light surface overlay |
| `--color-dark-200` | `rgba(255, 255, 255, 0.52)` | Alpha white | Medium-bright text |
| `--color-dark-100` | `rgba(255, 255, 255, 0.92)` | Alpha white | Near-white text |
| `--color-accent-purple` | `#8B5CF6` | Solid hex | Purple accent elements |
| `--color-accent-violet` | `#7C3AED` | Solid hex | Sidebar border gradient, violet accents |
| `--color-accent-blue` | `#3B82F6` | Solid hex | Blue badge elements |
| `--color-accent-cyan` | `#22D3EE` | Solid hex | Twitter/Cyan accent, Aurora slides |
| `--color-accent-pink` | `#EC4899` | Solid hex | Instagram Carousel accent |
| `--color-accent-green` | `#10B981` | Solid hex | Success states, approved badge |
| `--color-accent-orange` | `#F97316` | Solid hex | Video Script accent, Ideate gradient |
| `--color-gradient-start` | `#F59E0B` | Solid hex | Gold gradient start |
| `--color-gradient-mid` | `#FBBF24` | Solid hex | Gold gradient mid |
| `--color-gradient-end` | `#F59E0B` | Solid hex | Gold gradient end |
| `--font-sans` | `'Inter', system-ui, -apple-system, sans-serif` | Font | Body text |
| `--font-heading` | `'Playfair Display', Georgia, serif` | Font | Page headings, hero |
| `--font-display` | `'Space Grotesk', system-ui, sans-serif` | Font | Logo, stat values, subheadings |
| `--font-mono` | `'DM Mono', monospace` | Font | Labels, badges, codes, metadata |

**Note:** There are no light mode / dark mode variants. The entire app is permanently dark. The `@theme` block is Tailwind 4's replacement for `tailwind.config.js`.

---

### 1B. Platform Accent Colors

Defined as inline `platformMeta` objects across Dashboard, Library, Ideate, Calendar, and Repurpose pages. Consistently applied everywhere.

| Platform | Key | Primary Color | Hex | Background Tint | Tailwind Badge Class |
|---|---|---|---|---|---|
| Instagram Carousel | `instagram_carousel` | Pink / Magenta | `#EC4899` | `rgba(236,72,153,0.08)` | `badge-pink` |
| LinkedIn Post | `linkedin_post` | Blue | `#60A5FA` | `rgba(96,165,250,0.08)` | `badge-blue` |
| Twitter/X Thread | `twitter_thread` | Cyan | `#22D3EE` | `rgba(34,211,238,0.08)` | `badge-cyan` |
| Instagram Caption | `instagram_caption` | Purple / Violet | `#A78BFA` | `rgba(167,139,250,0.08)` | `badge-purple` |
| Video Script | `video_script` | Red / Coral | `#F87171` | `rgba(248,113,113,0.08)` | `badge-red` (effectively) |

---

### 1C. Carousel Theme Colors

**Corrected post carousel-rewrite (see `CLAUDE.md` §2/§11):** there is no server-side theme
generation anymore, so there is no "server accent" to compare against — `THEME_META` (and the
per-theme Gemini prompts it fed) was removed entirely. `CAROUSEL_THEMES` in
`client/src/pages/Result/constants.ts` is now the single source of truth for theme accents (name,
preview gradient/glow/emoji, and the color the theme-picker UI actually renders), consumed by both
the live preview and the SSR export bundle.

From `CAROUSEL_THEMES` in `client/src/pages/Result/constants.ts`.

| Theme Key | Display Name | Accent | Visual Character |
|---|---|---|---|
| `aurora` | Neon Aurora | `#00F5FF` | Dark navy, cyan scan lines, sharp corners, digital |
| `magazine` | Editorial | `#F59E0B` | Warm cream, gold hairlines, serif typography, luxury editorial |
| `split` | Geometric | `#8B5CF6` | Violet diagonal polygon splits, bold sans-serif, high energy |
| `bold` | Luxury | `#C9A84C` | Ivory/dark, concentric ring ornaments, Cormorant serif, opulent |
| `minimal` | Minimal | `#6366F1` | Light cream bg, indigo accent, clean whitespace |
| `neon` | Neon Cyber | `#FF2D78` | Dark, hot-pink glow, cyberpunk |
| `violet` | Violet Luxe | `#A855F7` | Deep violet |
| `crimson` | Crimson Power | `#DC2626` | Red power |
| `rose` | Rose Elegance | `#E11D48` | Hot magenta/rose |

All 9 themes are exposed in the theme picker today — the previous version of this doc found only 5
of 9 present in `CAROUSEL_THEMES` (`REVIEW_FINDINGS.md`-era finding); that gap has since been
closed, so all 9 keys now render as real picker options, not just the first 5.

**Note:** `client/src/lib/colorSystem.ts`'s `THEME_ACCENTS` array is a separate, secondary palette
(index-ordered, not keyed) used for accent-color derivation elsewhere in `Result.tsx` — its values
intentionally differ from `CAROUSEL_THEMES`' accents above (e.g. `neon` is `#00FF94` there vs
`#FF2D78` here) since the two arrays serve different purposes. This is not itself a bug, but it is
a second place a "theme color" question could be answered from — check which one a given call site
actually reads before assuming they should match.

---

### 1D. Semantic Color Usage

| Meaning | Color | Hex | Where It Appears |
|---|---|---|---|
| Primary CTA / Gold | Gradient | `#F59E0B → #FBBF24` | `.btn-primary`, hero CTA, logo, active nav, chip-active |
| Success / Approved | Green | `#10B981` / `#34D399` | Quality badge "Approved", Done status, live indicator dot |
| Error / Failed | Red | `#EF4444` / `#F87171` / `#F43F5E` | Toast error, failed badge, error states, delete button |
| Warning / In Progress | Amber | `#F59E0B` | Processing status, "needs work" badge |
| Quality Score ≥ 80 | Green | `#10B981` | ScorePill, job row score |
| Quality Score 60-79 | Amber | `#F59E0B` | ScorePill, job row score |
| Quality Score < 60 | Red/Coral | `#F87171` | ScorePill, job row score |
| Active Nav Item | Gold | `#F59E0B` | `.sidebar-link-active`, left inset shadow |
| Active Tab | Gold | `#F59E0B` | `.rp-tab.on` border-bottom, background tint |
| Hover — Nav | White up | `rgba(255,255,255,0.82)` | `.sidebar-link:hover` |
| Hover — Card | Border brighten | `rgba(255,255,255,0.1)` | `.card:hover` |
| Progress Bar Fill | Gold gradient | `#F59E0B → #FBBF24 → rgba(251,191,36,0.7)` | `.progress-bar-fill`, pipeline progress |
| Stage: Orchestrator | Gold | `#F59E0B` | Agent dot, pipeline display |
| Stage: Researcher | Purple | `#8B5CF6` | Agent dot |
| Stage: Writer | Cyan | `#22D3EE` | Agent dot |
| Stage: Formatter | Green | `#10B981` | Agent dot |
| Stage: Critic | Pink/Red | `#F43F5E` | Agent dot |
| Scrollbar thumb | Violet | `rgba(124,58,237,0.28)` → hover `rgba(245,158,11,0.38)` | Custom scrollbar |
| Selection highlight | Gold | `rgba(245,158,11,0.25)` | `::selection` |
| SSE stage badge — Done | Green | `rgba(16,185,129,0.1)` + `#34D399` | `.rp-badge-done` |
| SSE stage badge — Generating | Gold pulse | `rgba(245,158,11,0.08)` + `#F59E0B` | `.rp-badge-gen` |
| Content DNA (active) | Cyan | `#22D3EE` | Dashboard DNA bubble border/icon |
| Content DNA (inactive) | White/dim | `rgba(255,255,255,0.04)` | Dashboard DNA bubble |
| Brand Voice badge | Violet | `#A78BFA` | Dashboard eyebrow label |

---

### 1E. Color Consistency Issues

> Items 1-3 below (server vs. client theme-accent mismatches) described the pre-carousel-rewrite
> system, where a server-side `THEME_META` generated per-theme HTML and could disagree with the
> client's own accent value for the same theme. That system no longer exists (see §1C above) — the
> client's `CAROUSEL_THEMES` is now the only accent source, so there is nothing left to mismatch
> against. Left here struck through for historical record rather than silently deleted.

1. ~~**Split theme accent inconsistency:** Server defines `#FF6B35` (orange) for split theme; client `constants.ts` assigns `#8B5CF6` (violet) as its accent.~~ **Resolved — no server accent exists anymore.**
2. ~~**Aurora accent mismatch:** Server uses `#00D4FF`, client `colorSystem.ts`/`constants.ts` use `#00F5FF`.~~ **Resolved — no server accent exists anymore.**
3. ~~**Magazine accent:** Server `#D4A017`, client constants `#F59E0B`.~~ **Resolved — no server accent exists anymore.**
4. **Hardcoded colors throughout:** The majority of color values are hardcoded as inline style strings (e.g., `color: '#F59E0B'`, `background: '#07071C'`) rather than using the CSS custom property tokens. This means the tokens in `@theme` are defined but largely unused in JSX.
5. **Video script missing from dashboard `platformMeta`:** `video_script` is not in Dashboard's `platformMeta` — it falls back to `badge-purple`/`#A78BFA` instead of its proper red (`#F87171`).
6. **Error color inconsistency:** Three red variants in use — `#EF4444`, `#F87171`, `#F43F5E` — for semantically identical error states with no clear rule for which to use where.
7. **Body text color:** Defined in CSS as `rgba(255,255,255,0.88)` but inline styles use `rgba(255,255,255,0.9)`, `rgba(255,255,255,0.92)`, `rgba(255,255,255,0.96)` inconsistently.
8. **No semantic dark mode:** The app is permanently dark. There is no `prefers-color-scheme` handling or light mode defined.

---

## SECTION 2: TYPOGRAPHY SYSTEM

### 2A. Font Families

All fonts imported from Google Fonts via `@import url('https://fonts.googleapis.com/css2?...')` at the top of `index.css`.

| Font | Source | Weights Loaded | Role |
|---|---|---|---|
| **Inter** | Google Fonts | 300, 400, 500, 600, 700, 800 | Body text, UI labels, buttons — `--font-sans` |
| **Playfair Display** | Google Fonts | 400, 400italic, 600, 700, 700italic, 900, 900italic | Page headings, hero headline, feature titles, card headings — `--font-heading` |
| **Space Grotesk** | Google Fonts | 500, 600, 700 | Logo, stat numbers, display text — `--font-display` |
| **DM Mono** | Google Fonts | 400, 500 | Badges, labels, timestamps, metadata, section labels — `--font-mono` |

**Font strategy:** Editorial serif (Playfair Display) for all H1/H2 headings creates a premium feel; DM Mono for all microcopy gives a "technical/AI" personality; Space Grotesk for numbers and the logo bridges display and body. Inter handles all interactive text.

---

### 2B. Type Scale

The app does not use a strict Tailwind type scale. Almost all font sizes are hardcoded in inline styles with `clamp()` for responsive scaling.

| Usage | Size | Font Family | Weight | Color |
|---|---|---|---|---|
| Hero headline | `clamp(44px, 7.5vw, 94px)` | Playfair Display | 900 | `rgba(255,255,255,0.96)` |
| Page H1 (interior pages) | `clamp(20px, 5vw, 28px)` | Playfair Display | 700 | `rgba(255,255,255,0.92)` |
| Section H2 (landing) | `clamp(32px, 4.5vw, 54px)` | Playfair Display | 700 | `rgba(255,255,255,0.92)` |
| Feature card H3 | `19px` (landing), `15.5px` (how-it-works) | Playfair Display | 700 | `rgba(255,255,255,0.92)` |
| Result page H1 | `clamp(24px, 4vw, 48px)` | Space Grotesk | 700 | `rgba(255,255,255,0.96)` |
| Card heading | `13–14px` | Inter | 600 | `rgba(255,255,255,0.72–0.88)` |
| Body text | `13–14px` | Inter | 400 | `rgba(255,255,255,0.4–0.52)` |
| Stat value | `clamp(26px, 5vw, 38px)` | Space Grotesk | 700 | varies by accent |
| Badges/labels | `9–10px` | DM Mono | 400–600 | varies |
| Section label | `10px` | DM Mono | 400 | `#F59E0B` letter-spacing: 3px |
| Subtext/meta | `10–12px` | DM Mono | 400 | `rgba(255,255,255,0.2–0.3)` |
| Nav links (sidebar) | `13px` | Inter | 500 | `rgba(255,255,255,0.38)` default |
| Button text (primary) | `13.5px` | Inter | 700 | `#030310` (dark) |
| Button text (secondary) | `13px` | Inter | 500 | `rgba(255,255,255,0.52)` |
| Logo text | `14.5px` | Space Grotesk | 700 | white + `#F59E0B` accent |
| Input text | `14px` | Inter | 400 | `rgba(255,255,255,0.9)` |
| Toast text | `0.875rem (14px)` | Inter | 500 | white |

---

### 2C. Font Weight Usage

| Weight | Font | Used For |
|---|---|---|
| 300 (Light) | Inter | Hero subtitle text |
| 400 (Regular) | Inter, DM Mono | Body copy, metadata, badges |
| 500 (Medium) | Inter, Space Grotesk | Nav links, sidebar labels, some buttons |
| 600 (SemiBold) | Inter | Card headings, logo, subheadings |
| 700 (Bold) | Inter, Space Grotesk, Playfair Display | Buttons (primary), page H1, stat values, logo |
| 900 (Black) | Playfair Display | Hero headline, feature heading, landing display |

---

### 2D. Typography Inconsistencies

1. **Result page H1 uses Space Grotesk** (`fontFamily: "'Space Grotesk',sans-serif"`) while all other interior page H1s use Playfair Display. This is the most visible inconsistency.
2. **Ideate/Repurpose H1 uses Space Grotesk** (`fontFamily: "'Space Grotesk',sans-serif"`, `fontSize: 22`) while Dashboard/Brand/Create/Competitor use Playfair Display. No consistent rule for which pages use which heading font.
3. **No codified type scale:** Every font size is a raw pixel value or clamp(). There is no semantic scale (xs, sm, md, lg, xl) enforced anywhere.
4. **Letter-spacing inconsistency:** Section labels use `letterSpacing: 3` in some places, `letterSpacing: '2.5px'` in others, `letterSpacing: 2` in others — all are the same semantic thing.
5. **Line height:** Body text uses `lineHeight: 1.6` (body default), `1.65`, `1.68`, `1.72`, `1.78` — these are different in virtually every component with no consistency rule.

---

## SECTION 3: SPACING & LAYOUT SYSTEM

### 3A. Layout Dimensions

| Element | Value | Notes |
|---|---|---|
| Sidebar width (expanded) | `240px` | Defined in `.sidebar-desktop` |
| Sidebar width (collapsed) | `64px` | `.sidebar-collapsed-layout .sidebar-desktop` |
| Sidebar width at 900px breakpoint | `220px` | Media query override |
| Main content margin-left (expanded) | `240px` | `.main-content` |
| Main content margin-left (collapsed) | `64px` | |
| Inner content max-width | `1100px` | `.main-inner { max-width: 1100px }` |
| Inner content padding (desktop) | `40px 56px 30px` | `.main-inner` |
| Inner content padding (≤1100px) | `32px 40px 64px` | |
| Inner content padding (≤900px) | `28px 32px 56px` | |
| Inner content padding (mobile) | `22px 16px 28px` | |
| Inner content padding (480px) | `16px 12px 24px` | |
| Mobile topbar height | `56px` | `.mobile-topbar` |
| Mobile bottom tab bar height | ~72px + safe-area | `.mobile-tab-bar` |
| Result page sidebar width (expanded) | `360px` | `.rp-grid` default |
| Result page sidebar width (1100px) | `300px` | Media query |
| Result page drawer width (desktop) | `340px` | `.rp-drawer` |
| Landing nav padding (desktop) | `18px 72px` | `.lnav` |

---

### 3B. Spacing Patterns

| Purpose | Value | Where Applied |
|---|---|---|
| Page section gap | `1.5rem–1.75rem` | Dashboard `gap: '1.75rem'`, Brand `gap: '1.5rem'` |
| Card internal padding | `24px` | `.card`, `.card-glow`, `.card-violet` |
| Card internal padding (stat) | `22px` | `.stat-card` |
| Card gap in grids | `14px` | stat grid, bottom halves grid |
| Sidebar nav item gap | `2px` | `.sidebar-nav { gap: 2px }` |
| Sidebar nav padding | `8px 8px` | `.sidebar-nav` |
| Nav link padding | `9px 11px` | `.sidebar-link` |
| Button padding (primary) | `11px 24px` | `.btn-primary` |
| Button padding (secondary) | `10px 18px` | `.btn-secondary` |
| Button padding (ghost) | `9px 16px` | `.btn-ghost` |
| Input padding | `13px 16px` | `.input` |
| Section label margin-bottom | `14px` | `.section-label` |
| Divider margin | `2rem 0` | `.divider` |

---

### 3C. Border Radius

| Element | Radius | Class/Style |
|---|---|---|
| Cards (`.card`, `.card-glow`, `.card-violet`) | `14px` | Hardcoded |
| Cards (`.card-glass`) | `16px` | Hardcoded |
| Buttons (primary, secondary) | `10px` | `.btn-primary`, `.btn-secondary` |
| Button (ghost) | `9px` | `.btn-ghost` |
| Inputs | `10px` | `.input` |
| Badges | `20px` (pill) | `.badge` |
| Chips | `20px` (pill) | `.chip` |
| Toast | `11px` | `.toast` |
| Stat cards | `14px` | `.stat-card` |
| Sidebar logo icon | `9px` | `.sidebar-logo-icon` |
| Sidebar nav links | `9px` | `.sidebar-link` |
| Mobile more sheet | `20px 20px 0 0` | Bottom sheet top radius |
| Result drawer | no radius (full-height panel) | `.rp-drawer` |
| Calendar cells | `8px` | `.cal-cell` |
| Job rows (dashboard) | `13px` | `.dash-job-row` |
| Kebab menu | `12px` | `.kebab-menu` |
| Platform icon containers | `10px` | Dashboard, Library inline |
| Feature cards (landing) | no border-radius | `.feat-new` (sharp corners) |

---

## SECTION 4: COMPONENT DESIGN TOKENS

### 4A. Button Variants

| Variant | Class | Background | Text | Border | Hover | Disabled |
|---|---|---|---|---|---|---|
| Primary | `.btn-primary` | `linear-gradient(135deg, #F59E0B, #FBBF24)` | `#030310` | none | `translateY(-2px)` + stronger shadow | `opacity: 0.35` |
| Secondary | `.btn-secondary` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.52)` | `1px solid rgba(255,255,255,0.08)` | bg `rgba(255,255,255,0.08)`, text `rgba(255,255,255,0.88)` | `opacity: 0.35` |
| Ghost | `.btn-ghost` | `transparent` | `rgba(245,158,11,0.72)` | `1px solid rgba(245,158,11,0.2)` | bg `rgba(245,158,11,0.08)`, text `#F59E0B` | — |
| Primary (disabled state) | inline | `rgba(245,158,11,0.25)` | `rgba(245,158,11,0.5)` | none | cursor not-allowed | — |
| Danger (delete) | inline on `.btn-primary` | `linear-gradient(135deg,#EF4444,#F87171)` | `#fff` | none | — | — |

**Primary button effect:** Has a shimmer sweep (`::before` with translateX animation) on hover — a white gradient sweeps left-to-right at 0.38s.

---

### 4B. Input Field Design

| State | Background | Border | Text | Placeholder | Ring/Shadow |
|---|---|---|---|---|---|
| Default | `rgba(7,7,28,0.85)` | `1.5px solid rgba(255,255,255,0.07)` | `rgba(255,255,255,0.9)` | `rgba(255,255,255,0.2)` | none |
| Focus | same | `rgba(245,158,11,0.48)` | same | same | `0 0 0 3px rgba(245,158,11,0.08), 0 0 0 1px rgba(245,158,11,0.12)` |
| Repurpose URL focus | same | `rgba(34,211,238,0.35)` | same | same | — (cyan tint variant) |

---

### 4C. Card Design

| Variant | Background | Border | Radius | Padding | Hover |
|---|---|---|---|---|---|
| `.card` | `var(--color-dark-800)` = `#07071C` | `1px solid rgba(255,255,255,0.06)` | `14px` | `24px` | border `rgba(255,255,255,0.1)`, shadow `0 8px 48px rgba(0,0,0,0.45)` |
| `.card-glow` | `#07071C` | `1px solid rgba(245,158,11,0.15)` | `14px` | `24px` | border `rgba(245,158,11,0.28)`, outer ring glow |
| `.card-violet` | `#07071C` | `1px solid rgba(124,58,237,0.18)` | `14px` | `24px` | border `rgba(124,58,237,0.32)` |
| `.card-glass` | `rgba(7,7,28,0.72)` | `1px solid rgba(255,255,255,0.07)` | `16px` | `24px` | bg `rgba(7,7,28,0.85)` |

Both `.card-glow` and `.card-violet` have a `::before` pseudo-element with a radial gradient in the top-right corner for subtle inner glow.

---

### 4D. Badge / Tag Design

| Badge Type | Background | Text | Border | Notes |
|---|---|---|---|---|
| `.badge-purple` | `rgba(139,92,246,0.12)` | `#A78BFA` | `rgba(139,92,246,0.22)` | Instagram Caption, voice badges |
| `.badge-blue` | `rgba(59,130,246,0.12)` | `#60A5FA` | `rgba(59,130,246,0.22)` | LinkedIn, tone |
| `.badge-cyan` | `rgba(34,211,238,0.10)` | `#22D3EE` | `rgba(34,211,238,0.22)` | Twitter |
| `.badge-green` | `rgba(16,185,129,0.10)` | `#34D399` | `rgba(16,185,129,0.22)` | Done/approved |
| `.badge-orange` | `rgba(249,115,22,0.12)` | `#FB923C` | `rgba(249,115,22,0.20)` | Pending |
| `.badge-pink` | `rgba(236,72,153,0.10)` | `#F472B6` | `rgba(236,72,153,0.20)` | Instagram Carousel |
| `.badge-red` | `rgba(239,68,68,0.10)` | `#F87171` | `rgba(239,68,68,0.20)` | Failed |
| `.badge-gold` | `rgba(245,158,11,0.12)` | `#FBBF24` | `rgba(245,158,11,0.25)` | Platform label in result header |
| Quality S tier (≥80) | `rgba(16,185,129,0.1)` | `#10B981` | `rgba(16,185,129,0.28)` | ScorePill inline |
| Quality A tier (60-79) | `rgba(245,158,11,0.1)` | `#F59E0B` | `rgba(245,158,11,0.28)` | ScorePill inline |
| Quality C tier (<60) | `rgba(248,113,113,0.1)` | `#F87171` | `rgba(248,113,113,0.28)` | ScorePill inline |

**Badge base styling:** `font-size: 9px`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 1.2px`, `font-family: 'DM Mono'`, `border-radius: 20px`, `padding: 3px 9px`.

---

### 4E. Modal / Drawer / Sheet Design

| Element | Value |
|---|---|
| Backdrop | `rgba(0,0,0,0.78)` + `backdropFilter: blur(6px)` |
| Result drawer panel | `background: #07071C`, `border-left: 1px solid rgba(255,255,255,0.07)`, no radius, `box-shadow: -12px 0 40px rgba(0,0,0,0.45)` |
| Drawer animation | `rp-slideInRight .22s cubic-bezier(.16,1,.3,1)` from right |
| Drawer width (desktop) | `340px` |
| Drawer width (mobile) | `100vw` |
| Drawer header | `padding: 18px 20px 16px`, `border-bottom: 1px solid rgba(255,255,255,0.06)` |
| Drawer title | Space Grotesk 15px 600 `rgba(255,255,255,0.88)` |
| Mobile more sheet bg | `rgba(8,8,28,0.98)`, `border-radius: 20px 20px 0 0` |
| Mobile more sheet border | `border-top: 1px solid rgba(124,58,237,0.25)` |
| Mobile more sheet animation | `transform: translateY(100%)` → `translateY(0)` at `0.32s cubic-bezier(.4,0,.2,1)` |
| Confirm dialog | `card-glow` class, `max-width: 400px`, centered with `backdrop-filter: blur(6px)` |

---

## SECTION 5: ICONOGRAPHY SYSTEM

### 5A. Icon Usage Inventory (Lucide React)

All icons are from `lucide-react`. The following table lists icons found across all components:

| Icon | Lucide Name | Primary Size | Color Usage | Components / Pages |
|---|---|---|---|---|
| LayoutDashboard | `LayoutDashboard` | `size={15}` (nav), `size={17}` (stat) | `#F59E0B` | Sidebar nav, Dashboard stat card |
| Sparkles | `Sparkles` | `size={14–15}` | `#F59E0B` | Create button, brand voice indicator, empty state |
| Palette | `Palette` | `size={15}` | nav | Sidebar nav (Brand) |
| Clock | `Clock` | `size={15}` | nav | Sidebar nav (Library) |
| PanelLeftClose / PanelLeftOpen | both | `size={17}` | `rgba(255,255,255,0.32)` | Sidebar toggle |
| Lightbulb | `Lightbulb` | `size={15}` (nav), `size={18}` (page) | nav / `#F59E0B` | Sidebar (Ideate), Ideate page header, Dashboard tips card |
| Link2 | `Link2` | `size={15}` (nav), `size={18}` (page) | nav / `#22D3EE` | Sidebar (Repurpose), Repurpose header |
| Search | `Search` | `size={15}` (nav), `size={17}` (landing) | nav / `#22D3EE` | Sidebar (Competitor), Landing feature icon |
| CalendarDays | `CalendarDays` | `size={15}` | nav | Sidebar (Calendar) |
| ArrowRight | `ArrowRight` | `size={13–16}` | varies | Landing CTAs, Library view, ideate cards |
| ArrowUpRight | `ArrowUpRight` | `size={13}` | `rgba(255,255,255,0.16)` | Dashboard job row |
| Check | `Check` | `size={9–11}` | accent | Step indicators, agent done states, quality approved |
| ChevronRight | `ChevronRight` | `size={10–13}` | gold | Dashboard "View all", breadcrumb |
| ChevronDown | `ChevronDown` | `size={13}` | white | Create page collapsible sections |
| ChevronLeft | `ChevronLeft` | `size={8}` | dimmed | Result breadcrumb |
| TrendingUp | `TrendingUp` | `size={12}` | `#F59E0B` | Dashboard platform breakdown card header |
| Target | `Target` | `size={17}` (landing), `size={16}` (brand) | `#F59E0B` | Landing feature, Brand Identity card |
| Zap | `Zap` | `size={12}` | green | Landing feature icon, Insights sidebar "Fix with AI" |
| RefreshCw | `RefreshCw` | `size={10–15}` | varies | Landing feature, Repurpose page button |
| BarChart2 | `BarChart2` | `size={17}` | `#FBBF24` | Landing performance feature |
| Network | `Network` | `size={17}` | `#F472B6` | Landing Brand DNA feature |
| Layers | `Layers` | `size={13–17}` | varies | Landing logo icon, Dashboard stat, Library fallback |
| Hexagon | `Hexagon` | `size={15–16}` | `#22D3EE` | Dashboard Content DNA, Brand DNA card |
| ExternalLink | `ExternalLink` | `size={12}` | dimmed | Dashboard kebab menu |
| X | `X` | `size={12–20}` | varies | Close buttons throughout |
| Copy | `Copy` | `size={10–16}` | dimmed | Copy buttons |
| RotateCcw | `RotateCcw` | `size={10–16}` | dimmed | Regenerate buttons |
| Download | `Download` | `size={10–16}` | `#F59E0B` | Export buttons |
| MoreHorizontal | `MoreHorizontal` | `size={16}` | dimmed | Mobile footer "More" |
| Settings | `Settings` | `size={11}` | gold | Brand settings link |
| ClipboardList | `ClipboardList` | `size={13}` | white | Create audience toggle |
| AlertTriangle | `AlertTriangle` | `size={10–13}` | red | Error states, "Needs work" badge |
| Menu | `Menu` | `size={20}` | dimmed | Landing mobile hamburger |
| ImageIcon | `ImageIcon` | `size={13–15}` | pink | Instagram Carousel icon |
| Briefcase | `Briefcase` | `size={13–15}` | blue | LinkedIn icon |
| MessageSquare | `MessageSquare` | `size={13–15}` | cyan | Twitter icon |
| Camera | `Camera` | `size={13–15}` | purple | Instagram Caption icon |
| Video | `Video` | `size={13–15}` | red | Video Script icon |
| Loader2 | `Loader2` | `size={15}` | gold | Ideate page loading spinner |
| Trash2 | `Trash2` | various | red | Library delete |
| BookMarked | `BookMarked` | various | — | Library tab |
| Pin | `Pin` | various | — | Library pinned |
| Square / CheckSquare | both | various | — | Library bulk select |
| ArrowUpDown | `ArrowUpDown` | various | — | Library sort |
| Pencil / Check | both | various | — | Library rename |
| AlertCircle | `AlertCircle` | various | red | Competitor error |

---

### 5B. Icon Size Standards

| Context | Size | Notes |
|---|---|---|
| Sidebar nav icons | `size={15}` | All nav links |
| Sidebar toggle | `size={17}` | PanelLeftClose/Open |
| Button icons | `size={10–14}` | Varies by button size |
| Header/dashboard stat icons | `size={17}` | In colored icon containers |
| Card heading icons | `size={12–16}` | In small icon badges |
| Mobile tab icons | `size={19}` | Bottom tab bar |
| Landing feature icons | `size={17}` | In `.feat-icon-badge` |
| Platform icons in job rows | `size={15}` | |
| Breadcrumb chevron | `size={8}` | Smallest used |
| Mobile hamburger | `size={20}` | Landing nav |
| Mobile close button | `size={20}` | Landing menu |

---

### 5C. Icon Consistency Issues

1. **No fixed size for the same context:** Platform icons are `size={13}` on landing, `size={15}` in dashboard/library rows, `size={18}` in Repurpose header. No documented standard.
2. **Color inconsistency:** Some icons use the platform accent color, some use `rgba(255,255,255,0.3)`, some use `#F59E0B`, with no clear rule.
3. **Landing page uses `Layers` for logo** while app uses a custom `✦` character. Logo identity is split between `Layers` icon (landing) and a monospace symbol (app sidebar).
4. **Wrench icon is inline SVG** in mobile tab bar (`AuthLayout.tsx`) rather than a Lucide import — the only non-Lucide icon in the app.

---

## SECTION 6: PAGE-BY-PAGE UI DOCUMENTATION

---

### Landing Page — Route: /

**Purpose:** Public marketing page for unauthenticated users; communicates product value and drives sign-up.

**Layout:**
- Full-page dark (`#030310`) with three animated aurora orbs (radial gradients in violet, gold, cyan, each floating on independent animation cycles)
- Fixed sticky nav becomes frosted-glass on scroll (`scrolled` class adds `backdrop-filter: blur(28px)`)
- Six sections: Hero, Mockup screenshot, Features grid, How it works, Quality section, Live demo, CTA banner, Footer
- All sections max ~1280px content width, padding `0 72px`

**Color Usage:**
- Background: `#030310`
- Hero background: aurora orbs — `rgba(124,58,237,0.16)` (violet, 750px), `rgba(245,158,11,0.10)` (gold, 580px), `rgba(34,211,238,0.07)` (cyan, 480px)
- Grid lines behind hero: `rgba(124,58,237,0.08)` 1px crosshatch, 72px grid
- Hero headline gradient: shimmer on italic words — `linear-gradient(90deg,#F59E0B,#FBBF24,#F97316,#F59E0B)` animating at `5s linear infinite`
- Eyebrow pill: gold on `rgba(245,158,11,0.07)` bg
- Primary CTA: `linear-gradient(135deg,#F59E0B,#FBBF24)`, color `#030310`
- Secondary CTA: `rgba(255,255,255,0.04)` bg, `rgba(255,255,255,0.52)` text
- Features grid background: `rgba(124,58,237,0.07)` (fills the 1px gaps between cards)
- Quality section: `rgba(7,7,28,0.98)` with `border: 1px solid rgba(124,58,237,0.22)`
- CTA banner: `linear-gradient(135deg,#0B0B26,#080820)` with violet border
- Footer: barely visible — `rgba(255,255,255,0.3)` for brand name text

**Typography:**
- Hero H1: Playfair Display 900, `clamp(44px,7.5vw,94px)`, `letterSpacing: -3`, lineHeight 1.02
- Hero shimmer span: same font, italic, color animation
- "and ship." span: outlined text — `WebkitTextStroke: '1.5px rgba(255,255,255,.18)'`, `color: transparent`
- Hero subtitle: Inter 300, `fontSize: 17`, `rgba(255,255,255,0.45)`
- Section H2: Playfair Display 700, `clamp(32px,4.5vw,54px)`, `letterSpacing: -1.2`
- Section labels: DM Mono 10px uppercase, `#F59E0B`, 3px letter-spacing
- Feature card titles: Playfair Display 700, 19px
- Feature card body: Inter 400, 13.5px, `rgba(255,255,255,0.45)`
- Step titles: Playfair Display 700, 15.5px
- Step body: Inter 400, 12.5px, `rgba(255,255,255,0.4)`

**Key UI Elements:**
| Element | Type | Color Scheme | Size | Position |
|---|---|---|---|---|
| Eyebrow pill | DM Mono chip | Gold | 10.5px, `padding: 8px 18px`, `border-radius: 30px` | Centered above hero |
| Live indicator dot | Circle with blink animation | `#10B981` + glow | 6px | Hero stats strip |
| Stats strip | Row of DM Mono items | `rgba(255,255,255,0.26)` | 11px | Below hero CTAs |
| Mockup browser chrome | Fake browser window | `#050514` | — | Below hero |
| Traffic lights | Decorative circles | `#ff5f56`, `#ffbd2e`, `#27c93f` | 9px | Mockup browser chrome |
| Feature cards grid | 3-column grid | 1px violet gaps | — | Features section |
| Ghost number watermark | `.feat-num-ghost` | `rgba(245,158,11,1)` at `opacity: 0.032` | 100px Playfair 900 | Bottom-right of each feature card |
| Quality score display | `fontSize: 28` Playfair Display | `#F59E0B` | — | Quality section |
| Quality progress bars | `.q-bar-fill` animated on scroll | Per-dimension colors | 4px high | Quality section |
| Demo input | `.demo-input` | Gold focus ring | `14px` | Demo section |
| Platform selector buttons | `.demo-plat-btn` | Gold active state | `12px` | Demo section |

**States Documented:**
- **Empty:** Demo area shows input + platform selector only (no result)
- **Loading:** Demo button shows spinner + "Generating…" text
- **Result:** Animated `demo-fadeUp` panel shows content preview with violet border, gradient top bar
- **Error:** Red panel `rgba(239,68,68,0.07)` with `var(--color-error)` (`#EF4444`) text

**Visual Issues Found:**
- Hero "and ship." outline text may render poorly at small sizes (no fallback)
- Demo area uses `rgba(7,7,28,0.5)` section background which conflicts with body — visible seam
- Mobile: aurora orbs hidden via `display:none` — section-level gradient loses visual depth on mobile

---

### Dashboard — Route: /dashboard

**Purpose:** Overview of user's content activity — stats, recent generations, platform breakdown, and personalized tips.

**Layout:**
- Single-column flex with `gap: 1.75rem`
- Section header (title + CTA) → Stats grid (3 columns) → Content DNA bubble → Recent jobs list → 2-column bottom grid (breakdown + tips)
- Uses `.grid-stats` (3 col → 2 col at mobile) and `.grid-halves` (2 col → 1 col at mobile)

**Color Usage:**
- Background: `#030310` (inherited body)
- Stat cards: `#07071C` bg, `rgba(255,255,255,0.06)` border, 2px top gradient accent per stat
- Stat 1 (Total posts): gold accent `#F59E0B`
- Stat 2 (Avg score): violet accent `#A78BFA` — value is violet-colored
- Stat 3 (Best platform): cyan accent `#22D3EE`
- Content DNA bubble (active): `linear-gradient(135deg,rgba(34,211,238,0.05),rgba(139,92,246,0.05))` bg, `rgba(34,211,238,0.2)` border
- Content DNA bubble (inactive): `rgba(255,255,255,0.02)` bg, `rgba(255,255,255,0.06)` border
- Job rows: `#07071C` bg, hover to `#0A0A22`
- Kebab menu: `#0D0D26` bg, `rgba(124,58,237,0.22)` border
- Tips card items: `#0B0B26` bg with `rgba(255,255,255,0.04)` border
- Delete confirm modal: `card-glow` class, red gradient delete button

**Typography:**
- Page eyebrow: DM Mono 9.5px, `#A78BFA`, letterSpacing 3 (purple — only this page uses purple for eyebrow, all others use gold)
- Page H1: Playfair Display 700, `clamp(20px,5vw,28px)`, `rgba(255,255,255,0.92)`
- Stat value: Space Grotesk 700, `clamp(26px,5vw,38px)`, colored by accent
- Job topic: Inter 600, 13px, `rgba(255,255,255,0.88)`
- Job meta: DM Mono 9.5px, platform color

**Key UI Elements:**
| Element | Type | Color Scheme | Notes |
|---|---|---|---|
| Stat card | `.dash-stat-card` | Per-accent gradient top bar | 2px top bar, 40x40 icon in tinted container |
| Content DNA bubble | Link row | Cyan or dim | Icon + text + arrow |
| Job row | `.dash-job-row` | Platform-colored on hover | Platform icon + topic + status badge + score pill + time |
| Score pill | Inline | Green/amber/red by score | `2px 8px padding`, pill shape |
| Kebab menu | Absolute positioned | `#0D0D26` + violet border | Three options, purple hover |
| Platform breakdown | Progress bars | Platform accent colors | 4px bars |
| Tips | List items | `#0B0B26` + gradient dot | Gradient dot `#F59E0B → #A78BFA` |
| Skeleton loaders | `dash-shimmer` animation | `rgba(255,255,255,0.05)` | Opacity pulse 0.45→0.9→0.45 |

**States Documented:**
- **Loading:** Skeleton rows for jobs list, platform breakdown, tips
- **Empty (no jobs):** Large centered card with Sparkles icon, description, Create CTA
- **Populated:** Stats, DNA bubble, job list, breakdown chart, tips
- **Kebab open:** Dropdown menu appears with View/Create again/Delete options
- **Delete confirm:** Modal overlay with card-glow

**Visual Issues Found:**
- Dashboard eyebrow uses `#A78BFA` (violet) while all other pages use `#F59E0B` (gold) — inconsistent hierarchy signal
- `video_script` platform not in `platformMeta` — renders as purple fallback

---

### Create Page — Step 1: Platform — Route: /create

**Purpose:** 3-step wizard for creating new content — Step 1 selects platform.

**Layout:**
- Single-column narrow form
- Page header (eyebrow + H1 + subtitle) → step indicator → platform selector grid (5 cards) → Step 2 inputs (topic/tone/audience) → optional Advanced Options

**Color Usage on Step 1:**
- Step indicator circles: gold border/text for active/done, `rgba(255,255,255,0.1)` for future
- Connector lines: gold `rgba(245,158,11,0.4)` for completed, `rgba(255,255,255,0.07)` for upcoming
- Platform cards: each has a colored top bar in platform accent, hover border brightens

**Key Elements:**
- Step indicator: 28px circles (DM Mono, 10px), 3 steps, gold connector lines
- Step labels: small 22px badge with `rgba(245,158,11,0.12)` bg and gold number

**Step 2 (Content Input) Color Usage:**
- Topic textarea: `.input` class (dark, gold focus)
- Autocomplete dropdown: `#0D0D24` bg, `rgba(245,158,11,0.22)` border
- Brand voice indicator (active): `rgba(245,158,11,0.06)` bg, `rgba(245,158,11,0.22)` border, `#F59E0B` text + Sparkles icon
- Brand voice indicator (inactive): `rgba(255,255,255,0.02)` bg, link row
- Audience toggle: `rgba(255,255,255,0.03)` bg, collapsible
- Generate button (active): `linear-gradient(135deg,#F59E0B,#FBBF24)`, dark text `#050509`
- Generate button (disabled): `rgba(245,158,11,0.25)` bg, muted text
- Back button: `rgba(255,255,255,0.03)` bg secondary

**States:**
- Step 1: Platform grid visible, back button hidden
- Step 2: Topic input autofocused, tone selector, optional sections
- Loading: Spinner + "Generating..." text in generate button
- Error: Red alert box `rgba(244,63,94,0.08)` with `#F87171` text

---

### Result Page — Loading State — Route: /result/:jobId

**Purpose:** Real-time pipeline progress during generation.

**Layout:**
- `ResultHeader` (breadcrumb, title, status) above `LoadingView` card

**Color Usage:**
- `LoadingView` card: `.rp-lv card` = `rgba(255,255,255,0.015)` bg, `rgba(255,255,255,0.06)` border, `border-radius: 16px`
- Primary spinner ring: `#F59E0B` top border, `rgba(245,158,11,0.12)` full ring, gold glow `0 0 20px rgba(245,158,11,0.15)`
- Secondary spinner ring (inner): `rgba(139,92,246,0.45)` bottom, spinning opposite direction
- Center dot: `#F59E0B` 6px, glow
- Stage name lit: `rgba(255,255,255,0.75)`, dimmed: `rgba(255,255,255,0.28)`
- Stage connector line (done): `rgba(245,158,11,0.3)`, undone: `rgba(255,255,255,0.07)`
- Stage dot (active): `rp-pulse` animation — `rgba(245,158,11,0.2)` → `rgba(245,158,11,0.07)` box shadow
- Agent colors in stage dots: Orchestrator `#F59E0B`, Researcher `#8B5CF6`, Writer `#22D3EE`, Formatter `#10B981`, Critic `#F43F5E`
- Activity log: DM Mono `[AGENT]` label in `#F59E0B`, action text `rgba(255,255,255,0.38)`
- Stage message: `rgba(245,158,11,0.75)`, animated `rp-fadeUp`

---

### Result Page — Complete State — Route: /result/:jobId

**Purpose:** Displays finished content with quality analysis, export options, and platform renderers.

**Layout:**
- `ResultHeader` (breadcrumb + title + status bar + meta pills + toolbar)
- Mobile tabs (Content / Insights, hidden on desktop)
- Two-column grid: `ContentColumn` (left, ~60%) + `InsightsSidebar` (right, 360px collapsed to 48px)
- Sidebar collapses to a vertical strip (48px wide) showing score and label
- Mobile footer action bar (Copy / Regen / Export / More)
- Slide-out drawer for advanced actions (Feedback / Post / Hashtags)

**Color Usage:**
- Result header border-bottom: `rgba(255,255,255,0.05)`
- Breadcrumb: DM Mono `rgba(255,255,255,0.22)`, hover `#F59E0B`
- Result eyebrow: `#F59E0B`
- Platform badge: `badge-gold`
- Audience badge: `badge-purple`
- Tone badge: `badge-blue`
- Progress bar: gold gradient
- Status badge "Done": `rgba(16,185,129,0.1)` bg, `#34D399` text
- Status badge "Generating": `rgba(245,158,11,0.08)` bg, `#F59E0B` text + pulse dot
- Score ring: gold gradient `#F59E0B → #FBBF24`
- Score ring background track: `rgba(255,255,255,0.05)`
- "Approved" badge: `rgba(16,185,129,0.08)` + `#34D399`
- "Needs work": `rgba(245,158,11,0.08)` + `#F59E0B`
- Score dimension bars: per-dimension color (gold/violet/cyan/green/pink)
- Actionable tip card: `rgba(245,158,11,0.04)` bg, `rgba(245,158,11,0.1)` border
- Content Multiplier banner: `rgba(124,58,237,0.06)` bg, `rgba(124,58,237,0.18)` border, `#8B5CF6` icon
- Mobile footer bar: `rgba(3,3,14,0.92)` + `backdrop-filter: blur(20px)`
- Footer separator: `rgba(255,255,255,0.07)`

**Carousel slide rendering:**
- Slides are 1:1 aspect ratio (`max-width: 520px`) with `border-radius: 16px`
- Nav buttons: 36px circles, `rgba(255,255,255,0.05)` bg, `rgba(255,255,255,0.1)` border
- Progress dots: 4px high, active dot wider, colored by theme

---

### Library Page — Route: /library

**Purpose:** Paginated list of all generated content with search, filter, sort, and bulk delete.

**Layout:**
- Search input + filter chips (platform) + sort menu + manage mode toggle
- Job list rows (same style as Dashboard but with more detail)
- Pagination controls

**Key Color Notes:**
- Platform filter chips: `.chip` / `.chip-active` (gold active state)
- Job row background: `#08081A` (slightly different from dashboard's `#07071C`)
- Score pill: same green/amber/red tier logic as dashboard
- Skeleton: `lib-shimmer` animation (same pulse technique as dashboard's `dash-shimmer`)
- Bulk selection checkboxes: `CheckSquare` / `Square` icons
- Delete confirm modal: same card-glow + `rgba(0,0,0,0.78)` backdrop

**States:**
- Loading: `CardSkeleton` components (3 shown)
- Empty (content): illustration + message + Create CTA
- Populated: job rows list
- Manage mode: checkboxes appear, "Delete Selected" button becomes available

---

### Brand Voice Page — Route: /brand

**Purpose:** Configure brand identity, voice tone, phrases, and Content DNA; connect social accounts.

**Layout:**
- 2-column grid (`brand-card-grid`) → 1 column on mobile
- Card 1: Identity (brand name, industry, website) — gold `borderLeft: '3px solid rgba(245,158,11,0.4)'`
- Card 2: Voice (tone chips, phrases use/avoid) — violet `borderLeft: '3px solid rgba(139,92,246,0.4)'`
- Card 3: Content DNA (full-width) — cyan `borderLeft: '3px solid rgba(34,211,238,0.4)'`, gradient bg
- Card 4: Social Connections (full-width)
- Card 5: Analytics (full-width, if present)

**Key Color Notes:**
- Identity card accent: `rgba(245,158,11,0.1)` icon bg, gold border, Target icon
- Voice card accent: `rgba(139,92,246,0.1)` icon bg, violet border, Layers icon
- Voice chips (selected): `rgba(139,92,246,0.12)` bg, `#8B5CF6` border, `#A78BFA` text, violet glow
- Voice chips (unselected): `#0C0C28` bg, `rgba(255,255,255,0.07)` border
- Content DNA card: `rgba(34,211,238,0.02)` + `rgba(139,92,246,0.02)` gradient bg, cyan border
- Social connected: green `rgba(16,185,129,0.08)` bg, `#10B981` check
- Social disconnected: `rgba(255,255,255,0.04)` bg
- Toast (success): `rgba(16,185,129,0.94)` bg
- Save button: `.btn-primary` (gold gradient)

---

### Ideate — Route: /ideate

**Purpose:** AI generates 10 topic ideas based on brand voice and industry.

**Layout:**
- Narrow single column (`maxWidth: 780px`, centered)
- Header (icon + H1 + subtitle) → Generate button → Ideas list (or skeleton loading)

**Color Usage:**
- Header icon: `linear-gradient(135deg, rgba(245,158,11,0.18), rgba(139,92,246,0.18))` bg, `rgba(245,158,11,0.22)` border, `#F59E0B` Lightbulb icon
- H1: Space Grotesk 700 22px (NOT Playfair Display — inconsistency)
- Generate button (active): `linear-gradient(135deg,#F59E0B,#F97316)` — orange-gold, not pure gold
- Generate button (loading): `rgba(245,158,11,0.08)` bg
- Idea cards: `#08081A` bg, `rgba(255,255,255,0.06)` border, hover → `rgba(245,158,11,0.03)` bg + `rgba(245,158,11,0.25)` border
- Number badges: `rgba(245,158,11,0.08)` bg, `rgba(245,158,11,0.14)` border, `#F59E0B` text, DM Mono
- Platform icon: colored bg/border per platform
- "Why?" tag: small platform badge + angle description
- Create arrow: `ArrowRight` in platform color

**States:**
- **Empty:** Generate button only, no list
- **Loading:** 10 skeleton cards with `idea-shimmer` animation (staggered by `i * 0.07s`)
- **Populated:** List of 10 clickable idea cards
- **Error:** Red panel

---

### Repurpose — Route: /repurpose

**Purpose:** Paste a URL → AI extracts key insights and generates platform-specific content.

**Layout:**
- Narrow single column (`maxWidth: 680px`, centered)
- Header (icon + H1) → URL input with icon prefix → Platform selector cards → Tone chips → Audience input → Generate button

**Key Color Notes:**
- Header icon: `rgba(34,211,238,0.18)` + `rgba(139,92,246,0.18)` gradient, `rgba(34,211,238,0.22)` border, `#22D3EE` Link2 icon
- H1: Space Grotesk 700 22px (same inconsistency as Ideate)
- URL input focus: `rgba(34,211,238,0.35)` border (cyan, different from standard gold!)
- Platform cards show gradients matching actual platform brand colors:
  - Instagram: `linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)`
  - LinkedIn: `linear-gradient(135deg,#0077B5,#00a0dc)`
  - Twitter: `linear-gradient(135deg,#1DA1F2,#0d8ecf)`
  - Caption: `linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)`
- Tone chips: similar style to voice chips but without the violet accent
- Loading phases: "Fetching content from URL…" → "Extracting topic & starting generation…"

---

### Competitor — Route: /competitor

**Purpose:** Analyze a competitor's content strategy by entering their social handle.

**Layout:**
- Page header (eyebrow + H1 + subtitle) → Input card → Results section (when loaded)
- Input card: `#08081A` bg, `rgba(245,158,11,0.18)` border
- Results: multiple cards showing themes, patterns, gaps, suggested angles

**Key Color Notes:**
- H1: Playfair Display 700 (consistent with standard pages — same as Create, Dashboard, Brand)
- @-handle prefix indicator: inline `rgba(255,255,255,0.3)` text
- Engagement level colors: `high: '#10B981'`, `medium: '#F59E0B'`, `low: '#F43F5E'`
- Analyze button: `.btn-primary` (gold gradient)
- Loading: spinner in button, disabled state
- Results grid: `.comp-grid`, `.comp-angles-grid` (2-col → 1-col on mobile)

---

### Calendar — Route: /calendar

**Purpose:** Visual calendar view of generated content organized by creation date.

**Layout:**
- Page header (H1 + nav controls) → Month nav → Stats row → 7-column calendar grid → Day detail panel (on click)

**Key Color Notes:**
- Calendar cells: `#08081A` bg, `rgba(255,255,255,0.05)` border
- Today cell: `rgba(245,158,11,0.04)` bg, `rgba(245,158,11,0.35)` border
- Selected cell: `rgba(245,158,11,0.08)` bg, `rgba(245,158,11,0.6)` border
- Hover cell: `rgba(245,158,11,0.03)` bg, `rgba(245,158,11,0.25)` border
- Today date number: `#F59E0B`, DM Mono 700
- Platform pills inside cells: platform-colored bg/text
- Month navigation buttons: hover → `rgba(245,158,11,0.1)` bg, gold border + text
- Day detail panel: `#08081A` bg, `rgba(245,158,11,0.2)` border, `border-radius: 14px`
- Stats row: 4 cards with platform-colored icons

---

## SECTION 7: NAVIGATION DESIGN

### 7A. Desktop Sidebar

| Element | Color | Size | Weight | Font | Active State |
|---|---|---|---|---|---|
| Sidebar background | `rgba(3,3,16,0.97)` | 240px wide | — | — | — |
| Sidebar right border | Gradient: `rgba(124,58,237,0.45)` → `rgba(245,158,11,0.28)` → `rgba(34,211,238,0.15)` | 1px | — | — | — |
| Logo icon | `linear-gradient(135deg, #F59E0B, #FBBF24)` bg | 32×32px, `border-radius: 9px` | — | DM Mono | glow strengthens |
| Logo `✦` symbol | `#030310` | 15px | 500 | DM Mono | — |
| "Content" text | `#fff` | 14.5px | 700 | Space Grotesk | — |
| "Agent" text | `#F59E0B` | 14.5px | 700 | Space Grotesk | — |
| Collapse toggle | `rgba(255,255,255,0.32)` | 30×30px, border-radius 7px | — | — | hover bg `rgba(255,255,255,0.07)` |
| Nav links (default) | `rgba(255,255,255,0.38)` | 13px, padding 9px 11px | 500 | Inter | — |
| Nav links (hover) | `rgba(255,255,255,0.82)` | — | — | — | bg `rgba(255,255,255,0.04)`, border `rgba(255,255,255,0.06)` |
| Nav links (active) | `#F59E0B` | — | — | — | bg gradient gold, border `rgba(245,158,11,0.18)`, left inset shadow `inset 3px 0 0 #F59E0B` |
| Nav icons | matches link color | `size={15}`, minWidth 15 | — | — | — |
| Divider | `rgba(255,255,255,0.05)` | 1px | — | — | — |
| User section border-top | `rgba(255,255,255,0.04)` | 1px | — | — | — |
| Username | `rgba(255,255,255,0.88)` | 13px | 600 | Inter | — |
| Plan label ("Free plan") | `rgba(255,255,255,0.26)` | 10.5px | 400 | DM Mono | — |

**Nav order (workflow sequence):** Dashboard → Ideate → Competitor → Create → Repurpose → Library → Calendar → Brand Voice

**Collapsed state:** Links show only icons centered. Logo area shows only the toggle button. User shows only avatar. Width: 64px. Width transition: `0.3s cubic-bezier(0.4, 0, 0.2, 1)`.

---

### 7B. Mobile Navigation

**Mobile Top Bar (≤768px):**
| Element | Color | Size | Notes |
|---|---|---|---|
| Topbar background | `rgba(3,3,16,0.97)` | height 56px | `backdrop-filter: blur(28px)` |
| Topbar border | `rgba(124,58,237,0.18)` | 1px bottom | Violet tint |
| Logo (mobile) | Same as desktop but 30×30px icon | 14px Space Grotesk | Same `✦` + "Content**Agent**" |
| UserButton | Clerk component | w-8 h-8 | — |

**Mobile Bottom Tab Bar (≤768px):**
| Element | Color | Active |
|---|---|---|
| Tab bar background | `rgba(3,3,16,0.98)` | — |
| Tab bar border | `rgba(124,58,237,0.2)` | — |
| Tab icon + label | `rgba(255,255,255,0.28)` | `#F59E0B` (gold) |
| Tab icon size | `size={19}` | — |
| Label size | 10px | — |
| Create pill (center) | `linear-gradient(135deg, #F59E0B, #FBBF24)`, 38×38px, `border-radius: 12px` | — |

4 items in bottom tab: Home, Create, Library, Brand + Tools overflow.

**Mobile "More" Sheet (≤768px):**
- Bottom drawer: `rgba(8,8,28,0.98)` bg, `border-radius: 20px 20px 0 0`
- 3-column grid of app links not shown in bottom tab
- Active item: `rgba(245,158,11,0.1)` bg, gold border/text
- Inactive item: `rgba(255,255,255,0.04)` bg, `rgba(255,255,255,0.06)` border
- Hover: `rgba(124,58,237,0.12)` bg, violet border

---

### 7C. Navigation Consistency Issues

1. **History route redirects to Library** (`/history` → `/library`) but Dashboard still links to `/history` — could cause confusion if someone bookmarked `/history`
2. **"Library" icon is `Clock`** — semantically misleading. Clock typically means history/time, not library/saved content
3. **Tools dropdown vs sidebar items:** Repurpose, Ideate, Competitor are in the sidebar; the mobile "Tools" sheet contains overlapping items
4. **Active state contrast:** The gold left inset `3px` bar on active nav items is a strong indicator on desktop but provides no equivalent on mobile (only text color change)

---

## SECTION 8: INTERACTION & ANIMATION PATTERNS

### 8A. Transitions Used

| Pattern | CSS Value | Duration | Where Used |
|---|---|---|---|
| Button lift on hover | `transform: translateY(-2px)` | `0.22s cubic-bezier(0.4,0,0.2,1)` | `.btn-primary:hover` |
| Button shimmer sweep | `::before` translateX(-100% → 100%) | `0.38s cubic-bezier(0.4,0,0.2,1)` | `.btn-primary::before` |
| Card hover shadow | border-color + box-shadow | `0.22s ease` | `.card:hover`, `.card-glow:hover` |
| Sidebar width collapse | `width 0.3s cubic-bezier(0.4,0,0.2,1)` | `0.3s` | `.sidebar-desktop` |
| Main content shift | `margin-left 0.3s cubic-bezier(0.4,0,0.2,1)` | `0.3s` | `.main-content` |
| Drawer slide-in | `translateX(100%) → translateX(0)` | `0.22s cubic-bezier(.16,1,.3,1)` | `.rp-drawer` animation |
| Mobile more sheet | `translateY(100%) → translateY(0)` | `0.32s cubic-bezier(.4,0,.2,1)` | `.mobile-more-sheet` |
| Progress bar width | `width 0.6s cubic-bezier(0.4,0,0.2,1)` | `0.6s` | `.progress-bar-fill` |
| Score bars | `width 1.2s cubic-bezier(.16,1,.3,1)` | `1.2s` | InsightsSidebar score bars |
| Score ring | `stroke-dashoffset 1.5s cubic-bezier(.16,1,.3,1)` | `1.5s` | SVG quality ring |
| Nav link color | `all 0.18s ease` | `0.18s` | `.sidebar-link` |
| Calendar cell hover | `all 0.15s` | `0.15s` | `.cal-cell:hover` |
| Quality bars (landing) | `transform scaleX 1.4s cubic-bezier(.16,1,.3,1)` | `1.4s` | `.q-bar-fill` (triggered by IntersectionObserver) |
| Platform breakdown bars | `width 1.2s cubic-bezier(.16,1,.3,1)` | `1.2s` | Dashboard platform bars |
| Idea card hover | `border-color .2s, background .2s` | `0.2s` | Ideate cards |
| Dropdown reveal | `animate-scale-in 0.22s` | `0.22s` | Kebab menu |
| Result grid column resize | `grid-template-columns 0.25s cubic-bezier(.16,1,.3,1)` | `0.25s` | Sidebar collapse in result |

---

### 8B. Loading Patterns

| Pattern | Implementation | Where Used |
|---|---|---|
| Dual counter-rotating spinners | Two `div` borders with opposite `animation: spin/spinR` | Result page `LoadingView`, landing demo |
| Skeleton shimmer | opacity pulse `0.45 → 0.9` at `1.5s ease-in-out infinite` (`dash-shimmer`) | Dashboard job rows, stat cards |
| Staggered skeleton cards | `animation-delay: i * 0.07s` | Ideate page loading |
| Opacity pulse skeleton | `lib-shimmer` (same pattern as `dash-shimmer`) | Library page |
| Inline button spinner | Single border div + `spin 1s linear` inside button | Generate button (Create, Landing demo) |
| Loader2 spinning | Lucide `Loader2` + `animation: spin 1s linear infinite` | Ideate generate button |
| Stage pipeline stepper | Dot states (empty → active pulse → done checkmark) | Result `LoadingView` |
| `rp-pulse` animation | Box-shadow `0 → 4px rgba(245,158,11,0.2)` at 50% | Active stage dot |

---

### 8C. Feedback Patterns

| Pattern | Color | Trigger |
|---|---|---|
| Toast success | `rgba(16,185,129,0.94)` bg, white text | Brand voice saved, social connected |
| Toast error | `rgba(239,68,68,0.94)` bg, white text | API errors, social connection errors |
| Toast animation | `fade-in-up 0.3s ease-out` | On appear |
| Toast auto-dismiss | — | 3000–4000ms setTimeout |
| Copy button feedback | Text changes to "Copied!" temporarily | Copy all text action |
| Error banner inline | `rgba(244,63,94,0.08)` bg, red text | Create page error, competitor, repurpose |
| Social connection toast | Custom inline state | Brand page OAuth result |
| Scroll-reveal | Opacity 0→1, translateY 32px→0, 0.7s ease | Landing page sections (IntersectionObserver) |

---

## SECTION 9: RESPONSIVE BEHAVIOR

### Desktop (>1024px)
- Sidebar: 240px fixed, always visible
- Main content: 1100px max-width centered with `margin-left: 240px`
- Content padding: `40px 56px 30px`
- Stats: 3-column grid
- Dashboard halves: 2-column grid
- Result: 2-column with 360px sidebar
- Create: single column, max ~680px natural width
- Landing: full-width with `padding: 0 72px`

### Tablet (768px–1024px)
- Sidebar still visible (220px at 900px, full at larger)
- Content padding narrows to `28px 32px 56px`
- Stats still 3 columns
- Result sidebar: 300px at 1100px breakpoint, 1-column at 900px (sidebar goes grid 1fr 1fr)
- Landing: hamburger replaces nav links at 1024px

### Mobile (<768px)
- Desktop sidebar hidden (`display: none !important`)
- Mobile topbar (56px fixed top) + bottom tab bar
- Main content: `margin-left: 0`, `padding-top: 56px`, `padding-bottom: calc(72px + safe-area)`
- Content padding: `22px 16px 28px`
- Stats: 2-column (→ 1-col at 480px)
- Dashboard halves: 1-column stacked
- Result: `rp-tabs` (Content/Insights tabs) appear; grid becomes single column; mobile footer bar shows
- Create: single column, full-width inputs
- Library: 1-column, platform filter chips wrap
- Brand: 1-column cards
- Calendar: cells shrink to 56px, pills hidden at 480px
- Landing: hero `padding: 88px 22px 56px`, H1 scales down, hero actions stack vertically, features grid 2-col

**Touch targets:** Mobile tab items are `min-width: 54px` with `padding: 6px 12px`. Mobile more items are `padding: 14px 8px`. Both are at or above 44px recommendation.

**Known mobile issues:**
- Toast position shifts to above tab bar: `bottom: calc(5.5rem + env(safe-area-inset-bottom))` — good
- Result page footer bar adds `padding-bottom: 80px` to `.rp`
- Carousel slides maintain 1:1 aspect ratio with `max-width: 520px` — renders well on mobile

---

## SECTION 10: VISUAL CONSISTENCY AUDIT

| # | Issue | Pages Affected | Severity | Description |
|---|---|---|---|---|
| 1 | H1 font family inconsistency | Ideate, Repurpose vs all others | High | Ideate/Repurpose use Space Grotesk 700 22px for H1; all other pages use Playfair Display 700 |
| 2 | Result page H1 font | Result page | Medium | Uses Space Grotesk instead of Playfair Display for job topic title |
| 3 | Dashboard eyebrow uses violet | Dashboard | Medium | `#A78BFA` eyebrow color vs gold `#F59E0B` on all other pages |
| 4 | Video script missing from platformMeta | Dashboard | Medium | Falls back to purple badge/icon instead of its documented red/coral color |
| 5 | ~~Split theme accent mismatch~~ **Resolved** | Carousel theme picker | — | No server-side theme accent exists anymore post carousel-rewrite (see §1C) — nothing left to mismatch against |
| 6 | ~~Only 5 themes in picker~~ **Resolved** | Carousel theme picker | — | All 9 themes are now exposed in `CAROUSEL_THEMES` in constants.ts (verified: aurora, magazine, split, bold, minimal, neon, violet, crimson, rose) |
| 7 | URL input focus: cyan instead of gold | Repurpose page | Low | `rgba(34,211,238,0.35)` focus border — inconsistent with standard gold focus ring on all other inputs |
| 8 | Background shade inconsistency | Library vs Dashboard | Low | Library uses `#08081A`, Dashboard uses `#07071C` for row/card backgrounds |
| 9 | Three red error variants | All pages | Low | `#EF4444`, `#F87171`, `#F43F5E` used interchangeably for semantically identical error states |
| 10 | Body text color variations | All pages | Low | `rgba(255,255,255,0.88)`, `.90`, `.92`, `.96` used for body/card heading text with no rule |
| 11 | Hardcoded hex values in JSX | All pages | Medium | Design tokens exist in `@theme` but JSX uses literal hex strings everywhere. Changing a color requires hunting hundreds of inline styles |
| 12 | Library route `Clock` icon | Sidebar nav | Low | Semantically misleading icon for "Library" — Clock implies history/time |
| 13 | Logo design split between landing and app | Landing vs AuthLayout | Low | Landing uses `Layers` icon from Lucide; App sidebar uses `✦` DM Mono character |
| 14 | Gradient button orange-gold on Ideate | Ideate page | Low | Generate button gradient `#F59E0B → #F97316` (orange) vs standard `#F59E0B → #FBBF24` (gold) |
| 15 | Missing hover states on some links | Dashboard "View all" | Low | History link uses `onMouseEnter/Leave` style manipulation instead of CSS classes — fragile |
| 16 | Letter-spacing values | All pages | Low | Same semantic purpose (section labels) uses `3px`, `2.5px`, `2px`, `letterSpacing: 3` (unitless) inconsistently |
| 17 | Line-height body text | All pages | Low | Values range from 1.6 to 1.78 for body text with no clear semantic difference |
| 18 | Wrench icon is inline SVG | AuthLayout mobile | Low | Only non-Lucide icon; breaks the icon system consistency |
| 19 | ~~No focus-visible states documented~~ **Fixed** | All pages | — | `index.css` now has explicit `:focus-visible` rules (WCAG 2.4.7 cited in-line) applied globally plus per-component overrides (`.sidebar-link`, `.input`, `.selectable-tile`) — no longer relying on browser default |
| 20 | Feature cards on landing have no border-radius | Landing page | Low | `.feat-new` has sharp corners; all other cards in the app use 14px radius — jarring inconsistency |
| 21 | ~~Templates page not in sidebar~~ **Resolved** | App navigation | — | The Templates feature (page, `/templates` route, Library tab, backend CRUD) was removed entirely — nothing left to place in navigation |

---

## SECTION 11: DESIGN DIFFERENTIATION ANALYSIS

### 1. ContentAgent's Current Visual Identity (3-5 words)
**"Dark editorial intelligence — gold authority."**

### 2. Distinctive Visual Elements

- **Playfair Display 900 hero headlines** with shimmer gold animation — editorial-meets-AI aesthetic that is unusual in SaaS
- **Triple-font stack** (Playfair Display / Space Grotesk / DM Mono) creates a rich typographic palette where each has a distinct semantic role
- **DM Mono for all metadata** (badges, labels, timestamps, section labels) — gives a precise, "command-line intelligence" feel to UI microcopy
- **Ambient aurora body background** — three radial gradient orbs in violet/gold/cyan with film grain overlay creates persistent atmospheric depth
- **Gradient sidebar right-edge border** (violet → gold → cyan, 1px) — subtle brand element that appears on every page
- **Dual counter-rotating spinner** (gold outer + violet inner, opposite directions) — distinctive loading pattern
- **Quality score ring** (SVG arc with `stroke-dashoffset` animation, 1.5s spring) — visually communicates the AI critique concept
- **Agent color coding** (Orchestrator=gold, Researcher=violet, Writer=cyan, Formatter=green, Critic=red) — makes the pipeline feel alive and differentiated
- **Section label style** (DM Mono 10px uppercase, `#F59E0B`, with 22px gradient line before) — recurring brand signal
- **Carousel slide preview** at 1:1 ratio with themed backgrounds — rare in content tools

### 3. Generic Elements (Feels like default Tailwind / shadcn)

- Glass card system (`.glass`, `.glass-strong`, `.glass-violet`) — extremely common in 2024-2026 dark UI trend
- The dark-900 base with `rgba(255,255,255,0.06)` borders is the most common dark theme pattern
- The "stat card with colored top bar" pattern from Dashboard is everywhere in SaaS admin dashboards
- `.badge` pill system is generic Bootstrap/Tailwind behavior
- Sidebar collapse to 64px icon-only mode is a cloned Claude/linear pattern
- Kebab menu pattern (3 dots → dropdown) is universal

### 4. Elements That Communicate Trust and Quality

- The 70/100 quality gate displayed prominently in the landing page quality section
- The "Critic-reviewed" badge and score ring in the result page
- The 5-agent pipeline visualization (each agent has a name, action, and completion state)
- Performance Predictor with "confidence score" shown in both landing mockup and result
- "Approved" badge in green with checkmark (communicates a passed gate)
- DM Mono typography for all scores and metrics (feels precise/technical)
- The landing page mock browser with traffic lights and fake URL gives social proof of a real product

### 5. Elements That Communicate AI / Intelligence

- Dual counter-rotating spinners during generation
- Real-time activity feed showing `[AGENT] action text` during generation
- Pipeline stepper with per-agent colors
- Content DNA hexagon icon + "writing fingerprint" language
- The `✦` logo character (unusual, AI-associated)
- Agent color coding throughout loading state

### 6. ONE Visual Signature ContentAgent Could Uniquely Own

**The "Gold Score Ring" as a brand mark.** The SVG arc quality ring (gold gradient, animated stroke-dashoffset) combined with the DM Mono score number inside it is the single most distinctive UI element ContentAgent produces. If this ring appeared in marketing materials, loading states, favicon, empty states, and social previews — always in gold with the same spring animation — it could become as recognizable as Spotify's green wave or Duolingo's streak flame. Currently it only appears once (in the result sidebar). This element should be elevated to a core brand signature.

---

## QUICK REFERENCE: CORE DESIGN VALUES

### Primary Colors (copy-paste ready)

| Name | CSS Token | Hex | Role |
|---|---|---|---|
| Gold Primary | `var(--color-gradient-start)` | `#F59E0B` | CTAs, active states, nav highlight |
| Gold Light | `var(--color-gradient-mid)` | `#FBBF24` | Gradient endpoint, hover brightening |
| Violet | `var(--color-accent-violet)` | `#7C3AED` | Sidebar border, secondary accents |
| Purple | `var(--color-accent-purple)` | `#8B5CF6` | Researcher agent, voice chips, violet accent |
| Cyan | `var(--color-accent-cyan)` | `#22D3EE` | Writer agent, Twitter platform, DNA |
| Green | `var(--color-accent-green)` | `#10B981` | Success, approved, formatter agent |
| Pink | `var(--color-accent-pink)` | `#EC4899` | Instagram Carousel platform |
| Page Background | `var(--color-dark-900)` | `#030310` | Body background |
| Card Background | `var(--color-dark-800)` | `#07071C` | Cards, job rows |

### Font Stack

- **Headings (H1, H2):** `'Playfair Display', Georgia, serif`
- **Display / Numbers:** `'Space Grotesk', system-ui, sans-serif`
- **Body / UI:** `'Inter', system-ui, -apple-system, sans-serif`
- **Metadata / Labels:** `'DM Mono', monospace`

### Key Measurements

| Element | Value |
|---|---|
| Sidebar width (expanded) | `240px` |
| Sidebar width (collapsed) | `64px` |
| Content max-width | `1100px` |
| Desktop content padding | `40px 56px 30px` |
| Mobile content padding | `22px 16px 28px` |
| Base card border-radius | `14px` |
| Glass card border-radius | `16px` |
| Button border-radius (primary/secondary) | `10px` |
| Input border-radius | `10px` |
| Badge border-radius | `20px` (pill) |
| Base spacing unit | `14px` (card gap) |
| Mobile topbar height | `56px` |
| Mobile tab bar height | `~72px` |
| Result sidebar width | `360px` (expanded), `48px` (collapsed) |

### Platform Color Quick Reference

| Platform | Color Name | Hex |
|---|---|---|
| Instagram Carousel | Pink/Magenta | `#EC4899` |
| LinkedIn Post | Blue | `#60A5FA` |
| Twitter/X Thread | Cyan | `#22D3EE` |
| Instagram Caption | Violet | `#A78BFA` |
| Video Script | Red/Coral | `#F87171` |

### Carousel Theme Accent Quick Reference

| Theme (Key) | Display Name | Accent Hex |
|---|---|---|
| `aurora` | Neon Aurora | `#00D4FF` / `#00F5FF` |
| `magazine` | Editorial | `#D4A017` |
| `split` | Geometric | `#FF6B35` (server) / `#8B5CF6` (client — mismatch!) |
| `bold` | Luxury | `#C9A84C` |
| `minimal` | Minimal | `#6366F1` |
| `neon` | Neon Cyber | `#FF2D78` |
| `violet` | Violet Luxe | `#A855F7` |
| `crimson` | Crimson Power | `#DC2626` |
| `rose` | Rose Elegance | `#E11D48` |
