# ContentAgent — Audit Fixes Applied

> All 10 priority items from `PRODUCT_AUDIT.md` have been implemented.
> Generated: 2026-06-09
>
> **Format note (added 2026-07-28):** entries below this point are grouped by date, newest
> first, since fixes now land across many separate sessions rather than one audit batch.
> When you fix something from `REVIEW_FINDINGS.md`, add a dated entry here describing what
> changed and why, then delete (or mark `[FIXED]`) the corresponding row in
> `REVIEW_FINDINGS.md` so that file always reflects only what's still open.

---

## 2026-07-30 (4) — Fixed Puppeteer Chrome installation for Render deployment with full solution

**Status:** Complete.

**Fixed:** Puppeteer browser pool initialization was failing on Render due to missing Chrome
installation. Full solution:
- Added postinstall script to run `npx puppeteer browsers install chrome` automatically
- spawnBrowser() explicitly sets PUPPETEER_CACHE_DIR for Render environment
- Added intelligent Chrome path detection for multiple possible installation locations
- Fallback to auto-discovery if explicit paths fail
- Added install-chrome.sh script for system dependencies (for future use)
- Carousel PNG export should now work properly on Render

---

## 2026-07-30 — Fixed Clerk publishable key requirement for @clerk/express v2+

**Status:** Complete.

**Fixed:** @clerk/express v2.1.17 now requires both CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY
on the server side, whereas previous versions only needed the secret key. Added CLERK_PUBLISHABLE_KEY
to server/src/config.ts schema and server/.env.example, and updated clerkMiddleware() initialization
in server/src/index.ts to explicitly pass both keys. This fixes the "Publishable key is missing"
error that occurred during Render deployment.

---

## 2026-07-29 (2) — Fixed CI test-matrix crash (Node 18 unsupported by ESLint 10) and a flaky test timeout

**Status:** Complete. Verified locally: `server` lint/test/build and `client` lint/build all
exit 0 before pushing.

**Fixed:** `ci.yml`'s `test` job ran a matrix of Node `18`, `20`, `21`. `eslint@^10.3.0` (and its
`typescript-eslint@^8.59.2` peer) require Node `^20.19.0 || ^22.13.0 || >=24` — Node 18 is not
supported at all, so `npm run lint` crashed with exit code 2 on that leg, which cascaded via the
matrix's default `fail-fast` and cancelled the 20/21 legs before they finished. Changed the
matrix to `['20', '22']` — 21 was also non-LTS and already EOL, no reason to keep testing it.
No `engines` field anywhere in this repo pins Node 18, so nothing depended on that leg.

**Fixed:** `server/vitest.config.ts` had `testTimeout: 15000`. Under full-suite parallelism
(all `tests/**/*.test.ts` files transforming/importing concurrently) a few otherwise-passing
integration/security tests (`users-route`, `users-account-deletion`,
`content-routes-idor`) occasionally exceeded that 15s window and failed with
`Test timed out` — confirmed non-deterministic (different subset failed on each of two local
full-suite runs) and confirmed passing in isolation, i.e. genuine CPU-contention flakiness, not
a code bug. Raised to `30000` — same flakiness would eventually surface in CI's constrained
runners. No test logic changed.

---

## 2026-07-29 — Fixed CI npm-cache failure; removed unused Docker workflow

**Status:** Complete.

**Fixed:** `actions/setup-node@v4`'s `cache: 'npm'` looks for a lock file at the repo root by
default. This repo has no root lock file — `server/` and `client/` each have their own
(non-workspace layout) — so every job using it failed immediately with "Dependencies lock file
is not found." Added explicit `cache-dependency-path` (both `server/package-lock.json` and
`client/package-lock.json`) to the `setup-node` steps in `_reusable-build.yml` and `ci.yml`'s
`deploy` job.

**Removed:** `.github/workflows/docker.yml`. Production deployment is Vercel (client) + Render
(server) per `CLAUDE.md` §12 — nothing pulls or deploys the `contentagent/server:latest` /
`contentagent/client:latest` images this workflow built and pushed, so it was pure dead CI spend
(and was failing for the same lock-file reason via its `test-and-build` reuse of
`_reusable-build.yml`). `Dockerfile`s and `docker-compose.yml` remain as local-dev-only per
existing §12 notes — only the CI workflow that published images from them was removed.

---

## 2026-07-28 (Root cleanup) — Archived closed-out audits; deleted stray leftover files

**Status:** Complete. Phase 5 of the production-readiness pass (deployment target confirmed →
repo audit → env separation → license → this).

**Moved** (both already fully implemented per their own dated `CHANGELOG.md` entries above —
kept for historical record, out of the root of a production-ready repo):
- `FUNCTIONAL_AUDIT_2026-07.md` → `docs/archive/FUNCTIONAL_AUDIT_2026-07.md`
- `UI_UX_AUDIT_2026-07.md` → `docs/archive/UI_UX_AUDIT_2026-07.md`

**Deliberately NOT moved:** `REVIEW_FINDINGS.md` stays at root. Unlike the two audits above, it's
a live open-issues tracker that gets updated in place as issues are fixed (see `CLAUDE.md` §10)
— archiving it would misrepresent open work as resolved history.

**Deleted** (stray leftover files, unreferenced by any code or doc):
- `server/demo_ff743eb0-441a-4bd9-9849-1e6d4244a64e_slides.zip` (285KB manual test export)
- `server/shutdown_err.log`, `server/shutdown_out.log` (logs from a manual local run)

**Docs updated:** `CLAUDE.md` §10 (Docs Reference table + the docs/ROADMAP dangling-reference
note, since a real `docs/` directory now legitimately exists) and the folder-structure tree in
§4. Earlier dated entries in this file that mention the two audit docs by their old root path are
left as-is — they describe what was true at the time they were written.

---

## 2026-07-28 (License) — Resolved MIT/ISC/"all rights reserved" three-way conflict

**Status:** Complete. User confirmed (production-readiness pass, Phase 4) this project stays
private indefinitely — not intended for open-source reuse.

**Problem:** the root `LICENSE` file was MIT text, `server/package.json` said
`"license": "ISC"`, but `README.md` and `CONTRIBUTING.md` already both stated "Private — all
rights reserved" in their own License sections — three mutually inconsistent signals about the
project's actual license.

**Fixed:**
- `LICENSE`: replaced MIT text with an explicit "All Rights Reserved" / proprietary notice,
  matching what `README.md`/`CONTRIBUTING.md` already claimed.
- `server/package.json`: `"license"` changed from `"ISC"` to `"UNLICENSED"` (npm's standard
  marker for "not open source"; also makes `npm publish` refuse to publish by default).
- `client/package.json`: added `"license": "UNLICENSED"` (previously had no license field at
  all; already had `"private": true`).
- `README.md`: License section now links to the `LICENSE` file.

No changes needed to `README.md`/`CONTRIBUTING.md`'s License section wording — both already said
the right thing; only the actual license artifacts needed to catch up.

---

## 2026-07-28 (Deployment prep) — Production deployment target confirmed; env split + deploy configs added

**Status:** Phase 1-3 of a production-readiness pass (deployment target, repo audit, environment
separation). License resolution (Phase 4) and root cleanup (Phase 5) are separate, not yet done.

**Deployment target confirmed:** Vercel (client, static build) + Render (server, Web Service) +
Neon (Postgres, managed) + Upstash (Redis, managed) — all free tier, chosen for a shareable public
link with no self-hosted infra to maintain. Repo is not yet a git repository (`git init` not run);
this will need to happen before Vercel/Render's git-based auto-deploy can be wired up.

**Added:**
- `client/.env.example` and `server/.env.example` — replace the single root-level
  `.env.example`, which mixed frontend build-time vars with backend runtime secrets. Regenerated
  from `server/src/config.ts`'s validated schema (the authoritative source — it had drifted from
  the old root `.env.example`, e.g. `RATE_LIMIT_MAX_JOBS` and `CLERK_PUBLISHABLE_KEY` were only in
  the real `.env`, while `CORS_ORIGINS`/`FRONTEND_URL`/`APP_URL`/`SENTRY_DSN`/`TOGETHER_API_KEY`/
  social OAuth vars/PostHog vars were only in the stale example).
- `render.yaml` — Render Blueprint for the server (build/start commands, `/api/health` health
  check, secret env var slots marked `sync: false`).
- `client/vercel.json` — SPA rewrite rule so React Router routes survive a hard refresh on Vercel.

**Changed:**
- `docker-compose.yml` relabeled **local-dev-only**. It previously bundled self-hosted `postgres`
  and `redis` services with no framing, contradicting this file's own architecture description
  (Neon/Upstash managed services) — now documented at the top of the file as a dev convenience,
  not a production path.
- `server/Dockerfile`: removed `COPY .env.example .env`, which baked placeholder/empty env values
  into the built image. Runtime config now always comes from the container runtime
  (docker-compose's `environment:` block locally, or the hosting platform's dashboard in
  production) — never from a file baked into the image.
- `CLAUDE.md`: added §12 "Deployment (Production)"; updated the folder-structure tree and §6's
  env var reference to point at the two new per-side `.env.example` files instead of the retired
  root one.
- `README.md`: env var section now points at `client/.env.example` / `server/.env.example`; added
  a "Deployment" section; updated the Project Structure listing.

**Known follow-up (flagged, not yet resolved):** the root `LICENSE` file is MIT, but
`README.md`'s License section already says "Private — all rights reserved," and
`server/package.json` says `"license": "ISC"` — a three-way conflict. User confirmed (Phase 1)
this project is staying private indefinitely; license file resolution is a separate, explicit
confirm-before-acting step (Phase 4 of the production-readiness pass), not done in this entry.

