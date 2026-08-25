# Pensieve — Feature Reference

> Renamed from "ContentAgent" (2026-08-26) — user-facing brand strings, docs, and internal
> product-name references were updated throughout. Deployed service names, production URLs/
> domains, and existing localStorage keys were deliberately left unchanged (see `CHANGELOG.md`'s
> 2026-08-26 entry for the exact boundary and why). See `CLAUDE.md` for the full technical
> architecture; this file is the feature-level index.

Pensieve is an AI-powered social media content generation SaaS. Give it a topic, and a
5-agent LLM pipeline researches, writes, critiques, and formats platform-ready content —
then optionally renders it, schedules it, or posts it directly.

---

## 1. Core Content Pipeline

**5-agent pipeline:** Orchestrator → Researcher → Writer → Formatter → Critic → Performance
Predictor.

- **Orchestrator** — builds a task plan, 3 Tavily search queries, and platform rules for the run.
- **Researcher** — runs 3 Tavily web searches, extracts key facts, trending angles, hashtag seeds.
- **Writer** — generates platform-specific content (Gemini 2.0 Flash, Groq fallback after 3 retries).
- **Formatter** — applies per-platform structural rules (hashtag placement, line breaks, length caps).
- **Critic** — scores output 0–100 across 5 dimensions (hook strength, platform compliance, brand
  voice match, value delivery, CTA clarity — 20 pts each). Scores below 70 trigger a feedback loop
  back to the Writer, up to 2 retries.
- **Performance Predictor** — estimates reach, saves, and shares for the finished content.

Real-time progress streams to the browser via Server-Sent Events, with automatic polling
fallback if the SSE connection drops.

### Supported platforms (5)

| Platform | Structure | Key constraints |
|---|---|---|
| Instagram Carousel | 8 fixed slides (cover → problem → solution → 4 features → stat → quote → 3–4 steps → CTA) | 45–60 words/slide, 65-word hard cap, banned filler phrases, retries on placeholder text |
| LinkedIn Post | Hook + body + CTA + hashtags | Hook ≤25 words, body 150–200 words, ≤5 hashtags, banned corporate-speak phrases |
| Twitter/X Thread | 6–8 numbered tweets | Tweet 1: 200–250 chars; rest ≤270 chars; 280-char hard limit enforced with truncation; auto-numbered |
| Instagram Caption | Caption + hashtags | First line ≤125-char hook, body 80–120 words, 10–15 hashtags (broad/niche/branded mix, capped at 30) |
| Video Script | Hook + 3–5 segments + CTA + hashtags + speaker notes | 30–60s total runtime, hook within first 3s, 5–8 hashtags, per-segment b-roll + caption overlay |

**Content Multiplication** — adapt one job's research to any of the other 4 platforms without
re-running the research phase.

**Batch Creation** — submit up to 7 topic+platform rows at once for parallel generation
(week-of-content planning), tracked via a dedicated batch-result view.

---

## 2. Instagram Carousel Rendering

Two rendering systems coexist:

- **Template system (current, primary)** — 10 distinct, visually-styled templates, each with its
  own typography, spacing, and 3 curated color palettes: Modern Minimal, Bold Statement,
  Editorial Classic, Tech Modern, Vibrant Pop, Luxury Dark, Clean Corporate, Creative Abstract,
  Storyteller, Social Media. Selectable at creation time or switched afterward on the result page.
- **Legacy system (fallback)** — 20 design presets layered over 9 slide-type layouts (cover,
  problem, solution, features, how-to, stat, quote, CTA, content), auto-assigned per topic for
  carousels generated before the template system shipped.

**Rendering pipeline** — the live on-screen preview and the exported PNG use the *same* React
component (server-side rendered via a prebuilt bundle), so what the user previews always matches
what they download. Export is server-rendered through a sandboxed Puppeteer browser pool
(JavaScript disabled, network requests blocked) at a fixed 1080×1350 resolution, with a 24-hour
render cache. All slides render in parallel and are packaged into a ZIP.

---

## 3. Brand & Voice

- **Brand Voice** — persist brand name, tone, vocabulary, and phrases; injected into every
  Writer and Critic prompt so output matches a consistent voice.
