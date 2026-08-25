# Full-Codebase Audit Findings — 2026-08-14

`/code-review max`, run against the whole codebase (not scoped to git diff). 8 parallel finder
agents (line-by-line diff scan, removed-behavior audit, cross-file tracer, language-pitfall
specialist, wrapper/proxy correctness, reuse, simplification+efficiency, altitude+conventions),
each independently verifying its own candidates before reporting. This file merges and dedupes
their output, most severe first. TypeScript (`tsc --noEmit`) passes clean on both `client` and
`server`.

---

## 1. Orphaned Chromium process on shutdown during in-flight browser reservation

**File:** `server/src/lib/browserPool.ts:213` (reservation) / `:286` (`closeBrowserPool`)

`closeBrowserPool()` takes a synchronous snapshot of `_pool` and closes only entries where
`browser !== null`. If `acquireBrowser()` has just reserved a slot (`browser: null, reserved:
true`) and is awaiting `spawnBrowser()` when `SIGTERM` fires, the snapshot skips that entry
entirely. When the spawn resolves moments later, the pool never closes it.

**Failure scenario:** A deploy/restart lands while a request is mid-`acquireBrowser()`. The
`process.on('exit')` handler is a backstop, but `exit` handlers can't `await` async work, so a
fired `.close()` may not complete before `process.exit(0)` tears down the process. Result: an
orphaned OS Chromium process survives the parent, worst under repeated deploys/restarts.

**Fix direction:** Track in-flight reservations in a separate set/array that `closeBrowserPool`
also awaits, or have `spawnBrowser` check a `shuttingDown` flag after resolving and immediately
close if set.

---

## 2. `withTimeout()` never attaches a handler to the losing promise — same leak, second cause

**File:** `server/src/lib/browserPool.ts:57`

`withTimeout()` races a promise against a timer via `Promise.race` but never attaches `.then()`
to the losing side. If `puppeteer.launch()` resolves *after* the 10s timeout already rejected
the race, the caller treats the launch as failed (no pool entry created), but the browser
process is now live and referenced by nothing.

**Failure scenario:** Under host load, `puppeteer.launch()` occasionally takes >10s. The timeout
fires, `spawnBrowser()`'s caller moves on, and the late-resolving launch leaks a full Chromium
process (plus its renderer children) for the life of the server.

**Fix direction:** On timeout, keep a reference to the original promise and attach
`.then(browser => browser.close())` so a late resolution self-cleans instead of leaking.

---

## 3. `POST /:jobId/multiply` skips the tone/audience validation just added to its sibling `/regenerate`

**File:** `server/src/routes/jobs/regenerate.ts:128` (multiply) vs. `:47` (regenerate's new guard)

`/regenerate` just gained a `STALE_JOB_DATA` guard checking `existingJob.tone` against
`VALID_TONES` and requiring `targetAudience` before running the pipeline, specifically to avoid
burning Gemini/Tavily quota on a run that's guaranteed to fail `persistJobToDB`'s own validation
at the end. `/multiply`, in the same file, copies `sourceJob.tone`/`sourceJob.targetAudience`
into a fresh pipeline run via the identical unvalidated pattern `/regenerate` had *before* the fix.

**Failure scenario:** A source job has a legacy `tone` value that predates a `VALID_TONES`
vocabulary change (or a null `targetAudience`). `POST /:jobId/multiply` runs the full pipeline
(writer → formatter → critic → predictor) only to fail at `persistJobToDB`, wasting quota and
losing the result — exactly the failure mode the sibling fix's own WHY comment describes.

**Fix direction:** Two finder agents independently suggested moving the check into
`runAndPersistPipeline`/`runContentPipeline` (`lib/pipeline.ts`) so every caller (`create.ts`,
`contentWorker.ts`, both `/regenerate` and `/multiply`) inherits the guard from one place instead
of requiring each call site to remember it.

---

## 4. Stray `"server": "file:../server"` dependency in `client/package.json`

**File:** `client/package.json:34` (mirrored in `client/package-lock.json`)

Links the entire backend package — and its full transitive dependency tree (Express, Puppeteer,
BullMQ, Drizzle, the Gemini/Groq SDKs, etc.) — into `client/node_modules`. Confirmed via grep:
zero imports of a `server` module anywhere in `client/src`. Consistent with an accidental
`npm install` run from the wrong directory rather than a deliberate change.

**Impact:** Bloats every client install/CI run for no functional benefit, couples
`client/package-lock.json` to `server/package.json`'s exact contents going forward, and directly
contradicts this repo's deliberate client/server separation (documented throughout `CLAUDE.md`,
separate Vercel/Render deploy targets — a client-only deploy doesn't expect a sibling `server/`
directory to exist).

