// SECURITY: rate limiting backed by Redis (not in-process memory).
// WHY Redis: an in-process MemoryStore is reset on every server restart and doesn't
// share state across horizontally scaled instances — both let users bypass limits trivially.
import { Request, Response, NextFunction, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { AuthRequest } from './auth.js';
import { getRedisClient } from '../lib/redisClient.js';
import { logger } from '../lib/logger.js';
import { env } from '../config.js';

// SECURITY: these patterns short-circuit prompt injection attempts before they reach Gemini.
// If a user embeds "ignore all previous instructions" in their topic, the LLM could be
// manipulated into ignoring brand-voice rules, leaking system prompts, or generating harmful content.
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior|above)\s+instructions?/i,
  /disregard\s+(previous|all|prior|above)\s+instructions?/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(if\s+you\s+are|a|an)\s+/i,
  /new\s+role\s*:/i,
  /system\s*:/i,
  /\[SYSTEM\]/i,
  /override\s+(your\s+)?instructions?/i,
  /forget\s+(everything|all)\s+(you|your)/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /dan\s+mode/i,
];

function containsInjection(value: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(value));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

/**
 * Sanitizes and validates all LLM-facing text fields on the request body.
 * Applied to all generation routes: /api/jobs/create, /api/jobs/batch,
 * /api/content/* (including /ideate's focusTopic), /api/demo/jobs/create
 */
