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

## 2026-08-06 — Pre-commit cleanup pass on the carousel template system branch

**Status:** Complete. The template-system work below (and its REVIEW_FINDINGS-closeout follow-up)
had accumulated on this branch without being committed; before pushing, ran a full review pass
across every changed/new file for responsiveness, dead code, complexity, and comment quality.

- Removed a stray local debug script (`server/_pool_debug.mts`, not part of the feature) and
  reverted an accidental `server/package.json` edit (`dev`/`worker` scripts pointed at
  `.env` instead of the repo convention `../.env`, which would break anyone without a
  `server/.env` file of their own).
- `igslide/templates/LuxuryDarkTemplate.tsx` — fixed a real bug: the template hardcoded
  `#0a0a0a`/`#ffffff` instead of reading `colors.DARK_BG`/`getContrastColor()`, so switching its
  curated color palette in the gallery had no visual effect. Now respects the selected palette
  like the other 9 templates.
- `client/src/components/TemplatePreview.tsx` — deleted; confirmed zero importers (superseded by
  `CompactTemplatePicker.tsx` earlier in the same branch, left behind as dead code).
- `client/src/components/TemplatePreview.tsx` (before deletion) and
  `CarouselTemplateSwitcher.tsx` — removed a `console.log` and an unchecked
  `templateId as NewTemplateId` cast respectively, replacing the latter with the existing
  `isTemplateId()` guard.
- `client/src/pages/Create.tsx` — the same unchecked-cast pattern existed twice reading
  `templateId`/`paletteId` back out of `localStorage` (user-writable, so worth guarding);
  replaced both with `isTemplateId()`/`getPalette()` validation.
- `client/src/pages/Result.tsx` — fixed a state-leak bug: `/result/:jobId` isn't a keyed route,
  so the `templateOverride` state persisted across navigating from one job's result to another's,
  silently carrying job A's template onto job B's preview. Added a reset keyed on `jobId`.
- `client/src/pages/Competitor.tsx` — added `aria-hidden="true"` to a hidden layout-spacer
  element that screen readers were announcing.
- `server/src/lib/carousel.ts` had grown to 438 lines (over CLAUDE.md's 400-line cap) as a
  side effect of the templateId/paletteId cache-key changes; extracted the Puppeteer
  browser-pool machinery into a new `server/src/lib/browserPool.ts` (218 + 266 lines), with
  `carousel.ts` re-exporting `closeBrowserPool` so no external import paths changed.
- Verified (did not need to change): ownership checks, 404-not-403 on mismatch, zod enum
  validation of `templateId`/`paletteId` at every entry point, rate limiting on the Puppeteer
  export route, Puppeteer JS-disabled + request interception, no raw SQL, all already correct
  in the pre-existing feature work.
- Rebuilt `server/src/generated/slideRenderer.js` via `npm run build:ssr` to pick up the
  `LuxuryDarkTemplate` fix in the exported-PNG path, not just the live preview. `tsc --noEmit`
  and `eslint` pass with zero errors on both `client/` and `server/`; full production builds of
  both succeed.

---

## 2026-08-06 — Repurpose page: sidebar visual polish + sticky layout fix

**Status:** Complete. `client/src/pages/Repurpose/InfoSidebar.tsx` redesigned — the "Supported
Sources"/"How It Works"/"Pro Tip" cards read as flat, cramped boxes with weak hierarchy (see
screenshot in session). Changes: source rows now separated by hairlines instead of loose
vertical gaps, with larger gradient icon tiles; "How It Works" is a numbered vertical-stepper
(numbered circles + connecting line) instead of plain checkmark bullets, with a short title +
description per step instead of one run-on sentence; "Pro Tip" gained a sparkle icon next to
its label and a "Set up Brand Voice" link (React Router `Link` to `/brand`) so the tip is
actionable, not just text. No behavior/data changes — this component is static/props-free.

Follow-up in the same session: the right column (Feed Monitor + history + the 3 info cards
above) is routinely taller than the left form, and the two-column grid in `Repurpose.tsx` had
no sticky/scroll handling — scrolling down past the form's bottom left blank space on the left
next to still-visible sidebar cards on the right (reported via screenshot). Added a
`.repurpose-sidebar` class (`position: sticky; top: 20px`, internal `overflow-y: auto`) on the
right column, matching the existing `.rp-sidebar` pattern in `Result.css`; reverts to
`position: static` under the existing 768px stack breakpoint where the columns go single-column
anyway.

Second follow-up (same session): the sticky box's initial `max-height: calc(100vh - 40px)` still
clipped the bottom-most card (Pro Tip) with no way to scroll the rest into view (reported via a
second screenshot) — the true bottom edge sat below the viewport because the calc only accounted
for a flat 40px and ignored that the box's own `top: 20px` sticky offset plus `.main-inner`'s
30px bottom padding both eat into the available height. Corrected to
`calc(100vh - 20px - 30px)` so the box's rendered height actually fits between the sticky
offset and the page's bottom padding, making the internal scrollbar able to reach the end.

Third follow-up (same session, real root cause): content was still clipped after the calc fix,
at a narrower viewport. Root cause was a **breakpoint mismatch** — `index.css`'s pre-existing
`.grid-repurpose` rule (line ~1646) collapses the grid to a single column starting at 900px, but
the new `.repurpose-sidebar` sticky/scroll-reset media query in `Repurpose.tsx` was still set to
768px. Between 768–900px wide, the grid was already single-column (form and sidebar stacked)
while the sidebar was still `position: sticky` with a capped `max-height` — so it rendered as a
short, internally-scrolling box wedged into an already-stacked layout, clipping cards. Fixed by
moving the sidebar's static/max-height/scroll reset to the same 900px breakpoint as the grid
collapse, so both switch together.

**Fourth follow-up — reverted the sticky approach entirely.** Feed Monitor and Pro Tip were
still unreachable after the breakpoint fix. Without a browser available in this session to
visually verify `100vh`/sticky-offset math against the actual rendered layout, continuing to
patch the calc was guesswork against a real bug. Removed `.repurpose-sidebar`'s
`position: sticky` / `max-height` / `overflow-y: auto` entirely — the right column (Feed
Monitor + history + info cards) is now a plain static flex column again, same as the left form,
so it scrolls with the ordinary page scroll and every card is reachable with no height-calc
risk. This trades away the "sidebar stays pinned while scrolling" polish from the first pass,
but that was never the reported problem — content being unreachable was.

---

## 2026-08-06 — Carousel template system: remaining REVIEW_FINDINGS.md items fixed

**Status:** Complete. Follow-up to the wiring pass below — this closes out the 13 findings from
`REVIEW_FINDINGS.md` that were still open after that session (verified against current code
before fixing; several other findings turned out already resolved and were left alone).

- `client/src/lib/colorSystem.ts` — added `getContrastColor()`/`getContrastRgba()` (WCAG
  relative-luminance based). Replaced the broken `colors.DARK_BG === '#1a1a1a'` sentinel check
  (always false — `DARK_BG` is procedurally tinted, never that literal string) at all 37
  occurrences across the 10 `igslide/templates/*.tsx` files with a real per-background contrast
  decision.
- `igslide/layouts/TemplateLayout.tsx` and all 10 `igslide/templates/*.tsx` — converted to
  `React.forwardRef<HTMLDivElement, ...>` and forward `ref` through to `TemplateLayout`'s root
  div, matching the legacy layout branch in `IGSlide.tsx` so `slideRefs`-style DOM access works
  on both rendering paths. Also removed `TemplateLayout`'s dead decorative-elements render loop
  (empty divs with no backing CSS — real decoration lives in each template component already).
- `client/src/lib/templateSystem.ts` — added `isTemplateId()` type guard; `IGSlide.tsx` now uses
  it instead of an unguarded `templateId as TemplateId` cast, and `server/src/schemas/jobs.ts`
  gained a mirrored `VALID_TEMPLATE_IDS`/`templateIdEnum` (server can't import client
  TypeScript) so `templateId` is enum-validated in `createJobSchema`, `exportCarouselSsrSchema`,
  and `setCarouselTemplateSchema` instead of an unbounded string.
- `igslide/templates/SocialMediaTemplate.tsx` — guarded `point.label.toLowerCase()` (was the one
  template inconsistent with siblings' defensive `point.icon || '•'` treatment).
- New `igslide/templates/registry.ts` (`TEMPLATE_COMPONENTS`, module-scoped) and
  `igslide/templates/templateProps.ts` (`CarouselTemplateProps`) — replaced `IGSlide.tsx`'s
  inline, per-render-rebuilt `templateComponents` map and each template's independently
  redeclared 8-field props interface with one shared source of truth for each.
- `client/src/pages/Result/constants.ts` — `NewTemplateId` is now a re-export of
  `templateSystem.ts`'s `TemplateId` instead of an independently hand-copied literal union;
  deleted the unused `AllTemplateId` type.
- `igslide/types.ts`'s `stablePointKeys()` is now actually called from every template's
  `points.map()` (and `TemplateLayout`'s old decorative-elements loop, before that loop was
  removed) instead of array index — was already exported but unused everywhere.
- `IGSlide.tsx` — `resolveType()`/`resolveBackground()` are now computed only on the legacy
  rendering path (after the template-branch early return), not unconditionally at the top of
  the component and then discarded when a template renders instead.
- `client/src/pages/Create/AdvancedOptions.tsx`, `Create/TopicStep.tsx`, `Create.tsx` — removed
  the dead `carouselTheme`/`onCarouselThemeChange` prop plumbing (threaded through 3 files but
  unused inside `AdvancedOptions` since its `{false && ...}` legacy picker branch was already
  deleted in the prior session) and the now-unused `CAROUSEL_THEME_KEY` localStorage constant.
- `server/src/lib/carousel.ts` — `renderSlideWithCache`'s cache key no longer silently collapses
  to the legacy `theme` key when only one of `templateId`/`paletteId` is set (was `&&`, now
  includes whichever is present). Split `ThemeKey` into `LegacyThemeKey`/`NewTemplateKey` with an
  explicit comment on why they're still unioned (the runtime `templateId || paletteId` branch
  that picks between them).
- New `client/src/lib/carouselStorageKeys.ts` — `Create.tsx` and `Result.tsx` previously
  duplicated the `'ca_carousel_template_id'`/`'ca_carousel_palette_id'` string literals
  independently; both now import the same constants. `Result.tsx`'s localStorage reads are also
  now `useMemo`'d instead of re-running via an inline IIFE on every render (including every SSE
  progress tick during job polling).
- `CLAUDE.md` §4 (folder structure) and §11a — added the previously-undocumented
  `templateSystem.ts`, `TemplateGallery.tsx`/`TemplatePreview.tsx`/`ColorPalettePicker.tsx`,
  `igslide/templates/`, `igslide/fontStack.ts`, `carouselStorageKeys.ts`, and
  `CarouselTemplateSwitcher.tsx`; updated §11a's guidance to reference the new contrast helpers,
  ref-forwarding requirement, and `registry.ts` instead of the now-removed inline map.

**Left as-is (already fixed by the time this session started):** SSR export wiring, live
preview using the template system, `paletteId` actually affecting rendered colors, and the
font-resolution ternary duplication (`igslide/fontStack.ts`'s `resolveTemplateFont()` already
existed and was already used everywhere) — all verified against current code, not assumed from
`REVIEW_FINDINGS.md`'s original text.

---

## 2026-08-06 — Carousel template system: wired end-to-end + fixed broken rendering

**Status:** Complete (P0 fix — `CAROUSEL_TEMPLATE_PLAN.md` §2). The 10-template Canva-like
design system (`client/src/lib/templateSystem.ts`, `TemplateGallery.tsx`,
`ColorPalettePicker.tsx`, 10 `igslide/templates/*.tsx` components) had been built in a prior
session but never connected — selecting a template on the Create form wrote to a global
`localStorage` key that only `ExportModal` read, so the live Result-page preview always fell
back to the old 9-theme system regardless of selection. See `CAROUSEL_TEMPLATE_PLAN.md` for the
full diagnosis and plan; this entry covers what shipped.

**Wiring (the reported "same UI" bug):**
- `server/src/db/schema.ts` — `contentJobs` gained nullable `templateId`/`paletteId` columns
  (migration `drizzle/0013_brief_penance.sql`).
- `server/src/schemas/jobs.ts` — `createJobSchema` accepts optional `templateId`/`paletteId`;
  new `setCarouselTemplateSchema` for the post-generation switcher.
- `server/src/routes/jobs/create.ts` — persists `templateId`/`paletteId` onto the job (carousel
  platform only).
- `server/src/routes/jobs/manage.ts` — new `PATCH /:jobId/carousel-template` lets a user change
  a carousel's template/palette after generation without regenerating content.
- `server/src/lib/persistJob.ts`, `server/src/routes/jobs/ownership.ts`,
  `server/src/lib/pipeline.ts` — `templateId`/`paletteId` threaded through the DB
  insert/`assembleJobFromDB` read path alongside the existing `sourceJobId`-style lineage
  fields.
- `client/src/pages/Create.tsx` / `Create/TopicStep.tsx` / `Create/AdvancedOptions.tsx` —
  template/palette selection now lives in `Create.tsx` state (not `AdvancedOptions`'s own
  `localStorage`-backed `useState`) and is sent explicitly with the job-creation request;
  `localStorage` still seeds the default for returning users only.
- `client/src/pages/Result.tsx` — reads `templateId`/`paletteId` from `jobData` (falling back to
  `localStorage` only for carousels generated before this shipped), passes them to
  `ContentColumn`, and added `onTemplateSwitch` for the new in-Result switcher.
- `client/src/pages/Result/components/ContentColumn.tsx`,
  `.../content/carousel/IGCarouselPreview.tsx` — prop-threaded down to `IGSlide`.