**Fix direction:** Remove the line from `client/package.json`, then `npm install` in `client/` to
regenerate `package-lock.json` without it.

---

## 5. `social.ts` and `pipeline.ts` are both over the CLAUDE.md 400-line file cap, and grew further while already over it

**Files:** `server/src/routes/social.ts` (484 lines) / `server/src/lib/pipeline.ts` (473 lines)

CLAUDE.md's file-organization rule (also listed under "NEVER DO THESE — Hard Stops"): *"No file
should exceed 400 lines — split before it gets there" / "NEVER create a file over 400 lines
without splitting it."* Both files were already over the cap before the most recent round of
changes and grew further within it instead of being split — `manage.ts` hit this same pattern
twice already per CLAUDE.md §4's own note about it being re-split.

**Fix direction:** Split `social.ts`'s OAuth-callback-hardening logic and `pipeline.ts`'s
failed-job persistence handling into focused sub-modules, following the existing
`routes/jobs/*.ts` sub-router precedent.

---

## 6. `fetchWithSsrfGuard` forwards the raw `RequestInit.body` unchanged across redirect hops

**File:** `server/src/lib/ssrfGuard.ts:112`

The function spreads the original `options` (including `options.body`) into a new `fetch()` call
on *every* redirect hop. If `options.body` were ever a one-shot `ReadableStream`, the second hop
would try to send an already-consumed stream.

**Currently unreachable:** both real callers (`repurpose.ts:58`, `feedMonitorWorker.ts:91`) only
pass `signal`/`headers`, never a body. But the function is exported as a general-purpose wrapper
with no runtime guard or documented restriction against streaming bodies, so a future caller
would hit this silently (throw "body already used", or hang).

**Fix direction:** Either document the GET-only/no-streaming-body constraint on the exported
function signature, or clone/re-read the body per hop.

---

## 7. `fetchWithSsrfGuard` has no internal try/catch around its own `fetch()` call

**File:** `server/src/lib/ssrfGuard.ts:100-135`

CLAUDE.md: *"EVERY async function must have try/catch."* A network-level rejection (DNS failure,
connection reset, abort) from the `await fetch(currentUrl, ...)` at line 112 propagates
uncaught out of the function rather than being folded into the function's own
`GuardedFetchResult | GuardedFetchFailure` discriminated-union contract.

**Mitigating factor:** both current call sites (`repurpose.ts`, `feedMonitorWorker.ts`) already
wrap the call in their own try/catch, so nothing currently crashes — but a raw network error is
handled differently by each caller than the function's own typed `{ok:false, reason}` failures,
which is an inconsistency in the contract itself.

**Fix direction:** Wrap the `fetch()` call in try/catch internally and fold network errors into
the same `{ok:false, reason}` shape the rest of the function already returns.

---

## 8. Ten template components each duplicate the same `pointKeys` guard instead of sharing one hook

**Files:** all 10 of `client/src/pages/Result/components/content/carousel/igslide/templates/*.tsx`
(`ModernMinimalTemplate.tsx:26` and identical lines in the other 9)

`const pointKeys = slide.points ? stablePointKeys(slide.points) : [];` was added independently to
all 10 template components rather than once in a shared hook or in `TemplateLayout.tsx`. Not
memoized either — recomputes its O(n) map-plus-occurrence-counting pass on every render (e.g.
every keystroke while live-editing a slide in `EditSlideModal.tsx`), even though the input array
reference is often unchanged.

**Why it matters here specifically:** CLAUDE.md §11a's own "To add an 11th template" checklist
tells the next author to copy an existing template file's structure rather than starting from
scratch, and separately warns that the padding/background/flex/ref-forwarding contract is "easy
to get subtly wrong" when doing so. This guard is now a second thing that can silently drift
across a copy-paste (as it already had to be manually normalized across 9 files in this change).

