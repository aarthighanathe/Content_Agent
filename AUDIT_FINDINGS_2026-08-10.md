# ContentAgent — Full-Codebase Audit Findings (2026-08-10)

> Consolidated output of running all 17 prompt files in `prompts/` (7 full-codebase audits,
> `pre-pr-checklist.md`, root `TESTING_PROMPT.md`, and all 10 `code-review-angles/*` files —
> the latter normally diff-scoped, rescoped to the whole codebase since there was no active
> diff at the time of this run) in parallel against the entire repo, static-analysis only (no
> running instance/browser available in the agent sandbox).
>
> `REVIEW_FINDINGS.md` does not exist in this repo despite CLAUDE.md §10 listing it as present —
> **every single audit below independently confirmed this** and proceeded without cross-checking
> it. This is the single most-repeated meta-finding across the whole run (see Meta-Findings).
>
> **Status: 18 / 18 done.** All audits complete. Three agents (`mobile-responsive-audit.md`,
> `TESTING_PROMPT.md`, `code-review-angles/10-simplification.md`) initially failed on a
> transient session API rate limit and were successfully retried. `TESTING_PROMPT.md`'s original
> (slow) run turned out not to have actually failed — it landed late, after its retry had already
> completed — so §18 below folds in both runs, using the fuller original as primary.

---

## Status

| # | Audit | Status |
|---|---|---|
| 1 | `security-audit.md` | ✅ done |
| 2 | `ui-ux-audit.md` | ✅ done |
| 3 | `flow-audit.md` | ✅ done |
| 4 | `bug-hunt.md` | ✅ done |
| 5 | `performance-audit.md` | ✅ done |
| 6 | `mobile-responsive-audit.md` | ✅ done |
| 7 | `production-readiness-checklist.md` | ✅ done |
| 8 | `pre-pr-checklist.md` (whole-codebase rescope) | ✅ done |
| 9 | `TESTING_PROMPT.md` | ✅ done |
| 10 | `code-review-angles/01-correctness.md` | ✅ done |
| 11 | `code-review-angles/02-security.md` | ✅ done |
| 12 | `code-review-angles/03-architecture-consistency.md` | ✅ done |
| 13 | `code-review-angles/04-type-safety.md` | ✅ done |
| 14 | `code-review-angles/05-react-frontend.md` | ✅ done |
| 15 | `code-review-angles/06-api-backend.md` | ✅ done |
| 16 | `code-review-angles/07-performance-efficiency.md` | ✅ done |
| 17 | `code-review-angles/08-test-coverage.md` | ✅ done |
| 18 | `code-review-angles/09-readability-maintainability.md` | ✅ done |
| 19 | `code-review-angles/10-simplification.md` | ✅ done |

---

## Executive Summary

### Critical / High severity