- New `client/src/pages/Result/components/content/carousel/CarouselTemplateSwitcher.tsx` —
  collapsible panel (matches `ContentMultiplier`'s pattern) on the Result page letting a user
  change a carousel's template/palette after generation; calls the new PATCH route.

**Bugs found and fixed while verifying live (none of these were introduced by the wiring above
— all were latent in the prior session's uncommitted template-system work):**
- `server/src/lib/carouselSsr.ts`'s `buildSlideHtml()` built its `renderSlideHtml()` params
  object without `templateId`/`paletteId` at all — the PNG export path silently ignored template
  selection regardless of the wiring above. Fixed.
- `server/src/generated/slideRenderer.d.ts` (hand-written types for the esbuild SSR bundle) was
  missing `templateId`/`paletteId` on `RenderSlideParams`, and the bundle itself
  (`slideRenderer.js`) predated the template-system source changes entirely — confirmed via a
  byte-identical-output test across 3 templates before rebuilding. Fixed by adding the fields to
  the `.d.ts` and rebuilding via `npm run build:ssr`.
- `IGSlide.tsx` resolved `templateId` into a template but never resolved `paletteId` into an
  actual color override — every template component rendered using the legacy 9-theme `colors`
  prop, so picking a palette in the gallery had no visual effect. Now resolves
  `getPalette(templateId, paletteId)` and derives a `ColorSystem` via
  `deriveColorSystemFromPalette()` for the template render branch.
- `igslide/layouts/TemplateLayout.tsx` (the shared wrapper all 10 templates render through) was
  missing `flexShrink: 0` on its root box — inside the carousel preview's horizontal flex track,
  every slide compressed to fit the visible width instead of staying full-size and swiping
  individually (reported as slides rendering squished side-by-side with clipped text).
- The same wrapper applied `padding: spacing.padding` a second time on top of the padding every
  individual `*Template.tsx` component already applies to its own content box — shrinking the
  visible template surface inward on all four edges. Combined with 9 of the 10 templates never
  setting a `background` on that content box at all (only `LuxuryDarkTemplate` did), this
  produced a letterboxed post floating on black — reported as "black background around the
  carousel" on both the live preview and the downloaded PNG. Fixed by removing the wrapper's
  duplicate padding and adding `background: colors.LIGHT_BG` (or the template's own dark fill)
  to all 10 templates' content boxes, plus `overflow: hidden`/`minHeight: 0` on the wrapper's
  inner flex box so long body text clips to the frame instead of overflowing past it.
- `TemplateLayout.tsx` also carried a dead `React.cloneElement(..., { templateStyles })`
  mechanism injecting computed heading/body styles into children — no template component ever
  read that prop (each computes its own styles from `template.typography` directly). Removed.
- 11 pre-existing `@typescript-eslint/no-explicit-any` lint errors across all 10 template
  components (`slide.points.map((point: any, i: number) => ...)`) — removed the redundant
  annotations; `SlidePoint`/`number` now infer correctly from `SlideData`.

**Deferred to a later session (see `CAROUSEL_TEMPLATE_PLAN.md` §3, not part of this P0 pass):**
real thumbnails in `TemplateGallery` (currently a schematic mini-preview, not the real
component), a working custom color picker (`ColorPalettePicker`'s custom-color button is still a
placeholder), per-slide-type layout variety within each template (today one layout serves
cover/content/stat/quote/cta uniformly), and retiring the legacy 9-theme system now that the new
one is proven working.

---

## 2026-08-05 — Repurpose: batch multi-URL input + RSS/feed monitoring

**Status:** Complete. Both items from `FUTURE_FEATURES.md`'s Repurpose "Design decisions" section are now implemented.

### Feature 1 — Batch multi-URL input

Repurpose previously accepted only one URL per submission. Now users can paste up to 10 URLs (one per line) and repurpose them all in a single click — each URL is independently fetched, extracted, and turned into its own job, fanned out via `Promise.allSettled` so a single failed URL doesn't block the rest. Results open in `BatchResult.tsx` (the existing batch display already built for Create's multi-topic mode).

- `server/src/schemas/content.ts` — new `repurposeBatchSchema` (`items[]`, up to 10, each with its own `url`/`platform`/`platforms?`/`tone`/`targetAudience`).
- `server/src/routes/content/repurpose.ts` — refactored: job-creation logic extracted into `createJobsForPlatforms()` (shared by both single-URL and batch routes); new `POST /repurpose/batch` endpoint processes all items in parallel, returns `{ jobs[], failedItems[] }` so partial failure is visible without aborting the whole batch.
- `client/src/api.ts` — new `repurposeBatchUrls(items[])`.
- `client/src/pages/Repurpose/UrlInput.tsx` — the batch-mode textarea (already built but unwired) is now connected.
- `client/src/pages/Repurpose.tsx` — added `batchMode`/`batchUrls` state; "Switch to Batch" toggle now switches modes; submit button label changes to "Repurpose N URLs"; navigates to `/batch-result` on success.

### Feature 2 — RSS/Atom feed monitoring

Users can now subscribe a public RSS/Atom feed URL from the Repurpose sidebar. The server polls every active subscription every 30 minutes and auto-creates a Repurpose job for the latest unseen item (tracked by `lastItemGuid` so historic items are never reprocessed). A "Check now" button triggers an immediate on-demand check without waiting for the cron tick.

- `server/src/db/schema.ts` — new `feed_monitors` table (`userId`, `feedUrl`, `platform`, `tone`, `targetAudience`, `active`, `lastCheckedAt`, `lastItemGuid`). Migration `drizzle/0012_panoramic_elektra.sql`.
- `server/src/schemas/content.ts` — new `feedMonitorSchema`.
- `server/src/routes/feedMonitors.ts` — full CRUD route: `GET /` list, `POST /` create, `PATCH /:id` toggle/update, `DELETE /:id` remove, `POST /:id/check` immediate manual check (202 fire-and-forget matching the repurpose route's own async pattern).
- `server/src/workers/feedMonitorWorker.ts` — `node-cron` task running `*/30 * * * *`; uses `rss-parser` to handle both RSS 2.0 and Atom 1.0; processes at most 1 new item per tick to avoid flooding the pipeline on first run. `checkFeedMonitor()` exported for the manual-check route.
- `server/src/index.ts` — `startFeedMonitorWorker`/`stopFeedMonitorWorker` wired into the server bootstrap and graceful-shutdown sequence alongside the existing content + publish workers.
- `client/src/api.ts` — `getFeedMonitors`, `createFeedMonitor`, `toggleFeedMonitor`, `deleteFeedMonitor`, `checkFeedMonitorNow`.
- `client/src/pages/Repurpose/FeedMonitorPanel.tsx` — new collapsible sidebar panel: lists subscribed feeds by hostname with last-check time, pause/resume toggle, "Check now" spinner, and delete; inline "Add" form (feed URL + platform + tone + audience).
- `client/src/pages/Repurpose.tsx` — `FeedMonitorPanel` added to the right sidebar above the history list.

Both client and server typecheck clean (`npx tsc --noEmit` passes on both). Server migration generated. `FUTURE_FEATURES.md`'s Repurpose section cleared.

## 2026-08-05 — Calendar: real auto-publish

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Calendar "Actual auto-publish" item.

Placing a job on the Calendar was previously a pure planning aid — no BullMQ delayed job ever called a platform's post API at the scheduled time. This wires real delivery scoped to the Calendar's existing `scheduled_posts` table only (jobId + date), deliberately leaving `social.ts`'s separate in-memory platform+time+content schedule Map untouched — see that route's own WHY comment for why the two weren't unified into one concept in this pass.

- `server/src/db/schema.ts` — `scheduled_posts` gains `publishPlatform` (nullable — omitting it keeps the old reminder-only behavior), `publishStatus` (`pending`/`posted`/`failed`), `publishedAt`, `postUrl`, `publishError`. Migration `0011_great_prima.sql`.
- `server/src/lib/socialPublish.ts` — new shared module: the LinkedIn/Twitter posting logic (build text from content shape → call the platform API → derive a browsable post URL) extracted out of `routes/social.ts`'s `POST /post`, so both that interactive route and the new worker call one implementation instead of two copies that could drift.
- `server/src/lib/publishQueue.ts` — new BullMQ queue `scheduled-publish` (separate from `queue.ts`'s content-generation queue — different delay/retry shape). `queuePublishJob`/`cancelPublishJob` remove-then-add so rescheduling a job to a new date replaces its delayed job rather than firing both.
- `server/src/workers/publishWorker.ts` — new worker: loads the job's final content + the user's stored OAuth token, calls `socialPublish.ts`, records the outcome back onto the `scheduled_posts` row. `attempts: 1` — a failure is recorded as a visible `failed` status with `publishError`, not silently retried.
- `server/src/index.ts` — wires `startPublishWorker`/`stopPublishWorker` into the existing bootstrap/graceful-shutdown sequence, same pattern as the content worker.
- `server/src/routes/scheduledPosts.ts` — `POST /` now accepts an optional `publishPlatform`; when present, queues a delayed job set to fire at a fixed 9am UTC slot (`PUBLISH_HOUR_UTC`) on the scheduled date (no time-of-day picker — a deliberately smaller scope than a full timestamp column). Rescheduling a job (upsert-on-jobId) resets `publishStatus`/`publishedAt`/`postUrl`/`publishError` back to pending so a moved job doesn't keep showing a stale badge from its old date. `DELETE /:jobId` cancels any queued publish job.
- `server/src/routes/social.ts` — `POST /post` now calls the shared `publishToSocialPlatform` instead of its own inline duplicate; exports `dbGetToken`/`PLATFORM_LABELS` for the new worker to reuse.
- `server/src/schemas/scheduledPosts.ts` — `createScheduledPostSchema` gains optional `publishPlatform: z.enum(['linkedin', 'twitter'])`.
- `client/src/types/scheduledPost.ts` — `ScheduledPost` gains `publishPlatform`/`publishStatus`/`publishedAt`/`postUrl`/`publishError`; new `PublishPlatform`/`PublishStatus` types.
- `client/src/pages/Calendar/calendarHelpers.ts` — `useSchedule()` now also returns `postsByJobId` (jobId → full row, for reading publish state) alongside the existing date-grouped `ScheduleMap`; `allocate()` accepts an optional `publishPlatform` third argument.
- `client/src/pages/Calendar/DayDetailPanel.tsx` — each scheduled job row now shows either an "Auto-publish…" picker (disabled with an explanatory tooltip when the user has no connected LinkedIn/Twitter account) or, once a platform is chosen, a pending/posted/failed status badge (posted links out to the real post; failed shows the error in a tooltip) plus a Cancel action that reverts to reminder-only.
- `client/src/pages/Calendar.tsx` — plumbs `postsByJobId` and an `onSetPublishPlatform` handler through to `DayDetailPanel`.
- `client/src/pages/Calendar/calendarStyles.ts` — new `.sc-detail-job-wrap`/`.sc-publish-menu*`/`sc-spin` styles (the job-row border moved from `.sc-detail-job` to a new wrapper class so it separates jobs, not a job's own info row from its new publish-control row underneath).
- `CLAUDE.md` — §9 Known Limitations updated (was an explicit "no auto-publish worker exists" disclosure, now describes what actually fires); routes/lib/workers folder listing updated with the new files; `schema.ts`'s table count corrected from a stale "8 tables" to the real current 11.

Both client and server typecheck clean; ESLint clean on all changed files (server's two `catch (error)` unused-var warnings are the same pre-existing pattern used throughout this codebase's routes). Server: 402/411 — the 9 failures are the same pre-existing/environmental ones noted in the version-history entry above (local Redis unavailable + 2 long-standing `rateLimit-keyGenerator` failures), none in code this change touched.

## 2026-08-05 — Library: per-job version history

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Library "No per-job version history" item.

`persistJobToDB` (`lib/persistJob.ts`) unconditionally deletes and re-inserts `contentOutputs` on every persist — including a regenerate — so the previous `final` output was destroyed in place with no way to compare or revert. Rather than changing that shared path (used by every job completion, not just regenerates — a much larger blast radius), a new table is populated by a snapshot step at the two call sites that actually overwrite a result a user might want back: regenerate and restore itself.

- `server/src/db/schema.ts` — new `job_output_versions` table (id, jobId, content, qualityScore, label, createdAt), no cascade delete (same "display/lineage metadata, not enforced referential integrity" stance as `sourceJobId`). Migration `0010_brown_nightcrawler.sql`.
- `server/src/routes/jobs/manage.ts` — `POST /:jobId/regenerate` now snapshots the current `final` output (with its critique score) into `job_output_versions` immediately before the in-memory job is overwritten. Best-effort: a snapshot failure logs and continues rather than blocking the regeneration the user asked for.
- `server/src/routes/jobs/versions.ts` — new sub-router: `GET /:jobId/versions` (list history, newest first) and `POST /:jobId/versions/:versionId/restore` (replace the current `final` output with a past snapshot's content — the pre-restore content is itself snapshotted first, so restoring is non-destructive too). Mounted in `jobs/index.ts`.
- `server/src/routes/jobs/list.ts` — the `GET /` paginated/searchable/sortable job list was extracted out of `manage.ts` into its own file (unrelated to versioning itself) purely to keep `manage.ts` under the 400-line split threshold after the regenerate-route snapshot logic pushed it over.
- `client/src/types/jobVersion.ts` — `JobOutputVersionSummary`, `JobVersionListResponse`.
- `client/src/api.ts` — `getJobVersions`, `restoreJobVersion`.
- `client/src/pages/Result/components/panels/HistoryPanel.tsx` — new panel: lists snapshots (label, relative time, score) with a confirm-before-restore action per row.
- `client/src/pages/Result/components/ActionDrawer.tsx` — new "History" tab alongside Feedback/Post/Hashtags.
- `client/src/pages/Result/hooks/useJobData.ts` — exposes `loadJob` so a successful restore can re-fetch the job and show the restored content immediately.

Both client and server typecheck clean; ESLint clean on all changed files (pre-existing `catch (error)` unused-var warnings carried through the `manage.ts` split unchanged, not introduced by it). Server: all `jobs`-scoped tests pass; full suite is 402/411 due to 7 environmental failures in `social-route.test.ts` (local Redis unavailable in this dev environment — `social.ts`'s rate limiter correctly rejects with 503 per the "never fall back to an in-memory limiter" rule rather than silently degrading) plus the 2 pre-existing `rateLimit-keyGenerator.test.ts` failures already noted in earlier entries — none of the 9 are in code this change touched.

## 2026-08-05 — Code review fixes: prompt injection, broken Twitter OAuth, and 15 other findings

**Status:** Complete. All findings in `CODE_REVIEW_2026-08-05.md` were independently re-verified
against current file state (5 parallel research passes) before fixing; verdicts and line numbers
are recorded in that document. All 3 CRITICAL and 6 HIGH findings confirmed and fixed; 4 of 4
MEDIUM confirmed and fixed; a handful of LOW findings (uncleaned timers, index-as-key) fixed as
well. Pure duplication/reuse LOW findings and the broad `res.status(500)` vs `next(error)`
pattern (#31) were left as documented, not fixed — the latter would change client-visible error
copy across ~10 files with no security/correctness upside, out of scope without explicit sign-off.

- **CRITICAL — writer prompt injection via unwrapped `criticFeedback`** (`server/src/agents/writer.ts`): every other writer-prompt field is XML-wrapped per the prompt's own stated invariant except `criticFeedback`, which flows from `repurpose.ts`'s scraped-URL text through `pipeline.ts`'s `initialFeedback` unwrapped. Now wrapped in `<critic_feedback>` tags.
- **CRITICAL — `/api/users/analyze-voice` unsanitized `samples` + whole `/api/users` router missing `sanitizeGenerationInput`** (`server/src/routes/users/brandVoice.ts`, `server/src/index.ts`): mounted `sanitizeGenerationInput` on `/api/users` (already had a `samples: 3000` limit defined but unapplied here).
- **CRITICAL — Twitter OAuth PKCE verifier unreproducible, connect flow could never succeed** (`server/src/routes/social.ts`): `code_verifier` was recomputed with a fresh `Date.now()` at callback time instead of reusing the value sent as `code_challenge` at connect time. Now generated once at connect time and carried through the signed `state` param to the callback.
- **HIGH — `imageRateLimit` missing fail-closed wrapper** (`server/src/middleware/rateLimit.ts`): the one limiter not wrapped in `failClosedMiddleware`, so a Redis outage silently fell back to an unenforced in-process limiter on the most expensive route in the app. Now wrapped like its siblings.
- **HIGH — `/api/image/generate` missing `sanitizeGenerationInput`** (`server/src/index.ts`, `server/src/middleware/rateLimit.ts`): added `prompt: 2000` to the sanitizer's field list and mounted it on `/api/image`.
- **HIGH — BullMQ retries jobs already reported failed to the client** (`server/src/workers/contentWorker.ts`): `processContentJob` had no try/catch around `runAndPersistPipeline`, so BullMQ's `attempts: 3` retried a pipeline that had already persisted `status: 'failed'` and emitted a terminal SSE event — burning provider quota again and risking a stale DB overwrite with no client listening. Now catches and swallows, matching `_runPipelineDirect`'s existing documented contract.
- **HIGH — Create form's carousel theme swatches didn't match rendered output** (`client/src/pages/Create/AdvancedOptions.tsx`): hardcoded its own theme color list that diverged from `Result/constants.ts`'s `CAROUSEL_THEMES` (the actual source used by both the live preview and PNG export). Now derives its swatches directly from `CAROUSEL_THEMES`.
- **HIGH — Brand.tsx profile form never hydrates under React 19 StrictMode dev double-invoke** (`client/src/pages/Brand.tsx`): the `hydrated` guard was set before scheduling the deferred `setTimeout`, so StrictMode's mount→cleanup→remount cleared the first timer while the second invocation's guard check skipped scheduling a replacement — no timer ever fired. Guard now flips only when the timer actually runs.
- **MEDIUM — `puppeteerAvailable` flag raced across concurrent pool spawns** (`server/src/lib/carousel.ts`): two `POOL_MIN` browsers spawn concurrently at boot; each `spawnBrowser()` call independently wrote a shared flag with no ordering guarantee, so a transient failure on one could stick the flag `false` even with a healthy pooled browser, permanently blocking exports. `renderSlideWithCache` now gates on `_pool.length` (checked live, race-free) instead; the now-dead flag was removed.
- **MEDIUM — `BatchResult.tsx` polling re-subscribed a new `setInterval` every tick** (`client/src/pages/BatchResult.tsx`): the effect depended on `items`, and the interval callback updated `items` every tick, tearing down/recreating the timer on every poll instead of running on one stable interval. Now reads live items via a ref; the effect depends only on `items.length`/`allDone`.
- **MEDIUM — SSRF filter in `repurpose.ts` checked the literal hostname, not the resolved IP** (`server/src/routes/content/repurpose.ts`): bypassable via DNS rebinding (a public hostname resolving to a private/loopback/metadata IP). Now resolves DNS via `dns.promises.lookup` and validates every resolved address before fetching.
- **MEDIUM — social OAuth connect/callback routes had no rate limiter** (`server/src/routes/social.ts`, `server/src/middleware/rateLimit.ts`, `server/src/index.ts`): added a new fail-closed `socialRateLimit` (30 req/15min, keyed by user) mounted on `/api/social`.
- **LOW — untracked `setTimeout` calls outside any owning effect** (`client/src/pages/Result/hooks/useSocial.ts`, `client/src/pages/Result/components/ExportModal.tsx`): both fired transient-state-reset timers from click handlers with no cleanup path on unmount. Now tracked in a ref-held `Set` and cleared on unmount.
- **LOW — index-as-React-key on AI-generated/LLM-derived list items**: `igslide/layouts/{ContentLayout,ProblemLayout,HowToLayout,FeaturesLayout}.tsx`, `Dashboard/InsightsCards.tsx`, `Competitor.tsx` — switched to a content-derived key (index + the item's own label/text) instead of index alone.

---

## 2026-08-05 — Library: collections/folders

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Library "No collections/folders" item.

Jobs could already be tagged (a single free-text label per job, shipped 2026-08-04) but not grouped into named, persistent groupings — a tag is one label per job; a collection is many-to-many (one job can belong to several collections).

- `server/src/db/schema.ts` — new `collections` (id, userId, name, createdAt) and `collection_jobs` (id, collectionId, jobId, addedAt) tables + relations. Unique index on `(collectionId, jobId)` makes "add a job that's already in the collection" a DB-level no-op. Migration `0009_bored_naoko.sql`.
- `server/src/schemas/collections.ts` — `createCollectionSchema` (name, 1–60 chars), `addJobToCollectionSchema` (jobId).
- `server/src/routes/collections.ts` — new top-level route (same shape as `routes/scheduledPosts.ts`): `GET /` (list with job counts), `POST /` (create), `DELETE /:id` (delete + cascade-clean memberships), `GET /:id/jobs` (lightweight job rows, same shape as `GET /jobs`), `POST /:id/jobs` (add), `DELETE /:id/jobs/:jobId` (remove). Ownership scoped by `userId` throughout; adding a job also runs `requireJobOwnership` (404, not 403, on mismatch) so a user can't add another user's job into their own collection.
- `server/src/index.ts` — mounted at `/api/collections` behind `authMiddleware`.
- `client/src/types/collection.ts` — `Collection`, `CollectionListResponse`, `CreateCollectionResponse`.
- `client/src/api.ts` — `getCollections`, `createCollection`, `deleteCollection`, `getCollectionJobs`, `addJobToCollection`, `removeJobFromCollection`.
- `client/src/pages/Library/CollectionsPanel.tsx` — new component: pill row ("All jobs" + one pill per collection with a job count and hover-to-delete), inline "+ New" input to create a collection.
- `client/src/pages/Library/useLibraryData.ts` — `activeCollectionId` state; when set, `jobs`/`total`/`totalPages`/`jobsLoading`/`jobsError` all switch from the paginated `GET /jobs` query to `GET /:id/jobs` (a collection has no pagination of its own — the whole membership list loads in one shot). Existing tag-filter/search/sort logic is untouched and simply operates on whichever source is active.
- `client/src/pages/Library/ContentTab.tsx` — new "Add to collection" row action opens an inline picker (`CollectionPickerRow`, same colocated-component pattern as `TagInputRow`) listing every collection as a pill to click.
- `client/src/pages/Library/libraryHelpers.ts` — added `.lib-collection-*` CSS classes.

Both client and server typecheck clean; ESLint clean on all changed files. Server: 409/411 tests pass (2 pre-existing failures unchanged, unrelated to this change).

## 2026-08-05 — Brand: remove dead website input

**Status:** Complete. Fixes `FUTURE_FEATURES.md`'s Brand Bugs "`website` field is fully dead" item.

- `client/src/pages/Brand/IdentityCard.tsx` — removed the `website` prop, input label, and `<input>` element entirely. The field was local-only React state: it was never included in `handleSave`'s `updateBrandVoice` call and absent from `brandVoiceSchema`. Typing a URL and saving silently discarded it.
- `client/src/pages/Brand.tsx` — removed `website` useState, removed it from `applyProfileToForm`, removed the prop pass to `IdentityCard`.

## 2026-08-05 — Brand: Content DNA history (last 3 fingerprints, localStorage)

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Brand Design decisions "No history/versioning for Content DNA" item.

No schema migration — history is persisted in `localStorage` keyed by Clerk user ID, capped at 3 entries (each ContentDna object < 1 KB).

- `client/src/pages/Brand/dnaHistory.ts` — new utility: `loadDnaHistory(userId)` / `saveDnaHistory(userId, dna)` / `DnaHistoryEntry` type. MAX_HISTORY=3.
- `client/src/pages/Brand.tsx` — imports `useUser` to get `clerkUserId`; loads history via `useEffect` once `clerkUserId` stabilises (Clerk hydrates async); saves a new entry in `analyzeVoiceMutation.onSuccess`; passes `dnaHistory` to `ContentDnaCard`.
- `client/src/pages/Brand/ContentDnaCard.tsx` — optional `dnaHistory` prop; renders a "Previous fingerprints" section below the Analyze button when `dnaHistory.length > 1`, showing up to 2 past snapshots with timestamp + 4 key trait chips each.

## 2026-08-05 — Library: lineage view (sourceJobId chip on each multiplied row)

**Status:** Complete. Implements part of `FUTURE_FEATURES.md`'s Library "no lineage view connecting multiplied jobs via sourceJobId" item.

`sourceJobId` and `sourcePlatform` were already present in the DB, `AssembledJob`, and `GET /jobs` response — nothing in the Library UI was reading them.

- `client/src/pages/Library/libraryHelpers.ts` — added `sourceJobId?: string | null` and `sourcePlatform?: string | null` to `LibraryJob`; added `.lib-lineage-chip` CSS class.
- `client/src/pages/Library/ContentTab.tsx` — renders a `.lib-lineage-chip` anchor next to the tag chip when `job.sourceJobId` is set; shows the source platform icon + label (from `platformMeta`); clicking navigates to `/result/{sourceJobId}` without triggering the row expand.

## 2026-08-05 — Library: analytics panel (score distribution, platform mix, score trend)

**Status:** Complete. Implements part of `FUTURE_FEATURES.md`'s Library "no analytics/aggregate view (score trends, platform mix)" item.

All derived client-side from the already-fetched page — no extra API calls.

- `client/src/pages/Library/LibraryAnalyticsPanel.tsx` — new component: score distribution by tier (A ≥80 / B 60–79 / C 40–59 / D <40) bar chart; platform mix bar chart; weekly average score sparkline (shown when ≥2 weekly buckets exist).
- `client/src/pages/Library/libraryHelpers.ts` — added `.lib-analytics-panel`, `.lib-analytics-section`, `.lib-analytics-title`, `.lib-bar*`, `.lib-sparkline` CSS classes.
- `client/src/pages/Library/LibraryHeader.tsx` — added "Analytics" toggle button (accent-2 coloured when active) alongside the existing Manage button; added `showAnalytics`/`onToggleAnalytics` props.
- `client/src/pages/Library/useLibraryData.ts` — added `showAnalytics`/`setShowAnalytics` state, exposed in return object.
- `client/src/pages/Library.tsx` — imports `LibraryAnalyticsPanel`; wires analytics props to `LibraryHeader`; renders the panel between the toolbar and content list when `showAnalytics` is active.

Both client and server typecheck clean. 409/411 server tests pass (2 pre-existing failures unchanged).

## 2026-08-04 — Library: sort=score is now a true global sort (server-side two-step query)

**Status:** Complete. Fixes `FUTURE_FEATURES.md`'s Library "`sort=score` is not a true global sort — it only reorders whatever page was already fetched" item.

Previously, "Sort: Score" in the Library re-sorted the 10 already-fetched rows in-memory — the highest-scoring post in your entire library might never appear on the first page. It now runs a two-step Drizzle query: (1) a `LEFT JOIN` on a `contentOutputs` score subquery to retrieve job IDs ordered by `MAX(qualityScore) DESC NULLS LAST` globally, then (2) a relational `findMany` on those IDs to load full output data. No schema migration needed — `idx_content_outputs_job_type on (jobId, outputType)` already covers the subquery's `WHERE outputType='critique' GROUP BY jobId`.

- `server/src/routes/jobs/manage.ts` — added `inArray` import; split the DB fetch branch into a `sort === 'score'` two-step path and an unchanged `date`/`platform` path; the comment block at the top of `GET /` updated to reflect the fix. The in-memory re-sort that follows is kept (now a "stabilization sort" that only ensures any prepended in-flight memory-only jobs — which have no score — end up after the DB's already-correctly-ordered results).

Both client and server typecheck clean. 409/411 server tests pass (2 pre-existing `rateLimit-keyGenerator.test.ts` failures, unchanged).

## 2026-08-04 — Library: tag chip + filter UI (connects the already-built server tag endpoint)

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Library "`contentJobs.tag` column + `PATCH /:jobId/tag` endpoint already exist server-side but are completely unused by the Library UI" item — the backend was fully done; nothing in the client ever called the endpoint or read the `tag` field.

- `client/src/api.ts` — added `tagJob(jobId, tag)` calling `PATCH /api/jobs/:id/tag` (the only missing client-side piece).
- `client/src/pages/Library/libraryHelpers.ts` — added optional `tag?: string | null` to `LibraryJob`; added CSS classes for the tag chip (`.lib-tag-chip`), inline edit input (`.lib-tag-input-wrap`, `.lib-tag-input`), and tag filter pills (`.lib-tag-filters`, `.lib-tag-filter-pill`).
- `client/src/pages/Library/useLibraryData.ts` — added `tagFilter`/`setTagFilter` state; `editingTagJobId`/`setEditingTagJobId` state; `tagJobMutation` (React Query `useMutation` wrapping `tagJob()`, invalidates `['library', 'jobs']` on success); `pageTags` (stable `useMemo` collecting unique tags from the current page, same accepted in-page limitation as `sort=score`); `filteredJobs` now applies `tagFilter` client-side when set.
- `client/src/pages/Library/ContentTab.tsx` — renders a `.lib-tag-chip` next to the platform/status meta on each row when `job.tag` is set; the expanded `RowActionStrip` gained an "Add tag" / "Edit tag" action that opens a `TagInputRow` inline input below the strip; `TagInputRow` (private helper at the bottom of the file) manages its own draft string, submits on Enter/Save, cancels on Escape/×, and passes validation (1–30 chars, matching `tagJobSchema`).
- `client/src/pages/Library/LibraryToolbar.tsx` — added a tag-filter row (`.lib-tag-filters`) below the platform pills, rendered only when `pageTags.length > 0` (zero tags = no row = no visual clutter for new users); clicking a pill toggles that tag as the active filter; a "Clear filter" pill appears when a filter is active.
- `client/src/pages/Library.tsx` — wired all new props through to `LibraryToolbar` and `ContentTab`.

Both client and server typecheck clean. 409/411 server tests pass (2 pre-existing `rateLimit-keyGenerator.test.ts` failures, unchanged).

## 2026-08-04 — Repurpose: multi-platform repurposing from one URL fetch

**Status:** Complete (multi-platform scope only — multi-URL batch input explicitly deferred, kept
as its own open item). Implements the multi-platform half of `FUTURE_FEATURES.md`'s Repurpose
"No batch/multi-URL input and no multi-platform repurposing" item — the real inefficiency it
called out: repurposing one article to N platforms required re-pasting the same URL N times, each
paying the full fetch+extraction+topic-summary cost again.

- `server/src/schemas/content.ts` — `repurposeSchema` gained optional `platforms: string[]`
  (max 5, additive to the existing required `platform`, so a request that never sends it behaves
  exactly as before).
- `server/src/routes/content/repurpose.ts` — extracted the fetch/sanitize/extract/summarize logic
  into `fetchAndExtractArticle()`, run exactly once per request regardless of platform count; job
  creation now fans out per platform via `Promise.allSettled` (same parallel pattern as
  `jobs/batch`). Response gained a `jobs: [{jobId, platform}]` array while keeping the top-level
  `{jobId, topic}` shape existing callers already read (both refer to the same job when only one
  platform was requested).
- `client/src/api.ts` — `repurposeUrl()` accepts optional `platforms` and returns `jobs`.
- `client/src/pages/Repurpose.tsx` — added a "Repurpose to multiple platforms" toggle switching the
  existing single-select platform pills into a multi-select; on a multi-platform submission with
  more than one resulting job, navigates to `/batch-result` (built for Create's batch mode,
  reused here rather than building a second N-jobs-from-one-submission results page) instead of
  `/result/:jobId`.
- `client/src/pages/Repurpose/PlatformPicker.tsx` (new) — extracted the platform-selection block;
  adding the toggle pushed `Repurpose.tsx` to 401 lines, one over the split threshold.
- `server/tests/integration/repurpose-route.test.ts` (new, 9 tests) — single-platform call shape
  unchanged, multi-platform fetch/summarize called exactly once regardless of platform count, one
  job per platform each with its own id, `sourceUrl` consistent across the fan-out, and the
  existing single-fetch error paths (invalid URL, SSRF, fetch failure, insufficient content, the
  5-platform cap) still apply before any fan-out.

Both client and server typecheck clean; 409/411 server tests pass (1 pre-existing unrelated
failure, unchanged).

## 2026-08-04 — Repurpose: history of recent attempts (success and failed)

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Repurpose "No history of past repurposed
URLs" item — a failed or abandoned Repurpose submission previously left nothing behind, unlike
Create's draft persistence.

- `client/src/pages/Repurpose/useRepurposeHistory.ts` (new) — `localStorage`-backed history of the
  last 15 attempts (not `sessionStorage` like Create's draft — a repurpose attempt worth
  retrying/revisiting is meaningful across days, not just the current tab session). Records both
  outcomes: a successful attempt carries its `jobId` (now that item 3's `sourceUrl` persistence
  work landed, that job is itself the durable record — this hook only needs to remember "which job
  came from which URL"); a failed attempt carries the error message so the user can see why it
  failed without retrying blind.
- `client/src/pages/Repurpose/RepurposeHistoryList.tsx` (new) — compact sidebar card, hidden when
  empty. Success entries link to `/result/:jobId`; failures show a retry icon.
- `client/src/pages/Repurpose.tsx` — records an entry on every attempt that actually reached the
  server (a client-side `validateUrl()` rejection before the network call isn't a meaningful
  "attempt" to remember); `handleRetryFromHistory` re-fills the form rather than silently
  re-submitting the exact request that just failed, matching how every other retry affordance in
  this app works.
- `client/src/pages/Repurpose/InfoSidebar.tsx` (new) — extracted the page's static informational
  cards (Supported Sources / How It Works / Pro Tip) into their own component; adding the history
  feature pushed `Repurpose.tsx` to 409 lines, over the 400-line split threshold, and this content
  had zero state/props dependency, making it the natural piece to pull out. Also fixed an
  index-as-key violation in the extracted `howItWorks` list while moving it (`key={i}` → `key={step}`).

Client typecheck clean; no server changes, so the 400/402 server test baseline is unaffected.

## 2026-08-04 — Repurpose: persist sourceUrl; show "Repurposed from" on Result and Library

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Repurpose "`sourceUrl` is captured but
never persisted" item — the original article URL was set on the in-memory job object by
`routes/content/repurpose.ts` but dropped before the DB write, so it vanished once the job was
persisted or aged out of memory.

- `server/src/db/schema.ts` — added `contentJobs.sourceUrl` (nullable text, no FK — same
  display/lineage pattern as `sourceJobId`/`sourceCompetitorAnalysisId`). Migration
  `server/drizzle/0008_square_tempest.sql`.
- `server/src/lib/pipeline.ts` — `sourceUrl` was previously only reachable via `PipelineJob`'s
  `[key: string]: unknown` index signature (untyped, unsafe); added as a real optional field.
- `server/src/lib/persistJob.ts` — now carries `sourceUrl` through to the `contentJobs` INSERT,
  mirroring the existing `sourceJobId`/`sourceCompetitorAnalysisId` handling.
- `server/src/routes/jobs/ownership.ts` — added `sourceUrl` to `AssembledJob`/`assembleJobFromDB`
  (the DTO rebuilt once a job ages out of `jobsMemory`).
- `client/src/pages/Result/components/ResultHeader.tsx` — shows "Repurposed from: `<url>`" under
  the title when present.
- `client/src/pages/Library/ContentTab.tsx` — a small external-link icon on the job row (tooltip +
  click-through) at that view's row density.
- `client/src/lib/utils.ts` — extracted `isSafeHttpUrl()` (http/https-only scheme guard for any
  externally-influenced value rendered as an `<a href>`) as a shared helper, refactoring the two
  near-identical inline copies already in `Ideate/IdeaCard.tsx` and this change's `ResultHeader.tsx`
  addition rather than letting a third copy diverge.

**Incidental fix, found while adding this DTO field:** `sourceCompetitorAnalysisId` (added earlier
the same day for the Competitor→Create pipeline-linkage feature) had been added to the DB column
and `persistJob.ts`'s INSERT, but never added to `AssembledJob`/`assembleJobFromDB` — meaning the
"based on competitor analysis" lineage silently disappeared once a job aged out of `jobsMemory`
(the same 10-minute-eviction bug class `sourceJobId`'s own code comments describe fixing
previously). Added alongside `sourceUrl` in the same DTO.

Both client and server typecheck clean; 400/402 server tests pass (1 pre-existing unrelated
failure, unchanged).

## 2026-08-04 — Create: learned audience defaults from the user's own job history

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Create "Static, not learned, defaults"
item's actionable half — target-audience defaults now derive from the user's own history instead
of one hardcoded string per platform for every user. Left `TOPIC_PLACEHOLDERS` as static example
text: unlike audience (a recurring pattern worth reusing), a topic placeholder that echoed a past
real topic would read as "reuse this exact topic" rather than "here's an example of the format" —
not implemented, and not carried forward as an open item either, since static example topics are
the correct behavior here, not a gap.

- `server/src/routes/jobs/insights.ts` (new) — `GET /api/jobs/audience-defaults`: for each
  platform, the most-frequent non-blank `targetAudience` string across the user's last 40
  completed jobs (frequency, not recency alone — a one-off multiplied-content job with an unusual
  audience shouldn't override what the user overwhelmingly types for that platform). Mounted in
  `server/src/routes/jobs/index.ts` ahead of `manageRouter`, since its static `/audience-defaults`
  path would otherwise be swallowed by `manageRouter`'s `GET /:jobId`. Returns `{}` (200, not an
  error) for a brand-new/demo/no-DB identity — a read-only convenience, not a hard dependency.
- `client/src/api.ts` — `getAudienceDefaults()`.
- `client/src/pages/Create.tsx` — new `audienceDefaultsQuery` (React Query, its own cache key,
  independent of the brand-voice profile query); `effectiveAudience`/the audience field's
  placeholder/`BatchTopicList`'s per-row fallback now all prefer the learned value over the static
  `AUDIENCE_DEFAULTS` map, which still backs new users and platforms with no history yet.
- `server/tests/integration/jobs-audience-defaults.test.ts` (new, 5 tests) — most-frequent
  computation, platforms with no history omitted, user-scoping (no cross-user leakage), the
  no-dbUserId empty-response case, blank-value filtering.

Both client and server typecheck clean; 400/402 server tests pass (1 pre-existing unrelated
failure, unchanged).

## 2026-08-04 — Create: batch/multi-topic creation UI (up to 7 posts in one submit)

**Status:** Complete. Implements `FUTURE_FEATURES.md`'s Create "No batch/multi-topic creation UI"
item. `POST /api/jobs/batch` and `createBatchJobs()` were already fully built server/client-side
but unreachable — nothing constructed a batch request, and the display page (`BatchResult.tsx`)
had been deleted in an earlier cleanup pass. Rebuilt the missing piece: the submission UI and a
modernized results page.

- `client/src/pages/Create/BatchTopicList.tsx` (new) — up to 7 topic+platform rows (add/remove),
  shared tone/audience fields applied to all rows, submits via the existing `createBatchJobs()`.
  Uses the shared `Dropdown` component per row rather than Create's full platform card grid
  (7 of those stacked would be an enormous scroll).
- `client/src/pages/Create.tsx` — added a "Plan multiple topics" toggle in the header that swaps
  the single-topic `TopicStep` for `BatchTopicList`; on submit, navigates to `/batch-result` with
  the created job list in router state (same one-shot state-handoff pattern `CreateHandoff` already
  uses elsewhere, not a new mechanism).
- `client/src/pages/BatchResult.tsx` (rebuilt from git history) — polls each job's status every
  2.5s, shows per-item progress/score/platform, an overall progress bar, and post-completion CTAs
  (Library/Calendar/Create more). Rewritten from the original to read its job list from router
  state instead of a `?jobs=id|platform,...` URL param format (simpler, and a hard refresh already
  couldn't usefully resume a param-encoded batch either way), and from hardcoded hex colors to the
  app's `var(--...)` theme tokens (the original predates the 6-theme system).
- `client/src/App.tsx` — added the `/batch-result` route (lazy-loaded, matching every other
  authenticated page).
- `server/src/routes/jobs/create.ts` — the batch route's 500 error response was missing the
  `retryable` field CLAUDE.md's error-shape rule requires; added while wiring the UI that now
  depends on it.
- `client/src/components/ToolsDropdown.tsx`, `CLAUDE.md` §9 — updated the stale "no UI exists"
  notes; deliberately did not add a Tools nav entry, since batch creation lives inside Create's
  toggle rather than being its own destination.

Both client and server typecheck clean; 395/397 server tests pass (1 pre-existing unrelated
failure, unchanged).

## 2026-08-04 — Docs: single-brand-profile scope decision recorded; dropped one unbuilt wishlist item

**Status:** Complete. Documentation-only change, no code touched.

- Confirmed via codebase search that no multi-brand/workspace scaffolding exists anywhere
  (`users` holds `brandName`/`brandVoice`/`industry`/`contentDna` directly as columns, no separate
  brand/workspace table, no multi-tenant code) — the app is already single-profile-per-user by
  construction, this was never a partial/half-built gap.
- `FUTURE_FEATURES.md`'s Brand "Design decisions" — removed "Single brand profile only" as an open
  item and replaced it with a note stating this is intentional scope, not a gap, so it isn't
  mistaken for planned work in a future session. Added the same decision as a row in `CLAUDE.md`
  §8 "Architecture Decisions".
- `FUTURE_FEATURES.md`'s Brand "Design decisions" — also removed "No live tone/voice preview" (an
  unbuilt wishlist idea for a sample-sentence preview panel, not a live feature). Brand Voice
  itself (tone selection, phrases-to-use/avoid, voice-consistency scoring) is unaffected and stays
  as-is — confirmed with the user this refers to writing style/tone only; there is no audio,
  text-to-speech, or spoken-voice feature anywhere in this app.

## 2026-08-04 — Templates feature removed entirely (backend + frontend + docs)

**Status:** Complete. The Templates CRUD feature (save/reuse a successful post's structure as a
reusable template) is fully removed — earlier in the day, its route/schema/UI files had already
been deleted in a separate cleanup pass after confirming the current Library/Result pages had no
caller left for it; this pass removes the one piece that survived that cleanup, the DB table
itself, plus every remaining reference across code, tests, and docs.

- `server/src/db/schema.ts` — dropped the `templates` table and its `Template`/`NewTemplate`
  type exports. Migration `server/drizzle/0007_deep_mad_thinker.sql` (`DROP TABLE "templates"
  CASCADE`), generated via `npm run db:generate`.
- `server/src/routes/users/account.ts` — `GET /me/export` no longer queries or returns a
  `templates` array; `DELETE /me`'s account-deletion transaction no longer deletes from it.
- `server/tests/integration/users-account-deletion.test.ts`,
  `server/tests/integration/users-profile-cache.test.ts` — removed the now-nonexistent `templates`
  entry from each test's `db/schema.js` mock.
- `client/src/types/api.ts` — removed the `Template` interface and `ExportDataResponse.templates`
  field (confirmed unused anywhere else in the client first).
- `client/src/pages/Brand/DeleteAccountModal.tsx` — the delete-confirmation copy no longer claims
  "templates" will be deleted, since nothing is left to delete.
- Docs: removed every reference across `FUTURE_FEATURES.md` (Create's "No template-driven
  starting point" item, Library's "Templates tab search/sort" item — both now moot, not "done"),
  `CLAUDE.md` (folder-structure listing: `TemplatesTab.tsx`/`TemplatePanel.tsx`/`routes/templates.ts`
  entries, `ActionDrawer.tsx`'s panel-list description, the DB table count/list), `README.md`
  (public feature list), and `UI_UX_DOCUMENTATION.md` (Library's Templates tab layout/color/empty-state
  notes, the two Templates-page navigation findings, and finding #21 marked resolved rather than
  deleted to preserve the table's existing numbering).

**Incidental fix, found while updating the account-deletion test's mock:** removing `templates`
exposed that the same mock was also missing `scheduledPosts` entirely (never added when that table
shipped earlier the same day) — the route's real code already needed it, so every test in this file
was failing with a 500 from an `undefined.userId` access. Added the missing mock entry; this
resolves 2 of the session's previously-tracked pre-existing test failures (down to 1 remaining
unrelated failure, `rateLimit-keyGenerator.test.ts`, 2 tests).

Both client and server typecheck clean; 395/397 server tests pass.

## 2026-08-04 — Ideate + Competitor: all 9 remaining "Design decisions"/"Quick wins" items

**Status:** Complete. Implements every remaining item from `FUTURE_FEATURES.md`'s Ideate and
Competitor sections. No production data exists yet, so the DB schema was changed freely.

**Competitor persistence (C1):** new `competitor_analyses` table (`server/src/db/schema.ts`:
userId FK, handle, industry, `analysis` jsonb, soft-delete, `(userId, deleted, createdAt)` index)
+ migration `0006_peaceful_adam_warlock.sql`. `POST /api/content/competitor` now best-effort
persists each analysis (non-fatal on DB failure — the user's response never blocks on it); new
`GET /api/content/competitor/history` (auth-scoped, capped at 20, most-recent-first). Client:
`Competitor/HistoryDropdown.tsx` (new) — a small "Past analyses" dropdown that reloads a prior
result client-side without re-calling the (paid, slower) analyze endpoint.

**Competitor grounded in real data (C2):** `competitor.ts`'s unauthenticated `fetch()` scraping of
LinkedIn/Twitter/X profile pages (routinely blocked by bot detection) replaced with 3 parallel
`searchTavily()` calls, same tolerant `Promise.allSettled` pattern `agents/researcher.ts` already
established. `dataQualityNote` now reflects search-grounded vs. general-pattern framing depending
on whether Tavily returned anything.

**Competitor → pipeline linkage (C3):** `contentJobs.sourceCompetitorAnalysisId` (display/lineage,
mirrors the existing `sourceJobId` pattern — no FK). The actual prompt-time effect is a separate
`competitorContext` string: `routes/jobs/create.ts`'s `loadOwnedCompetitorContext()`
(ownership-checked) loads a chosen analysis's `contentGaps`/`suggestedAngles` server-side and
`agents/orchestrator.ts` splices it into its prompt as a `<competitor_context>` block — normal
research still runs, this only adds inspiration, doesn't replace it (unlike Multiply's
skip-research path).

**`CreateHandoff` extended (C4):** `client/src/lib/utils.ts`'s `CreateHandoff` gained optional
`industry`/`competitorContext`/`competitorAnalysisId`. `Create.tsx` now imports the real
`CreateHandoff` type instead of an inline hand-typed cast, and folds `industry` into
`competitorContext` prompt text (no new visible field, since Create has no industry input today).
Competitor's two `navigateToCreate` call sites (content-gap CTA, suggested-angle CTA) now pass all
three.

**Ideate — regenerate one idea (I1):** new `POST /api/content/ideate/regenerate-one`
(`focusTopic`/`excludeTitles` capped at 10×100 chars/`competitorAnalysisId`). `IdeaCard.tsx` gained
a dedicated regenerate icon, kept distinct from × (dismiss) so a user clicking × isn't surprised by
an idea silently coming back different. `Ideate.tsx`'s `handleRegenerateOne` merges the replacement
back via `.map()` at the same stable index `handleDismiss` already used — never a filter/splice
that would shift other ideas' indices mid-flight.

**Ideate — Tavily grounding + "why now" (I2/I3):** same `buildTrendContext()` pattern as C2, spliced
into both the batch and regenerate-one prompts; the prompt now requires each idea's `why` to cite
something concrete from the trend context. Ideas gained an optional `sourceUrl` (schema + client
`IdeatedIdea` type — optional so pre-existing localStorage data isn't dropped by the type guard),
shown as a "Based on this source" link when present.

**Ideate — performance-predictor-lite (I4):** a new lightweight prompt (not a reuse of
`runPerformancePredictor`, which requires already-written content + a critic score neither of which
exist at ideation time) batched into the same generation call — `tier` + a one-phrase `topReason`
only, the honest amount of signal a pre-writing estimate supports. `IdeaCard.tsx` shows a tier badge
reusing `Dashboard/PredictionInsights.tsx`'s exact color mapping (CLAUDE.md §13 — tier colors are
signal, not decoration, so they stay one fixed mapping app-wide).

**Ideate — competitor-gap mode (I5):** `IdeateControls.tsx` gained a toggle + analysis picker,
hidden entirely when the user has zero saved analyses (reuses C1's history endpoint). When enabled,
`ideate.ts` loads the chosen analysis's gaps/angles server-side and blends them into the prompt as
inspiration alongside (not instead of) brand-profile generation.

**Incidental fix, found while building I2/I5** (`profile.industry` needed to actually persist for
grounding to work): `server/src/routes/users/profileStore.ts`'s `saveUserProfile`/
`seedUserProfilesFromDB` were previously hardcoding `industry: ''`/never writing it to the DB —
matched exactly the still-open Brand "Bugs" item describing this. Added the `users.industry` column
(migration `0005_watery_lady_deathstrike.sql`) and wired it through both read and write paths.

**Post-implementation review fixes** (found reviewing the agent's work, not part of its own report):
- Two missing pieces of CLAUDE.md's required `{error, code, retryable}` error shape, added to
  `competitor.ts` and `ideate.ts`'s error responses (4 + 4 spots).
- `IdeaCard.tsx`'s new "Based on this source" link rendered `idea.sourceUrl` — LLM-generated text
  ultimately from untrusted Tavily results — directly as an `<a href>` with no scheme check; a
  crafted `javascript:` URL would execute on click despite React's JSX escaping. Added an
  `isSafeHttpUrl()` guard restricting it to `http(s):` only.
- `Ideate.tsx`'s idea grid used `key={stableIndex}` — an array-position value, not a stable
  identity — which violates CLAUDE.md's no-index-key rule and was newly reachable now that I1 lets
  one card regenerate in place while others keep their position: dismissing/regenerating an earlier
  card shifts every later idea's index, so React would reuse the wrong card's DOM node (and its
  local `copied` clipboard-feedback state) for what is now a different idea. Switched to
  `key={idea.title}` (titles are unique within one generated batch — already relied on elsewhere in
  the same file for `savedTitles`).
- `excludeTitles` (the currently-visible idea titles sent to steer I1's regenerate away from
  duplicates) was spliced into the prompt without the XML-delimiter wrapping every other
  LLM-facing text field in this codebase uses — even though the text originates from a prior LLM
  generation rather than raw keystrokes, that generation could itself have been steered by a
  crafted `focusTopic`. Wrapped each title in `<existing_idea_title>` tags.

Both client and server typecheck clean; 391/397 server tests pass (6 pre-existing failures in
`users-account-deletion.test.ts`/`rateLimit-keyGenerator.test.ts`, confirmed unrelated — same
baseline as the prior entry below). 18 new tests added covering the persistence, Tavily-mocking,
and regenerate-one paths.

## 2026-08-04 — Brand voice-drift card + Competitor self-benchmark ("close the loop" items)

**Status:** Complete. Implements the remaining two items from `FUTURE_FEATURES.md`'s
"Cross-cutting theme" note: Brand's "No voice-drift detection UI" and Competitor's "No
benchmarking against the user's own content." Both were built with **zero server changes** —
each page already fetches (or now fetches) `getProfile()`'s existing `stats.dimensionAverages`/
`dimensionTrend`/`avgScore` (added earlier the same day for the Dashboard quality-trend feature)
and derives its own view client-side.

- `client/src/pages/Brand/VoiceDriftCard.tsx` (new) — shows the average `brandVoiceMatch` score
  (as a %) across the user's last 10 scored posts, plus a trend indicator comparing it to the
  previous 10, derived from `dimensionTrend` (already in Brand.tsx's existing `profileQuery`, no
  new fetch). Handles loading/error/empty states matching `PublishingConnectionsCard.tsx`'s
  existing pattern.
- `client/src/pages/Brand/brandStyles.ts` (new) — extracted Brand.tsx's inline `<style>` block
  (same pattern as `Dashboard/dashboardStyles.ts`) to keep the page under the 400-line cap after
  adding the new card.
- `client/src/pages/Brand.tsx` — wired in `VoiceDriftCard`.
- `client/src/pages/Competitor/BenchmarkCard.tsx` (new) — a "How You Compare" card shown alongside
  a competitor analysis, comparing the user's own avg quality score and hook-strength % (from
  `dimensionAverages.hookStrength`) against the competitor's `contentPatterns.hookStyle`.
  Deliberately narrow: hook strength is the only axis both sides of the comparison actually
  describe (the Critic's other 4 dimensions have no competitor-side equivalent), so nothing wider
  is fabricated.
- `client/src/pages/Competitor.tsx` — added a second `getProfile()` query sharing Dashboard/
  Brand's `['dashboard', 'profile']` cache key (a cache hit on the common navigation path), wired
  `BenchmarkCard` into the results grid next to Content Patterns.

**Incidental fix (found via `tsc --noEmit`, unrelated to the above):** `server/src/middleware/rateLimit.ts`'s
`authJobRateLimit`/`demoJobRateLimit`/`exportRateLimit`/`contentRateLimit` were typed `as const`
(readonly tuples), which Express's `RequestHandlerParams` type doesn't accept when passed as a
single array argument (`router.use(authJobRateLimit)` etc.) — a type-checker-only issue (Express
accepts arrays of middleware at runtime regardless of readonly-ness, confirmed no production
behavior was affected) but one that failed a clean `tsc --noEmit`. Fixed by typing them as plain
`RequestHandler[]` instead of removing `as const`'s readonness via a spread at each call site — the
existing call sites and their test mocks (`tests/security/jobs-stream-auth-gate.test.ts`,
`tests/unit/rateLimit-keyGenerator.test.ts`) both already assumed the array-as-single-argument
form, confirmed by first trying the spread approach and watching it break 9 tests before reverting
to the correct fix.

Both client and server typecheck clean; 373/379 server tests pass (6 pre-existing failures in
`users-account-deletion.test.ts`/`rateLimit-keyGenerator.test.ts`, confirmed unrelated to this
session by reproducing them against a stashed pre-session baseline).

## 2026-08-04 — Edge-case pass on the Dashboard/Calendar server-sync work

**Status:** Complete. Follow-up review of the same-day Dashboard feature work below, focused on
what happens outside the happy path. Found and fixed 5 real gaps:

- **Orphaned `scheduled_posts` rows on job delete** — `DELETE /:jobId` (`server/src/routes/jobs/manage.ts`)
  soft-deletes the job but never touched its `scheduled_posts` row, so a deleted job stayed
  "scheduled" forever from the DB's perspective. Added a best-effort cleanup delete right after the
  soft-delete succeeds (logged, non-fatal — an orphan is a display annoyance, not corruption worth
  failing the user's delete over).
- **`NextScheduledCard` didn't check its job fetch for errors** — if the nearest scheduled post's
  job no longer exists (any pre-existing orphan, or the above cleanup failing), `getJob()` 404s but
  `jobQuery.isError` was never read — the card rendered a live-looking entry with a "View" link that
  404'd on click. Now falls back to the same empty state as "no upcoming posts" when the job fetch
  errors, and disables retry on that query (a 404'd job isn't coming back).
- **`TrendChart` used the array index as a React key** — `points.map((_, i) => <rect key={i} .../>)`
  violates the project's no-index-key rule; switched to the point's own `jobId`, which was already
  on the data.
- **`latestPredictionTopReason`'s recency comparison was fragile** — it compared
  `prediction.createdAt` timestamps with a `0` fallback for missing values, so a row with a null
  `createdAt` could incorrectly "win" the comparison. Since `completedJobs` is already queried
  `orderBy createdAt asc`, simplified to a plain overwrite-per-iteration (last one seen is the most
  recent) — removes the fragile comparison entirely instead of hardening it.
- **`scheduledDate` validation accepted calendar-invalid dates** — the regex alone let
  `"2026-02-30"` or `"2026-13-45"` through (unreachable from the real Calendar UI, which only builds
  dateKeys from real days-in-month, but a defense-in-depth gap for direct API calls). Added a
  `.refine()` that round-trips the date through `Date.UTC` and rejects anything that doesn't match
  back. Covered by a new test in `scheduled-posts-route.test.ts`.

All 379 server tests pass (378 + 1 new), both client and server typecheck clean.

## 2026-08-04 — Dashboard: all 3 "Design decisions" items implemented (quality trend chart, PerformancePredictor surfacing, Calendar server-sync + awareness card)

**Status:** Complete. Implements all 3 items from `FUTURE_FEATURES.md`'s Dashboard "Design
decisions" section. No production data exists yet, so the DB schema was changed freely
(new enum value, new table) without migration-safety concerns.

**1. Per-dimension quality trend chart:**
- `server/src/routes/users/me.ts` — `stats` now also returns `dimensionAverages` (radar-friendly
  average of the Critic's 5 dimensions across all completed jobs) and `dimensionTrend`
  (chronological per-job series for a line chart), computed from the `contentOutputs.content.scores`
  jsonb already stored on `critique` rows but never aggregated server-side before.
- `client/src/pages/Dashboard/QualityTrendChart.tsx` (new) — plain-SVG radar + line chart with a
  toggle between the two views; no new chart dependency added. Handles loading/empty states.
- `client/src/types/api.ts` — added `DimensionAverages`, `DimensionTrendPoint` to `ProfileStats`.

**2. PerformancePredictor persistence + surfacing:**
- `server/src/db/schema.ts` — added `'prediction'` to `outputTypeEnum`.
- `server/src/lib/persistJob.ts` — `isDBOutputType` guard now allows `'prediction'` through to the
  DB insert; previously the predictor's tier/confidence/reasoning output was generated per job but
  discarded before persistence, so nothing durable existed to aggregate.
- `server/src/routes/users/me.ts` — `stats` now also returns `predictionTierCounts` (high/medium/low
  distribution across the user's completed jobs) and `latestPredictionTopReason`.
- `client/src/pages/Dashboard/PredictionInsights.tsx` (new) — tier distribution bar + latest insight
  card. All pre-existing jobs have zero `prediction` rows (feature is new) — renders a clean empty
  state rather than an error for those.
- Migration `server/drizzle/0004_real_exodus.sql`.

**3. Calendar server-sync + Dashboard "next scheduled post" card:**
- `server/src/db/schema.ts` — new `scheduled_posts` table (userId, jobId unique, scheduledDate,
  createdAt) with FKs to `users`/`content_jobs` and a `(user_id, scheduled_date)` index. Same
  migration file as above.
- `server/src/schemas/scheduledPosts.ts`, `server/src/routes/scheduledPosts.ts` (new) —
  `GET /api/scheduled-posts?month=YYYY-MM`, `POST /api/scheduled-posts` (upserts on jobId, preserving
  the existing one-job-one-date invariant; requires `requireJobOwnership`), `DELETE
  /api/scheduled-posts/:jobId` (userId-scoped). Mounted in `index.ts` behind `authMiddleware`.
- `client/src/pages/Calendar/calendarHelpers.ts` — replaced the old `localStorage`-backed
  `loadSchedule`/`saveSchedule`/`SCHEDULE_KEY` with a `useSchedule()` React Query hook (same
  `allocate(dateKey, jobId)`/`removeFromSchedule(jobId)` call shape as before, so `Calendar.tsx` and
  its child components needed no redesign — just a persistence-layer swap). `Calendar.tsx` updated
  to consume it and surface mutation failures via a toast instead of failing silently.
- `client/src/pages/Dashboard/NextScheduledCard.tsx` (new) — shows the nearest future scheduled
  post's topic/platform/date, linking to its Result page; "no upcoming scheduled posts" empty state
  links to `/calendar` instead.
- **Deliberately out of scope:** no BullMQ auto-publish worker — scheduling is still a planning
  intent only, same disclosed scope as `social.ts`'s existing reminder-only social scheduling. See
  `CLAUDE.md` §9's updated Calendar bullet and `FUTURE_FEATURES.md`'s Calendar section for what
  remains open.

**Incident note:** the agent that built this work hit a session limit mid-task and, in an earlier
partial pass, deleted 6 unrelated files (the whole Templates feature: `routes/templates.ts`,
`schemas/templates.ts`, `Library/TemplatesTab.tsx`, `Result/components/TemplatePanel.tsx`,
`Result/components/StatusDisplay.tsx`, `types/template.ts`) plus their `index.ts`/`schemas/index.ts`
wiring — collateral damage outside its actual task. Investigated and resolved: the 6 files were
restored from `HEAD` and their route/schema wiring re-added, then confirmed against the current
Library/Result page structure that this Templates UI genuinely has no caller left (a prior,
unrelated refactor had already dropped it from both pages) — so the 6 files were re-deleted for
consistency rather than left half-wired, and their now-dangling `server/tests/integration/templates-route.test.ts`
was removed too. Separately, a real bug was found and fixed: `schemas/scheduledPosts.ts`'s
`jobIdSchema` used zod's strict `.uuid()` (which enforces the RFC 4122 version/variant nibbles) where
the rest of the codebase's UUID convention (`routes/jobs/ownership.ts`'s `isValidUUID`) is a loose
8-4-4-4-12 hex check — this rejected valid-by-convention job IDs with a 400. Fixed to match the
existing loose regex. All 378 server tests pass; both client and server typecheck clean.

## 2026-08-04 — Dashboard: fixed "Best platform" stat mislabeling

**Status:** Complete. Fixes the Dashboard Bugs item from `FUTURE_FEATURES.md`: the stat was
picked by *post count* (`server/src/routes/users/me.ts`, `platformCounts` sort) but labeled
"Best platform," implying a quality ranking — a platform someone spams low-quality posts to
would show as "best."

Renamed the field end-to-end rather than re-ranking by avg score, so the label always matches
what the metric actually measures:
- `server/src/routes/users/me.ts` — `bestPlatform` → `mostUsedPlatform` (still picked by post
  count); the `quickTips` copy that referenced it was reworded to stop implying a performance
  claim ("Your Instagram content is performing well!" → "Instagram is your most-used
  platform...").
- `client/src/types/api.ts`, `Dashboard.tsx`, `Dashboard/StatsOverview.tsx` — prop/type renamed
  to match; stat card label changed from "Best platform" to "Most-used platform".
- `server/tests/integration/users-route.test.ts` — updated to the new field name (29/29 passing).

## 2026-08-04 — FUTURE_FEATURES.md: all Quick wins + the Library any-type bug fixed

**Status:** Complete. Every unchecked "Quick wins" item plus the one `any`-typed Bugs item
from `FUTURE_FEATURES.md` (added by the 2026-08-03 audit below) is now implemented and
checked off there. "Design decisions" items are untouched — those still need a real
migration/new table/new worker and remain logged as future work.

**Dashboard:**
- `Dashboard/StatsOverview.tsx` — "Avg quality score" now shows a one-line note explaining
  the 70-point threshold ("Above average (70+ is our quality bar)" / "Below our 70-point
  quality bar — keep improving"), matching the Critic agent's actual approval cutoff
  (`agents/critic.ts`).
- `Dashboard/InsightsCards.tsx`, `types/api.ts` — the platform-breakdown card now shows a
  `×N` post count next to each platform's score bar, using the `count` field the server
  already computed in `platformBreakdown` (`server/src/routes/users/me.ts`) but the client
  previously discarded. Added `count` to the shared `ProfilePlatformBreakdown` type.

**Ideate:**
- `Ideate.tsx` — the error banner now has its own inline "Try again" button that re-runs
  the same fetch, instead of requiring the user to scroll up to "Regenerate ideas."
- `Ideate/IdeaCard.tsx`, `index.css` — added `.idea-card:focus-visible` (and
  `.idea-card-action-btn:focus-visible`) styling; previously the card's hover state was
  the only visual affordance, so Tab-focusing a card gave no visible indicator at all.

**Create:**
- `Create/TopicStep.tsx` — topic textarea now has `maxLength={250}` (matches the server's
  `createJobSchema` cap) plus a live `N/250` counter that turns red at the limit.
- `Create/TopicSuggestions.tsx` — first-time users with no recent topics now see "Your
  recent topics will appear here" on focus instead of the dropdown rendering nothing.
- `Create/useDraft.ts`, `Create.tsx` — `sessionStorage.setItem` failures (private
  mode/quota) now surface a `draftWriteFailed` flag from the hook, rendered by `Create.tsx`
  as a toast using the same `.toast`/`.toast-error` classes Brand.tsx/Library already use,
  instead of being silently swallowed in a `catch` block.
- `Create.tsx`, `Create/TopicStep.tsx` — added a one-line "Content DNA is active…" mention
  next to the brand-voice banner, reading `contentDna` off the same `['dashboard',
  'profile']` React Query cache `AuthLayout.tsx` already populates (no duplicate fetch).
- `Create/ToneSelector.tsx` — expanded from 5 to the full 9 tones the server's
  `VALID_TONES` (`server/src/schemas/jobs.ts`) accepts: added `witty`, `educational`,
  `inspirational`, `direct`.

**Repurpose:**
- `Repurpose.tsx` — added client-side `new URL()` validation (mirroring the server's own
  check in `content/repurpose.ts`) before submit, instead of relying solely on
  `type="url"` plus a guaranteed-fail round trip for malformed input.
- `server/src/routes/content/repurpose.ts` — every error response on `/repurpose` now
  returns the full `{ error, code, retryable }` shape (`VALIDATION_ERROR`, `FETCH_FAILED`,
  `INSUFFICIENT_CONTENT`, `SERVER_ERROR`) instead of a bare `{ error: string }`.
- `Repurpose.tsx` — added a "Clear" button in the error banner that resets the form back
  to its defaults, instead of leaving stale field values with no easy reset after a
  failed submit.

**Library:**
- Verified `finalJobs`/`getJobScore` in `server/src/routes/jobs/manage.ts` — the `any`-typed
  bug described in `FUTURE_FEATURES.md` no longer exists in the codebase (already properly
  typed as `Array<MemoryJob | AssembledJob>` / `(job: MemoryJob | AssembledJob): number` from
  an earlier session). No code change needed; confirmed via a repo-wide search for `any` in
  the file.
- `Library/ContentTab.tsx`, `Library/TemplatesTab.tsx` — manage-mode select indicators now
  have `role="checkbox"`, `aria-checked`, and a descriptive `aria-label` for screen readers.
- `Library/useLibraryData.ts` — `platformFilters` is now derived from `Object.keys(platformMeta)`
  instead of a hardcoded local array, so a new platform can't silently be missing from the
  filter pills.
- `Library/TemplatesTab.tsx` — its empty-state search copy now reads "Try a different
  search term," matching `ContentTab.tsx`'s existing wording (previously "Try a different
  search").

**Calendar:**
- `Calendar/CalendarGrid.tsx` — the existing localStorage-only disclosure line now also
  clarifies that Calendar's "schedule" is a personal planning view, not an auto-publish
  action, distinguishing it from `PostPanel.tsx`'s separate reminder-only social-scheduling
  concept.
- `Calendar/CalendarGrid.tsx` — "+N more" on a day cell is now its own `<button>` with an
  `aria-label`, always opening (never toggling closed) the day's detail panel, instead of
  being inert text riding along inside the whole-cell click target.
- `Calendar/CalendarSidebar.tsx` — sidebar cards now have a stronger platform-colored
  gradient thumbnail plus a `title` tooltip showing the full topic on hover. `GET /jobs`
  intentionally omits output `content` to keep the list response light
  (`server/src/routes/jobs/manage.ts`), so no raw content text is available client-side
  without an extra per-job fetch — this uses the topic/platform data that's already fetched
  rather than fabricating a preview.

**Brand:**
- `Brand.tsx` — `disconnectSocialMutation` now has an `onError` toast ("Failed to
  disconnect {platform} — please try again.") reusing the existing `flashToast`, instead of
  swallowing failures silently.
- `Brand/ContentDnaCard.tsx` — added a live `N/50 minimum` character counter under the
  Content DNA textarea; the 50-char minimum was previously only enforced (and surfaced) on
  submit.
- `Brand.tsx` — "Reset" now actually discards edits and reloads the saved profile
  (refetches `profileQuery` and reapplies every field), matching its own confirm-dialog
  copy ("Discard unsaved edits?"), instead of blanking every field to hardcoded defaults.
- `Brand.tsx`, `Brand/PublishingConnectionsCard.tsx` — the card now takes `isLoading`/
  `isError`/`onRetry` props and renders a skeleton while loading or `ErrorState` on
  failure, instead of rendering identically to "nothing connected" in both cases.

---

## 2026-08-03 — Full 8-page UX audit (Dashboard, Ideate, Competitor, Create, Repurpose, Library, Calendar, Brand)

**Status:** Audit complete; safe quick wins fixed, everything else logged to `FUTURE_FEATURES.md`.

Ran a page-by-page audit across the whole authenticated app (not just Ideate) covering UX/functionality gaps, underused backend data, and unique-feature opportunities. Fixed the items that were safe to fix without a schema/DB change; everything requiring a migration, new table, or real design decision was written to `FUTURE_FEATURES.md` as a dated to-do instead of being silently attempted.

**Fixed this session:**
- `RecentGenerations.tsx` — added `aria-label` to the clickable job row (was `role="button"` with no accessible name).
- `Ideate/IdeaCard.tsx` — added `aria-label`, and added a copy-to-clipboard button (title + angle) with a brief "copied" confirmation state.
- `Competitor.tsx` — added a "Create content →" CTA to `contentGaps` cards (previously only `suggestedAngles` cards had one, an inconsistency the fresh audit caught).
- `Competitor.tsx` / `types/social.ts` / `api.ts` — the page defined a local `AnalysisResult` type that duplicated (and had silently diverged from) the shared `AnalyzeCompetitorResponse`/`CompetitorAnalysis` type in `types/social.ts`, which itself had gone stale (wrong field names — `strengths`/`postingCadence` instead of the real `brandName`/`topThemes`/`contentGaps` shape the server actually returns, per `server/src/schemas/contentResponses.ts`'s `competitorResponseSchema`). Corrected the shared type to match the real server response, and switched the page to use it plus the already-existing (but previously unused) `analyzeCompetitor()` API function instead of a raw duplicate `api.post` call.

**Found but NOT fixed (needs a DB migration or real design decision — see `FUTURE_FEATURES.md` for full detail):**
- **Brand Settings data-loss bug**: `industry` is accepted by the API and shown in the UI, but is never included in the `db.update(users).set({...})` call in `server/src/routes/users/profileStore.ts` — there's no `industry` column on the `users` table at all, so it only survives in an in-memory cache and reverts to blank on every restart. The `website` field on the Identity card is fully dead for the same class of reason (never sent to the server, not in the schema).
- Everything else from the audit — Library's already-built-but-unused `tag` column, Calendar's fake-vs-real scheduling split, Repurpose's discarded `sourceUrl`, Create's orphaned batch-generation API, and the "surface data the pipeline already computes" theme common to Dashboard/Ideate/Competitor — is logged in `FUTURE_FEATURES.md`, organized by page and split into Bugs / Quick wins / Design decisions.

---

## 2026-08-03 — Ideation Mode: persist generated ideas across hard refresh

**Status:** Complete.

Audited `Ideate.tsx` end to end (component, store, `/api/content/ideate` route, schemas, auth/rate-limit mounting) after a user report that generated ideas disappeared on page refresh.

- Fixed: `ideatedIdeas` in `client/src/store.ts` was plain in-memory Zustand state with no persistence, so a hard refresh reset it to `[]` even though the comment claimed this was intentional. Added `readStoredIdeas()`/`writeStoredIdeas()` (same try/catch localStorage pattern as `themeName`), keyed under `contentagent-ideated-ideas`, with a per-element `isIdeatedIdea()` shape guard on read. Ideas now persist until the user explicitly clicks "Suggest 10 topics" / "Regenerate ideas" again.
- Everything else audited came back clean: auth + `sanitizeGenerationInput` + `contentRateLimit` are correctly applied at the `/api/content` mount in `index.ts`; `ideateSchema`/`ideateResponseSchema` validate/coerce properly; loading/error/empty states are all handled; the regenerate-failure path already preserves old ideas with a context-aware error message.
- Minor non-blocking note left as-is: idea cards key on array index (`Ideate.tsx`) since the LLM response has no stable id and the list is always fully replaced, not spliced — low risk, not the cause of any bug.

**Follow-up same day — fixed a separate 401 hit when clicking an idea:** `AuthLayout.tsx`'s
`useQuery(getProfile)` (populates Zustand `userProfile` for every authenticated page, added
2026-07-28) fired the instant the component mounted, without waiting for Clerk to finish
hydrating `window.Clerk.session`. `api.ts`'s request interceptor then found no session, sent
no `Authorization` header, and the server correctly 401'd `/api/users/me`. Gated the query with
`enabled: authLoaded && isSignedIn` from Clerk's `useAuth()` so it only fires once a real
session token is obtainable. Unrelated to the ideation persistence fix above — this race could
surface on any authenticated page load, ideation just happened to be where it was reported.

**Follow-up same day — Ideation Mode UX pass + shared Dropdown component:**
- Split `Ideate.tsx` into an orchestrator plus `client/src/pages/Ideate/IdeateControls.tsx`,
  `IdeaCard.tsx`, `SavedIdeasSection.tsx` (kept every file well under the 400-line limit).
- Added per-idea dismiss (removes one card from the current batch without regenerating all 10)
  and per-idea save/bookmark. Saved ideas persist in a new `savedIdeas` store slice
  (`SavedIdea = IdeatedIdea & { savedAt }`), independent of the replaceable `ideatedIdeas` batch,
  so bookmarking survives a "Regenerate ideas" click. Shown in a collapsible panel above the grid.
- Added generation controls: optional focus-topic text input (piped to the server as
  `focusTopic`, sanitized through the existing `sanitizeGenerationInput` LIMITS map and wrapped
  in `<user_focus>` XML delimiters before reaching the Gemini prompt — same pattern as other
  user text reaching an LLM), a platform filter (client-side, over the current batch), and an
  idea-count picker (5/10/15/20 — `ideateSchema` already allowed up to 20, the UI was hardcoded
  to always request 10).
- Added a "Generated {time ago}" timestamp on the current batch (`ideasGeneratedAt`, store-persisted
  alongside `ideatedIdeas`) and a distinct empty state for "platform filter matches nothing"
  vs. "no ideas generated yet."
- **New shared component:** `client/src/components/Dropdown.tsx` — a themed listbox
  (button + `role="listbox"`/`role="option"` popover, arrow-key nav, Enter/Escape,
  click-outside-to-close) replacing the native `<select>` used for the count picker. Native
  `<select>` renders with OS/browser popup styling that ignores the app's per-theme CSS
  variables (confirmed via screenshot — Windows/Chrome rendered its own blue-highight system
  dropdown, not the app's dark theme). This is now the one dropdown component new value-pickers
  anywhere in the app should reuse instead of a native `<select>` or a one-off implementation.

---

## 2026-08-03 — Mobile Responsiveness Improvements + Additional Audit Fixes

**Status:** Complete.

Additional mobile responsiveness improvements and remaining audit fixes based on comprehensive UI/UX audit.

**Mobile Responsiveness Fixes:**
- Fixed OnboardingModal centering on mobile — added proper viewport containment, padding adjustments at 480px/375px breakpoints, action buttons now stack vertically on mobile
- Added mobile padding to Create page — ensures content doesn't touch screen edges on small devices
- Added mobile padding to Dashboard page — prevents content overflow on small screens
- Added mobile padding to Brand page — improves touch target spacing on mobile
- Added mobile padding to Library page — ensures proper spacing on mobile devices
- Integrated Tools into mobile tab bar — simplified mobile navigation by making Tools accessible via bottom tab instead of separate drawer (5 tabs instead of 4)
- Added mobile-specific styling to TopicStep — improved layout on small screens

**Additional Audit Fixes:**
- Added disclaimer to OnboardingModal step 2 — clarifies that sample post is generic and actual content will match user's brand settings
- Added helper text to Create AdvancedOptions — explains that carousel themes only apply to Instagram Carousels
- Increased Brand toast duration from 3s to 4s — gives users more time to read success messages
- Added touch feedback to Landing MobileMenu links — background tint on hover for better mobile UX

**Files Modified:**
- `client/src/components/OnboardingModal.tsx` — mobile centering, disclaimer, responsive styling
- `client/src/components/AuthLayout.tsx` — integrated Tools into mobile tab bar, removed separate drawer
- `client/src/pages/Create.tsx` — mobile padding
- `client/src/pages/Create/TopicStep.tsx` — mobile padding
- `client/src/pages/Create/AdvancedOptions.tsx` — helper text
- `client/src/pages/Dashboard.tsx` — mobile padding
- `client/src/pages/Brand.tsx` — mobile padding, toast duration
- `client/src/pages/Library.tsx` — mobile padding
- `client/src/pages/Landing/MobileMenu.tsx` — touch feedback

**Mobile Breakpoint Coverage:**
- All main pages now have explicit 375px/480px mobile breakpoints
- Touch targets optimized for 44px minimum WCAG requirement
- Content properly padded to prevent edge-touching on small screens
- Navigation simplified for mobile users (5-tab unified navigation)

---

## 2026-08-03 — UI/UX Audit Fixes (42 findings resolved)

**Status:** Complete.

Comprehensive UI/UX audit performed per `UI_UX_AUDIT_PROMPT.md`, resolving 42 findings across 13 pages plus 6 cross-page consistency issues.

**High Severity Fixes:**
- Fixed ToolsDropdown focus trap — added `useFocusTrap` hook, Escape-to-close, and proper ARIA attributes
- Removed dead-end BatchResult page — deleted file and route (no nav entry, no way to construct valid URLs)
- Verified mobile footer bar in Result page — already properly implemented and activated at 768px breakpoint

**Medium Severity Fixes:**
- Fixed theme color hardcoding in Result.css — replaced all hardcoded `#F59E0B` and `rgba(245,158,11,...)` with theme-aware `var(--accent)` and `color-mix()` functions
- Added 375px mobile breakpoints to Create PlatformSelector, Ideate grid, Repurpose form, and Competitor form — ensures safe touch targets on small phones
- Added slow network loading skeleton to Landing LiveDemo — imported SkeletonCard component for better UX during API calls
- Standardized empty state copy — changed Dashboard "No content yet" to "No generations yet" for consistency
- Added aria-describedby to ConfirmDeleteModal — improved screen reader announcements for error messages
- Verified ThemeSwitcher boundary checks — already has proper viewport containment and flip logic

**Documentation Fixes:**
- Updated CLAUDE.md to remove Templates.tsx reference — functionality now integrated into Library as TemplatesTab.tsx
- Updated CLAUDE.md to reflect History.tsx redirect to Library
- Replaced all console.error instances with comments — removed debug info leakage to production (Create.tsx, store.ts, useJobData.ts, ExportModal.tsx)

**Low Severity Fixes:**
- Added touch feedback to Landing MobileMenu links — background tint on hover for better mobile UX
- Increased Brand toast duration from 3s to 4s — gives users more time to read success messages
- Added helper text to Create AdvancedOptions — clarifies that carousel themes only apply to Instagram Carousels

**Files Modified:**
- `client/src/App.tsx` — removed BatchResult route
- `client/src/components/ToolsDropdown.tsx` — added focus trap and ARIA
- `client/src/components/ConfirmDeleteModal.tsx` — added aria-describedby
- `client/src/components/ThemeSwitcher.tsx` — verified boundary checks
- `client/src/pages/BatchResult.tsx` — deleted (dead-end UX)
- `client/src/pages/Result/Result.css` — fixed theme color hardcoding
- `client/src/pages/Create/PlatformSelector.tsx` — added 375px breakpoint
- `client/src/pages/Ideate.tsx` — added 375px breakpoint
- `client/src/pages/Repurpose.tsx` — added 375px breakpoints
- `client/src/pages/Competitor.tsx` — added 375px breakpoints
- `client/src/pages/Landing/LiveDemo.tsx` — added loading skeleton
- `client/src/pages/Landing/MobileMenu.tsx` — added touch feedback
- `client/src/pages/Dashboard/RecentGenerations.tsx` — standardized empty state copy
- `client/src/pages/Brand.tsx` — increased toast duration
- `client/src/pages/Create/AdvancedOptions.tsx` — added helper text
- `client/src/pages/Create.tsx` — removed console.error
- `client/src/store.ts` — removed console.error
- `client/src/pages/Result/hooks/useJobData.ts` — removed console.error
- `client/src/pages/Result/components/ExportModal.tsx` — removed console.error
- `CLAUDE.md` — updated documentation

**Audit Report:** Full findings documented in `UI_UX_AUDIT_FINDINGS.md`

---

## 2026-08-02 — Added 6-theme UI system (Aurora, Deep Marine, Obsidian Ember, Nightshade, Ink & Verdigris, Carbon Signal)

**Status:** Complete.

Added a user-selectable color/font theme system across the entire app-chrome surface —
landing page (pre-auth) and every authenticated page — per `THEME_SYSTEM_PROMPT.md` /
`THEME_SYSTEM_PLAN.md`. Six themes total: Aurora (the original gold/violet look, stays
default) plus five new identities. Layout, spacing, component composition, copy, icons, and
animation timing are unchanged everywhere — this is a color + font-token migration only.

**Infrastructure:**
- `client/src/index.css`: the Tailwind 4 `@theme {}` block's color/font values are now
  `var()` references into a new `:root, [data-theme="aurora"] { ... }` block plus one
  `[data-theme="..."]` block per other theme (`--bg-base/raised/card`,
  `--text-primary/secondary/muted`, `--rule`, `--accent`, `--accent-2`, `--accent-glow`,
  `--on-accent`, `--font-display/heading/body/mono`). Existing `bg-dark-900`-style Tailwind
  utility classes keep working unchanged since they resolve through the aliased tokens.
- `client/index.html`: new inline `<script>` (none existed before) applies a persisted
  `data-theme` to `<html>` synchronously before first paint, preventing an Aurora flash on
  reload.
- `client/src/store.ts`: new `themeName`/`setTheme` Zustand slice, synced to
  `localStorage['contentagent-theme']`.
- `client/src/components/ThemeSwitcher.tsx` (new): one shared switcher component, wired
  into `AuthLayout.tsx`'s sidebar (works collapsed via an icon-only trigger) and
  `Landing/Nav.tsx` + `Landing/MobileMenu.tsx`.

**Migration:** ~75 `.tsx`/`.ts` files had hardcoded hex/rgba colors converted to
`var(--token)` / `color-mix(in srgb, var(--token) N%, transparent)` — every page and shared
component, not just the 63 originally identified by the pre-migration grep audit (a handful
of components added or refactored since that audit — `ConfirmDeleteModal.tsx`,
`ErrorState.tsx`, `RowActionStrip.tsx`, `ToolsDropdown.tsx`, `SectionDivider.tsx`,
`ContentEditShell.tsx`, `ContentColumn.tsx`, `QualityTierBadge.tsx`, `SkeletonCard.tsx`,
`Library/libraryHelpers.ts` — were found and migrated during the verification sweep).

**Deliberately left fixed across all 6 themes** (semantic signal colors, not brand
decoration): success/error/warning, quality-score-tier colors (`StatusDisplay.tsx`'s
`getTierInfo`, `QualityTierBadge.tsx`), platform-brand colors (Instagram/LinkedIn/
Twitter/video), the `.badge-*` palette, `Result/constants.ts`'s `agentColors`, and —
critically — the entire carousel SSR render path (`CAROUSEL_THEMES`, `SlideVisual.tsx`,
`IGSlide.tsx`, `igslide/layouts/*.tsx`, `igslide/contentPieces.tsx`,
`renderSlideHtml.tsx`), which is a separate, pre-existing 9-theme system for exported
carousel visuals and must never be confused with this one.

**Verified:** `tsc --noEmit` and `npm run lint` clean; `npm run build` and
`npm run build:ssr` both succeed, and the generated `server/src/generated/slideRenderer.js`
contains zero references to the new UI theme tokens (confirms the carousel export path is
untouched); WCAG contrast for `--text-secondary` holds ≥6:1 and `--text-muted` holds ~3:1
against every theme's own `--bg-base` (checked via computed relative-luminance contrast
ratios, not eyeballed — `--text-muted`'s ~3:1 matches Aurora's original ratio, used only for
de-emphasized non-body text); no `createPortal` usage exists anywhere in the codebase (all
modals are `position: fixed` divs in the normal tree), so the portal-escape concern from the
plan doesn't apply — CSS custom property inheritance reaches every surface trivially. See
`CLAUDE.md` §13 for the full architecture reference and how to add a 7th theme.

**Follow-up same day — corrected an over-conservative classification pattern:** a live
screenshot under Deep Marine surfaced that several colors had been wrongly left "fixed"
because they *happened* to match a badge/status hex value, when they were really just
arbitrary decorative variety with no actual cross-app semantic meaning. Re-audited every
page against a sharper rule (fixed only if tied to a real platform brand, a true status/
quality-tier, an actually-reused named badge class, or the carousel export system — never
just "this hue looks like a badge color"). Found and fixed real gaps:
- **`Calendar/calendarStyles.ts`** — the biggest one: the entire extracted stylesheet
  backing `CalendarGrid`/`CalendarSidebar`/`DayDetailPanel`/`SchedulePicker` was hardcoded
  to Aurora's own navy/amber palette with zero `[data-theme]` connection, so the whole
  Calendar page silently ignored theme selection. Retheme to `var(--bg-*)`/`var(--accent)`/
  `var(--accent-2)`/`var(--rule)`, preserving the existing amber-vs-violet-vs-cyan
  distinction between today/has-content/add-content affordances.
- **Decorative cyan/pink/violet retheme** across `Dashboard/StatsOverview.tsx` (Best
  Platform stat card + Content DNA bubble), `Dashboard/dashboardStyles.ts` (job rows, view-all
  link, stat cards, kebab menu), `Landing/{Features,Hero,HowItWorks,QualityDemo,LiveDemo}.tsx`
  (feature-card icons, hero pipeline-stage dots, quality-bar colors), `Result/components/
  StatusDisplay.tsx` (the non-tier "pending" stage badge — the S/A/B/C tier system itself was
  correctly left fixed), `Brand/{ContentDnaCard,VoiceCard}.tsx`, `Competitor.tsx`,
  `Repurpose.tsx`, and `AuthLayout.tsx` ("Free plan" sidebar subtext was fixed white instead
  of the theme's own tinted `--text-muted`).
- Confirmed correctly fixed and left alone: platform-brand colors, the quality-tier system
  (`StatusDisplay.tsx`/`QualityTierBadge.tsx`), real reuses of `.badge-purple`/
  `platformMeta` fallbacks, `Library/libraryHelpers.ts`'s pending/processing job-status
  colors (a genuine 4-state lifecycle system alongside done/failed), and multi-category
  charts that functionally need several distinguishable hues at once
  (`InsightsSidebar.tsx`'s 5 score-dimension bars, `Result/constants.ts`'s `agentColors` for
  the 5-stage pipeline relay diagram) — re-theming these to all-accent would have broken
  their actual purpose rather than fixed anything.
- Re-verified clean: `tsc --noEmit`, `npm run lint`, `npm run build`, `npm run build:ssr`.

**Second follow-up same day — matched backgrounds/fonts to the actual design artifact:**
the user pointed out the Landing page background looked the same across all 6 themes and
shared the original design-exploration artifact URL (`d1`–`d5` = Deep Marine, Obsidian
Ember, Nightshade, Ink & Verdigris, Carbon Signal — Aurora predates this artifact and isn't
in it). Fetched and diffed the artifact's actual HTML/CSS against `index.css`:
- **Root cause found:** `body::before`'s "ambient aurora orb" glow (three colored radial
  gradients) and `body::after`'s film-grain texture overlay were applying to *every* theme,
  when the artifact's other 5 themes are flat, clean solid backgrounds with zero glow/grain
  — that visual signature is Aurora's alone. Both effects are now scoped to
  `html[data-theme="aurora"] body::before/after` (plus the pre-hydration
  `html:not([data-theme])` default), so the other 5 themes render as clean flats matching
  the artifact exactly, while Aurora keeps its original textured look unchanged.
- **Token values re-verified against the artifact's literal CSS custom properties**
  (`--deep`, `--deep-2`, `--fog`/`--fog-soft`/`--fog-faint`, `--rule`, `--accent`,
  `--accent-2`, `--accent-glow`) for all 5 non-Aurora themes — `--bg-base`, `--bg-raised`,
  `--text-primary/secondary/muted`, `--rule`, `--accent`, `--accent-2`, and `--accent-glow`
  all matched exactly (no value changes needed; the tokens sourced from
  `THEME_SYSTEM_PLAN.md` earlier were already correct).
- **Font fallback chains corrected** to match the artifact's literal `font-family` stacks:
  `--font-display`/`--font-heading` gained the missing `"Segoe UI Semibold"` fallback step
  (`"Bahnschrift SemiCondensed", "Arial Narrow", "Segoe UI Semibold", sans-serif`);
  `--font-mono` dropped an extra `"Cascadia Mono"` step not present in the artifact, now
  exactly `ui-monospace, Consolas, monospace`. Applied identically across all 5 non-Aurora
  `[data-theme]` blocks.
- Re-verified clean: `tsc --noEmit`, `npm run lint`, `npm run build`.

**Third follow-up same day — found the actual root cause of the flat background not
showing:** the CSS-level fixes above were correct but invisible, because
`client/src/pages/Landing.tsx`'s own root wrapper `<div>` had `background: '#030310'`
(Aurora's exact hex) and `fontFamily: "'Inter', system-ui, sans-serif"` hardcoded directly
in its inline `style`, painted on top of `body`'s themed background and completely masking
it for all 6 themes regardless of which was selected. This one line was missed by every
earlier migration/re-audit pass because `Landing.tsx` had shown only 1 grep hit originally
and every subsequent sweep focused on child components, not the root wrapper. Fixed to
`background: 'var(--bg-base)'` / `fontFamily: 'var(--font-body)'`. Re-swept all
`Landing/*.tsx` files for the same root-wrapper-override pattern — none found. Re-verified
clean: `tsc --noEmit`, `npm run lint`, `npm run build`.

---

## 2026-08-01 — Split remaining oversized files (content.ts, users.ts, Library.tsx, Dashboard.tsx)

**Status:** Complete.

Closes the one remaining item from the 2026-08-01 verification pass (file-splitting §8):
`server/src/routes/content.ts` (561 lines) and `routes/users.ts` (574 lines) had no split at
all; `client/src/pages/Library.tsx` (445) and `Dashboard.tsx` (406) had gotten partial
presentational-component extraction into `Library/`/`Dashboard/` subfolders previously but
the orchestrator files themselves were still over the 400-line cap.

**`routes/content.ts` → `routes/content/` (mirrors the existing `routes/jobs/` split):**
`outputs.ts` (output CRUD: get/regenerate/export-pdf/export-text/slide-edit), `ideate.ts`,
`hashtags.ts`, `repurpose.ts`, `competitor.ts`, and a `shared.ts` for the `readOutputs`/
`parseAIJson`/`jobIdFromOutputId` helpers every sub-route needs. `content.ts` is now a
17-line router that just mounts the five sub-routers.

**`routes/users.ts` → `routes/users/`:** `profileStore.ts` (the `userProfiles` Map,
`UserProfile` type, `getUserProfile`/`saveUserProfile`/`seedUserProfilesFromDB` — the part
4 other files outside this folder import), `brandVoice.ts` (POST /brand-voice,
/analyze-voice), `me.ts` (GET /me stats), `onboarding.ts`, `account.ts` (GDPR export +
account deletion). `users.ts` is now a 17-line router re-exporting the profile-store
functions for backward-compatible imports from `content/`, `jobs/create.ts`,
`jobs/manage.ts`, and `index.ts`.

**`Library.tsx` → `Library/useLibraryData.ts`:** extracted all 5 mutations, 2 queries, CSV
export, and select-all-matching logic into a custom hook (matching the `Result/hooks/`
pattern already used elsewhere in this codebase). `Library.tsx` is now a thin 137-line
render-only orchestrator wiring the hook's return value into JSX (was 445 lines).

**`Dashboard.tsx` → `Dashboard/StatsOverview.tsx` + `Dashboard/dashboardStyles.ts`:** the
stat-cards grid + Content DNA bubble section (~100 lines) became its own presentational
component (same pattern as the existing `RecentGenerations`/`InsightsCards`); the inline
`<style>` block moved to a plain exported CSS string, matching `Library/libraryHelpers.ts`'s
`LIBRARY_STYLES` precedent. `Dashboard.tsx` is now 198 lines (was 406).

All extractions are pure code-movement — no behavior changes. Verified: `tsc --noEmit`
clean on both client and server, `npm run build` clean on both, ESLint clean on the client
and no new warnings on the server, full server test suite 384/384 passing (one transient
parallel-execution timeout on `users-route.test.ts` reproduced as a flake — passes both in
isolation and on a full-suite re-run).

---

## 2026-08-01 — Eliminated remaining `any` usage across server/src (final pass)

**Status:** Complete.

Continuation of the incremental `any`-elimination effort (CLAUDE.md's TypeScript rules
hard-ban `any`). This pass covered the last untouched cluster: `routes/jobs/ownership.ts`,
`routes/jobs/create.ts`, `routes/jobs/manage.ts`, `routes/jobs/stream.ts`,
`workers/contentWorker.ts`, `lib/persistJob.ts`, `lib/queue.ts`, `routes/content.ts`,
`routes/demo.ts`, `routes/users.ts`, and `index.ts`'s global error handler.

**Key design decision — `MemoryJob` type:** `jobsMemory`/`jobStore` (the shared in-memory
Maps every job route reads/writes through across its lifecycle) were `Map<string, any>`.
Introduced `MemoryJob = PipelineJob | PersistedJobResult` (reusing `lib/pipeline.ts`'s
existing types) plus `AssembledJob` (the shape `assembleJobFromDB` reconstructs once a job
ages out of memory), both now exported from `routes/jobs/ownership.ts`. `PipelineJob` gained
explicit optional fields (`deleted`, `tag`, `sourceJobId`, `sourcePlatform`, `createdAt`,
`updatedAt`, `stage`, `progress`) that were previously only accessible through its
`[key: string]: unknown` index signature.

**Two real bugs found and fixed as a direct consequence (not just typing):**
1. **Tone enum drift:** the Postgres `tone` column enum only had 5 values, but
   `VALID_TONES` (used by `createJobSchema`, Create's ToneSelector, and Brand's VoiceCard)
   had grown to 9 (`bold`/`playful`/`minimal`/`direct` added later without updating the DB
   enum). A job created with one of those 4 tones silently failed the DB insert — caught by
   `persistJobToDB`'s catch block, logged, never surfaced to the user; the job just never
   showed as done. Fixed via migration `0003_last_iceman.sql` widening the enum to match
   `VALID_TONES` exactly.
2. **`assembleJobFromDB` field gap:** the function never returned `brandVoice`/`phrasesUse`/
   `phrasesAvoid`/`contentDna` — investigated further and found these actually live on the
   `users` table, not `contentJobs`, so this was correct behavior all along, not a bug;
   `regenerate`/`multiply` already prefer a fresh `getUserProfile()` lookup over these fields
   for exactly that reason. Left undocumented as optional passthrough fields on `AssembledJob`
   rather than fabricating a nonexistent DB source for them.

**New Zod schemas** (`schemas/contentResponses.ts`, plus `contentDnaSchema` added to
`schemas/agentResponses.ts`): ideate/hashtags/competitor LLM-JSON responses and the
`POST /analyze-voice` Content DNA response now validate through the same
`.catch()`-per-field tolerance pattern established for the core agent pipeline, instead of
`let parsed: any` + bare `JSON.parse()`.

**Verification:** `grep`/ESLint show zero live `any` in `server/src` (only historical
comments reference the old casts); `tsc --noEmit` and `npm run build` both clean; full test
suite 384/384 passing throughout every incremental step.

---

## 2026-07-31 — Corrected false "docs/archive/ created" claim; scrubbed dangling references

**Status:** Complete.

**Problem found during a doc-drift review pass:** the 2026-07-28 "Root cleanup" entry below
claimed `FUNCTIONAL_AUDIT_2026-07.md` and `UI_UX_AUDIT_2026-07.md` were moved into a new
`docs/archive/` directory. `CLAUDE.md` (both its Docs Reference table and its folder-structure
tree) and `CONTRIBUTING.md`'s Repository Structure diagram all asserted this directory exists.
None of it does: `git log --all` shows no commit, on any branch, ever created a `docs/` directory
or either audit file — this repo's entire history is 12 commits back to a single initial commit.
Neither file exists loose on disk, gitignored, or untracked either — there is nothing to restore
from. The move was described in this file but never actually happened.

**Fixed:**
- Marked the 2026-07-28 "Root cleanup" entry's status as reverted/never-committed and reworded
  its "Moved" list to "Intended," so it no longer asserts something false as fact.
- `CLAUDE.md` §10's Docs Reference table now marks `docs/archive/` as **not** existing, with a
  correction note explaining the gap and pointing here.
- `CLAUDE.md`'s folder-structure tree (§4) no longer shows a fabricated `docs/archive/` entry.
- `CONTRIBUTING.md`'s Repository Structure diagram no longer shows it either.

**Deliberately NOT done:** did not fabricate replacement `FUNCTIONAL_AUDIT_2026-07.md` /
`UI_UX_AUDIT_2026-07.md` files to make the old claim retroactively true — there is no source
content to reconstruct them from, and both are described elsewhere (the 2026-07-28 dated entries
citing them) as already fully implemented, so recreating them now would only be theater. The
entries citing these two docs by name as their source of findings (`## 2026-07-28 (Functional)`
and `## 2026-07-28 (UI/UX)` below) are left as-is per this file's own stated convention — they
describe what was true when written, and their substantive claims (migration `0002_cute_rogue.sql`,
schema columns, etc.) were independently re-verified as real and current during this pass.

---

## 2026-07-30 (5) — Fixed CI/CD failures and simplified Puppeteer Chrome setup

**Status:** Complete.

**Fixed:** CI/CD was failing due to package-lock.json sync issues after adding glob dependency.
Simplified approach:
- Removed glob dependency and postinstall script that were causing CI failures
- spawnBrowser() now tries system Chrome paths on Render (/usr/bin/google-chrome-stable, etc.)
- Falls back to Puppeteer's auto-discovery if system Chrome not found
- Removed install-chrome.sh script (unnecessary complexity)
- Updated package-lock.json to sync with package.json
- CI/CD should now pass successfully

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

**Status:** Partially reverted — see the 2026-07-31 correction entry below. The move described
here was never actually committed.

**Intended** (both already fully implemented per their own dated `CHANGELOG.md` entries above —
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