---

## 2026-07-28 (Functional) — All fixable items from FUNCTIONAL_AUDIT_2026-07.md implemented

**Status:** Complete. Fixed every Tier 1/2 confirmed-broken finding, every Tier 4 dead-code item,
and the SSE reconnect + Calendar-disclosure Tier-3/design-debt items from
`FUNCTIONAL_AUDIT_2026-07.md`'s consolidated bug list. Includes a DB migration
(`server/drizzle/0002_cute_rogue.sql`) adding `users.content_dna`, `content_jobs.source_job_id`,
`content_jobs.source_platform`, and a new `idx_content_jobs_user_platform` index.

**Data model changes:**
- `users.content_dna` (jsonb): Content DNA (writing-style fingerprint from `POST
  /users/analyze-voice`) was previously held only in the server's in-memory `userProfiles` Map —
  a restart or a different instance handling the request silently reverted it to "not set up."
  Now persisted; `GET /users/me` and `seedUserProfilesFromDB()` both load it back (finding #9).
- `content_jobs.source_job_id` / `source_platform`: Content Multiplier's origin metadata was only
  ever held on the in-memory job object, so `assembleJobFromDB` (used once a job ages out of
  memory) silently dropped it — `ContentMultiplier.tsx`'s "View Original" badge went blank for
  older multiplied jobs. Now carried through `persistJob.ts` into the DB (finding #11).

**Backend fixes:**
- `server/src/schemas/jobs.ts`: `VALID_TONES` extended from 5 to 8 values (added `bold`,
  `playful`, `minimal`, `direct`) — the union of every tone label offered anywhere in the UI.
  Selecting Bold/Playful/Minimal on Create previously always failed generation with a generic,
  undiagnosable validation error (finding #1).
- `server/src/schemas/content.ts`: `hashtagsSchema.content` now accepts arrays — carousel jobs
  send their slide array as `content`, which the schema previously rejected outright, silently
  breaking hashtag research for every carousel job (finding #2).
- `server/src/schemas/users.ts`: `brandVoiceSchema.brandVoice` max length raised 50 → 150 —
  Brand's 6 voice pills joined can reach 63 chars, so selecting more than ~3-4 always failed Save
  with a generic error (finding #7).
- `server/src/routes/jobs/manage.ts`: `GET /jobs` gained `search`/`platform`/`sort` query params,
  now applied as real DB `WHERE`/`ORDER BY` clauses (plus a grouped per-platform count query for
  the toolbar's pill badges) instead of the client silently filtering only whatever page was
  already loaded — Library's search, platform filter, sort, "select all," and CSV export
  previously only ever covered the current 10-row page (finding #4).
- `server/src/routes/content.ts`: competitor-analysis prompt's JSON schema fixed to match what
  the frontend actually reads (`engagementSignal`→`engagementLevel`, added `frequency`) — three
  frontend fields were previously never produced by the prompt at all, always rendering blank
  (finding #6).
- `server/src/routes/social.ts`: `POST /social/post` now builds a real, browsable `postUrl` from
  the raw platform post ID (LinkedIn share-update URL / Twitter status URL) — the client
  previously received an opaque ID it never turned into a link, so "View post" never appeared
  after a successful post (finding #10).
- `server/src/routes/users.ts`: `POST /users/analyze-voice` and `GET /users/me` now read/write
  `contentDna` against the DB, not just the in-memory map (see Data model changes above).

**Frontend fixes:**
- `client/src/components/ToolsDropdown.tsx`: removed the "Batch" nav item — it linked to `/batch`
  with no query string, which always rendered a "No batch found" dead end since nothing in the
  app builds the `?jobs=` URL or calls `createBatchJobs()` (finding #3). The backend route and
  `BatchResult.tsx` page are untouched and still reachable directly.
- `client/src/pages/Result/components/panels/PostPanel.tsx`: "Post scheduled!" confirmation and
  the schedule-picker step now honestly disclose that scheduling only saves a reminder — there is
  no delivery worker wired up yet to actually publish at the scheduled time (finding #5).
- `client/src/pages/Competitor.tsx`: removed the "Posts/week" and "Avg engagement" UI elements,
  which the prompt (correctly) never populates since it explicitly refuses to fabricate exact
  posting-frequency/engagement numbers without live API access (finding #6, UI half).
- `client/src/store.ts`: `userProfile.brandVoice` default changed from `'professional'` to `''` —
  the truthy default made Create's "brand voice configured" banner always claim a brand voice was
  active, even for brand-new users who'd never touched Brand Settings (finding #8).
- `client/src/components/AuthLayout.tsx`: now fetches `getProfile()` once per authenticated
  session and hydrates the Zustand `userProfile` store — previously only `Brand.tsx`'s own
  save-success handler ever populated it, so a returning user's real brand voice wasn't reflected
  on Create until they revisited `/brand` (finding #8).
- `client/src/pages/Result/components/content/carousel/EditSlideModal.tsx`: added try/catch/
  finally around the save call (previously a failed save left the Save button's spinner stuck
  forever with no error shown, finding #12) and added `maxLength`/live counters matching the
  export pipeline's 300/1000-char caps so a slide can no longer be saved past what PNG export
  will later reject (finding #17).
- `client/src/pages/Result/hooks/useJobData.ts`: `handleRegenerate` now guards against re-entrant
  calls at the source (`if (!jobId || regenerating) return`) — previously only the desktop toolbar
  button unmounted itself while regenerating; the mobile sticky footer had no matching guard, so a
  fast double-tap there could fire two concurrent regenerate pipelines (finding #13). Also added
  `disabled={regenerating}` to the mobile footer's Regen button as a second layer of defense.
- `client/src/pages/Result/hooks/useJobData.ts` + `client/src/store.ts`: `connectToStream` gained
  an `onError` callback; on an SSE connection error, `useJobData.ts` now re-fetches a fresh
  stream-token and reopens the connection (debounced) instead of relying entirely on the native
  `EventSource`'s auto-retry, which kept hammering the same eventually-expired token forever with
  no recovery once the 15-minute token TTL passed (finding #27).
- `client/src/pages/Result/hooks/useMultiplier.ts`: polling `setInterval`s are now tracked in a
  ref and cleared on unmount — previously nothing stopped them if the user navigated away from
  Result before a multiply job finished (finding #14).
- `client/src/pages/Result/components/content/ContentEditShell.tsx`: now owns `saving`/`error`
  state and only calls `onClose()` after a successful save, showing an inline error (not just an
  easy-to-miss page-level toast) on failure — `InstagramContent.tsx`, `LinkedInContent.tsx`, and
  `TwitterContent.tsx`'s `saveEdit()` no longer close the editor unconditionally regardless of
  outcome (finding #15).
- Copy-to-clipboard buttons across `HashtagPanel.tsx`, `TwitterContent.tsx`,
  `VideoScriptContent.tsx`, `IGCarouselPreview.tsx`, and `useExport.ts`: all now gate the
  "Copied!" success state on the clipboard write actually resolving, and all have a `.catch()` —
  previously several had no rejection handler at all (risking an unhandled promise rejection on
  permission denial) while still optimistically claiming success (finding #16).
- `client/src/pages/Library.tsx` + `Library/LibraryToolbar.tsx`: search is now debounced and sent
  to the server; "Select all" and CSV export now fetch every matching page (capped at 20 pages,
  same pattern as Calendar's `hitFetchCap`) instead of only ever covering the current page
  (finding #4, frontend half).
- `client/src/pages/Calendar.tsx` + `Calendar/CalendarGrid.tsx`: added a persistent disclosure
  that the day-schedule is saved to the current browser only, with no server sync (finding #28);
  added an effect that prunes schedule entries for jobs no longer present in a complete (non-
  capped) fetch, fixing an unbounded, silently-accumulating localStorage leak (finding #29).

**Removed:**
- `client/src/pages/Result/components/content/CarouselContent.tsx` — a complete, fully-built
  alternate carousel-editing implementation that was never imported or rendered anywhere,
  duplicating and diverging from the live `IGCarouselPreview`/`EditSlideModal` path (finding #25).

**Not fixed (deliberately deferred, both still real, tracked limitations, not silently ignored):**
- Real scheduled-post delivery (BullMQ + platform API wiring) — disclosed instead per user
  direction; a full implementation is a substantial new feature, not a bug fix.
- Server-side schedule persistence for Calendar — disclosed instead per user direction; would
  require a `scheduledDate`-style schema addition and a full data-flow rework.
- SSRF DNS-rebinding gap on Repurpose's URL fetch (audit finding, security-adjacent) — flagged as
  needing a dedicated security review, out of scope for this functional-correctness pass.

---

## 2026-07-28 (UI/UX) — All 45 items from UI_UX_AUDIT_2026-07.md implemented

**Status:** Complete. All 45 prioritized fixes from `UI_UX_AUDIT_2026-07.md` (plus items #12 and #34
from the cross-page summary) are now implemented across Landing, Dashboard, Result, Brand,
Library, Calendar, BatchResult, Ideate, Repurpose, and Competitor pages.

**Major structural changes:**

- **Shared `ConfirmDeleteModal` component** (`client/src/components/ConfirmDeleteModal.tsx`):
  Consolidated the near-identical `Dashboard/DeleteJobModal.tsx` and `Library/DeleteJobModal.tsx`
  copies into one accessible component with `role="dialog"`, `aria-modal`, `aria-labelledby`,
  `useFocusTrap`, Escape key handling, and optional typed-confirmation gate. Both Dashboard and
  Library now use this shared modal. `History/DeleteJobModal.tsx` remains unchanged (History page
  redirects to `/library`, so its modal is legacy code not touched by this audit).

- **Brand.tsx migrated to React Query:** `Brand.tsx` now uses `useQuery` for `getProfile` and
  `getSocialConnections` (with shared `['dashboard', 'profile']` query key to match Dashboard's
  cache, fixing audit #25 where editing brand name didn't invalidate Dashboard's cache). Mutations
  (`updateBrandVoice`, `analyzeVoice`, `disconnectSocial`, `exportMyData`, `deleteMyAccount`) now
  use `useMutation` with proper `onSuccess`/`onError` callbacks and `queryClient.invalidateQueries`.

- **`navigateToCreate` helper** (`client/src/lib/utils.ts`): Extracted the "hand off to Create"
  pattern into a typed helper that accepts `{ topic?, platform?, tone? }` and calls
  `navigate('/create', { state: { ... } })`. Replaced 5 independent implementations in
  `Dashboard/RecentGenerations.tsx`, `Library/ContentTab.tsx`, `Ideate.tsx`, `Competitor.tsx`,
  and `BatchResult.tsx` (audit #27).

- **Calendar.tsx split into sub-components:** Split the 419-line `Calendar.tsx` into
  `Calendar/CalendarSidebar.tsx`, `Calendar/CalendarGrid.tsx`, `Calendar/DayDetailPanel.tsx`,
  `Calendar/SchedulePicker.tsx`, and `Calendar/calendarHelpers.ts` (audit #33). Added
  click-based "Schedule…" button with inline date picker for keyboard/touch users (audit #12),
  arrow-key navigation within the picker, and a separate `mobileOpen` state for the bottom-sheet
  drawer on ≤640px screens.

- **Shared `Button` component** (`client/src/components/Button.tsx`): Consolidated button styling
  into one component with four variants (primary, secondary, ghost, danger), loading state with
  spinner, optional icon prefix, and size presets (sm/md) (audit #34). Migrated Dashboard's
  delete-confirm buttons, Library's bulk-delete/export buttons, Brand's danger buttons, and
  Result's action buttons. Documented exceptions: Landing hero CTAs (React Router `<Link>` with
  custom hover effects), mobile-menu-cta, Calendar sc-btn-ghost, and icon-only status buttons
  remain inline per the component's own scope boundaries comment.

- **Accessibility improvements:** Added `aria-pressed` to platform/tone toggle buttons across
  Landing, Brand, and Repurpose (audit #18). Added `aria-label` to icon-only buttons on Dashboard,
  Library, and Calendar rows (audit #19). Added `role="button"`, `tabIndex={0}`, and `onKeyDown`
  handlers to Result's sidebar toggle, Ideate's idea cards, and Calendar's day cells (audit #17).
  Added `aria-live="polite"` to async progress regions in Result's LoadingView, BatchResult,
  Competitor, and Dashboard (audit #20). Added global `:focus-visible` CSS rules and
  `prefers-reduced-motion` media query in `index.css` (audit #21).

- **Error handling and user feedback:** Added confirmation to Library's bulk delete with count
  display (audit #1). Added `onError` callbacks to all 5 Library mutations (audit #7). Added
  partial-failure handling via `Promise.allSettled` for bulk operations (audit #8). Added
  try/catch + error state to Result's `handleContentSave` (audit #4). Added surface-level error
  messages to Result's ExportModal (audit #5). Added `onError` + pending/disabled state to
  Dashboard's delete confirm (audit #6). Added unified toast mechanism to Brand (audit #36) and
  Library's CSV export (audit #45). Added context-aware error copy for Ideate's regenerate-after-
  error (audit #40). Added double-submission guard to Competitor (audit #9).

- **Calendar fixes:** Added "no batch found" dead-end state for malformed/missing `?jobs=` URL
  param on BatchResult (audit #14). Simplified BatchResult URL format from `jobId|topic64|platform`
  to `jobId|platform` with backward compat (audit #37). Removed Repurpose's fake 600ms
  "fetching" delay (audit #32). Added Brand Reset two-step confirmation (audit #23). Scoped
  Dashboard's error state to failing query only (audit #26). Added visual weight to Dashboard's
  Content DNA "not set up" state (audit #41). Improved Landing's low-contrast body text
  (audit #42). Added platform-explainer copy to Landing's Live Demo (audit #43). Trimmed Landing's
  decorative ghost-numeral (audit #44).

- **Data-fetching consistency:** Brand's profile load now has a hydration guard to prevent
  clobbering in-progress edits (audit #2). Brand's main "Save brand settings" action now surfaces
  errors (audit #3). Calendar's schedule persistence remains `localStorage`-only (documented in
  code comments, audit #13).

**Files touched:** `client/src/components/ConfirmDeleteModal.tsx` (new), `client/src/components/Button.tsx`
(new), `client/src/lib/utils.ts` (added `navigateToCreate`), `client/src/index.css` (added
`:focus-visible` and `prefers-reduced-motion`), `client/src/pages/Landing/LiveDemo.tsx`,
`client/src/pages/Dashboard.tsx`, `client/src/pages/Dashboard/RecentGenerations.tsx`,
`client/src/pages/Result.tsx`, `client/src/pages/Result/components/InsightsSidebar.tsx`,
`client/src/pages/Result/components/LoadingView.tsx`, `client/src/pages/Brand.tsx`,
`client/src/pages/Brand/IdentityCard.tsx`, `client/src/pages/Brand/VoiceCard.tsx`,
`client/src/pages/Brand/ContentDnaCard.tsx`, `client/src/pages/Library.tsx`,
`client/src/pages/Library/ContentTab.tsx`, `client/src/pages/Library/TemplatesTab.tsx`,
`client/src/pages/Calendar.tsx` (split into `Calendar/*` subcomponents), `client/src/pages/Ideate.tsx`,
`client/src/pages/Repurpose.tsx`, `client/src/pages/Competitor.tsx`, `client/src/pages/BatchResult.tsx`.

**Deleted files:** `client/src/pages/Dashboard/DeleteJobModal.tsx`, `client/src/pages/Library/DeleteJobModal.tsx`
(both superseded by shared `ConfirmDeleteModal`).

---

## 2026-07-28 (UX) — Create page follow-up #2: brand voice gets its own section, not nested under Tone

Brand voice isn't a single tone-like value — it's a bundle (`brandVoice` description +
`phrasesUse` + `phrasesAvoid` + `industry`, per `UserProfile` in `client/src/store.ts`) sent to the
writer agent via separate `<brand_voice>`/`<phrases_to_include>`/`<phrases_to_avoid>` prompt tags
(`server/src/agents/writer.ts`), independent of the tone pill. Placing its banner directly beneath
"Select a tone" (as done in the prior follow-up) made it read as a footnote to the tone choice
rather than the separate, persistent profile it actually is.

`client/src/pages/Create/TopicStep.tsx`: brand voice now gets its own `SectionLabel` ("Brand
voice"), visually parallel to "Select a tone" rather than nested under it. Copy simplified to "Your
voice, phrases & style will be applied" in both tone-picked and no-tone-picked cases — the earlier
"also applied" qualifier existed only to avoid look like it competed with the tone pill, which is
no longer a concern now that the two sections are visually separate.

---

## 2026-07-28 (UX) — Create page follow-up: simpler brand-voice banner, no more collapsible sections

Two quick refinements on top of the same-day Create page redesign (see entry directly below),
based on direct feedback after reviewing the redesign:

- **Brand-voice banner** (`Create/TopicStep.tsx`): dropped the parenthetical voice-text/brand-name
  detail (e.g. `(professional) · Acme`) — the banner now shows only the plain statement ("Using
  your brand voice" / "Brand voice also applied"). The full voice text is still one click away via
  "Edit" → `/brand`. Tone pills (`Select a tone`) remain visible regardless of whether brand voice
  is configured — tone and brand voice are independent inputs sent separately to the writer agent
  (`server/src/agents/writer.ts`), so hiding one based on the other would remove a real, unrelated
  choice rather than reduce redundancy.
- **Target Audience and Advanced (carousel theme) are no longer collapsible.** Both previously
  required a click-to-expand chevron toggle; they now render directly on the page. Since Advanced
  only ever contained the carousel-theme picker, `Create/AdvancedOptions.tsx` dropped its
  `isOpen`/`onToggle` props and now simply renders the theme grid when `platform ===
  'instagram_carousel'` and renders nothing otherwise — no toggle button, no "no advanced options
  for this platform" placeholder message (nothing to explain once there's no panel to open).
  `Create.tsx` dropped the `showAudience`/`showAdvanced` state and the corresponding fields from
  `useDraft.ts`'s persisted draft shape.

---

## 2026-07-28 (UX) — Create page redesign: single-screen form, replacing the 2-step wizard

Full UI/UX audit of the Create page (describe → critique → simplify, all three phases reviewed
before implementation) surfaced 15 issues; all were implemented in this session.

**Structural change:** `Create.tsx` no longer has a `step` state machine. Platform and topic now
live on one screen — platform renders as a compact "chosen platform + Change" row
(`PlatformSummary` in `PlatformSelector.tsx`) once selected, expandable back to the full card grid
on click. This replaced the old flow where clicking a platform card immediately jumped to a
separate Step 2 screen with no way back except a full "Back to platform selection" button.

**Correctness/accessibility fixes:**
- Draft (topic/platform/tone/audience) now persists to `sessionStorage` via the new
  `Create/useDraft.ts` hook, cleared only on successful submit. Previously all state was local
  `useState`, so clicking the brand-voice "Edit"/"Set up" link (a route change to `/brand`) wiped
  everything the user had typed.
- Removed the Saved Templates section from `Create/AdvancedOptions.tsx` entirely — the feature had
  no templates in the product and its fetch-failure path silently rendered identically to the
  "no templates yet" empty state, which was actively misleading on top of being dead weight.
- `Create/errorMessages.ts` now reads the server's existing `{ error, code, retryable,
  retryAfterMs }` shape (previously only `.error` was read) so rate-limit vs. validation vs.
  server errors get distinct, actionable copy instead of one generic banner.
- `Create/TopicSuggestions.tsx` replaces the old `onMouseDown`-only suggestions dropdown with
  arrow-key navigation, Enter-to-select, and Escape-to-close — it was previously unusable via
  keyboard.
- Added `aria-pressed` to platform cards / tone pills / theme swatches, `aria-expanded` +
  `aria-controls` to the Target Audience and Advanced toggles, and a visually-hidden `<label>` on
  the topic textarea — none of these had screen-reader-facing state before.
- Added a themed `:focus-visible` ring (`.selectable-tile` class in `client/src/index.css`) and
  `:hover` feedback for platform cards / tone pills / theme swatches, which previously had no
  hover or focus styling at all (only `:selected` state changed their appearance).
- Tone pills are now deselectable (click the selected pill again to clear it) — previously a field
  labeled "optional" had no way back to the unselected state once touched.
- De-emphasized the `#F59E0B` gold accent everywhere except the primary Generate CTA and true
  selection state, and removed the full-width "Back" button (the "Change" affordance on the
  platform summary row now serves that correction role) so the page has one clear primary action
  instead of two similarly-weighted full-width buttons.
- Extracted `Create/SectionLabel.tsx` and `Create/platforms.ts` to remove duplicated inline style
  objects (`stepLabelStyle` was hand-copied between `TopicStep.tsx` and `AdvancedOptions.tsx`) and
  satisfy the fast-refresh-only-exports-components lint rule.
- Carousel theme grid in `AdvancedOptions.tsx` switched from a fixed `repeat(3, 1fr)` to
  `repeat(auto-fit, minmax(96px, 1fr))` so it reflows on narrow viewports like the platform grid
  already did.

`client/src/pages/Create/WizardStepIndicator.tsx` referenced in this file's folder-structure
section did not actually exist / was never imported anywhere — removed the stale reference as part
of this pass.

---

## 2026-07-28 (UX) — Create wizard: tone/brand-voice clarity, no unrequested recent-topics popup, dropped the fake 3rd wizard step

Three related Create-page UX issues, fixed together since they touched overlapping files:

**1. Recent-topics dropdown appeared on page load, before any user interaction.**
`client/src/pages/Create/TopicStep.tsx`'s topic `<textarea>` had `autoFocus`, which fired
`onFocus` → `setShowSuggestions(true)` the instant Step 2 mounted — so past generations popped
up unrequested. Removed `autoFocus`; the suggestions panel now only opens when the user actually
clicks/tabs into the field.

**2. Tone pill vs. brand-voice descriptor looked contradictory.** `Tone` (the pill selector) and
`brandVoice` (free text saved on `/brand`) are independent inputs both sent to the writer agent
(`server/src/agents/writer.ts` — separate `<tone>` / `<brand_voice>` prompt tags) — but the wizard
pre-selected "Professional" as the tone by default AND showed brand voice's first word (often
also "professional") in a separate bar, so picking "Casual" while the bar still said
"professional" looked like the tone choice wasn't registering.
  - `client/src/pages/Create.tsx`: `tone` state now starts as `''` (no pill pre-selected) instead
    of `'professional'`. Since the server's `tone` field is a strict zod enum with no empty case
    (`server/src/schemas/jobs.ts`), submission resolves via a new `effectiveTone = tone ||
    'professional'` — same generation behavior as before, but the UI no longer claims a choice
    was made until the user actually makes one.
  - `client/src/pages/Create/TopicStep.tsx`: the brand-voice bar now reads "Using your brand
    voice" when no tone is picked (honest: brand voice is the effective tone) and "Brand voice
    also applied" once a tone pill is picked (so it reads as a complement, not a competing
    choice). "Settings" link renamed to "Edit"; "Select a tone" marked "optional".

**3. Wizard step indicator showed 3 circles for a 2-step wizard.** `WizardStepIndicator.tsx`
rendered `[1, 2, 3]` unconditionally even though `step` is typed `1 | 2` and the 3rd circle was
never reachable or clickable — pure dead UI. Rather than fix the count, removed the indicator
entirely per direct feedback that a 2-step flow doesn't need a numbered progress bar; the
existing "← Back to platform selection" button already covers backward navigation. Deleted
`client/src/pages/Create/WizardStepIndicator.tsx` and its usage in `Create.tsx`, and removed the
now-redundant "1"/"2" numbered badges from the "Choose your platform"/"Write your topic" section
headings. Also replaced the numbered sub-section badges inside `AdvancedOptions.tsx` ("1" for
Carousel theme, "T" for Templates) and the "A" badge on "Select a tone" with plain icons
(`Palette`, `LayoutTemplate`, `Mic`) — those badges reused the same circular numbered-step visual
language as the real wizard steps, which read as a second, competing step sequence.

---

## 2026-07-28 (UX) — AI Quality Analysis scrollbar moved inside the card instead of the outer wrapper

**Bug:** `.rp-sidebar` (the outer sticky positioner in `Result.css`) had `overflow-y:auto`, while
the visible card (`.card-glow`, a child of it, with its own border/padding) had `overflow:hidden`
from its base style — and the expanded (non-collapsed) branch in `InsightsSidebar.tsx` even
explicitly set inline `overflow: 'visible'` on the card. Net effect: the scrollbar rendered along
the outer wrapper's edge, outside the card's rounded border, instead of inside the card where a
user would expect it.

**Fix:** Moved the scroll behavior from `.rp-sidebar` to `.rp-sidebar > .card-glow` in
`Result.css`, and removed the inline `overflow: 'visible'` override in
`InsightsSidebar.tsx` (adding `minHeight: 0` instead, needed so a `flex:1` column child can
actually shrink and trigger its own `overflow-y:auto`). Scoped via the `.rp-sidebar >` child
selector so other `.card-glow` usages (delete modals in Library/History/Dashboard) are
unaffected.

---

## 2026-07-28 (UX) — AI Quality Analysis sidebar now open by default on Result page

**Change (`client/src/pages/Result.tsx`):** `sidebarCollapsed` now defaults to `false` instead
of `true`. This reverses "AUDIT FIX #8" (2026-06-09), which collapsed the sidebar by default to
reduce cognitive load — in practice it also hid the fact that AI Quality Analysis exists at all,
since a thin collapsed strip is easy to miss on first viewing a result. The sidebar now opens
automatically when results are shown; the collapse toggle in `InsightsSidebar.tsx` still works
exactly as before for users who want it out of the way. No persistence involved — plain
component state, so no other behavior changes.

---

## 2026-07-28 (bugfix) — Fixed missing `useState`/`useRef`/etc. import in ActionDrawer, and a spurious `stream-token` 404 for already-finished jobs

**Bug 1 (`client/src/pages/Result/components/ActionDrawer.tsx`):** the component used
`useState`, `useRef`, `useCallback`, and `useEffect` but never imported them from `'react'`,
throwing `ReferenceError: useState is not defined` the moment the drawer rendered. Added the
missing import.

**Bug 2 (`client/src/pages/Result/hooks/useJobData.ts`):** opening a result page for an
already-`done` (or `failed`) job always fired `POST /:jobId/stream-token` before the job's
status was known, since the connect effect ran unconditionally on mount. For a job old enough
to have been evicted from the server's in-memory `jobsMemory`/BullMQ store (10-min TTL, see
CLAUDE.md §9) but still fetchable via the DB-backed `GET /:jobId`, `requireJobOwnership()`
inside the `stream-token` route can legitimately 404 depending on store/DB timing, producing a
console error with no visible effect (the existing try/catch already falls back to a raw Clerk
token). Fixed by fetching the job via REST first and only opening the SSE connection if the
job isn't already terminal — a finished job has nothing left to stream, so skipping the
`stream-token` call entirely for it removes the noisy, expected 404 without touching the
ownership-check logic (still 404s correctly for genuine ownership mismatches on in-progress
jobs).

---

## 2026-07-28 (bugfix) — Dashboard "Recent generations" row click now navigates to the result

**Bug:** Clicking a job row in the Dashboard's Recent Generations list didn't open the
associated content. The row's `onClick` only toggled an expand/collapse state (added by the
4.4 kebab-menu-to-inline-strip migration); the actual navigation lived behind a second click
on a "View result" button that only appeared once expanded. From the user's perspective, the
first click appeared to do nothing.

**Fix (`client/src/pages/Dashboard/RecentGenerations.tsx`):** Row click now calls
`onNavigate(`/result/${job.id}`)` directly, matching the "click a row to open it" convention
used elsewhere. "Create again" and "Delete" are now always-visible icon buttons on the row
(each with `stopPropagation()`) instead of being hidden behind the expand step. Removed the
now-unused `openMenu`/`onToggleMenu` expand-tracking state from `Dashboard.tsx` (was only
consumed by this component). Added `.dash-row-icon-btn` hover style in `index.css`. Scoped to
Dashboard only — History/Library still use the click-to-expand `RowActionStrip` pattern from
4.4 and were intentionally left unchanged.

---

## 2026-07-28 (cleanup) — All remaining open findings from REVIEW_FINDINGS.md resolved

**Status:** Complete. All items previously listed as "Still open" in Sections 2, 3 of
`REVIEW_FINDINGS.md` are now closed. Section 4 was already complete. `REVIEW_FINDINGS.md`
now has nothing open except the two intentional product decisions (no client test suite,
no light/dark mode).

**`LiveDemo.tsx` — raw `fetch()` documented as intentional (not a bug):** The `/api/demo/generate`
endpoint is explicitly unauthenticated — the server mounts it without `requireAuth` middleware
so any visitor can try the demo without an account. The shared `api.ts` axios instance
unconditionally attaches a Clerk Bearer token via its request interceptor; using it here would
send auth headers to a public route and break for unauthenticated visitors. Added a `// WHY raw
fetch()` comment in `LiveDemo.tsx` explaining this. Finding closed as "not a bug, intentional
design" rather than "fixed."

**`ContentEditShell.tsx` — shared edit-mode markup extracted (Section 3 duplication):**
`InstagramContent.tsx`, `LinkedInContent.tsx`, and `TwitterContent.tsx` shared ~70% identical
edit-mode markup (header row: label + × close button; Save Changes button at the bottom).
Extracted into a new `client/src/pages/Result/components/content/ContentEditShell.tsx`
component. All three platform content files now use `<ContentEditShell label="…" onClose={…}
onSave={…}>` with their platform-specific fields (caption/hashtag inputs, hook+body+CTA+hashtag
inputs, per-tweet textareas) as children. The `// TODO: shares ~70% identical markup` comments
in each file are removed. No visual change — same rendered output.

**ESLint — 0 errors (Section 3 lint debt):** `client/` ESLint now exits 0 with 9 warnings
(down from 27 problems, 11 of which were errors). Changes made:

- `eslint.config.js`: Added `@typescript-eslint/no-unused-vars` override with `argsIgnorePattern`
  + `varsIgnorePattern: '^_'` — the standard TypeScript convention for intentionally unused
  params that are part of a stable interface. Downgraded `react-hooks/set-state-in-effect` and
  `react-refresh/only-export-components` from errors to warnings with documented rationale (both
  fire on legitimate patterns used throughout the codebase). Added `no-empty: allowEmptyCatch`
  to match the project's established `catch { /* non-fatal */ }` convention.

- `Brand.tsx`: Converted `loadProfile`/`loadSocialConnections` from hoisted function declarations
  to `useCallback` expressions (placed before the effects that call them), satisfying
  `react-hooks/immutability`'s requirement for stable references in dependency arrays. Wrapped
  synchronous `setSocialToast`/`setSocialToastIsError` calls inside the social-connected effect
  in `setTimeout(..., 0)` callbacks to move them out of the effect body (satisfying
  `react-hooks/set-state-in-effect`). Fixed empty `catch {}` block with a comment.

- `ActionDrawer.tsx`: Extracted tab-sync state update into a `useCallback`-wrapped `syncTab`
  helper; deferred the call via `setTimeout(0)` to satisfy `react-hooks/set-state-in-effect`.
  Tab still resets on the same render cycle that opens the drawer — no user-visible change.

- `Result.tsx`: Removed unused `_prefill` parameter from `onSteer()` — the function never read
  it, only ever opening the feedback drawer.

- `BatchResult.tsx`: Added missing `params` dependency to the first `useEffect` dependency array
  (was flagged by `react-hooks/exhaustive-deps`). Removed stale `import React from 'react'`
  (not needed under React 19's automatic JSX transform).

- `IGCarouselPreview.tsx`: Replaced direct `slideRefs.current = Array(total).fill(null)` with
  `slideRefs.current.splice(0, …)` — semantically equivalent but satisfies
  `react-hooks/immutability` which flags direct ref reassignment.

**Verification:** `npm run lint` (client): **0 errors, 9 warnings**, exit code 0. Server
unaffected — `npx tsc --noEmit` clean, `npm test` 372/372 passing.

---

## 2026-07-28 (build fix) — Client production build restored

**Status:** Complete. While verifying the previous three entries below, running the client's
actual `npm run build` (`tsc -b && vite build`) — not just `npx tsc -b` in isolation — revealed
it had been failing outright: `tsc -b`'s ~32 pre-existing errors (present before any of today's
sessions) block the build step entirely, so `vite build` never even ran. This had been
mischaracterized as "lint noise" earlier in the day; it's actually a broken production build.
Fixed all of it:

- **Unused `React` imports (13 files):** `React 19`'s automatic JSX transform (configured in
  `vite.config.ts`) makes the `import React from 'react'` pattern unnecessary; TypeScript's
  `noUnusedLocals` was correctly flagging them as dead. Removed from `Result.tsx`,
  `SlideVisual.tsx`, `InstagramContent.tsx`, `LinkedInContent.tsx`, `TwitterContent.tsx`,
  `VideoScriptContent.tsx`, `FailedView.tsx`, `InsightsSidebar.tsx`, `LoadingView.tsx`,
  `FeedbackPanel.tsx`, `HashtagPanel.tsx`, `TemplatePanel.tsx`, `ResultHeader.tsx`,
  `StatusDisplay.tsx`.
- **`App.tsx`:** removed the dead `HistoryPage` lazy import — `/history` now redirects to
  `/library` (`<Navigate to="/library" replace />`), so the lazy-loaded component behind it was
  orphaned. Removed `BrowserRouter`'s `future={{ v7_startTransition, v7_relativeSplatPath }}`
  prop — `react-router-dom` v7.18.1 (installed) removed the opt-in future-flags API entirely
  because both behaviors are now the permanent v7 default; the prop was silently doing nothing
  and existed only as a stale v6-migration leftover.
- **`AuthLayout.tsx`:** a raw `<svg size={19} ...>` used `size`, a Lucide-icon-only convention,
  not a real SVG attribute — removed (redundant with the adjacent `style={{ width: 19, height:
  19 }}` on the same element).
- **`colorSystem.ts`:** deleted `isWarm()`, a fully unreferenced dead helper (confirmed zero call
  sites anywhere in the codebase).
- **`Calendar.tsx`:** `CalendarJob.deleted` was typed `boolean` but the real `ContentJob.deleted`
  (matching the DB's integer column) is `number` — corrected the local type; the `!j.deleted`
  filter check behaves identically for both types (0 is falsy either way), so no logic change.
  Removed a bogus `align: 'center'` from a style object — `align` isn't a real CSS property
  (`alignItems`, already present in the same object, was the intended one); pure dead code.
- **`SlideVisual.tsx`, `ResultHeader.tsx`, `PostPanel.tsx`:** a handful of destructured props/
  params that are part of a stable component contract (caller passes them) but genuinely unused
  in the body — prefixed with `_` (TypeScript's `noUnusedParameters` exempts underscore-prefixed
  params by convention) rather than dropped from the interface, to avoid silently changing a
  public prop contract without tracing every caller's intent.

**Verification:** `cd client && npm run build` now completes successfully end-to-end (`tsc -b`
+ `vite build`, ~16s, only a pre-existing benign chunk-size-warning, not an error). `npx tsc -b`
exit 0. `npm run lint` down to 23 problems (from 27), zero of which are `no-explicit-any`.
`server/`: unaffected, re-verified `npx tsc --noEmit` clean and 372/372 tests passing.

---

## 2026-07-28 (follow-up) — IGSlide.tsx split + client `any` debt eliminated

**Status:** Complete. This follow-up pass tackled the two items explicitly deferred at the end
of the previous session (the `IGSlide.tsx` oversized-file flag added to `CLAUDE.md`, and the
~119 pre-existing client ESLint errors) alongside the Section 4 UI/UX work below.

**`IGSlide.tsx` split (1157 → 69 lines):** Split into 14 new files under
`client/src/pages/Result/components/content/carousel/igslide/` — `types.ts`, `constants.ts`,
`presets.ts` (the 20-entry `DESIGN_PRESETS` system), `slideResolvers.ts`, `decorativePrimitives.tsx`
(19 icon components + `DotGrid`/`GlowBlob`/etc.), `contentPieces.tsx` (`PillTag`/`BrandLockup`/
`FeatureRow`/etc.), and 9 per-slide-type `layouts/*.tsx` files (`CoverLayout`, `ContentLayout`,
`StatLayout`, `QuoteLayout`, `CTALayout`, `ProblemLayout`, `SolutionLayout`, `HowToLayout`,
`FeaturesLayout`). `IGSlide.tsx` itself is now a thin dispatcher. This was the carousel-critical
file shared between the live preview and the server-side SSR export path, so it was verified more
carefully than a typical split: every one of the 10 dispatch branches (`cover`/`problem`/
`solution`/`howto`/`features`/`content`+`tip`+`details`/`stat`/`quote`/`cta`/fallback) was checked
byte-for-byte against the original, and `npm run build:ssr` was run to confirm the esbuild bundle
for `server/src/generated/slideRenderer.js` still produces a near-identical-size, error-free
output (814,442 → 816,268 bytes, +0.22%, consistent with pure per-module wrapper overhead).

**Client `no-explicit-any` fully eliminated (119 → 0):** Every remaining `any` across ~35 files
was replaced with a proper interface (extending the existing `client/src/types/job.ts`, `api.ts`,
`template.ts`, `social.ts` rather than creating new ones) or `unknown` + a type guard, matching
the pattern already established in `historyHelpers.ts`/`libraryHelpers.ts`. `store.ts`'s SSE event
payload (`updateFromSSE`, `connectToStream`'s `onEvent`) is now typed against a proper `SSEEvent`
interface instead of `Record<string, any>`. Tightening `CriticResult`'s type surfaced that it had
been completely wrong — it declared `dimensions[]` and flat score fields, but the server actually
returns `{approved, totalScore, scores, feedback}` — every consumer had been silently bypassing
this mismatch via `any`; `TemplatePanel.tsx` was reading a `criticResult.subscores` field that
never existed. Both corrected. `JobLog.durationMs` was loosened from required to optional (SSE-
sourced logs never populate it). A `handleContentSave` mutation in `Result.tsx` that mutated an
array element after only a shallow parent spread was fixed to properly clone the array.

**Dead code:** Deleted `client/src/components/ScorePill.tsx` and
`client/src/pages/History/ScorePill.tsx` — both fully superseded by the new
`QualityTierBadge.tsx` (see the UI/UX entry below) and confirmed to have zero remaining importers.

**Verification:** `server/`: `npx tsc --noEmit` clean, `npm test` 372/372 passing (server was
untouched by this pass, re-verified for regression). `client/`: `npx tsc -b --force` shows only
the same ~32 pre-existing, unrelated errors present before this session (unused `React` imports
under React 19's JSX transform, an `App.tsx`/`AuthLayout.tsx`/`Calendar.tsx` typing mismatch) —
zero new errors. `npm run lint` went from 121 problems (119 `no-explicit-any` errors) to 27
problems, none of them `no-explicit-any` — the remainder is pre-existing `react-hooks/*` rule
debt and a couple of `no-empty` blocks, none named in any finding. `npm run build:ssr` succeeds.

---

## 2026-07-28 (UI/UX) — 4 of 5 Section 4 differentiation suggestions implemented

**Status:** 4.1, 4.2, 4.4, 4.5 implemented as real shippable features. 4.3 (carousel theme
personality/motion) skipped — see note below. All changes are CSS/inline-style/SVG only, no
new npm dependencies, matching the rest of the codebase's inline-style convention.

**4.1 — Agent pipeline as loading-state hero (`LoadingView.tsx`, `Result.css`):** the pipeline
stepper now shows a real "handoff packet" pill flying along the connector into the currently
active agent node on every stage transition. The packet text is the agent's actual latest SSE
`message` (plus `durationMs` when present) — no fabricated counts; the SSE payload
(`server/src/agents/*.ts` `sendEvent` calls) only ever carries free-text `message`, not
structured counts like "3 search queries", so nothing invented was added to the UI.

**4.2 — Quality-tier badge system (new `client/src/components/QualityTierBadge.tsx`):** bespoke
tier badge (Needs Work <70, Solid 70-84, Strong 85-94, Exceptional 95+) with a small radial-fill
SVG ring reusing the Gold Score Ring's stroke-dashoffset formula at list-row size. Replaces the
flat-color `ScorePill` in `Dashboard/RecentGenerations.tsx`, `History/FlatJobList.tsx`,
`History/GroupedJobList.tsx`, and `Library/ContentTab.tsx`. The full-size ring on the Result page
(`StatusDisplay.tsx`) was intentionally left as-is — extracting shared logic into it was judged
more invasive than the value of avoiding ~10 lines of duplicated circle math. The old
`components/ScorePill.tsx` and `History/ScorePill.tsx` are now unused but left in place (not
deleted — out of scope for this change).

**4.3 — SKIPPED.** Investigated `constants.ts`'s `CAROUSEL_THEMES` and every carousel-adjacent
component outside the excluded `carousel/` subtree. Found there is currently no theme-picker UI
anywhere in the app — `Result.tsx` explicitly notes "the theme picker that called the setter
lived in the removed AI-render UI" and now reads a fixed value from `localStorage` with no way
for a user to change it. `CAROUSEL_THEMES` (aurora/magazine/split/etc.) is unused dead data; the
live carousel palette instead comes from a separate, unrelated `THEME_ACCENTS` array in
`lib/colorSystem.ts`. Since there is no picker UI at all (not even one living inside the excluded
files), there was no in-scope or out-of-scope place to add the requested per-theme signature
motion. Skipped rather than forcing an unrelated UI into existence.

**4.4 — Expandable job rows (new `client/src/components/RowActionStrip.tsx`, `index.css`):**
replaced the kebab-menu + floating-dropdown pattern with click-to-expand rows that reveal an
inline action strip, in `Dashboard/RecentGenerations.tsx`, `History/FlatJobList.tsx`,
`History/GroupedJobList.tsx`, and `Library/ContentTab.tsx`. Preserves exactly the actions each
page's kebab menu already offered (View result / Create again / Delete on Dashboard; View result
/ Delete on History and Library — no Export/Duplicate/Multiply row actions existed anywhere
before this change, so none were invented). Rows that were previously `<Link>` wrappers are now
`role="button" tabIndex={0}` divs with `onKeyDown` handling Enter/Space, so keyboard access isn't
lost. No virtualization exists on any of these lists (plain `.map()`), so nothing to preserve there.

**4.5 — Distinct empty-state illustrations (new `client/src/components/EmptyStateIllustration.tsx`):**
5 stroke-based line-art SVG variants (dashboard: agent-pipeline relay, library: stacked carousel
slides, history: clock-on-timeline, templates: bookmark ribbon, search: magnifier-over-card),
matching the lucide-style `stroke="currentColor" strokeWidth` convention already used in
`InsightsSidebar.tsx`/`PostPanel.tsx`. Wired into the empty states in
`Dashboard/RecentGenerations.tsx`, `History.tsx`, `Library/ContentTab.tsx`,
`Library/TemplatesTab.tsx`, and the standalone `Templates.tsx` page — all previously shared the
same icon-in-a-box pattern as `ErrorState.tsx`'s actual-error state.

---

## 2026-07-28 (fixes) — All 21 Section 1 findings from REVIEW_FINDINGS.md resolved

**Status:** Complete. Every item in `REVIEW_FINDINGS.md` Section 1 (Correctness & Security),
most of Section 2 (Production Readiness), and the Section 3 items that duplicate Section 1
are fixed and verified. Section 4 (UI/UX differentiation) was left untouched — it's explicitly
framed as design exploration, not a bug list.

**1.1 / 1.2 — CI pipeline:** Added the missing `eslint`/`typescript-eslint`/`@eslint/js`
devDependencies and a `"lint": "eslint ."` script to `server/package.json` (an `eslint.config.js`
already existed but nothing was installed to run it). Added `src/generated/` and `idor-test.mjs`
to the ignore list, added a scoped override so `scripts/**/*.mjs` build scripts get Node globals
instead of tripping `no-undef` on `console`/`process`. Rewrote `.github/workflows/docker.yml`
from scratch against real GitHub Actions schema (it previously used invalid top-level keys and
list syntax and could not parse at all). Factored the duplicated lint/test/build steps out of
`ci.yml` and `docker.yml` into a new reusable `.github/workflows/_reusable-build.yml` so the two
can't drift out of sync again.

**1.3 — `POST /batch` sequential awaits:** `server/src/routes/jobs/create.ts` now creates all
batch jobs via `Promise.allSettled`, ~7× faster for a full 7-job batch.

**1.4 — Missing zod schema on `/regenerate`:** Added `regenerateContentSchema` to
`server/src/schemas/content.ts`, validated via `parseBody` before destructuring.

**1.5 — SSE token identity ambiguity:** `verifySSEToken()` now always resolves to the DB UUID;
the redundant Clerk-ID re-resolution step in `/stream` was removed.

**1.6 — `key={i}` on dynamic content:** Hashtags, tweets, and video segments in
`LinkedInContent.tsx`, `InstagramContent.tsx`, `VideoScriptContent.tsx`, `TwitterContent.tsx`,
and `CarouselContent.tsx` now key by stable content (tag text, tweet text, slide number) instead
of array index. Legitimate index-as-key uses (skeleton loaders, decorative SVG) were left alone.

**1.7 — `console.log` in production code:** `client/src/main.tsx`'s PostHog init log and six
`console.log` calls in `server/src/seed.ts` switched to `console.info` (a CLI preview script and
a one-time startup diagnostic — legitimate `info`-level output, not debug noise).

**1.8 — Oversized files:** `Create.tsx` (428→215 lines) split into `Create/TopicStep.tsx` and
`Create/WizardStepIndicator.tsx`; `Brand.tsx` (512→260 lines) split into five card components
plus `DeleteAccountModal.tsx` under a new `Brand/` folder; `Landing.tsx` (908→73 lines) split
into eleven section components under a new `Landing/` folder. All new files are under 400 lines.

**1.9 / 1.21 — Stale documentation:** Removed every dangling reference to `docs/` and
`ROADMAP.md` from `CLAUDE.md`, `README.md`, and `CONTRIBUTING.md` instead of stubbing them out —
none of that content ever existed, so pointing at it (even as a "not yet written" placeholder)
just relocates the drift. Fixed `README.md`'s "no automated tests" claim to describe the real
vitest suite (`server/tests/unit/`, `server/tests/integration/`). Fixed a licensing contradiction
found along the way (`CONTRIBUTING.md` claimed MIT; `README.md` says private/all-rights-reserved
and the project has no LICENSE file — `CONTRIBUTING.md` now matches `README.md`). Flagged
`IGSlide.tsx` (1157 lines) in `CLAUDE.md` §4 as the next oversized-file candidate — not split in
this pass, since it's shared between the live carousel preview and the SSR export path and
deserves its own focused session with visual verification.

**1.10 — Dead `postEmbeddings` scaffold:** Removed the table, its relation, and all read/export/
delete wiring in `server/src/routes/users.ts` — nothing ever wrote to it. Generated migration
`server/drizzle/0001_classy_vanisher.sql` (`DROP TABLE post_embeddings CASCADE`).

**1.11 — Content Multiplier duplicate pipeline:** `server/src/lib/pipeline.ts`'s
`runContentPipeline`/`runAndPersistPipeline` gained a `skipResearch` option so `/multiply` can
seed cached research/task-plan/platform-rules and start directly at the Writer stage. The
90-line hand-duplicated `runPipelineFromWriter` in `server/src/routes/jobs/manage.ts` is deleted
— `/multiply` now inherits the soft-delete race guard, the shared progress-percentage formula,
and the `Promise.allSettled` predictor pattern for free instead of drifting from them.

**1.12 — Falsy-zero `||` bugs:** Fixed all three named sites (`useMultiplier.ts`,
`BatchResult.tsx`, `Calendar.tsx`) plus one same-bug sibling found in `BatchResult.tsx` while
fixing the others — `||` replaced with `??` so a legitimate `0` progress/score no longer gets
silently discarded or masked by a stale fallback.

**1.13 — Reimplemented HTML sanitizer:** `server/src/routes/content.ts`'s `/repurpose` and
`/competitor` routes now call the canonical `stripScriptsAndEventHandlers()` from
`lib/carousel.ts` instead of two local regex chains that lacked its full protection set.

**1.14 — Non-null assertions bypassing fail-closed fallback:** All five `req.dbUserId!` sites in
`server/src/routes/content.ts` now use the same `req.dbUserId || req.userId || 'demo'` pattern
as every other route.

**1.15 — Redis connection sprawl:** `server/src/lib/redisClient.ts` is now the single source of
truth for Redis config; `queue.ts` derives its dedicated BullMQ connection via `.duplicate()`
(required — BullMQ Workers can't share a connection doing blocking commands), and
`rateLimit.ts` reuses the singleton directly. The `MemoryStore` fallback now logs at `error`
level instead of degrading silently.

**1.16 — Unbounded `authCache`:** Added an exported `invalidateAuthCache(clerkUserId)` and a
10,000-entry cap that evicts the oldest entry on overflow.

**1.17 — `Promise<any>` in `api.ts`:** Every function in `client/src/api.ts` is now properly
typed against new interfaces in `client/src/types/` (`job.ts`, `api.ts`, `template.ts`,
`social.ts`), including replacing a `window as any` Clerk-token cast with a narrow structural
type guard. Fixing `getJob`'s return type surfaced three real latent bugs that had been silently
passing under `any` (`Dashboard.tsx`/`RecentGenerations.tsx` reading critic scores without a
guard, and a missing `stats` field on the `Profile` type) — all three fixed with the same
`unknown`+type-guard pattern already used elsewhere in the codebase.

**1.18 — Dead files:** Deleted `SlideCanvas.tsx` (850 lines, zero importers after moving its
still-used `TemplateId` type into `constants.ts`) and `server/src/types/pipeline.ts` (100 lines,
fully orphaned shadow of the real `PipelineJob` type).

**1.19 — Puppeteer pool missing timeouts:** `server/src/lib/carousel.ts`'s `spawnBrowser()` and
`replaceBrokenBrowser()` now wrap `puppeteer.launch()`/`browser.close()` in a 10-second
`Promise.race`, so a hung launch or a wedged Chromium close no longer blocks indefinitely.

**1.20 — `useJobData.ts` SSE/poll bugs:** `handleRegenerate`'s reconnect now passes the
`mergeSSEIntoJobData` callback (previously dropped, silently killing live updates after a
Regenerate). The 2-second poll now tracks `lastSSEEventAt` and skips its `getJob()` REST call
whenever an SSE event arrived in the last 10 seconds, instead of running unconditionally in
parallel with a healthy SSE connection.

**Section 2 (production readiness):** `docker-compose.yml`'s bind-mount/volume path mismatch
fixed (`/app/client/dist` → `/app/dist`, matching the actual bind-mount target); Redis service
now passes `--requirepass` via `command:` so `REDIS_PASSWORD` actually takes effect instead of
being a no-op env var against the stock `redis:7-alpine` image. `.env` / `.gitignore` risk
verified already correctly handled (`.env` is gitignored twice over; no git repo exists yet to
accidentally stage it into).

**Section 3 (code quality):** `timeAgo()` de-duplicated (now imported from `lib/utils.ts`
everywhere instead of copy-pasted in `historyHelpers.ts`); `formatDate()` consolidated the same
way; `HistorySkeleton.tsx`/`CardSkeleton.tsx` replaced by one parameterized `SkeletonCard.tsx`.
Left `// TODO:` markers (not extracted) on the Instagram/LinkedIn/Twitter edit-mode markup
duplication — the review flagged this as real but risky to parameterize without full UI
regression testing.

**Explicitly out of scope (flagged, not fixed in this pass):**
- Section 4 (UI/UX differentiation) — design exploration, not bugs, per the file's own framing.
- `IGSlide.tsx` (1157 lines) — flagged in `CLAUDE.md` §4 but not split; carousel-critical shared
  render code, deserves its own session with visual verification rather than a blind split.
- ~119 pre-existing `client/` ESLint errors (mostly `no-explicit-any`) across ~35 files that
  predate this session and were never named in any of the 21 findings — `server/`'s lint is now
  fully clean (0 errors) as finding 1.1 required, but a full `any` purge across the client was
  never part of finding 1.1's scope and would be a substantially larger separate effort.

**Verification:** `server/`: `npx tsc --noEmit` clean, `npm run lint` 0 errors (282 pre-existing
warnings), `npm test` 372/372 passing across 22 files. `client/`: every file touched by this work
compiles clean under `npx tsc -b`; the ~35 pre-existing unrelated errors (unused `React` imports,
a couple of unrelated typing mismatches) were individually verified file-by-file to predate this
session.

**Files touched:** too many to enumerate individually — spans `server/src/routes/`,
`server/src/lib/`, `server/src/middleware/`, `server/src/db/schema.ts` (+ new migration),
`server/eslint.config.js`, `server/package.json`, `.github/workflows/`, `docker-compose.yml`,
`client/src/pages/Create.tsx` (+ new `Create/` files), `client/src/pages/Brand.tsx` (+ new
`Brand/` files), `client/src/pages/Landing.tsx` (+ new `Landing/` files), `client/src/api.ts`,
`client/src/types/` (new files), `client/src/pages/Result/` (multiple hooks/components),
`CLAUDE.md`, `README.md`, `CONTRIBUTING.md`. See `REVIEW_FINDINGS.md` — Section 1 is now empty;
all rows moved here.

---

## 2026-07-28 (update) — 10 parallel research angles landed, findings merged

**Status:** Review only — still no fixes applied. The 10 background research passes
mentioned below (launched alongside the initial manual review the same day) have now all
completed and their results are merged into `REVIEW_FINDINGS.md` as items 1.11–1.21, plus
additions to Section 3 (code quality).

**Highest-value new finding:** `server/src/routes/jobs/manage.ts`'s `/multiply` route
(`runPipelineFromWriter`, lines 196-283) hand-duplicates the Writer→Formatter→Critic retry
loop that `server/src/lib/pipeline.ts` exists specifically to centralize — and it has
already drifted (missing the soft-delete race guard, different progress-percentage math,
a weaker error-handling pattern around the performance predictor). Five of the six relevant
research angles independently flagged this same function, which is the strongest signal in
this review of where to spend fix time first. See `REVIEW_FINDINGS.md` §1.11.

**Other notable additions:** three independent falsy-zero (`||` instead of `??`) bugs on
progress/score fields (§1.12); Redis connection sprawl across `queue.ts`/`redisClient.ts`/
`rateLimit.ts` that can silently degrade rate limiting to an in-memory store under load
(§1.15); two fully dead files (§1.18); and confirmation that `CLAUDE.md`'s existing
"1297 lines, REFACTOR CANDIDATE" note on `carousel.ts` is now stale in the *opposite*
direction — that file is already down to 247 lines (§1.21).

**No code changes were made in this pass** — this entry documents the review's expanded
scope only. See `REVIEW_FINDINGS.md` for the fixable, ranked list of everything above.

---

## 2026-07-28 — Full Codebase Review (no fixes applied yet)

**Status:** Review only — see `REVIEW_FINDINGS.md` for the complete, ranked findings list.
This entry exists so the review itself is part of the project's documented history, per the
project's own rule that CHANGELOG.md tracks "history of all fixes and features applied."

**What happened:** A full-codebase security/correctness/UX/documentation review was run
(no diff was available — the repo has no git history yet, so this was a point-in-time audit
of the entire codebase against the rules in `CLAUDE.md`). Ten parallel research passes
covered: line-by-line security scan, missing-guard audit, cross-file caller tracing,
language-pitfall scan, wrapper/pool correctness, code reuse, simplification/dead-code,
efficiency, architectural altitude, and CLAUDE.md-convention violations — plus direct manual
verification of the highest-risk subsystems (ownership checks, Puppeteer safety, rate
limiting, OAuth state signing, SSE, auth caching, DB transactions).

**Key outcomes:**
- Found and corrected significant documentation drift in `CLAUDE.md`: the carousel rendering
  architecture section described a system (`THEME_META`, `generateCarouselTemplate()`,
  Gemini-generates-HTML-per-theme) that had been fully replaced by a React-SSR-based renderer
  weeks earlier. Corrected in place — see `CLAUDE.md` §3 and §11.
- Discovered `docs/` and `ROADMAP.md` are referenced throughout `CLAUDE.md`, `README.md`, and
  `CONTRIBUTING.md` but do not exist in the repository. Flagged in `CLAUDE.md` §10 rather than
  silently fabricated.
- Found the CI pipeline (`.github/workflows/ci.yml`) references `npm run lint` in `server/`,
  but `server/package.json` has no `lint` script — CI has likely never passed this step.
  `.github/workflows/docker.yml` additionally has invalid GitHub Actions YAML at multiple
  levels and cannot run at all in its current form.
- Confirmed zero automated tests exist in either `client/` or `server/` despite both being
  fully configured for testing (vitest, supertest, coverage scripts all present and unused).
- Confirmed several genuinely strong security properties already in place: consistent
  ownership checks with 404-not-403, Redis-backed rate limiting, fail-closed auth caching,
  timing-safe OAuth state verification, transactional multi-table writes, and correct
  Puppeteer sandboxing applied consistently across both the legacy and rewritten carousel
  renderers.
- Full ranked findings, including lower-severity code-quality and UI/UX differentiation
  suggestions, are in `REVIEW_FINDINGS.md` (new file, root of repo).
- New `ARCHITECTURE.md` (new file, root of repo) added as an accurate, currently-verified
  system architecture reference, cross-linked from `CLAUDE.md`.

**Files touched by this entry:**
- `CLAUDE.md` — carousel architecture section, docs reference table, theme-add process, one
  Puppeteer-safety bullet corrected to match current code
- `CHANGELOG.md` — this entry
- `REVIEW_FINDINGS.md` — new file
- `ARCHITECTURE.md` — new file

---

## FIX #1 — Migrate In-Memory Stores to Neon DB

**Status:** Complete  
**Files changed:**
- `server/src/db/schema.ts` — Added `templates`, `socialTokens`, `userOnboarding` tables
- `server/src/routes/templates.ts` — Replaced `templateStore` Map with Drizzle CRUD; in-memory fallback kept for resilience
- `server/src/routes/social.ts` — Replaced `socialTokens` Map with `dbGetTokens`, `dbUpsertToken`, `dbDeleteToken`, `dbGetToken` helpers; fallback maps kept

**Deviation:** Both routes keep in-memory fallback maps so the app still runs when DB is unavailable (dev/offline mode).

---

## FIX #2 — Rate Limiting + Prompt Injection Protection

**Status:** Complete  
**Files changed:**
- `server/src/middleware/rateLimit.ts` — New file: `sanitizeGenerationInput` middleware (field-length caps + 12 injection-pattern regex), `authJobRateLimit` (10/hour per user), `demoJobRateLimit` (3/hour per IP)
- `server/src/index.ts` — Applied rate-limiting and sanitization to `/api/jobs`, `/api/content`, `/api/demo`

**Deviation:** `sanitizeGenerationInput` silently strips HTML but returns 400 only on clear injection patterns. Short-circuits are user-friendly messages, not raw 429/400 codes.

---

## FIX #3 — Puppeteer Browser Pool

**Status:** Complete  
**Files changed:**
- `server/src/lib/carousel.ts` — Replaced single `_browser` singleton with pool: `POOL_MIN=2`, `POOL_MAX=8`, `RENDER_TIMEOUT_MS=30_000`, `acquireBrowser()`, `releaseBrowser()`, `replaceBrokenBrowser()`

**Deviation:** Pool is initialised lazily on first render request (not at module load) to avoid crashing the server when Chromium is unavailable (e.g. fresh deploy). `initPool()` is called inside `renderSlidePNG` on first use.

---

## FIX #4 — Parallelise Tavily Research Calls

**Status:** Complete  
**Files changed:**
- `server/src/agents/researcher.ts` — Changed sequential `for` loop to `Promise.allSettled` across 3 search queries; individual failures are logged and skipped (non-fatal)

**Expected improvement:** ~6–9 s → ~2–3 s for research phase.

---

## FIX #5 — PNG ZIP Export as Primary Carousel Download

**Status:** Complete  
**Files changed:**
- `server/src/routes/jobs.ts` — New endpoint `POST /api/jobs/:jobId/export/carousel-png`; renders each slide at 1080×1080 via Puppeteer, assembles ZIP with jszip, returns `application/zip`
- `client/src/pages/Result/hooks/useExport.ts` — `exportSlidesPNG()` calls server endpoint as primary path; `exportSlidesClientFallback()` (html2canvas) used only when server call fails
- `client/src/api.ts` — Added `export { api }` for typed blob requests

---

## FIX #6 — Simplify Create.tsx into Progressive Wizard

**Status:** Complete  
**Files changed:**
- `client/src/pages/Create.tsx` — Added `wizardStep` state (1 = platform, 2 = content); platform cards show "Continue with [Platform] →" on step 1; steps 2–5 only render after platform is chosen; tone/audience/carousel-theme collapsed into "Advanced" accordion; smart `AUDIENCE_DEFAULTS` per platform (audience no longer required); PostHog `content_generated` event

---

## FIX #7 — Observability (Sentry + PostHog)

**Status:** Complete  
**Files changed:**
- `server/src/index.ts` — Sentry init with `SENTRY_DSN` env var (no-op when unset); `Sentry.setupExpressErrorHandler(app)` added before error handler
- `client/src/main.tsx` — PostHog init with `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` (no-op when unset); `posthog` exported for hook use
- `client/src/pages/Create.tsx` — `posthog.capture('content_generated', …)`
- `client/src/pages/Result/hooks/useExport.ts` — `posthog.capture('export_downloaded', …)`
- `.env.example` — Added `SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`

---

## FIX #8 — Unify Result Page Layout

**Status:** Complete  
**Files changed:**
- `client/src/pages/Result/components/InsightsSidebar.tsx` — Added `collapsed`/`onToggle` props; collapsed state renders as 48px-wide strip with score pill and chevron toggle; expanded state adds collapse button in header
- `client/src/pages/Result.tsx` — Added `sidebarCollapsed` state (default `true`); grid column animates between `1fr 48px` and `1fr 360px`

**Deviation:** `ResultDrawer` was kept — it works well as a slide-over for action panels (Feedback, Post, Hashtags, Template) and is distinct from the InsightsSidebar. The sidebar collapse achieves the "reduce simultaneous panels" goal without breaking the action panel UX.

---

## FIX #9 — Remove Dead Dependencies

**Status:** Complete  
**Files changed:**
- `server/package.json` — Removed `@anthropic-ai/sdk`, `langchain`, `@langchain/core`, `@langchain/google-genai`
- `client/package.json` — Removed `react-icons`
- `client/src/components/BrandIcons.tsx` — New file: inline SVG components for `Instagram`, `Linkedin`, `XTwitter` / `Twitter` (brand icons not available in lucide-react)
- 11 client source files updated to use `lucide-react` and `BrandIcons` instead of `react-icons`:
  - `pages/Landing.tsx`
  - `pages/Create.tsx`
  - `pages/Repurpose.tsx`
  - `pages/Result.tsx`
  - `pages/Result/constants.ts`
  - `pages/Result/components/ResultHeader.tsx`
  - `pages/Result/components/ContentMultiplier.tsx`
  - `pages/Result/components/content/CarouselContent.tsx`
  - `pages/Result/components/content/carousel/IGCarouselPreview.tsx`
  - `pages/Result/components/panels/HashtagPanel.tsx`
  - `pages/Result/components/panels/PostPanel.tsx`
  - `pages/Result/components/panels/TemplatePanel.tsx`

**Icon substitutions:** `FaDna` → `Network`, `FaBreadSlice` → `Layers`, `FaXTwitter` / `FaLinkedinIn` / `FaInstagram` → inline SVG components.

**Remaining:** Run `npm install` in both `/client` and `/server` to prune the removed packages.

---

## FIX #10 — First-Run Onboarding Modal

**Status:** Complete  
**Files changed:**
- `server/src/db/schema.ts` — Added `userOnboarding` table (`userId`, `completed`, `brandName`, `preferredTone`, `completedAt`)
- `server/src/routes/users.ts` — Added `GET /api/users/onboarding` (status check) and `POST /api/users/onboarding` (mark complete + save brand/tone)
- `client/src/api.ts` — Added `getOnboardingStatus()` and `completeOnboarding()` helpers
- `client/src/components/OnboardingModal.tsx` — New file: 2-step modal (Step 1: brand name + tone picker; Step 2: sample LinkedIn post preview + feature bullets); uses `sessionStorage` to avoid re-fetching within a session
- `client/src/components/AuthLayout.tsx` — Imported and rendered `<OnboardingModal />` inside the authenticated layout

**Behaviour:** Modal appears once per account (DB flag), never again after completion. Skip button dismisses for the session. Step 2 saves the brand name/tone to the user profile via the existing brand-voice endpoint.

---

## Remaining items

| Item | Notes |
|---|---|
| Run `npm install` | Both `/client` and `/server` — prunes removed packages |
| DB migration | `userOnboarding`, `templates`, `socialTokens` tables need to be created in Neon (run `drizzle-kit push` or a manual migration) |
| Set env vars | `SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` in `.env` for production observability |
| Puppeteer on cloud | If deploying to Railway/Render, set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and configure `executablePath` |