**Fix direction:** Add a `usePointKeys(slide.points)` hook next to `stablePointKeys` in
`igslide/types.ts`, memoized with `useMemo` keyed on `slide.points`, and have all 10 (and any
future) template components call it instead of repeating the guard inline.

---

## 9. Duplicated tone-validation predicate between `regenerate.ts` and `persistJob.ts`

**File:** `server/src/routes/jobs/regenerate.ts:47` vs. `server/src/lib/persistJob.ts:21`

The new inline check `!(VALID_TONES as readonly string[]).includes(existingJob.tone)` duplicates
the exact predicate already implemented as `isValidTone()` in `persistJob.ts` — but that helper
is module-private (not exported), so `regenerate.ts` had no way to reuse it and reimplemented it
by hand.

**Fix direction:** Export `isValidTone`/`isValidPlatform` from `persistJob.ts` and import them in
`regenerate.ts` so both checks are guaranteed to stay identical by construction rather than by
convention.

---

## 10. `browserPool.ts`'s free-slot predicate `!e.busy && !e.reserved` is duplicated at two call sites

**File:** `server/src/lib/browserPool.ts:203` and `:231`

Both `acquireBrowser`'s fast path and its poll loop repeat the identical predicate with no shared
helper. There's already precedent for this drifting: `reserved` itself was added alongside the
pre-existing `busy` and required updating both copies in the same commit.

**Fix direction:** Extract a small `findFreeSlot(): PoolEntry | undefined` module-level helper
wrapping `_pool.find(...)` so the two call sites can't diverge on what "free" means.

---

## 11. Unreachable dead-code return in `fetchWithSsrfGuard`

**File:** `server/src/lib/ssrfGuard.ts:134`

The post-loop `return { ok: false, reason: 'Too many redirects' };` is unreachable. Tracing every
exit path of the `for (hop = 0; hop <= MAX_REDIRECT_HOPS; hop++)` loop: every branch inside the
body returns before falling through, and the only way to reach the next iteration is `continue`,
which is only taken when `hop !== MAX_REDIRECT_HOPS`. The in-loop guard at line 123
(`if (hop === MAX_REDIRECT_HOPS) return`) already handles the terminal case, so the loop can
never exit normally and fall to line 134.

**Fix direction:** Remove the line, or replace it with an assertion (e.g.
`assertUnreachable()`/a `never`-typed throw) if the intent is to guard against future loop-bound
edits.

---

## 12. `server.ts` seed script has the same `|| 'N/A'` falsy-zero bug this diff just fixed elsewhere

**File:** `server/src/seed.ts:118`

`job.outputs[1]?.qualityScore || 'N/A'` uses `||` instead of `??`. A legitimately-scored `0`
(reachable: `critic.ts` sums 5 dimensions 0–20 each) would print as `'N/A'` instead of `0` in the
seed preview — the identical bug class already fixed at `persistJob.ts:128`
(`qualityScore || null` → `qualityScore ?? null`) in the same body of work, just missed here.

**Impact:** Low — dev-only console output from `npm run seed`, not user-facing.

**Fix direction:** `?? 'N/A'` instead of `|| 'N/A'`.

---

## 13. `PoolEntry.reserved` is a fifth mutation site for a distinction its two readers never observe

**File:** `server/src/lib/browserPool.ts:44` (field) — read at `:203`, `:231`

Traced every state transition: at both places `reserved` is actually read, `busy` is already
`true` in lockstep, so `!e.busy` alone already excludes the entry from the free-slot search.
`reserved` is not fully redundant in general (it's what makes `_pool.length` count in-flight
reservations before a browser object exists — `busy` alone wouldn't give an accurate in-flight
count to a caller reading pool length), but for its two actual *read* sites it adds no discriminating
power beyond `busy`.

**Fix direction:** Low priority / judgment call — either document why `reserved` exists
independently of `busy` (the `_pool.length` accounting reason), or fold the two flags into a
single state enum (`'idle' | 'spawning' | 'busy'`) so the type system rules out illegal
combinations like `{browser: null, busy: true, reserved: false}` instead of relying on every call
site to check the right combination by convention.

---

## Verified clean (checked, not bugs — recorded to avoid re-litigating)

- **`browserPool.ts` reserved-flag lifecycle**: always cleared on both success and failure paths;
  `replaceBrokenBrowser` is only ever called on an entry that's already `busy: true`, so no
  double-acquire race exists as currently written.