- **Content DNA / Voice Analysis** — deeper writing-style fingerprinting beyond basic brand
  voice, derived from analyzing the user's own content samples.
- **Learned Audience Defaults** — target-audience field auto-suggests based on the most
  frequently used audience across the user's last 40 completed jobs per platform.

---

## 4. Ideation, Research & Repurposing

- **Topic Ideation** — AI brainstorming for new content topics, with trend-aware suggestions,
  per-idea regeneration, and save-for-later.
- **URL Repurposing** — paste an article URL; its content becomes the research context, skipping
  the research phase entirely. Supports batch repurposing of multiple URLs at once.
- **Feed Monitors** — subscribe to an RSS/Atom feed URL; a background worker polls it every 30
  minutes (or on-demand) and automatically creates a Repurpose job for the newest unseen item.
- **Competitor Analysis** — analyze a public `@handle`'s content patterns (themes, content gaps,
  suggested angles); results are persisted with history, and the feature deliberately avoids
  fabricating engagement/frequency numbers it can't verify.
- **Hashtag Research** — Tavily-powered 3-tier hashtag strategy (broad/niche/branded) as a
  standalone tool.

---

## 5. Organization & History

- **Library** — saved content browser with collections, analytics, and content-management tools.
- **Collections** — user-named folders for grouping jobs (many-to-many).
- **Job Versions** — every regeneration snapshots the prior "final" output first, with one-click
  restore to any previous version.
- **Job List** — paginated, searchable, filterable, sortable across all past generations.
- **Dashboard** — job stats, quality-score trend chart, performance-prediction insights, and
  next-scheduled-post summary.

---

## 6. Publishing & Scheduling

- **Social OAuth** — connect LinkedIn and Twitter/X accounts; tokens encrypted at rest
  (AES-256-GCM) and never stored in plaintext.
- **Direct Posting** — post approved content straight to a connected platform.
- **Calendar Auto-Publish** — place a job on a calendar date and (with a connected account)
  queue a real, delayed-queue-backed publish at a fixed daily hour in the *scheduling user's own
  timezone*; status (posted/failed + URL/error) reports back to the calendar as a badge.
- **Reminder Scheduling** — a lighter-weight, explicitly non-auto-publishing "remind me to post
  this" option, kept intentionally separate from the Calendar's real auto-publish path.

---

## 7. Account, Export & Trust

- **Onboarding** — first-run flow capturing preferred tone and brand basics.
- **Data Export** — self-service full account data export.
- **Account Deletion** — self-service account + data deletion.
- **Public Demo** — try the full pipeline with no sign-up (rate-limited, truncated output).

---

## 8. Supporting Infrastructure (feature-relevant)

- **Image Generation** — multi-provider fallback chain (DALL-E 3 / gpt-image-1 → Together AI
  FLUX.1-schnell → Pollinations.AI) so image generation degrades gracefully rather than failing.
- **Authentication** — Clerk-based auth on every protected route, with a 5-minute cached
  Clerk-ID → internal-user lookup.
- **Ownership Protection** — every job-scoped action verifies the requesting user owns the job;
  a mismatch returns a plain "not found" rather than "forbidden," so other users' job IDs can't be
  enumerated by probing for a permission error.
- **Rate Limiting** — every route that calls an external API (Gemini, Tavily, image providers,
  Puppeteer rendering, social posting) is rate-limited on a shared Redis store, so limits hold
  across restarts and multiple server instances.
- **Real-Time Delivery** — SSE progress streaming with short-lived, purpose-issued connection
  tokens and automatic polling fallback on disconnect.

---

## 9. Platform & Data Footprint (for context, not user-facing)

- **5 platforms**, **10 current carousel templates** (+ legacy 9-layout/20-preset fallback system).
- **12 database tables**: users, content jobs, content outputs, agent logs, social tokens, user
  onboarding, scheduled posts, competitor analyses, collections, collection-job links, job output
  versions, feed monitors.
- **~30 authenticated API routes** across job management, content tools, user/brand settings,
  social publishing, scheduling, collections, and feed monitoring, plus a public demo endpoint.

---

*This document is a feature-level index. For architecture, data flow, and implementation
decisions, see `CLAUDE.md` and `ARCHITECTURE.md`. For dated history of what shipped when, see
`CHANGELOG.md`.*
