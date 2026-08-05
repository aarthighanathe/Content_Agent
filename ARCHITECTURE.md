# ContentAgent — Architecture Reference

> Companion to `CLAUDE.md`. Where `CLAUDE.md` is the "read this before every editing session"
> document (conventions, hard rules, folder map), this file is the **verified, current-state**
> architecture reference — every claim in this file was directly confirmed against the code on
> 2026-07-28. Update this file in the same session as any change that alters a data flow,
> a shared module's responsibility, or which pipeline a route calls — don't let it go stale
> the way parts of `CLAUDE.md`'s carousel section did (see `REVIEW_FINDINGS.md` §1.9).

---

## 1. The one pipeline, two entry points

There is exactly **one** content-generation pipeline implementation:
`server/src/lib/pipeline.ts` → `runContentPipeline()` / `runAndPersistPipeline()`.

Two callers reach it, and both pass through `runAndPersistPipeline()` so success/failure
handling (DB persist, SSE terminal event, 10-minute memory eviction, soft-delete race
handling) can never drift between them:

```
POST /api/jobs/create                          BullMQ Worker (content-generation queue)
        │                                              │
Redis available? ──NO──▶ runPipelineDirect()           │  processContentJob()
        │  (create.ts, max 3 concurrent               │  (contentWorker.ts, concurrency 2)
        │   via acquirePipelineSlot/                   │
        │   releasePipelineSlot)                       │
        │                                              │
        └──────────────────┬───────────────────────────┘
                            ▼
              runAndPersistPipeline(job, emitProgress, store)
                            │
                            ▼
              runContentPipeline(job, emitProgress)
                            │
        Orchestrator → Researcher → [Writer → Formatter → Critic]×(1-3) → PerformancePredictor
                            │
              persistJobToDB()  (transactional: contentJobs + contentOutputs + agentLogs)
                            │
              store.set(...) then setTimeout(() => store.evict(...), 10 min)
                            │
              sseManager.sendEvent(jobId, { stage: 'done', ... })
```

**Which path runs depends only on whether Redis is configured** (`UPSTASH_REDIS_URL`/`UPSTASH_REDIS_TOKEN` or `REDIS_URL`) — checked at request time in `create.ts` via `addJobToQueue()`'s return value, not at server boot. If Redis is up when the server starts but drops mid-session, `addJobToQueue()` catches the failure and returns `false`, and `create.ts` falls back to `runPipelineDirect()` for that request only.

**Content Multiplication** (`POST /:jobId/multiply` in `manage.ts`) goes through the same `runAndPersistPipeline()` as every other job — it is **not** a separate inline copy. `pipeline.ts` (`runContentPipeline`/`runAndPersistPipeline`) exposes a `skipResearch` option that lets `/multiply` start directly at the Writer stage, reusing the source job's cached research/task-plan/platform-rules instead of re-running Orchestrator+Researcher (the whole point of multiplication is skipping re-research). Everything else — the retry loop, `isSoftDeleted()` guard, progress emission, PerformancePredictor stage — is the canonical shared implementation, so a bug fixed in `pipeline.ts` is automatically fixed for `/multiply` too; there is no second copy to keep in sync (see `CHANGELOG.md` §1.11 for when this was consolidated).

---

## 2. Carousel rendering — rewritten 2026-07, read this before touching `lib/carousel.ts`

**If you've seen an older version of this project's docs describing `THEME_META`, `generateCarouselTemplate()`, or `injectSlideContent()` in `lib/carousel.ts` — that system no longer exists.** It asked Gemini to invent slide HTML per theme on every render, so the exported PNG frequently didn't match the on-screen preview and varied between runs. It was fully replaced.

**Current system — one source of truth for both preview and export:**

```
client/src/ssr/renderSlideHtml.tsx        ← the actual slide markup (React), used by:
        │
        ├──▶ On-screen preview: imported directly by IGSlide.tsx / SlideVisual.tsx
        │     (client-side React, no server round-trip, live as the user edits)
        │
        └──▶ PNG export: prebuilt via esbuild into
              server/src/generated/slideRenderer.js  (client/scripts/build-ssr.mjs,
              run automatically as part of `npm run build` in server/)
                      │
                      ▼
              server/src/lib/carouselSsr.ts: buildSlideHtml() calls renderSlideHtml()
              from the bundle, then stripScriptsAndEventHandlers()
                      │
                      ▼
              server/src/lib/carousel.ts: renderSlideWithCache() → Puppeteer browser pool
              → setJavaScriptEnabled(false) → request interception (blocks
                script/xhr/fetch/websocket) → screenshot → base64 PNG
              (24h cache, keyed by sha256 content hash + jobId + slideIndex + theme + viewport)
                      │
                      ▼
              routes/jobs/render.ts: POST /:jobId/export/carousel-png
              zips all slides with jszip, streams back as application/zip
```

**Why this matters for security review:** because the export path now renders the *same*
component the user already sees on screen (not new AI-generated HTML per request), the
security surface is smaller than it looks — but `stripScriptsAndEventHandlers()` and
`setJavaScriptEnabled(false)` are still applied as defense-in-depth, and the palette values
that get interpolated into inline SVG are hex-validated at the schema boundary
(`colorSystemSchema` in `server/src/schemas/jobs.ts`) rather than trusted as arbitrary strings.

