// SECURITY: rate limiting backed by Redis (not in-process memory).
// WHY: Redis: an in-process MemoryStore is reset on every server restart and doesn't
// share state across horizontally scaled instances — both let users bypass limits trivially.
import { Request, Response, NextFunction, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import type { AugmentedRequest } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { AuthRequest } from './auth.js';
import { getRedisClient } from '../lib/redisClient.js';
import { logger } from '../lib/logger.js';
import { getInjectionTestPatterns } from '../lib/injectionPatterns.js';

// SECURITY: short-circuit prompt injection before Gemini — patterns live in
// lib/injectionPatterns.ts (shared with sanitizeSearchText) so reject + redact
// cannot drift apart again.
const INJECTION_PATTERNS = getInjectionTestPatterns();

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
  // NOTE: topic=500 vs schemas/jobs.ts's TOPIC_MAX_LENGTH=250: this middleware runs
  // BEFORE zod validation as a generous outer pre-filter (reject obviously-abusive
  // payloads early, cheaply), not the source of truth for the real business-rule cap.
  // createJobSchema (and jobs/create.ts's batch route, and the client's Create form's
  // maxLength) all enforce the tighter 250 downstream — don't "fix" this by making
  // them match; they're deliberately different layers with different jobs.
  // WHY: these caps equal (not undercut) the zod schema maxes: a lower cap here
  // rejected input the schema explicitly allows (e.g. 10k-char voice samples,
  // 300-char profile URLs) with a misleading length error before zod ran.
  const LIMITS: Record<string, number> = {
    topic: 500,
    targetAudience: 300,
    brandVoice: 300,
    brandName: 100,
    phrasesUse: 1000,
    phrasesAvoid: 1000,
    custom_feedback: 1000,
    feedback: 1000,
    handle: 300,
    industry: 200,
    samples: 10000,
    focusTopic: 200,
    competitorContext: 300,
    prompt: 2000,
  };

  // Returns cleaned string, or null after writing a 400 (caller must return).
  function sanitizeField(raw: unknown, fieldPath: string, maxLen: number): string | null {
    if (typeof raw !== 'string') {
      res.status(400).json({
        error: `Field "${fieldPath}" must be a string`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return null;
    }

    const cleaned = stripHtml(raw);

    if (cleaned.length > maxLen) {
      res.status(400).json({
        error: `Field "${fieldPath}" exceeds maximum length of ${maxLen} characters (got ${cleaned.length})`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return null;
    }

    if (containsInjection(cleaned)) {
      res.status(400).json({
        error: `Field "${fieldPath}" contains disallowed content. Please rephrase your request.`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return null;
    }

    return cleaned;
  }

  for (const [field, maxLen] of Object.entries(LIMITS)) {
    const raw = req.body?.[field];
    if (raw === undefined || raw === null) continue;
    const cleaned = sanitizeField(raw, field, maxLen);
    if (cleaned === null) return;
    req.body[field] = cleaned;
  }

  // SECURITY: batch / nested payloads (items[].topic, items[].targetAudience)
  // used to skip the top-level-only loop above — walk them with the same caps.
  const nestedFields: Array<{ key: string; maxLen: number }> = [
    { key: 'topic', maxLen: LIMITS.topic },
    { key: 'targetAudience', maxLen: LIMITS.targetAudience },
    { key: 'content', maxLen: 8000 },
    { key: 'feedback', maxLen: LIMITS.feedback },
  ];
  if (Array.isArray(req.body?.items)) {
    for (let i = 0; i < req.body.items.length; i++) {
      const item = req.body.items[i] as Record<string, unknown> | null;
      if (!item || typeof item !== 'object') continue;
      for (const { key, maxLen } of nestedFields) {
        if (item[key] === undefined || item[key] === null) continue;
        const cleaned = sanitizeField(item[key], `items[${i}].${key}`, maxLen);
        if (cleaned === null) return;
        item[key] = cleaned;
      }
    }
  }

  next();
}

// SECURITY: CLAUDE.md hard-bans in-memory rate limiters (MemoryStore resets on
// restart and isn't shared across instances — trivially bypassable, and on a
// multi-instance deployment each instance would track its own independent
// counter, effectively multiplying a user's real limit by instance count).
// WHY: fail closed, not fall back to MemoryStore: express-rate-limit's default
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

// FLOW: always return a RedisStore (never undefined). express-rate-limit falls
// back to MemoryStore when `store` is undefined — banned by CLAUDE.md. If Redis
// was null at import but connected later, a MemoryStore would silently enforce
// nothing shared. Lazy sendCommand resolves the client per call; failClosed
// still 503s when Redis is down before the limiter runs.
//
// WHY: reuse the redisClient.ts singleton directly (not a dedicated connection like
// BullMQ needs): rate-limit-redis only issues plain get/set/incr-style commands, none
// of which are blocking, so sharing the singleton connection is safe and preferred —
// it avoids opening yet another Redis socket per process (see CLAUDE.md finding 1.15).
function makeStore(prefix: string): RedisStore {
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) => {
      const client = getRedisClient();
      if (!client) {
        return Promise.reject(new Error(`Redis unavailable for rate-limit store (${prefix})`));
      }
      // NOTE: ioredis's `.call()` has generated overloads keyed to specific command-name
      // string literals — narrow cast scoped to this call site.
      const call = client.call.bind(client) as (...args: string[]) => Promise<unknown>;
      return call(...args) as ReturnType<RedisStore['sendCommand']>;
    },
  });
}

// WHY: a factory function: eliminates duplication of failClosedMiddleware wrapper
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
    // WHY: retryAfterMs, not just standardHeaders' Retry-After: the client's
    // countdown UI (Create/errorMessages.ts, TopicStep.tsx's countdownText)
    // was already built to consume a numeric retryAfterMs field on the 429
    // body — this was the one missing piece leaving that UI permanently dead
    // code. req.rateLimit.resetTime is populated by express-rate-limit before
    // the handler runs (requestPropertyName defaults to 'rateLimit').
    handler: (req, res) => {
      const resetTime = (req as AugmentedRequest).rateLimit?.resetTime;
      const retryAfterMs = resetTime ? Math.max(0, resetTime.getTime() - Date.now()) : undefined;
      res.status(429).json({
        error: config.message,
        code: config.code,
        retryable: false,
        ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: config.skip,
  });
  return [failClosedMiddleware(config.prefix), limiter];
}

// WHY: re-exported: batch/repurpose/feed-monitor callers historically imported
// budget helpers from this module; implementation lives in lib/generationBudget.ts
// so this file stays under the 400-line split threshold.
export {
  AUTH_JOB_MAX,
  assertGenerationBudget,
  chargeGenerationBudget,
  reserveGenerationBudget,
  releaseGenerationBudget,
} from '../lib/generationBudget.js';
import { AUTH_JOB_MAX } from '../lib/generationBudget.js';

/**
 * Authenticated users: configurable generation jobs per hour per user ID.
 * Override for local dev by setting RATE_LIMIT_MAX_JOBS=100 in .env
 */
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
// WHY: no explicit keyGenerator: this used to duplicate buildRateLimiter's own
// default keyGenerator byte-for-byte (2026-08-10 — every sibling limiter
// below already omits it) — removed to avoid the two copies silently
// diverging if one is ever edited without the other.
export const authJobRateLimit = buildRateLimiter({
  prefix: 'auth',
  windowMs: 60 * 60 * 1000,
  max: AUTH_JOB_MAX,
  message: 'Too many generation requests. You can create up to 10 pieces of content per hour.',
  code: 'RATE_LIMITED',
  skip: (req) => req.method === 'GET',
});

/** PATCH/DELETE/restore and other non-generation job mutations — separate from the hourly generation cap. */
export const jobMutationRateLimit = buildRateLimiter({
  prefix: 'job-mut',
  windowMs: 60 * 60 * 1000,
  max: 120,
  message: 'Too many job updates. Please slow down and try again shortly.',
  code: 'RATE_LIMITED',
  skip: (req) => req.method === 'GET',
});

/**
 * Demo mode: 5 generation jobs per hour per IP.
 * WHY 5: the landing demo offers one sample per platform, and there are 5
 * platforms. A cap of 3 made two of those buttons fail for every visitor.
 */
export const demoJobRateLimit = buildRateLimiter({
  prefix: 'demo',
  windowMs: 60 * 60 * 1000,
  max: 5,
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

/**
 * POST /api/jobs/:jobId/stream-token — mints short-lived Redis SSE tokens.
 * WHY separate from authJobRateLimit / jobMutationRateLimit: SSE reconnects
 * during a generation must not burn the hourly generation or mutation budgets,
 * but an unbounded mint loop still writes Redis keys and can amplify abuse.
 * 60/min is generous for legitimate reconnect storms, tight enough to stop spam.
 */
export const streamTokenRateLimit = buildRateLimiter({
  prefix: 'stream-token',
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many stream-token requests. Please wait a moment and try again.',
  code: 'RATE_LIMITED',
});