- **`stream.ts`'s fail-closed `dbUserId` check**: unreachable-but-safe, since `authMiddleware`
  guarantees `dbUserId` is set on every call to `next()`.
- **`ssrfGuard.ts`'s shared `AbortSignal` across a redirect chain**: confirmed one signal is
  reused for the whole chain, no timeout multiplication; both real call sites are GET-shaped, so
  the body-forwarding concern (finding #6) doesn't currently manifest.
- **9 template files' `pointKeys` hoisting**: safe — `slide` is a stable prop never reassigned
  within the component body, so no index-alignment bug, just the duplication/memoization gap in
  finding #8.
- **`rssParser.parseURL()`**: confirmed dead code (only `.parseString()` is used) — removing its
  constructor options would be harmless if anyone wants to clean it up, not urgent.
- **`dbGetTokens` narrower map** (`social.ts`): every consumer already guards with
  `!conn?.accessToken`; the narrower type closes a real prior bug (raw ciphertext usable as a
  bearer token) rather than introducing one.
- **`fetchAndExtractArticle` reuse across `repurpose.ts`/`feedMonitorWorker.ts`**: unchanged
  `ExtractResult` shape, consumed identically in both places.
- **`setJobInStore` in `/multiply`**: idempotent `Map.set()`, matches the existing pattern in
  `create.ts`/`versions.ts`/`/regenerate` — fixes a real prior gap rather than introducing a race.
- **`stream-token`'s fail-closed 401**: client already has a try/catch fallback to the raw Clerk
  token in `useJobData.ts`, degrades gracefully.
- **`VALID_TONES` cast in `regenerate.ts`**: `AssembledJob.tone` is genuinely `string | null`, and
  `VALID_TONES` matches the DB enum deliberately, so the cast isn't papering over a real
  divergence.
- **`stablePointKeys` desync risk**: pure function, no external state; the 4 legacy
  `igslide/layouts/*.tsx` files already used the identical single-computation pattern before this
  change, so no missed file.
- **`ssrfGuard.ts` per-hop `assertUrlIsPublic` re-validation**: intentional — each redirect hop is
  a genuinely different URL requiring independent DNS/IP validation, not duplicated logic.
- **`tokenEncryption.ts`'s new `logger.warn` in `decryptTokenOptional`'s catch block**: compliant
  WHY-tagged comment, doesn't log the ciphertext itself — checked as a positive control.
- **Puppeteer orphan-on-`process.exit`**: confirmed Puppeteer's default launch has no `detached`
  override, so a browser spawned but never `.close()`'d does survive parent exit — this is the
  mechanism behind findings #1 and #2, not a separate issue.

---

## Summary

| # | Severity | Area | One-line |
|---|---|---|---|
| 1 | High | Backend / resource leak | Orphaned Chromium process if shutdown races an in-flight pool reservation |
| 2 | High | Backend / resource leak | `withTimeout()` doesn't clean up the losing promise on a late-resolving launch |
| 3 | High | Backend / correctness | `/multiply` skips the stale-tone validation just added to `/regenerate` |
| 4 | Medium | Dependency hygiene | Stray `server` package linked into `client/package.json` |
| 5 | Medium | CLAUDE.md compliance | `social.ts` (484) and `pipeline.ts` (473) both over the 400-line cap |
| 6 | Low | Backend / robustness | `fetchWithSsrfGuard` re-sends `body` unchanged across redirect hops |
| 7 | Low | CLAUDE.md compliance | `fetchWithSsrfGuard` has no internal try/catch around `fetch()` |
| 8 | Low | Frontend / reuse | 10 template files duplicate an unmemoized `pointKeys` guard |
| 9 | Low | Backend / reuse | Tone-validation predicate duplicated instead of imported |
| 10 | Low | Backend / reuse | Free-slot predicate duplicated at 2 call sites |
| 11 | Low | Backend / dead code | Unreachable final return in `fetchWithSsrfGuard`'s redirect loop |
| 12 | Low | Dev tooling | Seed script has the same `\|\| 'N/A'` falsy-zero bug fixed elsewhere in this diff |
| 13 | Info | Backend / design | `PoolEntry.reserved` adds a 5th mutation site for what its 2 readers already get from `busy` |