**`lib/carousel.ts` today (331 lines — grew from 247 during the 2026-07 Render/Puppeteer Chrome-detection fixes; see `git log` on this file) contains ONLY:**
- The Puppeteer browser pool (min 2 / max 8, see §4 below)
- The PNG cache (24h TTL, content-hash keyed)
- `stripScriptsAndEventHandlers()` — the one canonical HTML sanitizer, used by both this file and `carouselSsr.ts`
- `renderSlideWithPuppeteer()` / `renderSlideWithCache()` — the actual screenshot calls

It does **not** contain theme metadata, prompt templates, or anything Gemini-related anymore.

---

## 3. Ownership, auth, and the "demo" fallback identity

Every `:jobId` route calls `requireJobOwnership(jobId, userId, res)` from
`server/src/routes/jobs/ownership.ts`. Lookup order: BullMQ worker's `jobStore` →
`jobsMemory` Map → DB (in that order, so in-flight jobs not yet persisted are still
reachable). Returns `404` (never `403`) on any mismatch, deliberately, to avoid confirming
a job ID exists but belongs to someone else.

**The `userId = req.dbUserId || req.userId || 'demo'` pattern** appears in most job/content
route handlers. In practice, on any route mounted behind `authMiddleware`, `req.dbUserId` is
always set (or the middleware itself returns 401/503 before the handler runs) — so the
`'demo'` fallback should be dead code on authenticated routes. It exists because some of
these handler functions are theoretically reachable from contexts without full auth context
(the pattern predates the current auth-cache implementation). If you're adding a new route,
don't copy this fallback chain uncritically — confirm whether `authMiddleware` genuinely runs
first for your route, and if so, `req.dbUserId!` (non-null assertion, since middleware
guarantees it) is more honest than a silent `'demo'` fallback that could theoretically collide
two different unauthenticated requests onto the same synthetic user bucket.

**Auth caching:** `middleware/auth.ts` caches the Clerk-ID → DB-UUID mapping for 5 minutes in
an in-process `Map`. On a DB error during the cache-miss lookup, it **fails closed** (503, not
a silent fallback to the raw Clerk ID) — this is deliberate: jobs are stored keyed by DB UUID,
so falling back to the Clerk ID string would make every subsequent ownership check silently
fail to match, turning a transient DB hiccup into "every job 404s for this user" without any
clear error.

---

## 4. Resource pools and long-lived state (what could leak, and why it doesn't)

| Pool / Map | File | Bound | Eviction |
|---|---|---|---|
| Puppeteer browser pool | `lib/carousel.ts` | min 2, max 8 | Browsers are reused across requests; a broken one is replaced via `replaceBrokenBrowser()` in the `catch` path, never left dangling |
| PNG cache | `lib/carousel.ts` | Unbounded `Map`, but entries are content-hash keyed so re-rendering identical content is a hit, not a new entry; 24h TTL checked on read | Never actively swept — old entries stay in memory until process restart. Acceptable today given typical job volume; worth revisiting if memory profiling ever shows this as a factor |
| `jobsMemory` Map | `routes/jobs/ownership.ts` | Unbounded | Evicted 10 min after completion via `setTimeout(() => store.evict(id), 10 * 60 * 1000)` in `pipeline.ts` |
| `jobStore` Map (BullMQ worker) | `workers/contentWorker.ts` | Unbounded | Same 10-min eviction pattern, called from the same shared `runAndPersistPipeline()` |
| Auth cache | `middleware/auth.ts` | Unbounded `Map`, keyed by Clerk ID | Entries expire on read (checked against `expiresAt`) but a stale entry for a user who never returns stays in memory forever — bounded in practice by total distinct users who've ever signed in during this process's lifetime |
| SSE clients | `lib/sse.ts` | Unbounded `Map<jobId, SSEClient[]>` | Correctly cleaned up via `res.on('close', ...)` — verified during this review, no leak |
| Redis rate-limit client | `middleware/rateLimit.ts` | Single lazy singleton per process | N/A — one connection, reused |

**Note on the 10-minute eviction pattern:** the same `setTimeout(() => store.evict(id), 10 * 60 * 1000)` literal appears in exactly one place (`pipeline.ts`), used by both callers — this is good; it was previously at risk of being copy-pasted per call site, and isn't.

---

## 5. External API fallback chains

Two independent multi-provider fallback chains exist — don't confuse them:

**LLM text generation** (`lib/ai.ts`, `generateWithAI()`):
```
Gemini 2.0 Flash (3 retries, exponential backoff 1s/2s/4s, circuit breaker opens for 60s
after 5 consecutive failures) → Groq llama-3.3-70b-versatile (2 retries)
```

**Image generation** (`routes/imageGen.ts`, `POST /api/image/generate`):
```
OpenAI gpt-image-1 → OpenAI DALL-E 3 → Together AI FLUX.1-schnell-Free
→ Gemini image models → Pollinations.AI (no key required, always available)
```
Every provider in this chain is attempted **sequentially within a single request** — up to 5
outbound calls with independent timeouts (90s/60s/30s/60s/60s/50s) before giving up. This is
mounted behind `authMiddleware` + `imageRateLimit` (20/hour/user) in `index.ts`.

---

## 6. Cross-references

- `CLAUDE.md` — conventions, hard rules, folder map (read this first each session)
- `REVIEW_FINDINGS.md` — open findings from the 2026-07-28 review; check before assuming something here is bug-free
- `CHANGELOG.md` — dated history of fixes and features; add an entry whenever something in this file becomes stale due to your change
- `UI_UX_DOCUMENTATION.md` — full design-system + differentiation reference

---

*Generated: 2026-07-28. Every claim in this file was directly verified against the code at that date — if you're reading this much later and something looks off, trust the code over this file, then fix this file.*
