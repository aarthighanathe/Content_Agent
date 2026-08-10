> ⚠️ READ AGENT RULES FIRST — they apply to every code change in this project automatically.

# AGENT RULES
> These rules apply automatically to every code generation, edit, file creation, and refactor in this project. No exceptions.
> Never ask the user to confirm these — just follow them.

---

## 🔒 SECURITY RULES (Non-negotiable)

### Input Validation
- EVERY POST/PATCH endpoint must validate req.body with a zod schema before touching any data. Schema lives in server/src/schemas/.
- NEVER spread req.body directly into a DB update (mass assignment risk)
- NEVER use req.body values in Redis keys without sanitizing them
- ALWAYS strip HTML from user inputs that go near the DOM: use the existing stripScriptsAndEventHandlers() from lib/carousel.ts
- ALWAYS sanitize LLM-facing inputs: max length, strip injection patterns

### Authentication & Authorization
- EVERY route with a :jobId param MUST call requireJobOwnership() from routes/jobs/ownership.ts before doing anything
- NEVER return 403 for ownership failures — always return 404 (prevents enumeration of other users' resource IDs)
- NEVER skip authMiddleware on any route except explicitly public ones
- SSE endpoints MUST validate query-param tokens via verifySSEToken()

### LLM Output Safety
- ALWAYS pass LLM-generated HTML through stripScriptsAndEventHandlers() before rendering or storing
- NEVER pass raw user input directly into a prompt string — always wrap user content in XML delimiters: `<user_input>${sanitizedInput}</user_input>`
- NEVER use dangerouslySetInnerHTML with LLM output unless it has been sanitized first

### Puppeteer Safety
- ALWAYS ensure setJavaScriptEnabled(false) is set before page.setContent()
- ALWAYS use request interception to block script/xhr/fetch resource types
- NEVER accept HTML from the client to render in Puppeteer — only render server-generated HTML from the SSR bundle (`renderSlideHtml()` in `server/src/generated/slideRenderer.js`, called via `buildSlideHtml()` in `lib/carouselSsr.ts`; see §3 "Carousel Rendering Sub-Flow")

### Secrets & Config
- NEVER hardcode API keys, secrets, or connection strings
- ALWAYS use config.X from server/src/config.ts (never process.env.X directly)
- NEVER add a VITE_ prefix to sensitive values
- ALL new env vars must be added to .env.example with a description comment

### Rate Limiting
- ANY endpoint that calls an external API (Gemini, Tavily, Puppeteer) MUST have a rate limiter applied
- Rate limiters MUST use Redis store (never MemoryStore)
- New rate limiters go in server/src/middleware/rateLimit.ts

---

## 🔷 TYPESCRIPT RULES (Always enforced)

### Type Safety
- NEVER use `any` type — use `unknown` and add a type guard if needed
- NEVER use `as SomeType` cast without a null/type check before it
- ALWAYS define return types on all functions (no implicit returns)
- ALWAYS define prop types for every React component
- ALL API response types must have a corresponding TypeScript interface: genuinely cross-cutting
  client types go in client/src/types/ (job.ts, api.ts, collection.ts, etc.); server types are
  colocated in the module that owns them (e.g. AuthRequest in middleware/auth.ts, MemoryJob in
  routes/jobs/ownership.ts) — there is no server/src/types/ directory (removed 2026-08-10, was
  empty and unused; don't recreate it without an actual cross-cutting type that needs a home
  outside any single module)

### Null Safety
- ALWAYS handle null/undefined before accessing properties — use optional chaining (?.) AND provide a fallback (?? defaultValue)
- ALWAYS check array length before accessing array[0]
- ALWAYS wrap JSON.parse() in try/catch
- NEVER assume an API response field exists — validate it

### Async Safety
- EVERY async function must have try/catch
- NEVER use Promise.all when partial failure should be tolerated — use Promise.allSettled instead
- NEVER fire-and-forget an async call — always .catch() it or await it
- NEVER await inside a loop — use Promise.all/allSettled instead

### Imports
- NEVER import unused modules
- NEVER create circular imports
- ALWAYS use named imports over default imports where possible
- Path aliases (@/ for client, ~/ for server) must be used for imports more than 2 levels deep

---

## ⚛️ REACT RULES (Always enforced)

### Hooks
- NEVER call hooks conditionally, inside loops, or inside nested functions — always at the top level of the component
- ALWAYS include all dependencies in useEffect/useCallback/useMemo dependency arrays — no suppressions without a comment explaining why
- ALWAYS return a cleanup function from useEffect when:
  - Setting up event listeners
  - Creating timers (setInterval/setTimeout)
  - Opening SSE/WebSocket connections
  - Starting async operations (use AbortController)

### Components
- NEVER use index as key in .map() — always use a stable unique id
- NEVER use dangerouslySetInnerHTML without sanitization
- ALWAYS handle loading, error, AND empty states for every async data fetch — never leave a user staring at nothing
- Components over 300 lines must be split — no exceptions
- NEVER fetch data inside a component directly — use React Query hooks

### State Management
- Server state (API data) → React Query (never useState for this)
- Global UI state → Zustand store
- Local component state → useState
- NEVER duplicate server state in Zustand
- ALWAYS invalidate React Query cache after mutations

### Forms
- NEVER allow double-submission — disable submit button while pending
- ALWAYS show field-level validation errors inline
- ALWAYS preserve form state if user navigates away accidentally (use localStorage draft for the Create form)

---

## 🚂 EXPRESS/NODE RULES (Always enforced)

### Route Handlers
- EVERY route handler must be wrapped in try/catch with next(error)
- EVERY response send must be preceded by return to prevent double-response bugs: `return res.status(400).json({ error: '...' });`
- NEVER send a response after already sending one in the same handler
- ALL new routes must be added to the correct sub-module in routes/jobs/

### Error Handling
- NEVER expose err.message directly to the client in production — log it server-side, return a generic message to client
- ALWAYS use the global error handler (next(error)) for unexpected errors
- ALWAYS return consistent error shape: `{ error: string, code: string, retryable: boolean }`

### Database
- NEVER use raw SQL string concatenation — always use Drizzle ORM
- ALWAYS filter by userId AND resourceId on any user-scoped query
- ALWAYS add database indexes for columns used in WHERE/ORDER BY — new indexes go in schema.ts using Drizzle's index() helper
- NEVER SELECT * — always specify the columns you need
- ALWAYS use transactions for operations that modify multiple tables

### Performance
- NEVER make sequential API calls that can be parallelized — use Promise.allSettled()
- NEVER create a new Puppeteer browser instance per request — always use the existing browser pool from lib/carousel.ts
- ALWAYS evict completed jobs from memory after DB persist (10-minute TTL setTimeout pattern from contentWorker.ts)
- ALWAYS cache auth lookups (5-minute TTL from middleware/auth.ts)

---

## 🎨 CODE STYLE RULES (Always enforced)

### Comments
- ALWAYS add comments explaining WHY, not what: `// WHY: returning 404 instead of 403 prevents job ID enumeration`
- Use these comment tags:
  - `// WHY:` reason this approach was chosen
  - `// FLOW:` what happens next in the pipeline
  - `// SECURITY:` security decision being enforced
  - `// NOTE:` non-obvious behavior to be aware of
  - `// TODO:` known improvement, not urgent
- NEVER add obvious comments: `// increment counter — i++;`
- ALWAYS comment security-critical code blocks

### File Organization
- One component per file
- File naming: PascalCase for components, camelCase for everything else
- New page components go in client/src/pages/
- New shared components go in client/src/components/
- New hooks go in client/src/hooks/ (shared) or page folder (page-specific)
- New server utilities go in server/src/lib/
- New zod schemas go in server/src/schemas/
- New cross-cutting TypeScript types go in client/src/types/; server-side types are colocated in
  the module that owns them (no server/src/types/ — see Type Safety rules above)
- No file should exceed 400 lines — split before it gets there

### Formatting
- 2 space indentation
- Single quotes for strings
- Trailing commas in multi-line structures
- Semicolons always
- Max line length: 100 characters
- Run Prettier before committing

---

## 📦 NEW FEATURE CHECKLIST

When adding any new feature, automatically do ALL of these:

**Backend:**
- [ ] Zod schema created for all inputs
- [ ] Auth middleware applied
- [ ] Ownership check applied (if job-scoped)
- [ ] Rate limiter applied (if calls external API)
- [ ] Error handling with next(error)
- [ ] Returns applied before every res.json()
- [ ] New env vars added to config.ts + .env.example
- [ ] DB indexes added for new query columns

**Frontend:**
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Empty state handled
- [ ] No double-submission possible
- [ ] Props fully typed (no any)
- [ ] useEffect has cleanup
- [ ] React Query used for server state
- [ ] React Query cache invalidated after mutations

**Code Quality:**
- [ ] No TypeScript errors (tsc --noEmit passes)
- [ ] No ESLint errors
- [ ] No unused imports or variables
- [ ] Comments added to non-obvious logic
- [ ] File is under 400 lines

**Documentation:**
- [ ] CLAUDE.md updated if architecture changes
- [ ] CHANGELOG.md updated with what was added
- [ ] .env.example updated if new env vars added

---

## 🚫 NEVER DO THESE (Hard Stops)

- NEVER commit .env files
- NEVER store secrets in code
- NEVER use `any` type
- NEVER skip ownership checks on job routes
- NEVER render LLM HTML without sanitization
- NEVER run Puppeteer with JavaScript enabled
- NEVER accept client-supplied HTML in Puppeteer
- NEVER use in-memory rate limiters
- NEVER make a Puppeteer browser per request
- NEVER use sequential awaits when parallel is possible
- NEVER leave async functions without error handling
- NEVER create a file over 400 lines without splitting it
- NEVER use console.log in production code (use console.error/warn)
- NEVER duplicate server state in Zustand
- NEVER use array index as React key

---

# ContentAgent — CLAUDE.md

> **Read this before every editing session.** Single source of truth for architecture, conventions, active decisions, and gotchas.
>
> **Companion documents (also in repo root):**
> - `ARCHITECTURE.md` — verified current-state data flows; more detail than this file's diagrams, and the first place to check if this file's architecture description ever seems to disagree with the actual code
> - `CHANGELOG.md` — dated history; **add an entry here for every change you make**, however small
> - `UI_UX_DOCUMENTATION.md` — full design-system reference + brand differentiation analysis
>
> There is no `REVIEW_FINDINGS.md` in this repo (retired 2026-08-10 — every audit in that day's
> 18-audit run independently confirmed it didn't exist despite being referenced here as a live
> document; open work is now tracked per-audit-run, e.g. `AUDIT_FINDINGS_2026-08-10.md` +
> `prompts/FIX_AUDIT_FINDINGS.md`'s checkboxes, with fixes recorded directly in `CHANGELOG.md`).
> Don't add cross-references to it unless the file is recreated in the same change — same
> discipline already applied to `docs/`/`ROADMAP.md` on 2026-07-28.

---

## 1. Project Overview

ContentAgent is an **AI-powered social media content generation SaaS**. Given a topic, platform, tone, and target audience it orchestrates a 5-agent LLM pipeline (Orchestrator → Researcher → Writer → Formatter → Critic) to produce platform-optimized content: Instagram carousels (9 visual themes), LinkedIn posts, Twitter/X threads, Instagram captions, and video scripts.

**Target users:** Solo creators, marketers, and small teams who need high-quality, brand-consistent social content at volume.

**Development stage:** Post-Phase-4 — all planned features shipped and security-audited. No formal roadmap document is tracked; see `CHANGELOG.md` for shipped work. Open items live in the most recent audit-run file (e.g. `AUDIT_FINDINGS_2026-08-10.md`) and its companion fix-tracking prompt, not a standing `REVIEW_FINDINGS.md` (retired 2026-08-10 — see §10).

**Core value props:**
- Brand voice learning (persist tone, vocabulary, phrases)
- Multi-step research → write → critique loop with quality scoring
- Visual carousel rendering (HTML → Puppeteer → 1080×1080 PNG)
- Content multiplication (reuse one research session across 5 platforms)
- Social OAuth posting (LinkedIn, Twitter)
- Real-time SSE progress tracking

---

## 2. Tech Stack

### Frontend (`/client`)
| Layer | Technology |
|---|---|
| Framework | React 19.2.6 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS 4.3 (CSS-var-based, no `tailwind.config.js`); 6-theme UI system via `[data-theme]` custom properties — see §13 |
| State | Zustand 5 (real-time SSE state), React Query 5 (server data) |
| Routing | React Router DOM 6 |
| Auth | Clerk (`@clerk/clerk-react`) |
| HTTP | Axios with Clerk JWT interceptor (`api.ts`) |
| Export | jsPDF 4 + JSZip |
| Icons | Lucide React |

### Backend (`/server`)
| Layer | Technology |
|---|---|
| Runtime | Node.js ESM, TypeScript |
| Framework | Express 5.2.1 |
| ORM | Drizzle ORM |
| Database | Neon Serverless PostgreSQL |
| Queue | BullMQ 5 + Upstash Redis (ioredis) |
| Auth | Clerk (`@clerk/express`) JWT middleware |
| Rendering | Puppeteer 25 (carousel PNG generation, browser pool: min 2 / max 8) |

### AI / LLM
| Provider | Used For |
|---|---|
| Google Gemini 2.0 Flash (`@google/generative-ai`) | Primary LLM for all 5 agents |
| Groq (`groq-sdk`) | Fallback LLM when Gemini fails after 3 retries |
| Tavily REST API | Web research (researcher agent, hashtag research) |
| OpenAI REST (DALL-E 3, gpt-image-1) | Image generation (primary) |
| Together AI REST (FLUX.1-schnell-Free) | Image generation fallback |
| Pollinations.AI REST (no key required) | Image generation final fallback |

---

## 3. Architecture Overview

```
User submits Create form
        │
        ▼
POST /api/jobs/create  [auth + sanitizeGenerationInput + authJobRateLimit]
        │
        ├─── Upstash Redis available? ──YES──▶ addJobToQueue() → BullMQ queue
        │                                               │
        │                                       contentWorker.ts picks up job
        │
        └─── Redis unavailable? ────────────▶ runPipelineDirect() (inline, max 3 concurrent)

Both paths run the same agent pipeline:
        │
        ▼
  Orchestrator  →  task plan + 3 Tavily search queries + platform rules
        │
        ▼
  Researcher  →  3 Tavily searches → keyFacts, trendingAngles, hashtag seeds
        │
        ▼
  Writer  →  platform-specific content (8 slides / thread / caption / script)
        │
        ▼
  Formatter  →  apply platform rules (hashtag placement, line breaks, emoji density)
        │
        ▼
  Critic  →  score 0-100 across 5 dimensions
             if totalScore < 70 → feedback → re-run Writer (max 2 retries)
        │
        ▼
  PerformancePredictor  →  estimated reach, saves, shares
        │
        ▼
  persistJobToDB()  →  Neon DB (contentJobs + contentOutputs + agentLogs)
  jobsMemory evicted after 10 min (job safely in DB)
        │
  SSE events emitted throughout via sseManager.sendEvent() at each stage
        │
        ▼
Frontend: useJobData hook  →  SSE subscription + fallback polling
Result.tsx renders ContentColumn → platform-specific renderer
```

### Carousel Rendering Sub-Flow

> **REWRITTEN 2026-07 — this replaces the old Gemini-generates-HTML-per-theme flow.**
> The previous design asked Gemini to invent slide HTML per theme on every render, so the
> downloaded PNG frequently didn't match what the user saw on screen, and varied run to run
> (it could even fail over to Groq mid-export). `render-slides` and its SSE stream were
> removed entirely — the export route below is the only rendering path left.

```
User previews carousel live in IGSlide.tsx / SlideVisual.tsx (plain React, no server round-trip)
        │
User clicks Export → POST /api/jobs/:id/export/carousel-png  [exportRateLimit, ownership check]
        │
carouselSsr.ts: buildSlideHtml(slide, ...)
   → renderSlideHtml() from server/src/generated/slideRenderer.js
     (an esbuild bundle of client/src/ssr/renderSlideHtml.tsx — the SAME React
      component IGSlide preview uses, prebuilt via `npm run build:ssr`)
        │
stripScriptsAndEventHandlers()  →  defense-in-depth sanitize (React already escapes text;
                                     inline SVG built from hex-validated palette values)
        │
renderSlideWithCache()  →  lib/carousel.ts Puppeteer pool: acquire browser
                            → setJavaScriptEnabled(false) → request interception
                              (blocks script/xhr/fetch/websocket)
                            → screenshot at 1080×1350 → base64 PNG
                              (cached 24h, keyed by content-hash + theme + viewport)
        │
All slides render in parallel (Promise.allSettled) → zipped with jszip → downloaded
```

**Key files:**
- `client/src/ssr/renderSlideHtml.tsx` — the React slide component, source of truth for both the on-screen preview and the exported PNG
- `client/scripts/build-ssr.mjs` — esbuild bundles the above into `server/src/generated/slideRenderer.js` (run via `npm run build:ssr`, part of `server`'s `npm run build`)
- `server/src/lib/carousel.ts` (331 lines) — Puppeteer browser pool + PNG cache + `stripScriptsAndEventHandlers()` only; no longer generates HTML
- `server/src/lib/carouselSsr.ts` — bridges the SSR bundle to the Puppeteer renderer above
- `server/src/routes/jobs/render.ts` — the single remaining route: `POST /:jobId/export/carousel-png`

**Live preview is responsive; export is not (deliberately).** `IGCarouselPreview.tsx`'s design
width/height (420×525) used to be hardcoded pixel constants passed straight through to
`IGSlide`/`TemplateLayout`, overflowing horizontally below ~452px viewports (fixed 2026-08-10).
The preview now observes its container via `ResizeObserver` and scales the rendered frame down
(never up, 4:5 ratio preserved) to fit narrow viewports. The SSR export path
(`ssr/renderSlideHtml.tsx`'s own `SLIDE_WIDTH`/`SLIDE_HEIGHT`) is intentionally untouched by this
— PNG export always renders at the fixed 1080×1350 design size regardless of what the live
preview is currently scaled to.

---

## 4. Folder Structure (Current)

```
e:/AGContentAgent/
├── README.md
├── CLAUDE.md               ← this file
├── CHANGELOG.md            ← history of all fixes and features
├── LICENSE                 ← proprietary / all-rights-reserved (see §12)
├── render.yaml             ← Render Blueprint for server deployment (see §12)
├── docker-compose.yml      ← LOCAL DEV ONLY — Postgres/Redis stand-ins for Neon/Upstash (see §12)
├── .gitignore
│
│ (no docs/ directory today — see §10; CHANGELOG.md records a docs/archive/ folder being
│  created 2026-07-28, but it and its two archived audit files are absent from the repo now)
│
├── client/                 ← React + Vite SPA (port 5173)
│   ├── .env.example        ← client-side env vars (VITE_-prefixed only, see §12)
│   ├── vercel.json         ← SPA rewrite rule for Vercel deployment (see §12)
│   └── src/
│       ├── App.tsx                     ← Router + ClerkProvider + QueryClientProvider
│       ├── api.ts                      ← All Axios API functions; Clerk JWT interceptor
│       ├── store.ts                    ← Zustand: currentJob (SSE state), ideatedIdeas/savedIdeas,
│       │                                 themeName. No `userProfile` slice (removed 2026-08-10 —
│       │                                 was a second, staleness-prone copy of the same profile
│       │                                 React Query already caches under `['dashboard','profile']`;
│       │                                 every consumer now reads that query directly instead)
│       ├── index.css                   ← Tailwind 4 + Midnight Aurora CSS variables
│       ├── main.tsx                    ← React 19 entry point
│       │
│       ├── components/
│       │   ├── AuthLayout.tsx          ← Protected route wrapper + nav sidebar
│       │   ├── BrandIcons.tsx          ← SVG brand icons
│       │   ├── OnboardingModal.tsx     ← First-run onboarding flow
│       │   ├── ThemeSwitcher.tsx       ← Shared 6-theme picker (sidebar + landing nav) — see §13
│       │   └── ToolsDropdown.tsx       ← Nav tools dropdown
│       │
│       ├── lib/
│       │   ├── colorSystem.ts          ← Accent color derivation for carousel previews + palette→ColorSystem
│       │   │                             mapping (`deriveColorSystemFromPalette`) + `getContrastColor`/
│       │   │                             `getContrastRgba` (WCAG-luminance text contrast) — see §11a
│       │   ├── templateSystem.ts       ← Carousel template catalog public surface: `TemplateId` union,
│       │   │                             type defs, `getTemplate`/`getPalette`/`getDefaultPalette`/
│       │   │                             `isTemplateId` (110 lines — see §11a). The actual `TEMPLATES`
│       │   │                             data record was split out (was 722 lines combined) into
│       │   │                             `templateData.ts` (assembles the record) + `templates/*.ts`
│       │   │                             (one file per template, ~63 lines each) below.
│       │   ├── templateData.ts         ← Assembles `TEMPLATES: Record<TemplateId, CarouselTemplate>`
│       │   │                             from `templates/*.ts`; re-exported by `templateSystem.ts`
│       │   ├── templates/              ← One file per carousel template (modernMinimal.ts,
│       │   │                             boldStatement.ts, editorialClassic.ts, techModern.ts,
│       │   │                             vibrantPop.ts, luxuryDark.ts, cleanCorporate.ts,
│       │   │                             creativeAbstract.ts, storyteller.ts, socialMedia.ts) —
│       │   │                             each exports one `CarouselTemplate` object; see §11a
│       │   └── carouselStorageKeys.ts  ← Shared `CAROUSEL_TEMPLATE_KEY`/`CAROUSEL_PALETTE_KEY` localStorage
│       │                                 key names (Create.tsx and Result.tsx both read/write these)
│       │
│       └── pages/
│           ├── Landing.tsx             ← Public marketing page (thin orchestrator, no auth required)
│           ├── Landing/                ← Section components for the marketing page
│           │   ├── Nav.tsx
│           │   ├── MobileMenu.tsx
│           │   ├── Hero.tsx
│           │   ├── Features.tsx
│           │   ├── HowItWorks.tsx
│           │   ├── QualityDemo.tsx
│           │   ├── LiveDemo.tsx
│           │   ├── CtaFooter.tsx
│           │   ├── SectionDivider.tsx
│           │   ├── LandingStyles.tsx
│           │   └── navLinks.ts
│           ├── Dashboard.tsx           ← Job overview, stats, quick actions
│           ├── Create.tsx              ← Single-screen job creation form (thin orchestrator); also owns the
│           │                              batch-mode toggle (single ↔ multi-topic) added 2026-08-04
│           ├── BatchResult.tsx         ← Landing page for a batch submission (polls each job, shows per-item
│           │                              status/score) — reached only via router state from Create's batch
│           │                              mode, not a standalone nav destination
│           ├── Create/                 ← Sub-components for the Create form
│           │   ├── AdvancedOptions.tsx    ← Carousel template + color-palette picker (renders CompactTemplatePicker) — see §11a
│           │   ├── CompactTemplatePicker.tsx ← Pill-chip template/palette picker shared by Create and the Result page's
│           │   │                                CarouselTemplateSwitcher — see §11a
│           │   ├── PlatformSelector.tsx   ← Full card grid (`PlatformSelector`) + compact chosen-platform row (`PlatformSummary`)
│           │   ├── platforms.ts           ← Platform metadata + `findPlatform()` (extracted from PlatformSelector.tsx to keep it component-only)
│           │   ├── ToneSelector.tsx       ← Deselectable pills (click selected pill again to clear)
│           │   ├── SectionLabel.tsx       ← Shared label row, replaces duplicated `stepLabelStyle` object
│           │   ├── TopicSuggestions.tsx   ← Recent-topics dropdown with keyboard nav (arrows/Enter/Escape)
│           │   ├── useDraft.ts            ← sessionStorage draft (topic/platform/tone/audience) surviving a trip to /brand and back; cleared on submit
│           │   ├── useBatchCreate.ts      ← Batch-mode state (rows/tone/audience/loading/error) + handleBatchSubmit — extracted from Create.tsx to stay under the 400-line cap
│           │   ├── useCarouselTemplateSelection.ts ← templateId/paletteId state + localStorage sync — extracted from Create.tsx alongside useBatchCreate.ts
│           │   ├── errorMessages.ts       ← Maps server `{ error, code, retryable, retryAfterMs }` to actionable copy
│           │   ├── BatchTopicList.tsx     ← Up to 7 topic+platform rows, submitted together via POST /jobs/batch
│           │   └── TopicStep.tsx          ← Page body (platform summary/grid, topic, tone, brand-voice banner, audience, advanced, generate)
│           ├── Brand.tsx               ← Brand settings page (thin orchestrator)
│           ├── Brand/                  ← Sub-components for Brand settings
│           │   ├── IdentityCard.tsx
│           │   ├── VoiceCard.tsx
│           │   ├── ContentDnaCard.tsx
│           │   ├── PublishingConnectionsCard.tsx
│           │   ├── DangerZoneCard.tsx
│           │   └── DeleteAccountModal.tsx
│           ├── History.tsx             ← Redirects to Library (merged into Library as content tab)
│           ├── Library.tsx             ← Saved content library
│           ├── Calendar.tsx            ← Content calendar view
│           ├── Ideate.tsx              ← AI topic brainstorming
│           ├── Repurpose.tsx           ← URL → content (skips research phase)
│           ├── Repurpose/
│           │   └── FeedMonitorPanel.tsx   ← RSS/Atom feed subscription manager — React Query-backed CRUD + on-demand check, see §5's Feed Monitors row
│           ├── Competitor.tsx          ← @handle competitor analysis
│           └── Result.tsx              ← Main result viewer (thin orchestrator)
│               └── Result/
│                   ├── Result.css
│                   ├── constants.ts
│                   ├── hooks/
│                   │   ├── useJobData.ts       ← SSE + polling + job fetch
│                   │   ├── useExport.ts        ← PDF + TXT download
│                   │   ├── useMultiplier.ts    ← Content multiplication mutation
│                   │   └── useSocial.ts        ← OAuth redirect + post
│                   └── components/
│                       ├── ActionDrawer.tsx        ← Consolidated drawer: feedback/post/hashtags
│                       ├── ContentColumn.tsx       ← Dispatches to platform renderer by job.platform
│                       ├── ContentMultiplier.tsx   ← "Adapt to platform" UI
│                       ├── ExportModal.tsx         ← Export options dialog
│                       ├── FailedView.tsx          ← Error state with retry
│                       ├── InsightsSidebar.tsx     ← Research facts, angles, sources (collapsible)
│                       ├── LoadingView.tsx         ← Real-time SSE progress display
│                       ├── ResultDrawer.tsx        ← Generic slide-out drawer shell
│                       ├── ResultHeader.tsx        ← Job title, export, quality score
│                       ├── StatusDisplay.tsx       ← Quality score + stage badge
│                       ├── content/
│                       │   ├── CarouselContent.tsx     ← Theme picker + slide list + render trigger
│                       │   ├── InstagramContent.tsx
│                       │   ├── LinkedInContent.tsx
│                       │   ├── TwitterContent.tsx
│                       │   ├── VideoScriptContent.tsx
│                       │   └── carousel/
│                       │       ├── EditSlideModal.tsx
│                       │       ├── IGCarouselPreview.tsx
│                       │       ├── IGSlide.tsx         ← Dispatcher: legacy 9-theme layouts (below) OR, when a
│                       │       │                          templateId is set, one of the 10 igslide/templates/*
│                       │       │                          components via the module-scoped registry.ts map — see §11a
│                       │       ├── CarouselTemplateSwitcher.tsx ← Post-generation template switcher (Result page)
│                       │       ├── SlideVisual.tsx     ← Legacy theme CSS applied to slide data
│                       │       └── igslide/            ← IGSlide.tsx's split-out theme/section pieces (was 1157 lines pre-split)
│                       │           ├── constants.ts
│                       │           ├── contentPieces.tsx
│                       │           ├── decorativePrimitives.tsx
│                       │           ├── presets.ts
│                       │           ├── slideResolvers.ts
│                       │           ├── types.ts          ← SlideData/SlidePoint + `stablePointKeys()` (stable React
│                       │           │                        keys for point lists, not array index)
│                       │           ├── fontStack.ts       ← `resolveTemplateFont()` — single font-family resolver
│                       │           │                        shared by all 10 template components
│                       │           ├── layouts/        ← CTALayout, ContentLayout, CoverLayout, FeaturesLayout,
│                       │           │                      HowToLayout, ProblemLayout, QuoteLayout, SolutionLayout,
│                       │           │                      StatLayout (legacy 9-theme layouts), plus TemplateLayout.tsx
│                       │           │                      (shared sizing/clipping wrapper for the new template system)
│                       │           └── templates/      ← 10 new-template-system components (ModernMinimalTemplate,
│                       │                                  BoldStatementTemplate, EditorialClassicTemplate, TechModernTemplate,
│                       │                                  VibrantPopTemplate, LuxuryDarkTemplate, CleanCorporateTemplate,
│                       │                                  CreativeAbstractTemplate, StorytellerTemplate, SocialMediaTemplate) —
│                       │                                  each a `forwardRef<HTMLDivElement, CarouselTemplateProps>` (shared
│                       │                                  prop type in templateProps.ts); registry.ts's `TEMPLATE_COMPONENTS`
│                       │                                  is the single id→component map both IGSlide.tsx and any future
│                       │                                  consumer should import — see §11a
│                       └── panels/
│                           ├── FeedbackPanel.tsx
│                           ├── HashtagPanel.tsx
│                           └── PostPanel.tsx
│
└── server/                 ← Express API + BullMQ worker (port 3001)
    ├── .env.example        ← server-side env vars, schema enforced by src/config.ts (see §12)
    ├── Dockerfile          ← LOCAL DEV ONLY, used by docker-compose.yml (see §12)
    └── src/
        ├── index.ts                    ← Bootstrap: CORS, middleware, route mounts, worker start
        │
        ├── routes/
        │   ├── jobs/                   ← Modular job routes
        │   │   ├── index.ts            ← Auth middleware + sub-router mounting
        │   │   ├── create.ts           ← POST /create, POST /batch + pipeline fallback
        │   │   ├── stream.ts           ← GET /:id/stream (SSE) + POST /:id/stream-token
        │   │   ├── render.ts           ← POST /:id/export/carousel-png (SSR-based ZIP export)
        │   │   ├── insights.ts         ← GET /audience-defaults — learned per-platform targetAudience
        │   │   │                          default from the user's last 40 completed jobs (most-frequent,
        │   │   │                          not most-recent — see file's own WHY); Create.tsx's fallback when
        │   │   │                          no learned default exists yet is a static AUDIENCE_DEFAULTS map
        │   │   ├── list.ts             ← GET / — paginated/searchable/filterable/sortable job list
        │   │   ├── versions.ts         ← GET /:id/versions, POST /:id/versions/:versionId/restore (Library version history)
        │   │   ├── manage.ts           ← GET /:id, DELETE, PATCH /:id/tag, PATCH /:id/carousel-template,
        │   │   │                          PATCH /:id/content (312 lines — split 2026-08-10, was 473;
        │   │   │                          regenerate/multiply extracted to regenerate.ts below, this file's
        │   │   │                          second time regrowing past the 400-line cap and being re-split)
        │   │   ├── regenerate.ts       ← POST /:id/regenerate (snapshots a version first), POST /:id/multiply
        │   │   │                          — extracted from manage.ts 2026-08-10, same sub-router pattern as
        │   │   │                          list.ts/versions.ts's earlier extractions from the same file
        │   │   └── ownership.ts        ← requireJobOwnership(); jobsMemory Map; requireDbUser() (shared
        │   │                              db+UUID-userId guard for non-:jobId user-scoped routes — used
        │   │                              by scheduledPosts.ts/collections.ts/feedMonitors.ts, added
        │   │                              2026-08-10 to stop the three files' near-identical guards from
        │   │                              diverging, which had caused feedMonitors.ts to hang with zero
        │   │                              response on a DB outage instead of a real 503)
        │   ├── content.ts              ← thin router mounting content/* below
        │   ├── content/                ← Modular content-tool routes (split from a single content.ts file)
        │   │   ├── ideate.ts           ← POST /ideate
        │   │   ├── hashtags.ts         ← POST /hashtags
        │   │   ├── repurpose.ts        ← POST /repurpose (+ shared fetchAndExtractArticle/createJobsForPlatforms, reused by feedMonitorWorker.ts)
        │   │   ├── competitor.ts       ← POST /competitor
        │   │   └── shared.ts           ← readOutputs/sanitizeContentDeep/parseAIJson — canonical copies imported by jobs/manage.ts and jobs/regenerate.ts too
        │   ├── users.ts                ← thin router mounting users/* below
        │   ├── users/                  ← Modular user-profile routes (split from a single users.ts file)
        │   │   ├── brandVoice.ts       ← POST /brand-voice, POST /analyze-voice (Content DNA)
        │   │   ├── me.ts               ← GET /me
        │   │   ├── onboarding.ts       ← GET/POST /onboarding
        │   │   ├── account.ts          ← DELETE /me (account deletion)
        │   │   └── profileStore.ts     ← getUserProfile/saveUserProfile cache-aside helpers
        │   ├── social.ts               ← OAuth + post (LinkedIn, Twitter)
        │   ├── scheduledPosts.ts       ← GET/POST /api/scheduled-posts, DELETE /:jobId (Calendar server-sync)
        │   ├── collections.ts          ← GET/POST /api/collections, DELETE /:id, GET/POST/DELETE /:id/jobs[/:jobId] (Library folders)
        │   ├── feedMonitors.ts         ← GET/POST /api/feed-monitors, PATCH/DELETE /:id, POST /:id/check (RSS auto-repurpose subscriptions — see §5)
        │   ├── demo.ts                 ← Public demo (no auth, rate-limited)
        │   └── imageGen.ts             ← Multi-provider image gen with fallback chain
        │
        ├── agents/
        │   ├── orchestrator.ts
        │   ├── researcher.ts
        │   ├── writer.ts               ← Most complex; contains per-platform system prompts
        │   ├── formatter.ts
        │   ├── critic.ts               ← Scores hookStrength, platformCompliance, brandVoiceMatch, valueDelivery, ctaClarity (20 pts each)
        │   └── performancePredictor.ts
        │
        ├── lib/
        │   ├── ai.ts                   ← Gemini wrapper + Groq fallback + retry logic
        │   ├── carousel.ts             ← Puppeteer browser pool + PNG cache + stripScriptsAndEventHandlers() (331 lines — rewritten 2026-07 to drop HTML generation; grew from 247 during later Render/Puppeteer Chrome-detection fixes)
        │   ├── carouselSsr.ts          ← Bridges the prebuilt React SSR bundle (server/src/generated/slideRenderer.js) to the Puppeteer renderer in carousel.ts
        │   ├── logger.ts               ← Structured JSON logger (info/warn/error) — use instead of console.log per code style rules
        │   ├── persistJob.ts           ← Insert agent outputs to contentOutputs
        │   ├── queue.ts                ← BullMQ Queue + createRedisConnection()
        │   ├── publishQueue.ts         ← BullMQ 'scheduled-publish' delayed queue (Calendar auto-publish)
        │   ├── socialPublish.ts        ← Shared LinkedIn/Twitter posting logic — used by both routes/social.ts's POST /post and workers/publishWorker.ts
        │   ├── redisClient.ts          ← Shared Redis client
        │   ├── sse.ts                  ← SSEManager: broadcast events to connected clients
        │   ├── ssrfGuard.ts            ← assertUrlIsPublic()/isPrivateOrReservedIp() — DNS-rebinding-resistant private-IP guard shared by repurpose.ts's article fetch and feedMonitorWorker.ts's RSS fetch
        │   ├── sanitizeSearchText.ts   ← Prompt-injection neutralization for untrusted Tavily results — shared by researcher.ts, competitor.ts, ideate.ts
        │   └── tokenEncryption.ts      ← AES-256-GCM for social OAuth tokens
        │
        ├── middleware/
        │   ├── auth.ts                 ← Clerk JWT verify; caches Clerk→dbUserId mapping (5 min TTL)
        │   └── rateLimit.ts            ← Rate limiters (Redis store) + sanitizeGenerationInput
        │
        ├── db/
        │   ├── index.ts
        │   └── schema.ts               ← 12 tables: users, contentJobs, contentOutputs, agentLogs, socialTokens, userOnboarding, scheduledPosts, competitorAnalyses, collections, collectionJobs, jobOutputVersions, feedMonitors
        │       (migrations tracked in server/drizzle/ via drizzle-kit — see `npm run db:generate` / `db:migrate`)
        │
        ├── lib/
        │   └── pipeline.ts             ← shared 5-stage pipeline (runContentPipeline/runAndPersistPipeline) — the single implementation both create.ts and contentWorker.ts call
        │
        ├── workers/
        │   ├── contentWorker.ts        ← BullMQ Worker; calls lib/pipeline.ts (same pipeline as the direct-mode fallback in create.ts)
        │   ├── publishWorker.ts        ← BullMQ Worker for the 'scheduled-publish' queue; posts to LinkedIn/Twitter at a scheduled_posts row's publish time
        │   └── feedMonitorWorker.ts    ← node-cron worker (every 30 min) polling active feed_monitors rows; checkFeedMonitor() also called on-demand by POST /api/feed-monitors/:id/check
        │
        └── scripts/
            ├── demo_flow.ts            ← Dev script
            └── profiling/              ← Latency measurement scripts (dev only)

```

> **`docs/` and `ROADMAP.md` do not exist in this repo, and nothing should reference them.**
> The 2026-07-28 review (see `REVIEW_FINDINGS.md` §1.9) found stale cross-references to both
> in this file, `README.md`, and `CONTRIBUTING.md` — all three have since been corrected to
> stop pointing at paths that don't exist, rather than inventing placeholder content for them.
> Root-level docs that DO exist today: `CLAUDE.md` (this file), `README.md`, `CHANGELOG.md`,
> `CONTRIBUTING.md`, `UI_UX_DOCUMENTATION.md`, `ARCHITECTURE.md`. (`REVIEW_FINDINGS.md` was
> retired 2026-08-10 — see §10.)
> If a real roadmap or docs/ tree gets introduced later, update every cross-reference in the
> same change — don't let this drift happen again.

---

## 5. Key Features (Stable)

| Feature | Key Files | Notes |
|---|---|---|
| 5-agent content pipeline | `agents/`, `workers/contentWorker.ts`, `routes/jobs/create.ts` | Gemini primary, Groq fallback |
| 5 platforms | `agents/writer.ts`, `agents/formatter.ts` | carousel, linkedin, twitter, instagram, video |
| 9 carousel themes | `lib/carousel.ts`, `CarouselContent.tsx` | Puppeteer renders 1080×1080 PNG |
| Brand voice | `routes/users.ts`, `agents/writer.ts` | Injected into writer + critic prompts |
| Real-time SSE | `lib/sse.ts`, `LoadingView.tsx`, `hooks/useJobData.ts` | Fallback to polling on reconnect |
| Critic loop | `agents/critic.ts` | Score ≥ 70 to approve; max 2 retries |
| Content multiplication | `routes/jobs/regenerate.ts` | Reuses existing research report |
| Social OAuth | `routes/social.ts`, `lib/tokenEncryption.ts` | Tokens AES-256-GCM encrypted at rest |
| Public demo | `routes/demo.ts` | No auth; 3/hour per IP; truncated output |
| Feed monitors (RSS auto-repurpose) | `routes/feedMonitors.ts`, `workers/feedMonitorWorker.ts`, `client/src/pages/Repurpose/FeedMonitorPanel.tsx` | Subscribe an RSS/Atom feed URL; a node-cron worker polls it every 30 min (or on-demand via "Check now") and auto-creates a Repurpose job for the newest unseen item, reusing `repurpose.ts`'s article-extraction + SSRF-guarded fetch. Gated by `contentRateLimit` on the `/check` route since it triggers the same 5-agent pipeline as Repurpose. |

---

## 6. Development Commands

```bash
# Install
cd client && npm install
cd server && npm install

# Run (two terminals)
cd server && npm run dev   # Express on :3001
cd client && npm run dev   # Vite on :5173

# Build
cd client && npm run build
cd server && npm run build

# Lint
cd client && npm run lint

# Seed DB
cd server && npm run seed
```

**Minimum env vars to run:**
`DATABASE_URL`, `GEMINI_API_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL=http://localhost:3001`

Env vars are split by side — see `client/.env.example` and `server/.env.example` for the full
annotated lists (the schema `server/src/config.ts` validates against is the authoritative source
of truth if the two ever drift). See §12 for the production deployment path.

---

## 7. Coding Conventions

### Every `:jobId` route must call `requireJobOwnership`
```ts
router.get('/:jobId', async (req: AuthRequest, res) => {
  const ownership = await requireJobOwnership(req.params.jobId, req.dbUserId!, res);
  if (!ownership) return; // 404 already sent
  // ... use ownership object
});
```

### Every generation route must apply input sanitization
```ts
router.post('/create', auth, sanitizeGenerationInput, authJobRateLimit, async (req, res) => { ... });
```

### LLM-generated HTML must be sanitized before Puppeteer
```ts
const safe = stripScriptsAndEventHandlers(aiGeneratedHtml);
// then setJavaScriptEnabled(false) in the Puppeteer page
```

### Agent output types — query for `final` only
```ts
const finalOutput = job.outputs.find(o => o.outputType === 'final');
// do NOT render 'draft' or 'research' outputs to users
```

### New feature checklist
1. Server route in `server/src/routes/`
2. Mount in `server/src/index.ts`
3. Auth middleware on all protected endpoints
4. `sanitizeGenerationInput` on all LLM-facing endpoints
5. Client page in `client/src/pages/`
6. Route in `client/src/App.tsx`
7. API function in `client/src/api.ts`

---

## 8. Architecture Decisions

| Decision | Why |
|---|---|
| `setJavaScriptEnabled(false)` in Puppeteer | AI-generated HTML could contain injected scripts. Slides are CSS-only. Defense-in-depth with `stripScriptsAndEventHandlers`. |
| UUID job IDs | Sequential IDs enable IDOR — attackers enumerate other users' jobs trivially. |
| SSE `?token=` query param | `EventSource` cannot send custom headers. Short-lived tokens from `/stream-token` limit exposure. |
| Rate limiters use Redis store | In-process `MemoryStore` resets on restart and isn't shared across instances. |
| 404 on ownership mismatch (not 403) | 403 confirms the resource exists — IDOR information leakage. |
| 5-min auth cache | Avoids a Neon DB round-trip on every request while keeping user data reasonably fresh. |
| Browser pool (min 2, max 8) | Chromium launch costs ~800ms + ~150MB. Pre-warm 2; cap at 8 to prevent OOM. |
| Template cache (24h TTL) | Gemini template gen costs ~$0.002 and takes 3-8s. Themes rarely change between requests. |
| BullMQ concurrency 2 | Cost control — each job burns Gemini + Tavily quota. Two concurrent is the deliberate cap. |
| Social tokens AES-256-GCM | OAuth tokens grant write access to social accounts — plaintext storage is unacceptable. |
| Single brand profile per user (no multi-workspace) | Intentional scope decision (2026-08-04) — `brandName`/`brandVoice`/`industry`/`contentDna` live directly as columns on `users`, no separate brand/workspace table. Do not build multi-brand/agency support unless this is explicitly revisited. |

---

## 9. Known Limitations

- Puppeteer pool max 8 — renders beyond this queue, timeout at 60s
- BullMQ concurrency 2 — at most 2 jobs run simultaneously
- **Worker-crash recovery is configured but not yet live-verified (as of 2026-08-10).**
  `lib/queue.ts`'s `content-generation` queue sets `attempts: 3` with exponential backoff
  (1s base delay); `workers/contentWorker.ts`'s `Worker` leaves BullMQ's `stalledInterval`/
  `maxStalledCount` at library defaults (30s / 1) — on paper this means a worker process killed
  mid-job should have that job detected as stalled within ~30s and automatically requeued onto
  another worker, up to 3 total attempts before landing in `failed`. **This has not been
  confirmed against a real killed process** — `production-readiness-checklist.md` names this the
  single highest-value live test to run before the next deploy: on staging, `kill -9` the worker
  process mid-pipeline-run and confirm the job requeues cleanly or fails visibly rather than
  silently vanishing. Update this entry with the actual outcome once run.
- Demo: 3 generations/hour per IP
- Writer enforces 45-60 word limit per carousel slide body; critic does not re-check this
- Content Multiplication reuses existing research — stale research propagates
- Neon cold starts: first DB call after idle stalls 1-2s
- On Railway/Render/Fly.io: set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` + configure `executablePath`
- `TOKEN_ENCRYPTION_KEY` must be exactly 32 bytes — generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  **Required, not optional** (fixed 2026-08-10 — `config.ts` previously allowed it to be unset, in
  which case `routes/social.ts` silently stored OAuth tokens in plaintext instead of failing; the
  server now refuses to boot without it, matching `OAUTH_STATE_SECRET`'s existing hard-fail pattern).
- SSE does not replay missed events on reconnect — client falls back to polling `GET /api/jobs/:id`.
  On an SSE connection error, the client now re-fetches a fresh stream-token and reopens the
  connection itself (`useJobData.ts`'s `connectToStream(..., onError)`) rather than relying solely
  on the browser's native retry, which kept reusing an eventually-expired token forever.
- **`POST /api/social/schedule` is still reminder-only** — saves the intent to an in-memory `Map`
  (`server/src/routes/social.ts`); there is no delivery worker wired up for this specific entry
  point. The UI (`PostPanel.tsx`) discloses this explicitly rather than implying auto-publishing.
  This is a deliberately separate, narrower concept from the Calendar's real auto-publish below —
  see `scheduledPosts.ts`'s WHY comment for why the two weren't unified in the same change.
- **Calendar's day-schedule now supports real auto-publish (as of 2026-08-05)** — scheduling lives
  in the `scheduled_posts` table (`server/src/db/schema.ts`, migration `0004_real_exodus.sql`,
  extended by `0011_great_prima.sql` with `publishPlatform`/`publishStatus`/`publishedAt`/`postUrl`/
  `publishError`) behind `server/src/routes/scheduledPosts.ts`, and `Calendar/calendarHelpers.ts`'s
  `useSchedule()` hook reads/writes it via React Query. Placing a job on a date with no publish
  platform stays exactly the old planning-only behavior. Choosing a platform (via `DayDetailPanel`'s
  "Auto-publish…" control, only shown when the user has a connected LinkedIn/Twitter account) queues
  a BullMQ delayed job (`lib/publishQueue.ts`, queue `scheduled-publish`) that fires at a fixed daily
  hour (9am — `PUBLISH_HOUR_UTC` in `scheduledPosts.ts`; no time-of-day picker yet) **in the
  scheduling user's own timezone**, not always UTC (fixed 2026-08-10 — `calendarHelpers.ts`'s
  `useSchedule()` now sends `timezoneOffsetMinutes` alongside `scheduledDate` on every schedule
  call, since `scheduledDate` itself is built from the browser's *local* calendar day while
  `publishDelayMs()` used to always interpret it as a UTC day, misfiring auto-publish by hours).
  `workers/publishWorker.ts` then calls the real platform post API, sharing the exact
  same posting logic (`lib/socialPublish.ts`) as the interactive `POST /api/social/post` route, and
  records the outcome back onto the row (`posted` + `postUrl`, or `failed` + `publishError`) so the
  Calendar can show a status badge. Deliberately NOT unified with `social.ts`'s separate in-memory
  schedule Map (see that route's own WHY comment) — this only wires the Calendar's existing
  jobId+date table, not a merge of both scheduling concepts.
---

## 10. Docs Reference

| Document | Purpose | Exists today? |
|---|---|---|
| `CLAUDE.md` (this file) | Primary dev context — architecture, conventions, decisions | Yes |
| `README.md` | Public-facing developer onboarding | Yes |
| `CHANGELOG.md` | History of all fixes and features applied — **update this on every change** | Yes |
| `CONTRIBUTING.md` | Contribution workflow, commit/PR conventions | Yes |
| `UI_UX_DOCUMENTATION.md` | Full design-system reference + differentiation analysis | Yes |
| `ARCHITECTURE.md` | Accurate, current system architecture (companion to this file — see note below) | Yes |
| `docs/archive/` | Closed-out, point-in-time audit docs kept for historical record (not living docs — see below) | **No — see correction below** |

There is no `ROADMAP.md` in this repo — don't add cross-references to it unless the file is
created in the same change. This table used to list five planned-but-never-created `docs/*`
files and a `ROADMAP.md`; the 2026-07-28 review found every reference to them was dangling, so
they were removed rather than stubbed out. `CHANGELOG.md` records that a `docs/archive/`
directory was added the same day, with `FUNCTIONAL_AUDIT_2026-07.md` and `UI_UX_AUDIT_2026-07.md`
moved into it once both had been fully implemented — but a later doc-drift pass found neither
`docs/` nor either archived file actually present in the repo today, despite that. **Treat
`docs/archive/` as not existing until someone re-creates it** (either restore the directory and
the two archived files, or strip the remaining references — see §4 folder listing above, which
still shows it).

**`REVIEW_FINDINGS.md` was retired 2026-08-10** — it was supposed to be a live open-issues
tracker updated in place (fixed rows moved to `CHANGELOG.md`, per this table's old row for it),
but every audit in that day's 18-audit full-codebase run independently confirmed the file itself
had never actually existed, despite being referenced throughout this file as current. Rather than
recreate it as a fourth place to track open work, the team decided to retire it: open items from
an audit run now live in that run's own findings file (e.g. `AUDIT_FINDINGS_2026-08-10.md`) plus
a companion fix-tracking prompt (e.g. `prompts/FIX_AUDIT_FINDINGS.md`) with per-item checkboxes,
and fixes are recorded directly in `CHANGELOG.md` as they land — no separate standing tracker
file. If a future audit round wants a persistent cross-run backlog again, introduce it
deliberately (new name, real content) rather than resurrecting a reference to a file that was
dangling for at least two consecutive full-codebase reviews.

**Why this file (CLAUDE.md) can drift from the real codebase:** architecture sections here are
hand-written and only updated when someone remembers to. The 2026-07-28 review found this file
describing a carousel-rendering system that had been fully rewritten weeks earlier (see §3
"Carousel Rendering Sub-Flow" — now corrected) and pointing at docs files under `docs/` that
were never created (now corrected — see above). **Whenever you finish a change that alters an
architecture decision, a data flow, or a folder's contents, update the relevant section of this
file in the same session** — don't defer it, and don't let CHANGELOG.md be the only record of
what changed.

---

## 11. Carousel Theme & Template Reference

> **Two parallel systems coexist today** — see `CAROUSEL_TEMPLATE_PLAN.md` for the full
> history/rationale. Both are live; the template system (added 2026-08-06) is the
> Canva-like, visually-distinct system users actually see when they pick a template on
> Create. The legacy 9-color-theme system still exists as the fallback for carousels
> generated before the template system shipped, and is a candidate for retirement once the
> template system is proven stable (`CAROUSEL_TEMPLATE_PLAN.md` §2.4 — not done yet).

### 11a. Template system (current, primary)

10 distinct templates — each with its own typography, spacing, layout style, and 3 curated
color palettes — defined in `client/src/lib/templateSystem.ts` (`TEMPLATES` record,
`getTemplate()`/`getPalette()`/`getDefaultPalette()` helpers). Selection happens on the
Create form (`Create/AdvancedOptions.tsx`'s `CompactTemplatePicker` — a compact row of pill
chips for both template and palette, matching `ToneSelector.tsx`'s visual language) and is
sent with job creation; it's also switchable after generation from the Result page's
"Carousel template" panel (`CarouselTemplateSwitcher.tsx`, which reuses the same
`CompactTemplatePicker` inside a collapsible banner), calling `PATCH /:jobId/carousel-template`.
The two pickers were briefly visually inconsistent — Create used the compact chips while
Result rendered a separate big-card `TemplateGallery`/`ColorPalettePicker` pair — until
2026-08-06, when `CarouselTemplateSwitcher.tsx` was switched to reuse `CompactTemplatePicker`
directly and the now-orphaned `components/TemplateGallery.tsx` + `components/ColorPalettePicker.tsx`
were deleted.

| Key | Name | Category |
|---|---|---|
| `modern-minimal` | Modern Minimal | minimal |
| `bold-statement` | Bold Statement | bold |
| `editorial-classic` | Editorial Classic | editorial |
| `tech-modern` | Tech Modern | modern |
| `vibrant-pop` | Vibrant Pop | modern |
| `luxury-dark` | Luxury Dark | classic |
| `clean-corporate` | Clean Corporate | minimal |
| `creative-abstract` | Creative Abstract | modern |
| `storyteller` | Storyteller | editorial |
| `social-media` | Social Media | modern |

**Data flow:** `templateId`/`paletteId` are columns on `contentJobs` (nullable — only
meaningful for `platform='instagram_carousel'`), read by `Result.tsx` and passed down through
`ContentColumn` → `IGCarouselPreview` → `IGSlide`, which resolves the template component
(`igslide/templates/*.tsx`) and the palette (via `getPalette()` + `deriveColorSystemFromPalette()`
in `lib/colorSystem.ts`) before rendering. The same values are sent to
`POST /:jobId/export/carousel-png` so the PNG export matches the preview exactly (same
principle as the legacy system's §3 note below).

**Shared rendering contract every `*Template.tsx` component must follow** (violating this
is what caused the 2026-08-06 letterboxing/overflow bugs — see that date's `CHANGELOG.md`
entry for what broke and why):
- The shared wrapper, `igslide/layouts/TemplateLayout.tsx`, owns **only** fixed sizing
  (`width`/`height`/`flexShrink: 0`) and clipping (`overflow: hidden`) — it must never add
  its own `padding` or `background`. Every individual template component is fully
  responsible for its own full-bleed `background` and `padding` on its root content div.
  Forgetting either causes a letterboxed card with a gap around it (padding applied twice,
  or the gap showing through to the page background because nothing filled it).
- Each template component's root content div must set `flex: 1` (to fill `TemplateLayout`'s
  inner box) and must not exceed the fixed `height` it's given — long body text needs to
  clip via the inherited `overflow: hidden`, not push the box taller.
- `colors: ColorSystem` passed into a template component is *already* the resolved palette
  (or the legacy accent, for a template rendered without a `paletteId`) — read
  `colors.LIGHT_BG`/`colors.DARK_BG`/`colors.BRAND_PRIMARY` etc. directly. For text-contrast
  decisions, call `getContrastColor(bgHex)` / `getContrastRgba(bgHex, alpha)` from
  `lib/colorSystem.ts` (WCAG relative-luminance based) — don't compare against the literal
  string `'#1a1a1a'` to detect dark mode; that sentinel check shipped broken (it can never
  match `deriveColorSystemFromPalette()`'s procedurally-tinted output) and was replaced
  repo-wide with the luminance helpers.
- Each template component is `React.forwardRef<HTMLDivElement, CarouselTemplateProps>`
  (shared prop type in `igslide/templates/templateProps.ts`) and must forward its `ref` to
  `TemplateLayout`'s `ref` prop, the same way the legacy layout branch in `IGSlide.tsx`
  forwards to its root div — this is what lets `slideRefs`-style DOM access (screenshot,
  scroll-to-slide) work identically regardless of which rendering path a slide takes.
- Use `stablePointKeys()` from `igslide/types.ts` for any `slide.points.map()` key, not the
  array index — a point's identity should survive reordering/editing in `EditSlideModal.tsx`.

**To add an 11th template:**
1. Add the id to `TemplateId` in `templateSystem.ts` (types/helpers only — 110 lines as of
   2026-08-10's split, see below). Create a new `lib/templates/yourTemplate.ts` exporting a
   `CarouselTemplate` object (typography, spacing, layout, 3+ `colorPalettes`,
   `defaultPaletteIndex` — copy an existing file's shape, e.g. `templates/modernMinimal.ts`),
   then register it in `lib/templateData.ts`'s `TEMPLATES` record, which
   `templateSystem.ts` re-exports.
2. Add the same id to `VALID_TEMPLATE_IDS`/`templateIdEnum` in `server/src/schemas/jobs.ts`
   (mirrored server-side since the server can't import client TypeScript — same pattern as
   `VALID_TONES` in that file) so `templateId` stays enum-validated end-to-end rather than an
   unbounded string.
3. Create `igslide/templates/YourTemplate.tsx` following the shared contract above — copy
   the structure of an existing template (e.g. `ModernMinimalTemplate.tsx`) rather than
   starting from scratch, since the padding/background/flex/ref-forwarding contract is easy
   to get subtly wrong.
4. Register it in `igslide/templates/registry.ts`'s `TEMPLATE_COMPONENTS` map — the single
   id→component source of truth both `IGSlide.tsx` and any future consumer import from
   (module-scoped, not rebuilt per render).
5. Run `npm run build:ssr` (in `client/`) to rebuild `server/src/generated/slideRenderer.js`
   — also update `server/src/generated/slideRenderer.d.ts` by hand if `RenderSlideParams`'
   fields ever change (esbuild emits no declarations; this file is hand-maintained and has
   silently drifted out of sync before).
6. Verify with a real render, not just a type-check: the SSR bundle is a separate build
   artifact from the live preview, and a stale bundle after a source change (forgetting step
   5) makes the PNG export silently ignore your new template while the live preview looks
   correct — this exact bug shipped once already (2026-08-06).

### 11b. Legacy 9-color-theme system (fallback for pre-template carousels)

Defined in **two places that must stay in sync**:
- `client/src/pages/Result/constants.ts` → `CAROUSEL_THEMES` (name, accent, preview gradient/glow/emoji — drives the legacy theme picker UI)
- `client/src/pages/Result/components/content/carousel/SlideVisual.tsx` and `IGSlide.tsx`'s fallback branch (the actual per-theme layout/decoration rendering, consumed by both the live preview AND the SSR export bundle when no `templateId` is present — see §3)

| Key | Name | Accent |
|---|---|---|
| `aurora` | Neon Aurora | `#00F5FF` |
| `magazine` | Editorial | `#F59E0B` |
| `split` | Geometric | `#8B5CF6` |
| `bold` | Luxury | `#C9A84C` |
| `minimal` | Minimal | `#6366F1` |
| `neon` | Neon Cyber | `#FF2D78` |
| `violet` | Violet Luxe | `#A855F7` |
| `crimson` | Crimson Power | `#DC2626` |
| `rose` | Rose Elegance | `#E11D48` |

Do not add new themes to this system — extend the template system (§11a) instead. This
section is retained only so existing pre-template carousels keep rendering correctly.

---

## 12. Deployment (Production)

> This repo is not yet under version control (`git init` has not been run). Deploying via
> Vercel/Render's git-based auto-deploy requires pushing to a GitHub/GitLab remote first —
> that's a one-time setup step, not something either platform needs repo config for beyond
> what's already here.

**Target stack — free tier, shareable public link, no self-hosted infra to maintain:**

| Piece | Platform | Config file |
|---|---|---|
| Frontend | Vercel (static Vite build) | `client/vercel.json` (SPA rewrite to `index.html` for React Router) |
| Backend | Render (Web Service) | `render.yaml` (Blueprint: build/start commands, health check, env var slots) |
| Database | Neon (managed Postgres, free tier) | none — connection string goes in Render env vars |
| Queue / cache | Upstash (managed Redis, free tier) | none — REST URL/token goes in Render env vars |

**Why not the existing `docker-compose.yml`:** it was originally written with self-hosted
`postgres`/`redis` containers, which contradicted the Neon/Upstash architecture described
throughout this file. It's been relabeled **local-dev-only** — a convenience for developing
against a local DB/queue without burning free-tier quota — and is not part of the production
path. Its `postgres`/`redis` services are not deployed anywhere; production always uses managed
Neon + Upstash. `client/Dockerfile` and `server/Dockerfile` are likewise dev-only, invoked by
this compose file, not by Vercel or Render (both platforms build directly from `package.json`
scripts, not from a Dockerfile).

**Env var handling:**
- `client/.env.example` and `server/.env.example` are the per-side templates (see §6). They
  replaced a single root-level `.env.example` that mixed both sides' vars together.
- In production, env vars are set directly in the Vercel/Render dashboards — never committed.
  `server/src/config.ts` validates the full required/optional schema at boot and fails fast with
  a clear error if something required is missing (see that file for the authoritative list).
- `OAUTH_STATE_SECRET` has an insecure hardcoded dev default that `config.ts` explicitly rejects
  when `NODE_ENV=production` — Render's env var for this **must** be set to a real generated
  value or the server refuses to start (this is intentional, not a bug — see the `SECURITY:`
  comment in `config.ts`).
- `server/Dockerfile` used to `COPY .env.example .env` into the image (baking placeholder/empty
  values in) — removed, since the container runtime (Render's env var injection, or
  docker-compose's `environment:` block for local dev) is the correct source of runtime config,
  never a file baked into the image.

**Render Blueprint notes (`render.yaml`):**
- `rootDir: server` — Render builds only the `server/` subfolder
- `buildCommand: npm install && npm run build` — `server`'s `build` script also runs
  `client`'s `build:ssr` step (see §3), so the carousel SSR bundle stays in sync automatically
- `preDeployCommand: npm run db:migrate` (added 2026-08-10) — runs `drizzle-kit migrate` after a
  successful build but before the new deploy is cut over to live traffic. Render treats a
  non-zero exit here as a failed deploy (the old version keeps serving traffic), so a broken
  migration blocks the rollout rather than shipping code that expects a schema that was never
  applied — this was previously a manual step with no automated gate at all.
  **If a migration fails mid-deploy:** Render's dashboard shows the failed `preDeployCommand`
  step's output — read it first; drizzle-kit's migrate output names the specific failing SQL
  file. The previous deploy keeps serving traffic throughout (Render never promotes a deploy
  whose `preDeployCommand` failed), so there's no user-facing outage window to react to
  urgently. Fix forward, don't try to hand-roll a rollback: `server/drizzle/` is the append-only
  migration history — write a new migration that corrects the issue (or is a no-op fixup) rather
  than editing or deleting an already-applied migration file, and redeploy. If the failure was a
  partial apply (some but not all statements in one migration file committed — Postgres DDL is
  transactional per Neon's defaults, so this should be rare), check Neon's dashboard for the
  actual current schema state before writing the fixup migration, don't assume the file's
  starting point.
- `healthCheckPath: /api/ready` (changed 2026-08-10, was `/api/health`) — `/api/health` is an
  unconditional 200 (liveness only: "the process is up"), so Render's restart/rollback logic
  never observed a real DB or Redis outage through it. `/api/ready` (also in `index.ts`) pings
  both with a 3s timeout each and returns 503 if either is unreachable, so Render's health
  monitoring now reflects actual dependency health, not just process uptime.
- Secret-bearing env vars are declared with `sync: false`, meaning Render prompts for their
  values in the dashboard rather than expecting them in this file

**Vercel notes (`client/vercel.json`):**
- Vite projects are auto-detected by Vercel (no explicit build command needed in the config)
- The only non-default piece needed is the SPA rewrite rule, since React Router's client-side
  routes 404 on a hard refresh without it

---

## 13. UI Theme System

> Six selectable color/font identities for app chrome (sidebar, landing page, every
> authenticated page). **Not to be confused with** the pre-existing 9-theme carousel-slide
> system (`CAROUSEL_THEMES` in `Result/constants.ts`, §11) — that's a separate, unrelated
> concept for exported Instagram carousel visuals and is untouched by this system.

**The 6 themes** (keys used in `data-theme` / `ThemeName`): `aurora` (default — the
original gold/violet look), `deep-marine`, `obsidian-ember`, `nightshade`, `ink-verdigris`,
`carbon-signal`.

**Architecture:**
- `client/src/index.css` defines all real color/font tokens as CSS custom properties in
  `:root, [data-theme="aurora"] { ... }` plus one block per other theme (`--bg-base`,
  `--bg-raised`, `--bg-card`, `--text-primary/secondary/muted`, `--rule`, `--accent`,
  `--accent-2`, `--accent-glow`, `--on-accent`, `--font-display/heading/body/mono`).
- The Tailwind 4 `@theme {}` block (further up the same file) no longer hardcodes values —
  every `--color-*`/`--font-*` name inside it is aliased to one of the tokens above (e.g.
  `--color-dark-900: var(--bg-base);`), so existing `bg-dark-900`-style utility classes
  keep working unchanged while resolving through the active theme at runtime.
- `data-theme` is set on `<html>`. `client/index.html` has a small inline `<script>` (before
  any stylesheet/app code) that reads `localStorage['contentagent-theme']` and applies it
  synchronously, preventing a flash of the Aurora default on reload.
- `client/src/store.ts`'s Zustand store owns `themeName`/`setTheme(name)` — `setTheme`
  writes `localStorage`, sets the `data-theme` attribute, and updates state so the switcher
  UI re-renders. No portal usage exists in this codebase (all modals are `position: fixed`
  divs in the normal tree), so custom-property inheritance reaches every surface without
  special-casing.
- `client/src/components/ThemeSwitcher.tsx` is the one shared switcher component, used in
  both `AuthLayout.tsx` (sidebar, including a collapsed-state icon-only trigger) and
  `Landing/Nav.tsx` + `Landing/MobileMenu.tsx`.

**What stays fixed across all 6 themes (never themed):** success/error/warning colors,
quality-score-tier colors (`StatusDisplay.tsx`'s `getTierInfo`, `QualityTierBadge.tsx`),
platform-brand colors (Instagram/LinkedIn/Twitter/video), the `.badge-*` palette in
`index.css`, `Result/constants.ts`'s `agentColors` and `CAROUSEL_THEMES`/`slideColors`, and
naturally the entire carousel SSR render path (`renderSlideHtml.tsx`,
`igslide/layouts/*.tsx`, `igslide/contentPieces.tsx`, `SlideVisual.tsx`) — these are
meaningful signal colors or a deliberately separate design system, not brand decoration.

**To add a 7th theme:**
1. Add a new `[data-theme="your-key"] { ... }` block in `index.css` with all the tokens
   listed above (pull real hex values from a design source — don't invent them).
2. Add `'your-key'` to the `ThemeName` union in `store.ts`.
3. Add an entry to `THEME_OPTIONS` in `ThemeSwitcher.tsx` (label + swatch hex, duplicated
   there since only one `[data-theme]` block is active in the DOM at a time).
4. Run the client build (`npm run build`) and spot-check contrast of `--text-secondary`/
   `--text-muted` against the new `--bg-base` — don't assume opacity values tuned for
   Aurora's near-black hold at a different base luminance.

---

*Last updated: 2026-08-02 (added the 6-theme UI system described in §13 — CSS custom
properties per `[data-theme]`, `ThemeSwitcher.tsx`, flash-prevention script, and a
color-token migration across ~75 `.tsx`/`.ts` files app-wide, leaving semantic/platform/
carousel colors fixed. See `CHANGELOG.md` for the full dated entry.)*

*Updated 2026-08-07: fixed every finding from `CODE_REVIEW_FULL_CODEBASE.md`'s 10-angle
review (correctness, security, architecture, type safety, React, backend, performance,
test coverage, readability, simplification) — see `CHANGELOG.md` for the full dated entry.
Doc-drift corrections applied in this pass: §4's folder tree now shows `routes/content/`
and `routes/users/` as the already-split subdirectories they actually are (was showing
both as flat files), added the previously-undocumented `feedMonitors` feature (§5's Key
Features table, `routes/feedMonitors.ts`, `workers/feedMonitorWorker.ts`,
`Repurpose/FeedMonitorPanel.tsx`) and its 12th `schema.ts` table (was listed as 11), and
added `lib/ssrfGuard.ts`/`lib/sanitizeSearchText.ts` (both extracted from
previously-duplicated inline copies during this pass) to §4.*

*Updated 2026-08-10: worked through `prompts/FIX_AUDIT_FINDINGS.md` Batches 1-6 (the
consolidated output of an 18-audit full-codebase run, `AUDIT_FINDINGS_2026-08-10.md`) —
security/data-safety fixes (carousel mobile responsiveness, required `TOKEN_ENCRYPTION_KEY`,
Repurpose prompt-injection sanitization, `feedMonitors.ts`'s DB-outage hang, feed-monitor
orphan cleanup, Calendar timezone bug), production-readiness fixes (DB migrations + real
health check wired into `render.yaml`, npm audit patches), architecture cleanup
(`manage.ts`/`templateSystem.ts` split back under the 400-line cap, `userProfile` removed
from Zustand in favor of React Query, `formatter.ts`'s word-limit fixed), smaller correctness
fixes (SSE reconnect, prompt XML-wrapping, auth-cache invalidation, `browserPool.ts` routed
through `config.ts`), and UI/UX fixes (delete/disconnect confirmations, `IdeaCard.tsx`'s
accessibility fix, focus-visible rings, Library icon, export progress). See `CHANGELOG.md`'s
six dated 2026-08-10 entries for full details of each batch.
**Doc-drift corrections applied in this pass (Batch 6):** `REVIEW_FINDINGS.md` retired — every
reference removed from this file (§0 pointer, "Development stage" line, §10 table and prose)
since every audit in the 18-audit run confirmed the file itself never existed despite being
cited throughout as a live tracker; open work now lives per-audit-run instead (e.g.
`AUDIT_FINDINGS_2026-08-10.md` + its fix-tracking prompt). `UI_UX_DOCUMENTATION.md` §1A/§2A
rewritten to describe the real 6-theme `[data-theme]` system and actual font stack (neither
matched the doc before this pass), and 5 of its Section 10 findings marked resolved with
verification notes. Added the previously-undocumented `routes/jobs/insights.ts`
(`GET /audience-defaults`) to §4. Removed the empty, never-actually-used `server/src/types/`
directory and corrected the two TypeScript rules that pointed at it — server types are
colocated in the module that owns them (e.g. `AuthRequest` in `middleware/auth.ts`), not
gathered in a shared types folder the way `client/src/types/` genuinely is. `CHANGELOG.md`
also backfilled a missing entry for commit `307b3ec`, which predated this session.*

*Previously updated: 2026-07-28 (all 21 Section 1 findings from `REVIEW_FINDINGS.md` fixed in this session — folder structure updated for the `Create`/`Brand`/`Landing` component splits, the `postEmbeddings` table removal, and the two dead-file deletions; `docs/`/`ROADMAP.md` cross-references removed repo-wide instead of stubbed; `IGSlide.tsx` flagged as the next oversized-file candidate. Later the same day: every fixable finding from `FUNCTIONAL_AUDIT_2026-07.md` was implemented — `users.content_dna` and `content_jobs.source_job_id`/`source_platform` added via migration `0002_cute_rogue.sql`, `GET /jobs` gained real server-side search/filter/sort, `VALID_TONES` extended to match the UI, the dead "Batch" nav entry removed, and `Section 9` above updated with the resulting known limitations. See `CHANGELOG.md` for the full dated entry. Later still: production deployment target confirmed as Vercel (client) + Render (server) + Neon + Upstash, all free tier; added `render.yaml`, `client/vercel.json`, split `client/.env.example` + `server/.env.example` out of the old root `.env.example`, relabeled `docker-compose.yml`/both Dockerfiles as local-dev-only, removed the `server/Dockerfile` line that baked `.env.example` into the image, and added this §12. See `CHANGELOG.md` for the full entry.)*