0. **[Critical][Mobile]** The Instagram carousel preview (`IGCarouselPreview.tsx`) — the app's flagship visual feature — renders at a **hardcoded fixed width of 420px with zero responsive scaling anywhere in its render chain** (confirmed independently by both `mobile-responsive-audit` and `TESTING_PROMPT`). On any viewport under ~452px (i.e. the large majority of real phones, including the explicitly-tested 375px/390px breakpoints), it silently overflows/clips horizontally, cutting off the right edge of the preview including the next-slide navigation control. A dead, previously-correct responsive CSS implementation (`.rp-ig-slide` with `width:100%; max-width:520px; aspect-ratio:1/1` plus `clamp()`-based fonts) already exists in `Result.css` but has zero `.tsx` consumers — this is a regression, not a gap that was never addressed. — *mobile-responsive-audit, TESTING_PROMPT*
1. **[High][Security]** `TOKEN_ENCRYPTION_KEY` is `.optional()` in `config.ts` and never validated as required at boot, contradicting CLAUDE.md §12's explicit claim. When absent, `dbUpsertToken()` silently falls back to storing **plaintext OAuth access/refresh tokens** in an in-process Map instead of failing the request — a silent, total loss of the "AES-256-GCM at rest" guarantee. — *security-audit*
2. **[High]** `server/src/routes/feedMonitors.ts` — every route hangs with **zero response ever sent** when `db` is unavailable (the shared `requireUserId()` guard never checks `db`, unlike sibling files' `requireDbUser()`). — *bug-hunt*
3. **[High]** Timezone mismatch between Calendar's local-date scheduling and the server's UTC-interpreted `publishDelayMs()` — auto-publish can silently fire up to ~16 hours off from what a non-UTC user expects, with negative delays silently clamped to "fire almost immediately" rather than erroring. — *bug-hunt*
4. **[Not ready — Data safety]** Account deletion never removes `feed_monitors` rows (no FK constraint on that table). A deleted user's active feed monitor keeps polling every 30 minutes **forever**, burning real Gemini/Tavily quota on every tick with the resulting job insert failing silently in a catch block that still advances the cursor — a live, unbounded cost leak with zero visibility. — *production-readiness-checklist*
5. **[Not ready — Deployment]** Database migrations are **not wired into the deploy pipeline** (`render.yaml`'s `buildCommand` never runs `db:migrate`) — schema changes must be applied manually with no automated gate. — *production-readiness-checklist*
6. **[Not ready — Observability]** `render.yaml`'s `healthCheckPath` points at `/api/health` (always green) instead of `/api/ready` (which actually checks DB/Redis) — Render's restart/rollback logic never observes a real DB or Redis outage. — *production-readiness-checklist*
7. **[Critical][Usability]** Collection delete and social-account disconnect fire their destructive mutation with **zero confirmation step**. — *ui-ux-audit*
8. **[High][Accessibility]** `IdeaCard.tsx` nests real `<button>` elements inside a parent `role="button"` div — invalid ARIA/HTML. — *ui-ux-audit*
9. **[High-risk / test gap]** `server/src/routes/collections.ts` and `server/src/routes/feedMonitors.ts` have **zero test coverage**, including IDOR-relevant ownership checks and (for feedMonitors) whether the rate limiter is actually mounted on the pipeline-triggering `/check` route. — *angle 08*

### Major

10. **[Major]** `updateJobWithCacheAside` in `manage.ts` only checks `jobsMemory`, not `jobStore` — DELETE/PATCH routes on an in-flight BullMQ job silently miss the in-memory update. — *angle 06*
11. **[Major]** `GET /api/users/me` fetches every completed job with full output content, unbounded, on nearly every authenticated page load. — *angle 07*
12. **[Major]** `userProfile` in Zustand (`store.ts`) duplicates React Query server state — flagged independently by **three separate audits** (angle 09, angle 05, angle 03) as a direct violation of CLAUDE.md's own hard-stop rule. — *angles 03, 05, 09*
13. **[Major]** Three near-duplicate "require DB user" guards (`scheduledPosts.ts`, `collections.ts`, `feedMonitors.ts`) have diverged in behavior — `feedMonitors.ts`'s version skips UUID validation and returns 401 instead of 503 on DB outage, which is also the root cause of finding #2 above. — *angle 03*
14. **[Major]** Two files exceed CLAUDE.md's 400-line hard cap: `server/src/routes/jobs/manage.ts` (473 lines) and `client/src/lib/templateSystem.ts` (722 lines) — flagged independently by **three audits** (pre-pr-checklist, angle 03, angle 09). `server/src/routes/social.ts` (444 lines) also flagged by angle 03. — *pre-pr-checklist, angles 03 & 09*
15. **[Medium][Security]** Repurpose's fetched-webpage content reaches the Writer LLM prompt without `sanitizeSearchText()`'s injection-pattern stripping, unlike every other untrusted-content source (Tavily results) in the codebase. — *security-audit*
16. **[Medium]** `server/src/lib/browserPool.ts` reads `PUPPETEER_EXECUTABLE_PATH`/`RENDER` via raw `process.env` instead of `config.ts` — flagged independently by **three audits** (pre-pr-checklist, angle 02, angle 04-adjacent). — *pre-pr-checklist, angle 02*
17. **[Major]** Two genuinely dead/orphaned code paths found: `routes/jobs/stream.ts`'s "legacy" Clerk-JWT SSE-token fallback branch has zero live callers (every client call site only ever produces Redis-issued tokens), and `client/src/pages/Result/components/ResultDrawer.tsx` is an entire component with **zero import sites** — its replacement (`ActionDrawer.tsx`) reimplemented the same shell inline instead of composing it. — *angle 10*
18. **[High][Mobile]** 8 of the 10 new carousel templates render `slide.points.map()` with **no overflow guard** — on several templates this can push footer/branding content off the fixed 1080×1350 export frame instead of clipping cleanly, affecting the live preview and the exported PNG identically. `ModernMinimalTemplate.tsx` is a ready-made reference for the correct pattern. — *TESTING_PROMPT*
19. **[High][UX]** The 429 rate-limit response never includes `retryAfterMs` server-side, even though Create's countdown-timer UI was fully built to consume it and is permanently dead code as a result — every rate-limit hit shows a static message with no real countdown. — *TESTING_PROMPT*
20. **[High][Security]** Batch-mode job creation's `tone` field bypasses the enum validation the single-topic path enforces (`z.string().optional()` server-side vs. a free-text client input) — breaks the "every generation field is enum-validated" invariant for what should be an identical field. — *TESTING_PROMPT*
21. **[Medium][Mobile]** `CompactTemplatePicker.tsx`'s palette-swatch buttons render at ~24-26px tall with no `minHeight` — under the 44px touch-target minimum, inconsistent with the template chips one row above in the same component. Independently confirmed by **three separate passes** (mobile-responsive-audit, and both TESTING_PROMPT runs). — *mobile-responsive-audit, TESTING_PROMPT*
22. **[High][UX]** (re-confirmed, elevated) Both TESTING_PROMPT runs independently re-rate the social-disconnect no-confirmation gap as **P1 High** rather than the ui-ux-audit's original Critical-but-narrower framing — worth treating as unambiguously high-priority given three separate audits now agree it exists and matters.

### Documentation drift (repeated across nearly every audit)

17. `REVIEW_FINDINGS.md` does not exist despite being referenced as a live document throughout `CLAUDE.md` — confirmed independently by **all ~15 completed audits**.
18. `UI_UX_DOCUMENTATION.md` is substantially stale — wrong theme system, wrong font stack, several "open" findings already fixed in code. — *ui-ux-audit*
19. `CHANGELOG.md` is one commit behind `git log` (missing an entry for the most recent commit as of the audit date). — *production-readiness-checklist*

Full detail below, organized by source audit.

---

## 1. `security-audit.md` (full-codebase)

**Method:** static analysis; all "dynamic pass" checklist items explicitly marked not dynamically verified rather than fabricated.

### Findings table

| Severity | File:Line | Class | Issue |
|---|---|---|---|
| **High** | `config.ts:43-46`, `routes/social.ts:132-137,151-154` | Cleartext secrets storage (CWE-312) | `TOKEN_ENCRYPTION_KEY` is optional and unvalidated at boot. On absence, `dbUpsertToken()`'s catch block swallows the `encryptTokenOptional()` throw and falls back to storing **raw plaintext OAuth tokens** in an in-process Map. No error surfaced to user or operator — only a `console.error`. Directly contradicts CLAUDE.md's "AES-256-GCM at rest" claim and its §12 assertion that config.ts validates this at boot. |
| **Medium** | `routes/content/repurpose.ts:125,202` | Prompt injection (CWE-74) | Fetched webpage text reaches the Writer prompt via `initialFeedback`/`<critic_feedback>` with only `stripScriptsAndEventHandlers()` + length truncation — no `sanitizeSearchText()` injection-pattern stripping, unlike the Tavily path in `researcher.ts`/`competitor.ts`/`ideate.ts`. |
| **Medium** | `lib/sanitizeSearchText.ts:6-10`, `middleware/rateLimit.ts:16-29` | Weak injection filter (CWE-693) | Both filters are literal/regex string matches, trivially bypassed by rephrasing, translation, or homoglyphs. Acceptable only as defense-in-depth given XML-tag wrapping is the real containment. |
| **Low** | `routes/jobs/stream.ts:21-59,62-86,110-116` | Missing token-scope check (CWE-863) | `verifySSEToken()` never compares the token's stored `jobId` against the URL's `:jobId` — not cross-tenant exploitable (ownership check still runs after), but a token minted for job A can be replayed against job B if the same user owns both. |
| **Low** | `lib/browserPool.ts:77,93` | Config convention violation | Raw `process.env` reads bypassing `config.ts`, for two non-secret infra vars. |
| **Informational** | `client/package.json` | Vulnerable transitive deps | `dompurify` (moderate, via jsPDF/PostHog — unreachable through actual app usage), `nanoid` (high, via Vite's PostCSS toolchain — build-time only). `npm audit`: server 0 vulnerabilities / 208 deps; client 2, both non-reachable. |

### Checklist results (all PASS unless noted above)
Ownership/IDOR: zero `res.status(403)` calls anywhere in the codebase — 404-only policy followed without exception. `authMiddleware` applied everywhere except documented, exact-path-anchored exemptions. Puppeteer sandbox implemented exactly as documented (`setJavaScriptEnabled(false)` before every `setContent()`, full script/xhr/fetch/websocket/other interception, SSR-only render path, hex-validated palette colors). CORS is a proper allowlist, never wildcard. No hardcoded secrets. Rate limiters uniformly Redis-backed, fail-closed. `OAUTH_STATE_SECRET` correctly rejects its dev default outside localhost at boot (this one IS implemented as documented, unlike `TOKEN_ENCRYPTION_KEY`). OAuth state HMAC uses `timingSafeEqual`. Fresh IV per encryption, no nonce reuse (code-path level; DB-level ciphertext-at-rest not dynamically verified given the High finding above).

---

## 2. `ui-ux-audit.md` (full-codebase)

**Method:** Static analysis only — no browser available. Visual/contrast/interaction claims derived from reading CSS/component source.

**Ground-truth drift found:** `UI_UX_DOCUMENTATION.md` (dated 2026-06-14) is out of sync with `index.css` — documents a single dark theme with the wrong font stack and no CSS-variable system; the real code implements the full 6-theme `[data-theme]` system (CLAUDE.md §13). Several of the doc's "open" findings (hardcoded hex colors, cyan focus ring, violet eyebrow, 3 red variants) appear **already fixed in code but never marked resolved**.

### Top-5 Executive Summary (from this audit)
1. **[Critical][Usability]** Collection delete (`Library/CollectionsPanel.tsx`) and social disconnect (`Brand.tsx handleDisconnect`) fire directly on click with **zero confirmation** — no modal, no `window.confirm`. Inconsistent with the `ConfirmDeleteModal`/`DeleteAccountModal` pattern used elsewhere.
2. **[High][Accessibility]** `IdeaCard.tsx` nests real `<button>`s inside `<div role="button" tabIndex={0}>` — invalid ARIA/HTML.
3. **[High][Docs]** `UI_UX_DOCUMENTATION.md` is stale (see above) — risks false positives if used as ground truth.
4. **[Medium][Usability]** Carousel PNG export (`ExportModal.tsx`) shows only a spinner + "Saving…", well below `LoadingView.tsx`'s per-stage detail.
5. **[Medium][Visual]** Legacy 9-color carousel-theme system and the new 10-template system both remain fully live depending on job creation date — an ongoing consistency cost CLAUDE.md itself calls "not done yet" to retire.

### Accessibility findings
| # | Finding | Severity | Location |
|---|---|---|---|
| A1 | Nested `<button>`s inside `role="button"` div | High | `pages/Ideate/IdeaCard.tsx` |
| A2 | Raw inputs set `outline: 'none'` with no `:focus-visible` replacement | Medium | `Repurpose/UrlInput.tsx`, `Repurpose/FeedMonitorPanel.tsx`, `PostPanel.tsx`, `IdeateControls.tsx`, `Repurpose.tsx`, `OnboardingModal.tsx` |
| A3 | Destructive actions with no confirmation | High | `Library/CollectionsPanel.tsx`, `Brand.tsx handleDisconnect` |
| A4 | Strength: focus-trap/`role="dialog"`/`aria-modal` via shared `useFocusTrap` | — | `ConfirmDeleteModal`, `DeleteAccountModal`, `ResultDrawer` |
| A5 | Strength: `aria-live="polite"` correctly used for SSE stage messages | — | `LoadingView.tsx`, `TopicStep.tsx`, `Competitor.tsx` |
| A9 | **[static-only]** `--text-muted` opacity (0.36-0.40) vs `--bg-base` is the biggest per-theme contrast risk; one prior fix documented, no evidence of a systematic sweep | Medium | `index.css`, e.g. `nightshade` theme |
| A10 | Strength: global `prefers-reduced-motion` correctly zeroes durations, catches page-local `<style>` animations too | — | `index.css:1724-1738` |

### Page-by-page highlights
- **Dashboard:** sidebar "Library" nav uses the `Clock` icon (reads as "history," not "library") — cheap fix, swap to `BookMarked`.
- **Library:** Critical — collection delete has no confirmation.
- **Brand:** Critical — social disconnect has no confirmation. `DeleteAccountModal.tsx` is a model confirmation pattern (strength).
- **Ideate:** High — `IdeaCard.tsx` nested-button bug.
- **Result:** `LoadingView.tsx` called out as best-in-class; `ExportModal.tsx`'s export loading state comparatively thin.

### Prioritized backlog
**Quick wins:** ConfirmDeleteModal on collection delete + social disconnect; swap Library sidebar icon; add `:focus-visible` rings to raw inputs; refresh `UI_UX_DOCUMENTATION.md`.
**Larger:** fix `IdeaCard.tsx` a11y bug; per-slide export progress; real contrast-ratio audit across all 6 themes; drag-and-drop slide reordering (Canva-parity gap); retire legacy 9-color carousel theme system.

---

## 3. `flow-audit.md` (full-codebase, 8 end-to-end flows traced statically)

**Method:** static code trace (client pages → api.ts → server routes → pipeline → DB), no live instance.

### Flow-by-flow results
| Flow | Result |
|---|---|
| 1. First-time onboarding | **Pass** — no Clerk-webhook race; onboarding tracked server-side; SSE stage progress correct; only `final` output rendered; export is genuinely WYSIWYG; Library refreshes without manual reload |
| 2. Feedback → regenerate → version history | **Pass** — feedback genuinely reaches Writer; snapshot-before-overwrite confirmed as a real DB insert both for regenerate and restore; critic loop terminates at max 3 attempts (1 + 2 retries) and doesn't silently approve. **Minor finding:** `partial: true` (exhausted-retries flag) is set server-side but never read anywhere in the client — no UI distinction between "scored low" and "never actually passed review." |
| 3. Content multiplication | **Pass** — confirmed no new Tavily calls on multiply (branches around researcher/orchestrator entirely); `sourceJobId`/`sourcePlatform` persisted; Library shows lineage chip; stale-research disclosure banner always visible. |
| 4. Batch generation | **Pass**, with one **documented tradeoff**: `BatchResultPage` sources its list only from `location.state` — a genuine navigate-away-and-back (not browser Back) loses the in-progress batch view (jobs continue server-side; client falls back to a graceful "No batch found" empty state). Per-item progress, independent failure isolation, and rate limiting all correct. |
| **5. Schedule → auto-publish (flagged Critical-severity-if-violated)** | **Pass on every checkpoint.** No code path queues a real publish without an explicit `publishPlatform`; auto-publish UI is hidden (not disabled) without a connected account; success/failure paths correctly update DB + surface in UI without manual refresh; reminder-only vs. real-auto-publish UIs are textually distinct. **No Critical findings.** |
| 6. OAuth connect → post → disconnect → reconnect | **Pass**, with a **minor-moderate finding**: server-side token check is always fresh (disconnect is a genuine DB delete, not UI-only), but the client's post-failure handling is generic — a revoked-token 401 renders identically to any other failure, not a specific "reconnect required" message. |
| 7. Session expiry & multi-tab | **Pass with caveat** — no global Axios 401 interceptor; recovery relies on Clerk SDK's reactive `<SignedOut>` re-render rather than an explicit redirect tied to the failed request (can't verify cross-tab timing via static trace). SSE fan-out to multiple tabs confirmed structurally sound (broadcast layer decoupled from job execution — no duplicate side effects possible). |
| 8. Interrupted/resumed generation | **Pass** — server-side jobs unaffected by tab close; 10-min eviction correctly falls back to DB reassembly; SSE reconnect fetches a fresh token rather than retrying with a stale one. |

### Summary of findings requiring attention
| # | Flow | Finding | Severity |
|---|---|---|---|
| 1 | 2 | `partial` flag set but never surfaced in UI | Low |
| 2 | 4 | BatchResultPage loses view on navigate-away-and-back (intentional tradeoff) | Low-Moderate |
| 3 | 6 | Generic post-failure error discards the actual error code | Low-Moderate |
| 4 | 7 | No global 401 interceptor; relies on Clerk SDK | Low |

---

## 4. `bug-hunt.md` (full-codebase)

### Findings
**[Medium] Async/race** — `useJobData.ts:231`'s `handleRegenerate()` calls `connectToStream()` **without** the `onError` callback that the initial-mount path passes — so an SSE error after clicking Regenerate has no fresh-token reconnect path, only the browser's native retry against an eventually-expiring token. Recovery falls back to the REST poll (up to ~10-25s stall) instead of the immediate reconnect the mount path gets.

**[High] Express** — `server/src/routes/feedMonitors.ts` — **all 5 routes hang with no response ever sent** when `db` is unavailable. `requireUserId()` only handles the unauthenticated case; `if (!userId || !db) return;` silently returns with zero bytes written when `db` is falsy. Sibling files (`collections.ts`, `scheduledPosts.ts`) correctly return 503 in this case via their own `requireDbUser()` helper. *(Same root cause independently found by angle-03 as a "diverged guard" architecture issue.)*

**[Low] Express** — `routes/jobs/stream.ts`'s `GET /:jobId/stream` has no top-level try/catch + `next(error)`, though downstream calls already self-guard, making this low-risk defense-in-depth gap rather than a live bug.

**[High] Data integrity** — Timezone mismatch: Calendar's `dateKey` is built from the browser's **local** date and sent verbatim as `scheduledDate`; the server's `publishDelayMs()` interprets that string as **UTC** (`Date.UTC(y,m-1,d,9,0,0)`). A non-UTC user scheduling near midnight local time can get a publish computed for the wrong calendar day, off by up to ~16 hours from what they saw highlighted. `Math.max(delayMs, 0)` silently clamps a resulting negative delay to "fire almost immediately" rather than erroring — a silent early/late publish, not a loud failure.

**[Unverifiable/documented gap]** No reconciliation mechanism exists for a job stuck in `processing` after a hard crash of the direct-pipeline (non-BullMQ) fallback path — in-flight state lives only in a process-local Map; no cron/sweep detects and marks orphaned jobs `failed` on restart. Could not be dynamically confirmed (no running instance), but confirmed absent via code search.

### Verified correct (no findings)
Collection-deletion cascade, version-snapshot-before-overwrite (both regenerate and restore paths), Gemini→Groq fallback (exactly 3 retries + backoff before failover), Tavily total-failure graceful degradation, all-image-providers-fail clean 500, Redis-unavailable direct-pipeline fallback, critic score object null-guards, `stablePointKeys()` usage across all 10 templates, 7-topic batch cap enforced both client and server, Create.tsx double-submission guard, no per-request Puppeteer instantiation, no `console.log` in production paths.

### Minor/style notes
`create.ts`/`list.ts` use raw `console.error` instead of `logger.ts`. Batch-jobs zod schema defined inline via dynamic import rather than in `server/src/schemas/`. All 10 carousel templates recompute `stablePointKeys()` inside the `.map()` callback (O(n²) not O(n) per slide) — perf smell, not a correctness bug.

---

## 5. `performance-audit.md` (full-codebase)

**One real measured artifact:** `npm run build` in `client/` — everything else is static analysis, explicitly labeled **[measured]** vs **[estimated]** vs **not measured** throughout.

### Top-5 worst offenders by user-perceived impact
1. `requireJobOwnership`'s DB fallback (`ownership.ts:155-159`) fetches full `outputs`/`logs` relations with **no column restriction** — runs on every job-scoped route once a job ages past the 10-min memory TTL.
2. Google Fonts loaded via `@import` in `index.css` instead of a `<link>` in `<head>` — serializes an avoidable extra round-trip on every cold-cache load, despite `preconnect` hints already present in `index.html` going unused by this path.
3. Image-gen fallback chain (`imageGen.ts`) fully sequential across 5 providers, worst-case timeout sum ≈ 350-410s.
4. BullMQ concurrency hard-capped at 2 with no queue-position surfaced to the user — a 3rd concurrent job appears stalled with no "queued" state shown.
5. `export`+`html2canvas`+`index.es` chunks total ~225 kB gzip — correctly lazy-loaded behind the PDF-export click, but the single heaviest feature-triggered fetch in the app.

### Measured build output (gzip)
Largest chunks: `export` (jsPDF+JSZip) 130.29 kB, `react` 56.33 kB, `index.es` (lazy polyfill) 48.90 kB, `html2canvas` (lazy) 46.78 kB, `Result` 37.05 kB, `clerk` 28.61 kB, `query` 26.01 kB. **No chunk crosses the 250KB gzip flag threshold.**

### Other findings
- 6 `SELECT *`-equivalent raw `db.select().from(table)` calls with no column list (`feedMonitors.ts` ×2, `versions.ts`, `social.ts`, `account.ts`, `profileStore.ts`) — violates the explicit AGENT RULES ban.
- Font fallback stack hardcodes Windows-specific fonts ("Bahnschrift SemiCondensed", "Segoe UI") instead of the documented Inter/Space Grotesk/Playfair Display stack — possibly unrelated drift, worth confirming intentional.
- Doc-drift: CLAUDE.md §9 says "max 2 retries" but code shows `retryCount < 3` — consistent behavior (3 total attempts = 1 + 2 retries), just imprecise wording.
- Puppeteer export: 8-slide parallel render can momentarily exhaust the entire 8-browser pool if 2+ users export simultaneously — graceful (polls, clean timeout error) but unmeasured under real concurrent load.

### Confirmed already optimal (no findings)
Tavily search parallelization (documented before/after: 6-9s → ~2s), critic-loop cost is inherently sequential by data dependency, Gemini circuit breaker, index coverage for `sort=score` job-list query, auth cache, `IGSlide` memoization, Zustand slice-selector usage, SSE/REST polling hybrid (only polls when SSE silent >10s), Library search debounce + server-side pagination, React Query staleTime tuning per data volatility, route-level code splitting, all pages images-free (no lazy-loading gap to flag).

### Not answerable via static analysis (explicitly flagged, not skipped silently)
Real TTI/LCP numbers, React DevTools Profiler flame graphs, heap-snapshot leak confirmation, `EXPLAIN ANALYZE` at scale, real per-stage/per-platform timing (instrumentation exists via `agentLogs.durationMs`, but no live traffic sample available), PNG cache hit-rate, actual fallback-chain trigger frequency.

---

## 6. `production-readiness-checklist.md` (full-codebase)

### Scorecard
| Section | Status |
|---|---|
| 1. Observability | Ready with caveats |
| 2. Error handling under failure | Ready with caveats |
| 3. Deployment safety | **Not ready** (migrations) |
| 4. Scaling & capacity | Ready with caveats |
| 5. Data safety & backup | **Not ready** (account-deletion gap; backup untested) |
| 6. Third-party dependency risk | Ready with caveats |
| 7. Documentation & handoff | **Not ready** (stale CHANGELOG, missing REVIEW_FINDINGS.md) |

### Key findings
- **Sentry IS integrated** and wired correctly (worker/pipeline/browser-pool/account-deletion failures all call `captureException` with tags) — stronger than the checklist framing implied. Caveat: whether `SENTRY_DSN` is actually set in the live Render dashboard is unverifiable statically.
- **`render.yaml`'s `healthCheckPath` is `/api/health` (always-green liveness only), not `/api/ready` (which actually pings DB+Redis with a 3s timeout and returns 503 on failure)** — Render's restart/rollback logic never observes a real dependency outage even though the correct endpoint already exists in the code.
- Neon-unreachable, Redis-unreachable, Gemini-exhausted, all-image-providers-fail, and Clerk-unreachable failure modes were all traced and confirmed to fail cleanly/gracefully (fail-closed 503s, documented fallback chains, no infinite "processing" hangs).
- **Genuine gap:** no reconciliation exists for a worker process crash mid-job (OOM/SIGKILL) — graceful `SIGTERM`/`SIGINT` shutdown is well-built, but an abrupt kill's recovery depends entirely on BullMQ's stalled-job detection at library defaults, never live-tested. Recommended as the single highest-value live test to run before calling the system production-ready.
- `build:ssr` failure correctly fails the whole build chain (verified: no swallowed rejection) — contrary to what CLAUDE.md's historical warning might suggest, production deploys structurally can't ship a stale SSR bundle; that historical incident was a local-dev workflow gap, not a deploy-pipeline gap.
- **Database migrations are not wired into `render.yaml`'s `buildCommand`** — 16 migration files exist with no automated apply step; schema changes require manual production application with no gate.
- **Account deletion never removes `feed_monitors` rows** (no FK constraint on that table) — confirmed as a live, ongoing cost leak: the cron worker keeps polling orphaned monitors every 30 minutes forever, each tick firing a real Gemini/Tavily-backed pipeline attempt that fails on the `contentJobs.userId` FK constraint, logs to a catch block, and **still advances the cursor** — repeating indefinitely with no visibility beyond Sentry error volume.
- No per-user/global dollar spend cap exists beyond request-count rate limiting.
- `npm audit`: server 0 vulnerabilities (208 deps); client 2 (both transitive, `dompurify` moderate + `nanoid` high, both `fixAvailable: true`, neither documented as an accepted risk anywhere).
- `CHANGELOG.md`'s latest entry (`2026-08-07`) is one commit behind `git log` (`307b3ec`, `2026-08-08`) as of the 2026-08-10 audit date.

### Prioritized fix list (from this audit, in the audit's own priority order)
1. Feed-monitor orphan-and-retry-forever cost leak — add `feedMonitors` deletion to the account-deletion transaction.
2. Wire migrations into the deploy pipeline (`render.yaml` `preDeployCommand`).
3. Point `render.yaml`'s `healthCheckPath` at `/api/ready` instead of `/api/health`.
4. Refresh `CHANGELOG.md`/recreate `REVIEW_FINDINGS.md`.
5. Live-test a `kill -9` on the worker mid-job to confirm BullMQ's stalled-job recovery actually works.
6. Add automated test coverage for the Redis-unavailable direct-mode fallback.
7. Patch or explicitly accept the 2 client `npm audit` advisories.
8. Decide on (and document) a per-user/global spend cap policy.

---

## 7. `pre-pr-checklist.md` (rescoped to whole codebase)

### Security rules — mostly PASS
All of: zod validation, no mass-assignment, no unsanitized Redis key interpolation, `stripScriptsAndEventHandlers()` applied consistently, `authMiddleware` correctly gated, SSE token verification wired, no hardcoded secrets, Redis-backed fail-closed rate limiters, full Puppeteer safety — **all verified PASS**.

**[Medium] Finding:** `browserPool.ts` (lines 77, 93) reads `PUPPETEER_EXECUTABLE_PATH`/`RENDER` directly via `process.env` — the **only** violation of "always use config.X" in the server codebase. Neither var documented in `.env.example`.

### TypeScript rules — PASS
Zero live `any` usage anywhere (all hits are in comments documenting past fixes).

### React rules — PASS, one nitpick
`useJobData.ts` has full cleanup on all 3 `useEffect`s. No genuine index-as-key violations against reorderable data.

### Express/Node rules — PASS, plus the file-size finding
**[High] Two files exceed the 400-line hard cap** (an explicit "NEVER DO" hard stop):
- `server/src/routes/jobs/manage.ts` — **473 lines**. Suggested split: extract `/regenerate` + `/multiply` into a `routes/jobs/regenerate.ts` sibling.
- `client/src/lib/templateSystem.ts` — **722 lines**, mostly a data catalog. Suggested split: move the `TEMPLATES` data record to a sibling `templateData.ts`.
No other files exceed 400 lines (verified via full-repo sweep, excluding the generated SSR bundle).

### Code style — PASS with one nit
Zero `console.log` anywhere. WHY/FLOW/SECURITY/NOTE comment discipline called out as a genuine strength. Minor: some files use raw `console.error`/`console.warn` instead of `lib/logger.ts` (`demo.ts`, `social.ts`, `jobs/list.ts`, `jobs/manage.ts`, `jobs/render.ts`, `jobs/stream.ts`, `users/onboarding.ts`, `imageGen.ts`).

### Summary table
| Severity | Finding | Location |
|---|---|---|
| High | 400-line cap violation | `server/src/routes/jobs/manage.ts` (473 lines) |
| High | 400-line cap violation | `client/src/lib/templateSystem.ts` (722 lines) |
| Medium | Raw `process.env.X` bypassing `config.ts` | `server/src/lib/browserPool.ts` |
| Low | `REVIEW_FINDINGS.md` referenced but absent | repo root |
| Low | Inconsistent `console.error` vs `lib/logger.ts` usage | 8 files |
| Nit | `key={i}` over fixed decorative arrays, undocumented safety | `SlideVisual.tsx` |

---

## 8. `code-review-angles/01-correctness.md` (rescoped)

### Findings
**[Minor]** `server/src/agents/formatter.ts:80-83` — `formatCarousel` truncates slide body at **80 words**, not the documented **45-60 word target** (writer.ts's actual prompt target, per CLAUDE.md §9). A slide 21-35 words over target passes through unmodified into the persisted/rendered output, risking overflow against the fixed-height carousel card. Suggested: tighten to ~65 words, or document the two numbers serve different purposes.

### Verified correct
Critic-loop retry counting (exactly 3 total writer calls = "max 2 retries" as documented), score clamping, batch 7-topic cap, 404-not-403 IDOR policy, SSE reconnect + polling fallback, auth cache race-safety, pagination consistency, Puppeteer pool/cache correctness, BullMQ duplicate-retry prevention, scheduled-posts upsert status reset, image-gen fallback independence, feed-monitor cursor advancement, repurpose batch fan-out.

---

## 9. `code-review-angles/02-security.md` (rescoped)

**Overall assessment:** "unusually well-defended against its own documented threat model."

### Findings
**[Medium]** `users/brandVoice.ts:53-56` — `analyze-voice`'s `samples` field reaches the LLM prompt **unwrapped in XML delimiters**, the one exception to CLAUDE.md's rule that every other prompt-builder in the codebase follows correctly. Suggested: wrap in `<sample_posts>...</sample_posts>` and add a "treat XML content as data, not instructions" line to the system prompt (which currently has none, unlike `writer.ts`'s).

**[Low]** `users/account.ts:101-157` — `DELETE /me` never calls `invalidateAuthCache()`. Not attacker-exploitable, but `middleware/auth.ts`'s own comment explicitly flags this exact requirement. For up to 5 minutes post-deletion, a still-valid session resolves to the deleted UUID; if the same identity re-signs-up within that window, the stale cache entry could serve the *old* deleted dbUserId to the *new* account.

**[Low]** `browserPool.ts:77,93` — same `process.env` bypass as flagged elsewhere.

**[Informational]** `feedMonitors.ts` PATCH/DELETE/`:id/check` skip the `isValidUUID` pre-check sibling routes (`collections.ts`, `scheduledPosts.ts`) apply — not exploitable (Drizzle parameterizes), just inconsistent defense-in-depth.

**[Informational]** `stream.ts:106` — stale comment claims `/stream-token` is exempted from `authMiddleware`; actually only the rate limiter is exempted (auth still applies). Doc-only drift, not a vulnerability, but risks a future editor trusting the wrong comment.

### Checked clean
Zero mass-assignment instances anywhere. Only two intentional, narrowly-scoped auth exemptions exist, both exact-path-anchored. `dangerouslySetInnerHTML` only ever interpolates hex-validated palette colors, never raw text. Puppeteer sandbox fully intact. No hardcoded secrets. Rate limiting comprehensive and fail-closed. OAuth CSRF properly HMAC-signed with `timingSafeEqual`. SSRF guard resolves DNS and checks every returned address (DNS-rebinding-resistant).

---

## 10. `code-review-angles/03-architecture-consistency.md` (rescoped)

### Findings
**[Major]** `feedMonitors.ts:26` — third near-duplicate "require DB user" guard, diverges in behavior from `scheduledPosts.ts`/`collections.ts`'s `requireDbUser()`: skips `isValidUUID`, and returns 401 instead of 503 on DB outage. *(This is the architectural root cause of bug-hunt's High finding — the hung-request bug.)* Suggested: extract one shared `requireDbUser()` helper all three call.

**[Major]** `store.ts:180,190,329` — `userProfile` in Zustand duplicates React Query server state (Brand.tsx's own mutation writes into both). *(Independently flagged by angles 05 and 09 too — see Executive Summary.)*

**[Major]** `jobs/manage.ts` (473 lines) and `social.ts` (444 lines) exceed the 400-line cap with no split — notably, `list.ts`/`versions.ts` were **already extracted from manage.ts once before specifically to solve this**, and it regrew past the cap since. This is a pattern the codebase already solved once and let regress.

**[Minor]** `Brand.tsx` (414) and `Repurpose.tsx` (458) — modest over-cap orchestrator pages that already follow the thin-orchestrator pattern but haven't re-extracted as they grew.

**[Minor]** `server/src/generated/slideRenderer.js`'s prebuilt SSR bundle wasn't regenerated in the same commit as source changes to its inputs (commit `83cff5f` touched `igslide/slideResolvers.ts` + 2 templates without updating the bundle) — low-risk this time (comment/key-only changes), but no CI check enforces the rebuild, and this exact class of bug has shipped once already per CLAUDE.md's own account.

**[Minor]** `lib/logger.ts` adopted by only 14/43 server files that log errors — the "documented standard" is actually the minority pattern (29 files still use raw `console.error`/`warn`).

**[Minor]** `server/src/types/` exists on disk but is completely empty — the documented "types live here" convention has never actually been followed once; every server type is defined inline instead.

**[Minor]** `routes/jobs/insights.ts` is a legitimate, well-justified file not listed in CLAUDE.md §4's folder tree — pure doc-drift.

**[Minor]** `collections.ts:214` — `DELETE /:id/jobs/:jobId` doesn't call `requireJobOwnership` on `:jobId` (unlike the symmetric `POST /:id/jobs` in the same file) — low real risk today (membership-row-only mutation) but inconsistent and load-bearing if the handler is ever extended.

### Checked consistent (no findings)
Single pipeline entry point (no duplicate logic between direct-mode and BullMQ worker). Template system three-way sync (client/server/registry all 10/10/10). Rate limiters centralized. Ownership checks correctly scoped per resource type. Error shape consistent everywhere. No orphaned dead code beyond the already-known precedent. UI theme system vs. carousel template system boundary respected.

---

## 11. `code-review-angles/04-type-safety.md` (rescoped)

**Overall assessment:** production `any` usage is essentially zero.

### Findings (all Minor)
- `Create/useDraft.ts:12-18` — `readDraft()` casts `JSON.parse()` straight to `Partial<CreateDraft>` with no shape validation.
- `Create.tsx:95-97` — `recentTopics` initializer trusts `JSON.parse(localStorage)` as `string[]` with no array/element validation.
- `Brand/dnaHistory.ts:27-29` — checks `Array.isArray` but doesn't validate per-element `dna`/`analyzedAt` shape — the one file that didn't get the stricter guard pattern used elsewhere.
- `routes/jobs/create.ts:86,87,110` — `_runPipelineDirect`/`emitProgress`/`runPipelineDirect` all lack explicit return types (rule violation, inference currently correct).
- `routes/social.ts:90-93` — `fbGet(uid)` has no explicit return type.
- `routes/social.ts:268` — `(decoded.userId as string) || 'demo'` casts an `unknown` field without a `typeof` check (not attacker-controlled — HMAC-signed — but a latent contract violation).
- `lib/socialPublish.ts:44,68` — `content[0]?.headline`/`.body` with no length check first; an empty array would silently post `"undefined\nundefined"` to a live social account.

### Verified acceptable
All agent `JSON.parse()` sites parse as `unknown` then validate via Zod — "the strongest pattern in the codebase." External API response casts use all-optional interfaces with safe fallbacks. `ownership.ts` fully typed. No bare non-null assertions on `req.dbUserId` anywhere. `db!` assertions always preceded by a guard. `strict: true` on both tsconfigs; all `catch` blocks correctly `unknown`-typed.

---

## 12. `code-review-angles/05-react-frontend.md` (rescoped)

### Findings
**[Major]** `store.ts:177-219,329-333` + `AuthLayout.tsx:61-70` + `Brand.tsx:150-160` — same `userProfile`/Zustand finding as angles 03 & 09, with an added concrete mechanism: `Brand.tsx`'s mutation `onSuccess` writes the just-submitted form values into Zustand directly (not the server's canonical response), while `AuthLayout.tsx`'s separate `useEffect` copies `profileQuery.data` into the same slice — a re-render with stale cached `profileQuery.data` can silently overwrite the just-set fresh values back to stale ones, reproducing the exact bug (`FUNCTIONAL_AUDIT_2026-07.md` finding #8) this dual-write pattern was originally built to fix.

**[Minor]** `IGCarouselPreview.tsx:157-163` and `Ideate/IdeaCard.tsx:38-39` — both have a "Copy" button's `setTimeout` with **no unmount cleanup/tracking**, despite the codebase having a shared `useTrackedTimeout()` hook built specifically for this exact pattern (already used in `useSocial.ts`, `ExportModal.tsx`, `FeedMonitorPanel.tsx`) — these two call sites were never migrated to it.

**[Minor]** `components/OnboardingModal.tsx:32-39` — mount-fetch effect has no mounted-guard before `setShow(true)`; low real-world impact but the same class of bug `useIsMountedRef()` exists to prevent elsewhere (e.g. `HashtagPanel.tsx`).

**[Minor]** `TwitterContent.tsx:65-66` — read-only tweet list falls back to array index as key on falsy `text`, while the edit-mode list 10 lines above correctly uses a purpose-built `_key` to avoid exactly this.

**[Minor]** `Competitor.tsx:53-76` — `handleAnalyze` manually manages loading/error/result state instead of `useMutation`, unlike every comparable POST action elsewhere in the codebase (`Brand.tsx`, `Dashboard.tsx`, `useLibraryData.ts`).

### Verified correct
`stablePointKeys()` contract followed everywhere it applies. `forwardRef` contract correct across all 10 templates + dispatcher. SSE/timer/listener cleanup correct across every hook/component checked except the two Minor findings above. Zustand vs. React Query boundaries correct apart from the one Major finding. Every `useMutation` found correctly invalidates its query keys. Double-submission guards present and correct on every form checked. Loading/error/empty states handled explicitly everywhere sampled.

---

## 13. `code-review-angles/06-api-backend.md` (rescoped)

### Findings
**[Major]** `jobs/manage.ts:31-46` — `updateJobWithCacheAside` only checks `jobsMemory`, not `jobStore` (the BullMQ worker's store) — inconsistent with every other dual-store read site in the same codebase, including this file's own `GET /:jobId/status` handler 23 lines above. While a job is in-flight via the primary/production BullMQ path, DELETE/PATCH routes write to the DB correctly but silently skip the in-memory update, leaving SSE/polling clients stale until eviction. Suggested fix: mirror `versions.ts`'s restore-route pattern (`getJobFromStore(jobId) || jobsMemory.get(jobId)`, write back to whichever store held it).

**[Minor]** `content/repurpose.ts:277-280` — dead/unreachable `rejected` branch in batch `Promise.allSettled` handling (inner try/catch always resolves, never throws) — harmless today, fragile if the inner catch is ever loosened.

**[Minor]** Systemic: several route files call `res.status(500)` directly instead of `next(error)` in outer catches. Response contract stays intact, but `users/me.ts`, `onboarding.ts`, and `brandVoice.ts` specifically have **no Sentry capture at all** in these blocks — unexpected errors there are invisible to telemetry.

**[Minor]** `feedMonitors.ts` — the one route module with neither `next(error)` nor explicit Sentry capture anywhere.

**[Minor]** `jobs/create.ts:66-84` — `MAX_DIRECT_PIPELINES`'s pending-queue array is unbounded with no timeout; low practical impact since BullMQ is the primary path, but a sustained Redis outage under load could accumulate unresolved closures indefinitely.

### Verified clean
Transactions correctly wrap all multi-table writes. Every handler sends exactly one response, always `return`-guarded. Ownership checks consistent. All rate limiters Redis-backed, fail-closed. Puppeteer pool discipline correct. Memory eviction consistent across both stores. No raw SQL concatenation. No `SELECT *` on hot paths. Idempotent upserts correctly keyed everywhere checked.

---

## 14. `code-review-angles/07-performance-efficiency.md` (rescoped)

**Note:** codebase shows evidence of multiple prior dedicated performance-audit passes already applied.

### Findings
**[Major]** `routes/users/me.ts:198-212` — `GET /api/users/me` fetches every completed job with full output content, unbounded, on nearly every authenticated page load, just to extract a handful of numbers inside `aggregateStats()` before discarding the rest — the one remaining "fetch everything to aggregate" anti-pattern in the codebase, unlike Library's paginated list or Calendar's capped fetch. Suggested: push aggregation into SQL, or at minimum cap + narrow the column selection.

**[Minor]** `lib/sse.ts:64-71` — dead-client cleanup could batch Map writes; negligible at current scale.

**[Minor]** `IGCarouselPreview.tsx:134-145` — drag-offset state updates on every `pointermove`; already substantially mitigated by `IGSlide`'s `React.memo`.

**[Minor]** `routes/imageGen.ts` — 5-provider fallback chain is sequential by design (each paid attempt costs real money); correct-as-designed, not a fix candidate.

### Verified already well-optimized
Tavily searches, pipeline's inherent sequentiality, batch creation parallelization, `jobs/list.ts` pagination scoping, `collections.ts` batched fetch (no N+1), Puppeteer pool/cache correctness, SSE-liveness-gated polling, Library/Calendar server-side search/sort with bounded caps, `IGSlide` memoization, writer.ts prompt payload capping.

---

## 15. `code-review-angles/08-test-coverage.md` (rescoped)

**Method:** mapped 39 server test files + 15 client test files against 27 route files, 6 agents, 17 lib files, 3 workers, 100+ components, 12 hooks.

### High-risk gaps (zero coverage on security/data-integrity-relevant code)
- **`server/src/routes/collections.ts`** — entire file untested, including ownership-scoping (IDOR risk: a future refactor dropping the `userId` filter would go undetected by CI).
- **`server/src/routes/feedMonitors.ts`** — entire file untested, including **whether `contentRateLimit` is actually mounted on `POST /:id/check`** (a pipeline-triggering route) — a silently-dropped limiter would only surface as a billing anomaly.
- **`server/src/routes/jobs/list.ts` (`GET /`)** — no test for the `sort=score` re-map, page-1 dedup logic, or DB-error fallback. The code's own comment documents a **prior real bug** here from this exact complexity.

### Medium-risk gaps
- **`useJobData.ts`** — no test for the SSE-error reconnect debounce or the `handleRegenerate` double-submit guard, despite this hook having **already shipped two real production bugs** (stale token reuse; double-submit race) caught by inspection, not tests.
- **`lib/ssrfGuard.ts`** — only one incidental case tested; no dedicated test for private-IP/IPv6-loopback/cloud-metadata rejection despite protecting two real SSRF-relevant fetch sites.
- **`lib/socialPublish.ts`** — zero coverage on the shared LinkedIn/Twitter text-building logic; a regression posts broken/truncated content to a **real, live social account**.
- **`lib/publishQueue.ts`** — zero coverage on remove-then-add reschedule semantics; a regression here could **silently double-post** to a live account.
- **`ExportModal.tsx`**/**`EditSlideModal.tsx`** — no component test for the export double-submission guard or point-reordering integrity.

### Lower-risk gaps
`jobs/render.ts`'s partial-failure export path, `jobs/versions.ts`'s restore insert-vs-update branch, `Calendar/calendarHelpers.ts`'s local-timezone date math (which already has one prior duplicate bug in this exact area — see bug-hunt finding #3 above), `useTrackedTimeout.ts` (a shared correctness primitive several other hooks depend on).

### Riskiest single untested area (per this audit's own call)
`jobs/list.ts`'s combined pagination/sort/dedup logic — 5 interacting axes of variation, one documented prior real bug, on the single most-trafficked read path in the app, with a failure mode that's silent and would surface only via a user complaint days or weeks later.

### Confirmed well-covered
Writer/critic retry loop, 7-topic batch cap (both sides), cross-system `TemplateId` sync (including SSR-bundle-staleness detection), Gemini→Groq fallback, carousel PNG cache/pool logic.

---

## 16. `code-review-angles/09-readability-maintainability.md` (rescoped)

**Note:** comment discipline (WHY/FLOW/SECURITY/NOTE) called out as unusually consistent and thorough — most files actively explain non-obvious tradeoffs rather than omitting them.

### Findings
**[Major]** `store.ts:177-219,329-333` + `AuthLayout.tsx:61-70` + `Brand.tsx:153` — the same `userProfile`/Zustand dual-write finding as angles 03 and 05 (three independent confirmations of the same issue).

**[Minor]** `jobs/manage.ts` — 473 lines, 18% over cap.
**[Minor]** `lib/templateSystem.ts` — 722 lines, the most severe cap violation in the repo, though mostly data.
**[Minor]** `lib/pipeline.ts` — 459 lines, 15% over cap; `runContentPipeline` (~210 lines) does 5 conceptually distinct stages in one function body. Suggested: extract the write→format→critique retry loop into a named helper.
**[Nit]** `agents/writer.ts:321-338` — `sanitizeAiJson` helper redefined on every `runWriter` call despite closing over nothing; could be hoisted to module level.
**[Nit]** `IGCarouselPreview.tsx:30-37` — `let fontsInjected = false;` module-level mutable state with no comment explaining the module-scoping choice.

### Not found
No misleading names, no missing SECURITY comments, no obvious/noise comments, no `any`, no `console.log` in production paths, no array-index-as-key.

---

## 17. `mobile-responsive-audit.md` (full-codebase)

**Method:** 100% static analysis (grep/glob/read across `client/src`, cross-referencing Tailwind/inline-style rules, CSS media queries, fixed-pixel dimensions, touch-target sizing). No live browser/device available — items needing live confirmation explicitly labeled.

**Overall assessment:** the app has a genuinely mature, purpose-built mobile layer (real bottom-tab-bar + "More" sheet nav, Calendar's dedicated mobile bottom-sheet, a correctly-scoped Result-page drawer→bottom-sheet swap) — against that backdrop, one critical regression stands out.

### Critical finding
**[Critical]** The carousel preview (`IGCarouselPreview.tsx`, `IGSlide.tsx`, `TemplateLayout.tsx`) is entirely fixed-pixel (`SLIDE_W = 420`, `SLIDE_H = 525`, hardcoded, not `100%`/`max-width`/`clamp()`/`vw`) with **zero** scaling logic anywhere in the render chain (confirmed: `TemplateLayout.tsx`, the shared wrapper every one of the 10 template components renders through per CLAUDE.md §11a, sets fixed pixels with no scaling). `ContentColumn.tsx` renders it with no scaling wrapper. A previously-correct, fully-built responsive CSS implementation exists dead in `Result.css` (`.rp-ig-slide { width:100%; max-width:520px; aspect-ratio:1/1 }` plus a full `clamp()`-based font-size system) — grep confirms **zero `.tsx` files reference any `.rp-ig-*` class** today. Will overflow horizontally on any viewport under ~452px, confirmed at both 375px and 390px. Suggested fix: either resurrect `.rp-ig-*` and wire it into `IGCarouselPreview`, or make `SLIDE_W`/`SLIDE_H` responsive (`ResizeObserver`/`container-type: inline-size` + `cqw` units, or `width: min(420px, 100% - 32px)` with `aspect-ratio: 4/5`) and pass the rendered pixel size down rather than a constant.

### Medium — systemic under-44px touch targets
A recurring pattern (not a single bug) of icon-only "ghost" buttons using 3-8px padding around 10-16px icons, concentrated in list-row secondary actions: Calendar day-panel row buttons (`.sc-btn-ghost`, ~21-25px, no mobile-breakpoint override unlike everything else in that file), Repurpose history row actions (~18px, smallest found), Library collection-delete (24px, though it does get a `@media (hover:none)` bump to 32px — still under 44px but better than most), batch topic rows' dropdown/remove buttons (~26-30px). **Contrast — done right:** `ToneSelector.tsx`/`CompactTemplatePicker.tsx`'s template chips (`minHeight: 44`), `EditSlideModal.tsx`'s close button (explicit `minWidth/minHeight: 44`), `PlatformSelector.tsx`'s cards (20px padding around 48px icons). Suggested: a shared `.icon-btn-sm` utility class with `min-width/min-height: 44px`, applied to the row-action spots above.

### Other findings
- **[High]** `Create/BatchTopicList.tsx` — no responsive stacking at any breakpoint for each batch row (input + platform dropdown + delete button all on one line); at 375px the topic input and 88px-wide dropdown must share ~300px combined, squeezing the input to well under 100px. With 5-7 rows filled (the realistic max), a long column of cramped rows results. Suggested: stack input above a dropdown+delete second line on narrow viewports, matching `PlatformSelector.tsx`'s existing `@media(max-width:375px)` pattern.
- **[Low-Medium]** `Library`'s `.lib-filters`/`.lib-tag-filters` use horizontal-scroll-with-hidden-scrollbar (`overflow-x:auto; scrollbar-width:none`) — the audit's own guidance names this exact pattern as *not* recommended for Library's filter controls specifically (a collapsible filter sheet is preferred), and the hidden scrollbar means no visual affordance signals more filters exist off-screen.
- **[Informational]** No slide-drag-reorder feature exists anywhere in the codebase (`EditSlideModal.tsx` only edits text) — the audit prompt's checklist item asking to verify this doesn't apply; flagged for whoever maintains the prompt template.
- **[Informational, verified correct]** Swipe navigation (`IGCarouselPreview.tsx`) correctly uses Pointer Events (unifying touch/mouse) with non-swipe fallbacks (chevron buttons, position dots) — the one caveat being the chevrons are 32×32px, under 44px but with generous surrounding empty space.
- **[Verified correct]** Landing page's mobile theme switcher is deliberately kept in the always-visible top bar, not buried in the hamburger menu (explicit code comment recording the reasoning) — no regression found.
- **[Verified correct]** `Calendar`'s dedicated mobile bottom-sheet sidebar replacement, `Result`'s drawer→bottom-sheet breakpoint swap (with `env(safe-area-inset-bottom)` for the iOS home indicator), and `EditSlideModal`/`ExportModal`'s pinned-header/scrollable-body modal pattern are all called out as reference-quality mobile adaptations worth reusing as the template for future components.
- **[Verified correct]** Viewport meta tag correctly configured, no zoom-disabling `maximum-scale`.
- **[Needs live verification]** ExportModal's background-tab survival during PNG export (no Page Visibility API handling found — unclear if a suspended tab silently hangs or cleanly errors via the existing catch block); actual mis-tap rates on several of the borderline touch targets above.

---

## 18. `TESTING_PROMPT.md` (root-level combined 6-lens QA sweep)

**Method:** two independent runs completed for this prompt (the first ran much longer, 152 tool calls across 4 parallel research passes covering nearly every page/flow in depth; a second, faster run was launched believing the first had failed). Both are folded in below — this section presents the fuller first run's findings as primary, since it strictly subsumes the second run's coverage, with the second run's few genuinely distinct items appended at the end.

**Coverage note (from the fuller run):** 3 of 4 internal research passes completed in full depth (Landing/Dashboard/Create/BatchResult/global chrome; Result page + full carousel system; Ideate/Repurpose/Competitor + all 9 flows). The 4th (Brand/Library/Calendar) was covered via direct targeted verification of the highest-risk items rather than the same exhaustive per-lens depth — named gaps: Library's collection-delete-cascade-safety (not re-verified), Calendar's dense-day mobile tap-target overlap (not verified).

### New findings not previously logged elsewhere in this document

**[High][Functionality]** 8 of the 10 new carousel templates (all except `ModernMinimalTemplate` and the intentionally-exempt `SocialMediaTemplate`) render `slide.points.map()` with no `flex:1`/`minHeight:0`/`overflow:hidden` guard on the wrapper, violating CLAUDE.md §11a's own documented rendering contract. On several templates (Editorial Classic, Storyteller, Clean Corporate, Luxury Dark) this sits directly above a `marginTop:'auto'` footer/branding row — a long points list pushes the footer off the fixed 1080×1350 frame instead of clipping cleanly. Affects both the live preview and the PNG export identically (same SSR component) — a real content-loss bug, not cosmetic. `ModernMinimalTemplate.tsx` and the legacy `ContentLayout.tsx` are both ready-made reference implementations of the correct guard.
Files: `igslide/templates/{EditorialClassicTemplate,TechModernTemplate,VibrantPopTemplate,BoldStatementTemplate,LuxuryDarkTemplate,CleanCorporateTemplate,CreativeAbstractTemplate,StorytellerTemplate}.tsx`

**[High][Functionality/UX]** The rate-limit 429 response never includes `retryAfterMs` anywhere server-side (`rateLimit.ts`'s `buildRateLimiter()` only returns `{ error, code, retryable: false }`). Create's countdown-timer UI (`errorMessages.ts`, `Create.tsx`'s `countdownText` state, `TopicStep.tsx`'s render) was fully built to consume this field and is permanently dead code — every rate-limit hit (Create's real submit, and the public Landing demo) shows a static "Rate limit reached" with no actual countdown.
Files: `server/src/middleware/rateLimit.ts`, `client/src/pages/Create/errorMessages.ts`, `client/src/pages/Create.tsx`, `client/src/pages/Create/TopicStep.tsx`

**[High][Security/Functionality]** Batch-mode job creation's `tone` field is a free-text `<input>` with no enum constraint client-side, and the server's `POST /batch` schema defines `tone: z.string().optional()` — a bare unconstrained string — unlike the single-topic path's `toneEnum`-validated field. Breaks the "every generation-facing field is enum-validated" invariant the single-topic path was specifically hardened to enforce, for what should be the identical field.
Files: `client/src/pages/Create/BatchTopicList.tsx:181-186`, `client/src/pages/Create/useBatchCreate.ts:37`, `server/src/routes/jobs/create.ts:206`

**[Medium]** `POST /batch` silently drops any item that fails to create a job (the route's own comment confirms this — "simply omitted instead of aborting the whole batch"), with zero client-visible signal of which topic failed or why. `useBatchCreate.ts` has no code path to detect a submitted-count vs. returned-count mismatch.
Files: `server/src/routes/jobs/create.ts:262-268`, `client/src/pages/Create/useBatchCreate.ts:34-46`

**[Medium]** `EditSlideModal.tsx` has no UI to add/edit/remove/reorder a slide's `points` array at all — only headline/body fields exist. `stablePointKeys()` is correctly implemented but never exercised by any user interaction since the capability doesn't exist; users can't fix/reorder bullet points without a full regenerate.
File: `client/src/pages/Result/components/content/carousel/EditSlideModal.tsx`

**[Medium]** `InsightsSidebar.tsx` renders nothing at all (not even an empty state) when `criticResult` is absent (`if (!criticResult?.scores) return null;`) — violates the AGENT RULES "never leave a user staring at nothing." Mobile's "Insights" tab shows a fully blank pane in this case.
File: `client/src/pages/Result/components/InsightsSidebar.tsx:27`

**[Medium]** `manage.ts`'s `PATCH /:jobId/tag` and `PATCH /:jobId/carousel-template` mark their generic outer-catch 500 as `retryable: false`, inconsistent with every other route in the same file (`GET /:jobId`, `POST /regenerate`, `POST /multiply`, `PATCH /content` all correctly use `retryable: true` for the identical error class) — a client retry-UI keyed off `retryable` would incorrectly treat a transient failure as permanent.
File: `server/src/routes/jobs/manage.ts:377, 419`

**[Medium]** Repurpose's URL-input hint text claims "YouTube (auto-captions)" support that doesn't exist anywhere in the codebase (confirmed via repo-wide grep — no code path special-cases YouTube URLs). A submitted YouTube URL just hits the generic HTML-strip extraction, which will almost always fail against a YouTube SPA page's near-empty server-rendered HTML, producing a confusing "Not enough readable text" error against an explicit promise.
Files: `client/src/pages/Repurpose/UrlInput.tsx:100`, `server/src/routes/content/repurpose.ts:35-94`

**[Medium]** `CompactTemplatePicker.tsx`'s palette-selector chips (used on both Create's Advanced Options and Result's `CarouselTemplateSwitcher`) fall short of the 44px touch-target minimum — `padding:'4px 9px 4px 4px'` + 16px swatch yields ~24-26px, inconsistent with the template chips immediately above in the same file which correctly set `minHeight:44`. *(Independently found by mobile-responsive-audit and the second TESTING_PROMPT run too — three-way confirmation.)*
File: `client/src/pages/Create/CompactTemplatePicker.tsx:94-131`

**[Low]** Landing footer copyright year hardcoded to `© 2025` (today is 2026-08-10).
File: `client/src/pages/Landing/CtaFooter.tsx:54`

**[Low]** `OnboardingModal.tsx`'s status fetch runs unconditionally on mount with no `authLoaded && isSignedIn` gate, unlike every sibling query in the codebase (`AuthLayout`'s profileQuery, Dashboard's two queries, `NextScheduledCard` all have this exact gate, with comments documenting it as a fixed race). Guarantees one wasted 401-shaped request on every fresh session load, on every authenticated page (mounted globally).
File: `client/src/components/OnboardingModal.tsx:32-39`

**[Low]** Three independent length caps on the same `topic` field with no single source of truth: client `maxLength={250}`, rate-limiter's `LIMITS.topic=500`, schema's `.max(250)`. Not a live bug today (client blocks first), but a latent drift risk if any one number changes without the others being noticed.
Files: `client/src/pages/Create/TopicStep.tsx:97`, `server/src/middleware/rateLimit.ts:47`, `server/src/schemas/jobs.ts:63`

**[Low]** `VITE_CLERK_PUBLISHABLE_KEY` silently falls back to a hardcoded test-mode key with no startup warning if unset — a debugging footgun for a misconfigured deployment (not a security hole; publishable keys are safe to expose).
File: `client/src/App.tsx:30`

**[Low]** No Content-Type check before treating fetched Repurpose URL bytes as text — a PDF/image URL's raw bytes get `.text()`-decoded and regex-stripped rather than being cleanly rejected; if the garbled result happens to clear the 120-char floor, corrupted text reaches the summarization LLM.
File: `server/src/routes/content/repurpose.ts:53-69`

**[Low]** `FeedMonitorPanel.tsx`'s "Check now" mutation defines only `onSuccess`, no `onError` — unlike its own `createMutation` — so a failed check silently resolves back to idle with no visible error.
File: `client/src/pages/Repurpose/FeedMonitorPanel.tsx:83-92`

**[Low]** Ideate's server-error handling collapses every failure (429/500/network) to one of two generic hardcoded strings, never inspecting the actual error — unlike Repurpose.tsx/Competitor.tsx, which both already read `err.response?.data?.error`. No `Create/errorMessages.ts`-equivalent mapping exists for this page.
File: `client/src/pages/Ideate.tsx:58-68, 94-96`

**[Low]** `AuthLayout.tsx`'s sidebar collapse state is component-local `useState`, not persisted to `localStorage` — survives SPA navigation (component never unmounts) but resets to expanded on every hard reload, inconsistent with the adjacent theme switcher which does persist.
File: `client/src/components/AuthLayout.tsx:41`

**[Informational — design choice, not a defect]** Competitor analysis has no hard "handle not found" error for a misspelled/nonexistent handle — a sparse Tavily result still produces a low-confidence LLM analysis with an honest `dataQualityNote`, rather than the "clear error" the prompt's literal wording expected. Arguably correct product behavior.

**[Informational, verified correct — worth calling out]** Calendar's day-scheduling drag-and-drop uses native HTML5 DnD (doesn't fire on touch without a polyfill), but `CalendarSidebar.tsx` explicitly provides a parallel tap-based "Schedule…" → `SchedulePicker.tsx` flow as the documented primary touch trigger — a deliberate, working fallback, not an oversight.

### Confirms / elevates existing findings (both runs)
Both runs independently re-confirmed essentially every High/Critical finding already logged elsewhere in this document via fresh page-by-page traces rather than whole-codebase-angle sweeps: the carousel mobile-overflow bug (Executive Summary #0), `TOKEN_ENCRYPTION_KEY` plaintext fallback (#1), `feedMonitors.ts` hanging (#2), the Calendar timezone mismatch (#3, with the client-side root cause re-confirmed directly), the missing disconnect/collection-delete confirmations (#7, re-rated **P1 High** independently by both runs), `IdeaCard.tsx`'s nested-button accessibility bug (#8), Repurpose's unsanitized injection path (#15), `collections.ts`'s asymmetric `requireJobOwnership` gap, the `useJobData.ts` Regenerate SSE-reconnect gap, `userProfile`/Zustand duplication, and `stablePointKeys()`'s O(n²) recomputation across all 10 templates.

### Coverage confirmation
All pages (Landing, sign-up/in, Dashboard, Create, BatchResult, Result, Brand, Library/History, Calendar, Ideate, Repurpose, Competitor, global chrome) and all 9 flows from the prompt's own flow list were traced across the two runs combined; all 6 lenses (Functionality/UX/Mobile/Security/Performance/Enhancement) applied per page, with explicit "no issues found" notes where applicable rather than silent gaps. Named remaining gaps: Library's collection-delete-cascade safety and Calendar's dense-day mobile tap-target overlap were not independently re-verified by either run (both defer to this document's other audits where overlapping coverage exists).

---

## 19. `code-review-angles/10-simplification.md` (rescoped)

**Note:** most patterns that looked like duplication on first grep (dual `jobsMemory`/`getJobFromStore`, `schedulePost` vs `scheduleJob`, `updateJobWithCacheAside`, `buildRateLimiter` factory) turned out to be intentional, documented, non-duplicative design — verified individually before being ruled out.

### Findings
**[Major]** `routes/jobs/stream.ts:43-58` — `verifySSEToken()`'s Clerk-JWT fallback branch (explicitly commented "legacy support") has **zero live callers** — every client call site that constructs the SSE URL only ever produces a Redis-issued token via `POST /:jobId/stream-token`. Suggested: delete the dead branch and its now-unused imports (`clerkVerifyToken`, `users`, `eq`, `env`).

**[Major]** `client/src/pages/Result/components/ResultDrawer.tsx` — the entire file is orphaned; grep finds zero import sites anywhere in `client/src`. Its intended replacement, `ActionDrawer.tsx`, independently reimplemented the identical shell (same CSS classes, same `useFocusTrap` call, same Escape-to-close effect, same `role="dialog"` markup) inline rather than composing the shared component. Matches the exact "leftover superseded code" pattern CLAUDE.md's own precedent (the `TemplateGallery.tsx`/`ColorPalettePicker.tsx` deletion) says should be removed, not kept "for reference." Suggested: delete the file.

**[Minor]** `lib/templateSystem.ts` — the `category: TemplateCategory` field is set on all 10 templates but read by zero consumers (verified via grep across every picker/renderer). Either remove it or wire up the category-based filtering it implies but doesn't deliver.

**[Minor]** `lib/templateSystem.ts` — `decorativeElements: string[]` is write-only dead data on all 10 templates; its own consuming comment in `TemplateLayout.tsx` cites `TemplateGallery.tsx`'s preview swatches as the reader, but that file was deleted in the 2026-08-06 migration. Suggested: remove the field and the stale comment together.

**[Minor]** `igslide/layouts/TemplateLayout.tsx:63-65` — `data-cover-style`/`data-content-style` DOM attributes are stamped on every slide's root div with zero consumers (no CSS selector, no test query, no JS read-back). Note: `layout.coverStyle` itself is *not* dead — `BoldStatementTemplate.tsx` reads it directly as a prop — only the DOM-attribute mirroring here is unused.

**[Minor]** `middleware/rateLimit.ts:217-220` — `authJobRateLimit`'s explicit `keyGenerator` is byte-for-byte identical to `buildRateLimiter`'s own default, adding 4 lines that change nothing. Every sibling limiter (`demoJobRateLimit`, `exportRateLimit`, etc.) already omits the override and gets the same behavior for free.

**[Minor]** `Result.tsx:181` + `useCarouselDesignSeed.ts` — the design-seed hook (localStorage read/hash/no-repeat-window/write) runs unconditionally for every carousel, but its output (`designPreset`) is only ever read by the *legacy* layout branch in `IGSlide.tsx` — for every template-system carousel (the primary path per CLAUDE.md §11a), the hook's full side-effect cycle runs and the result is immediately discarded. Suggested: gate the hook call on `!templateId`.

### Checked clean (no findings)
`manage.ts`'s shared `updateJobWithCacheAside` helper, `rateLimit.ts`'s `buildRateLimiter` factory, the dual job-store lookup (intentional, documented), `schedulePost` vs `scheduleJob` (two deliberately separate systems per CLAUDE.md §9), server/client `TemplateId` mirroring (necessary, still in sync 10/10), `carouselStorageKeys.ts`, the 9 legacy carousel layouts (still reachable, not dead), `ai.ts`'s `GenerateOptions` (real variation across call sites), `agentResponses.ts` zod schemas (legitimate LLM-boundary validation), `BatchResult.tsx` vs `useJobData.ts` (different-enough problems, not worth a shared abstraction), the two `.d.ts` ambient declaration files (false positives from a naive grep, correctly ruled out on inspection).

---

## Cross-Audit Meta-Findings

- **`REVIEW_FINDINGS.md` does not exist**, despite `CLAUDE.md` §10 listing it as present — **all 18 completed audits** confirmed this independently. This is the single most-repeated finding of the entire run. Recommend either recreating it (seeded with this report) or correcting the dangling references in `CLAUDE.md`.
- **The carousel mobile-overflow bug** (Executive Summary #0) was independently found by both `mobile-responsive-audit` and `TESTING_PROMPT` via completely separate traces, converging on the same root cause (fixed `SLIDE_W`/`SLIDE_H`, dead `.rp-ig-*` CSS) — the highest-confidence finding of the entire run given it affects the app's single flagship feature on the majority of real mobile devices.
- **`userProfile` in Zustand duplicating React Query server state** was independently flagged by **three separate audits** (angle 03, angle 05, angle 09) with angle 05 additionally identifying the concrete staleness mechanism (`Brand.tsx`'s mutation writing form values directly while `AuthLayout.tsx` separately syncs from the query cache).
- **`server/src/routes/jobs/manage.ts` (473 lines) and `client/src/lib/templateSystem.ts` (722 lines)** were independently flagged as 400-line-cap violations by **three audits** (pre-pr-checklist, angle 09, angle 03) — angle 03 additionally notes `manage.ts` was already split once before (producing `list.ts`/`versions.ts`) and has regrown past the cap since, meaning this is a regression of an already-solved problem, not a new one.
- **`server/src/lib/browserPool.ts`'s `process.env` bypass** was independently flagged by **three audits** (pre-pr-checklist, security-audit, angle 02).
- **`feedMonitors.ts`'s DB-unavailable handling** was found from two different angles that converge on the same root cause: bug-hunt found the concrete symptom (hung request, zero response sent), angle 03 found the architectural cause (a diverged, non-`requireDbUser`-conformant guard implementation).
- **The missing social-disconnect confirmation modal** was independently flagged by **three separate passes** (ui-ux-audit as Critical, and both TESTING_PROMPT runs as P1 High via independent fresh page-by-page traces) — strong, unanimous signal this is a real, high-priority gap.
- **The `CompactTemplatePicker.tsx` palette-swatch touch-target gap** was independently found by **three separate passes** (mobile-responsive-audit, and both TESTING_PROMPT runs) — the same file, same exact chips, same ~24px measurement, arrived at from three different analysis angles.
- **`UI_UX_DOCUMENTATION.md`** is confirmed stale by the ui-ux-audit — a second companion-doc-drift issue alongside the `REVIEW_FINDINGS.md` gap.
- **`CHANGELOG.md`** is confirmed one commit behind current `git log` by the production-readiness-checklist.
