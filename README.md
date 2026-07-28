# ContentAgent

AI-powered social media content generation SaaS. Give it a topic; it researches, writes, critiques, and formats content for five platforms.

## What it does

ContentAgent runs a 5-agent pipeline (Orchestrator → Researcher → Writer → Formatter → Critic) that produces platform-optimized content from a single topic. The critic scores output on five dimensions and requests revisions until quality exceeds 70/100. Final content is streamed to the browser in real time via SSE.

Supported platforms: Instagram carousels (9 visual themes, Puppeteer-rendered PNGs), LinkedIn posts, Twitter/X threads, Instagram captions, and video scripts. One research session can be adapted to all five platforms without re-running the research phase.

## Features

- **Multi-agent pipeline** — Orchestrator, Researcher (Tavily), Writer (Gemini), Formatter, Critic, PerformancePredictor
- **9 carousel themes** — AI-generated, Puppeteer-rendered 1080×1080 PNGs; ZIP export
- **Brand voice** — Save tone, vocabulary, phrases; injected into every generation
- **Real-time progress** — SSE streams agent stage and progress to the browser
- **Content Multiplication** — Adapt one job to other platforms, reusing existing research
- **Hashtag Research** — Tavily-powered 3-tier hashtag strategy
- **Social Publishing** — OAuth connect + direct post to LinkedIn and Twitter
- **Topic Ideation** — AI brainstorming with trend-aware suggestions
- **URL Repurposing** — Paste an article URL; the article becomes the research context
- **Competitor Analysis** — @handle → content pattern analysis + content ideas
- **Content Templates** — Save and reuse successful content structures
- **Batch Creation** — Generate up to 7 jobs in parallel (week planning)
- **Public Demo** — No sign-up required to try the pipeline (truncated output, rate-limited)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4 |
| State | Zustand (SSE state), React Query (server data) |
| Auth | Clerk |
| Backend | Node.js, Express 5, TypeScript |
| Queue | BullMQ + Upstash Redis |
| Database | Neon PostgreSQL (Drizzle ORM) |
| AI | Gemini 2.0 Flash (primary), Groq (fallback), Tavily (research) |
| Rendering | Puppeteer (carousel PNGs) |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Clerk](https://clerk.com) project (free tier works)
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini 2.0 Flash)

Everything else (Upstash, Tavily, OpenAI, social OAuth) is optional — the app degrades gracefully without them.

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd AGContentAgent

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### Environment Variables

Env vars are split by side — copy `client/.env.example` to `client/.env.local` and
`server/.env.example` to `server/.env`, then fill in the values. `server/src/config.ts` is the
authoritative schema (validated at boot); the table below mirrors it.

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `GEMINI_API_KEY` | Google Gemini 2.0 Flash API key | Yes |
| `CLERK_SECRET_KEY` | Clerk backend secret | Yes |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend publishable key | Yes |
| `VITE_API_BASE_URL` | API server URL (e.g. `http://localhost:3001`) | Yes |
| `PORT` | API server port (default: `3001`) | No |
| `UPSTASH_REDIS_URL` | Upstash Redis URL for BullMQ queue | No — falls back to inline pipeline |
| `UPSTASH_REDIS_TOKEN` | Upstash Redis auth token | No |
| `REDIS_URL` | Generic Redis URL (Railway/Render/Docker Compose) — alternative to Upstash | No |
| `TAVILY_API_KEY` | Tavily web search API key | No — research skipped without it |
| `GROQ_API_KEY` | Groq fallback LLM | No |
| `OPENAI_API_KEY` | DALL-E 3 / gpt-image-1 image generation | No |
| `TOGETHER_API_KEY` | Together AI image generation fallback | No |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth | No |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | Twitter/X OAuth | No |
| `OAUTH_STATE_SECRET` | 32-byte hex — signs OAuth state params | Required for social OAuth |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex — AES-256-GCM for stored social tokens | Required for social OAuth |
| `SENTRY_DSN` | Sentry error tracking | No |
| `VITE_POSTHOG_KEY` | PostHog client analytics | No |
| `CORS_ORIGINS` | Comma-separated list of extra CORS origins | No |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Running Locally

```bash
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — Vite dev server
cd client && npm run dev
```

Open `http://localhost:5173`. Sign in with Clerk, then create your first content job.

## Deployment

Production target: **Vercel** (client) + **Render** (server) + **Neon** (Postgres) + **Upstash**
(Redis) — all free-tier. `client/vercel.json` and `render.yaml` (root) hold the platform config;
see [CLAUDE.md § 12](CLAUDE.md#12-deployment-production) for the full rationale and env var
handling. `docker-compose.yml` and both `Dockerfile`s are local-dev-only conveniences (a local
Postgres/Redis stand-in), not part of the production deploy path.

## Architecture

See [CLAUDE.md](CLAUDE.md) for the full architecture overview, folder structure, and data flow diagrams.

Short version:

```
Browser → POST /api/jobs/create → BullMQ queue (or direct pipeline if no Redis)
       → 5 AI agents run sequentially with SSE progress events
       → content persisted to Neon DB
       → Result page streams updates via SSE
```

## Project Structure

```
/
├── client/               React + Vite SPA (+ .env.example, vercel.json)
├── server/               Express API + BullMQ worker (+ .env.example)
├── render.yaml           Render Blueprint (server deployment)
├── docker-compose.yml    Local-dev-only Postgres/Redis stand-in
├── CLAUDE.md             Full dev context (read this first)
├── ARCHITECTURE.md       Verified current-state data flows
├── REVIEW_FINDINGS.md    Open issues from the most recent codebase review
└── CHANGELOG.md          History of all changes
```

## Development

### Available Scripts

```bash
# Server
cd server
npm run dev      # tsx watch — live reload
npm run build    # tsc → /dist
npm run seed     # populate test data

# Client
cd client
npm run dev      # Vite dev server
npm run build    # tsc + vite build → /dist
npm run lint     # ESLint
```

### Adding a New Feature

Follow the checklist in [CLAUDE.md § 7](CLAUDE.md#7-coding-conventions):
1. Server route in `server/src/routes/`
2. Mount in `server/src/index.ts`
3. Auth middleware + `sanitizeGenerationInput` + rate limiter on all endpoints
4. Client page in `client/src/pages/`
5. Route in `client/src/App.tsx`
6. API function in `client/src/api.ts`

### Running Tests

```bash
cd server
npm run test           # vitest run
npm run test:watch     # vitest watch mode
npm run test:coverage  # vitest run --coverage
```

Unit tests live in `server/tests/unit/`, integration tests (route-level, mocked DB) in `server/tests/integration/`. The client has no automated test suite yet.

## Roadmap

No formal roadmap document is tracked yet. See [CHANGELOG.md](CHANGELOG.md) for shipped work and [REVIEW_FINDINGS.md](REVIEW_FINDINGS.md) for known open items.

## License

Private — all rights reserved. See [LICENSE](LICENSE).