export function sanitizeGenerationInput(req: Request, res: Response, next: NextFunction): void {
  const LIMITS: Record<string, number> = {
    topic: 500,
    targetAudience: 200,
    brandVoice: 300,
    brandName: 100,
    phrasesUse: 300,
    phrasesAvoid: 300,
    custom_feedback: 600,
    feedback: 600,
    handle: 100,
    industry: 150,
    samples: 3000,
    focusTopic: 200,
    competitorContext: 300,
    prompt: 2000,
  };

  for (const [field, maxLen] of Object.entries(LIMITS)) {
    const raw = req.body?.[field];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== 'string') {
      res.status(400).json({
        error: `Field "${field}" must be a string`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return;
    }

    const cleaned = stripHtml(raw);

    if (cleaned.length > maxLen) {
      res.status(400).json({
        error: `Field "${field}" exceeds maximum length of ${maxLen} characters (got ${cleaned.length})`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return;
    }

    if (containsInjection(cleaned)) {
      res.status(400).json({
        error: `Field "${field}" contains disallowed content. Please rephrase your request.`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return;
    }

    req.body[field] = cleaned;
  }

  next();
}

// SECURITY: CLAUDE.md hard-bans in-memory rate limiters (MemoryStore resets on
// restart and isn't shared across instances — trivially bypassable, and on a
// multi-instance deployment each instance would track its own independent
// counter, effectively multiplying a user's real limit by instance count).
// WHY fail closed, not fall back to MemoryStore: express-rate-limit's default
// behavior when `store` is undefined is to silently use its own in-process
// MemoryStore — exactly the banned behavior. failClosedMiddleware rejects
// with 503 instead whenever Redis is unavailable, so a Redis outage degrades
// rate-limited endpoints (content generation, exports, image gen) to
// unavailable rather than to unenforced. This is a real availability
// tradeoff, made deliberately: an unenforced limiter on routes that call
// metered external APIs (Gemini/Tavily/OpenAI/Together) is a cost/abuse
// exposure, not just a correctness nicety.
function failClosedMiddleware(prefix: string): (req: Request, res: Response, next: NextFunction) => void {
  return (_req, res, next) => {
    if (getRedisClient()) {
      next();
      return;
    }
    logger.error('Redis unavailable — rejecting request rather than falling back to an in-memory rate limiter', { prefix });
    res.status(503).json({
      error: 'This action is temporarily unavailable. Please try again shortly.',
      code: 'RATE_LIMITER_UNAVAILABLE',
      retryable: true,
    });
  };
}

// FLOW: makeStore() is evaluated once at module load (`rateLimit({ store:
// makeStore('auth') })` below runs at import time, before any request), so it
// must never throw here — Redis may not be configured yet, or at all, in
// local dev, and this file is imported unconditionally by index.ts. Returning
// undefined at load time is safe: express-rate-limit only reads `store` at
// construction, and failClosedMiddleware (applied as request-time middleware
// ahead of each limiter below) is what actually enforces "reject rather than
// silently use an in-memory limiter" per-request, based on Redis's REAL
// availability at request time rather than this load-time snapshot.
//
// WHY reuse the redisClient.ts singleton directly (not a dedicated connection like
// BullMQ needs): rate-limit-redis only issues plain get/set/incr-style commands, none
// of which are blocking, so sharing the singleton connection is safe and preferred —
// it avoids opening yet another Redis socket per process (see CLAUDE.md finding 1.15).
function makeStore(prefix: string): RedisStore | undefined {
  const client = getRedisClient();
  if (!client) return undefined;
  // NOTE: ioredis's `.call()` has generated overloads keyed to specific command-name
  // string literals, which TS can't match against a generic `...string[]` spread from
  // rate-limit-redis's SendCommandFn. Narrowing to a single explicit signature here
  // (rather than an `any`-typed client) keeps the cast scoped to this one call site.
  const call = client.call.bind(client) as (...args: string[]) => Promise<unknown>;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) => call(...args) as ReturnType<RedisStore['sendCommand']>,
  });
}

// ── Rate limiters ──────────────────────────────────────────────────────────────

// WHY a factory function: eliminates duplication of failClosedMiddleware wrapper
// across all limiters and ensures the prefix is compiler-enforced to match the limiter.
// A new limiter added later can't forget the wrapper or use the wrong prefix.
interface RateLimiterConfig {
  prefix: string;
  windowMs: number;
  max: number;
  message: string;
  code: string;
  skip?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
}

function buildRateLimiter(config: RateLimiterConfig): RequestHandler[] {
  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    store: makeStore(config.prefix),
    keyGenerator: config.keyGenerator || ((req: Request) => {
      const authReq = req as AuthRequest;
      return authReq.userId || authReq.dbUserId || ipKeyGenerator(req.ip ?? '') || (req.socket?.remoteAddress ?? 'unknown') || 'unknown';
    }),
    handler: (_req, res) => {
      res.status(429).json({
        error: config.message,
        code: config.code,
        retryable: false,
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: config.skip,
  });
  return [failClosedMiddleware(config.prefix), limiter];
}

/**
 * Authenticated users: configurable generation jobs per hour per user ID.
 * Override for local dev by setting RATE_LIMIT_MAX_JOBS=100 in .env
 */
const AUTH_JOB_MAX = parseInt(env.RATE_LIMIT_MAX_JOBS, 10);

// SECURITY: every keyGenerator below used to call `ipKeyGenerator(req as any)` —
// passing the whole Express Request where ipKeyGenerator(ip: string, ...)
// expects an IP address string. net.isIPv6() on a non-string returns false, so
// the function fell through to `return ip` and handed back the Request object
// itself as the rate-limit "key," not an actual IP. This was masked for every
// authenticated request (userId/dbUserId already win the `||` chain before
// ipKeyGenerator is ever reached) and only manifested in the true
// unauthenticated fallback path — exactly the case a rate limiter most needs to
// get right. Fixed to ipKeyGenerator(req.ip ?? ''), the string IP the function
// actually expects.
export const authJobRateLimit = buildRateLimiter({
  prefix: 'auth',
  windowMs: 60 * 60 * 1000,
  max: AUTH_JOB_MAX,
  message: 'Too many generation requests. You can create up to 10 pieces of content per hour.',
  code: 'RATE_LIMITED',
  skip: (req) => req.method === 'GET',
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || authReq.dbUserId || ipKeyGenerator(req.ip ?? '') || (req.socket?.remoteAddress ?? 'unknown') || 'unknown';
  },
});

/**
 * Demo mode: 3 generation jobs per hour per IP.
 */
export const demoJobRateLimit = buildRateLimiter({
  prefix: 'demo',
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Demo limit reached. Sign up for free to create up to 10 pieces per hour.',
  code: 'RATE_LIMITED',
  skip: (req) => req.method === 'GET',
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? '') || (req.socket?.remoteAddress ?? 'unknown') || 'unknown',
});

// NOTE: renderRateLimit and renderStreamRateLimit were removed along with the
// /render-slides endpoints they guarded. Carousel rendering now happens only inside the
// export route below, which exportRateLimit already covers.

/**
 * Carousel export endpoint: 10 exports per hour per user.
 */
export const exportRateLimit = buildRateLimiter({
  prefix: 'export',
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many export requests. Limit: 10 carousel exports per hour.',
  code: 'RATE_LIMITED',
});

/**
 * /api/content/* (POST): ideate, hashtags, repurpose, competitor, regenerate.
 * Each of these calls at least one paid LLM API, and repurpose/competitor also
 * fire outbound fetches — without a limiter a scripted loop burns real cost
 * and can exhaust the shared provider API keys for every user.
 */
export const contentRateLimit = buildRateLimiter({
  prefix: 'content',
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Too many requests. Limit: 30 content-tool calls per hour.',
  code: 'RATE_LIMITED',
  skip: (req) => req.method === 'GET',
});

/**
 * /api/image/generate (POST): can chain up to 5 sequential paid providers
 * (OpenAI gpt-image-1 → DALL-E 3 → Together AI → Gemini image → Pollinations)
 * per single request — the most expensive per-call route in the app.
 */
export const imageRateLimit = buildRateLimiter({
  prefix: 'image',
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many image generation requests. Limit: 20 per hour.',
  code: 'RATE_LIMITED',
  skip: (req) => req.method === 'GET',
});

/**
 * /api/social/connect/:platform and /api/social/callback/:platform: the
 * callback route calls external LinkedIn/Twitter token + profile APIs.
 * Without a limiter, repeated hits with crafted/stale codes cause unbounded
 * outbound calls to those APIs with no backpressure.
 */
export const socialRateLimit = buildRateLimiter({
  prefix: 'social',
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many social connection requests. Please try again later.',
  code: 'RATE_LIMITED',
});

