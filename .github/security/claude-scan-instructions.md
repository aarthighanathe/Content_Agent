# Pensieve — Claude security review focus

Prioritize findings that violate these project hard rules. Treat the following as
confirmed high-severity when introduced or weakened by the diff:

## Auth & authorization
- Any `:jobId` route that skips `requireJobOwnership()` from
  `server/src/routes/jobs/ownership.ts`.
- Returning **403** on ownership failure (must be **404** to prevent IDOR
  enumeration).
- Skipping `authMiddleware` on non-public routes; SSE endpoints that accept
  tokens without `verifySSEToken()`.

## Input & LLM safety
- Spreading `req.body` into DB updates (mass assignment).
- Using unsanitized values in Redis keys.
- LLM HTML rendered or stored without `stripScriptsAndEventHandlers()`.
- User/content text interpolated into prompts without XML field tags
  (`<topic>`, `<brand_voice>`, `<source_article>`, etc.).
- `dangerouslySetInnerHTML` with unsanitized LLM output.

## Puppeteer / SSR
- Enabling JavaScript in Puppeteer, or missing request interception that blocks
  script/xhr/fetch/websocket.
- Accepting client-supplied HTML for Puppeteer; only SSR
  `buildSlideHtml()` / `renderSlideHtml()` paths are allowed.

## Network & secrets
- SSRF: fetching user-controlled URLs without `assertUrlIsPublic()` /
  `ssrfGuard`.
- Hardcoded secrets, API keys, or connection strings; reading secrets via
  `process.env` instead of `config` from `server/src/config.ts`.
- New external-API routes without a Redis-backed rate limiter from
  `middleware/rateLimit.ts`.

## De-prioritize (known accepted patterns)
- Rate-limit / DoS noise already covered by Redis limiters.
- Legitimate `stripScriptsAndEventHandlers` / sanitizer regexes that look like
  “dangerous HTML handling.”
- Local-dev-only Dockerfiles (`client/Dockerfile`, `server/Dockerfile`) used by
  `docker-compose.yml`, not production Vercel/Render images.
