// SECURITY: rate limiting backed by Redis (not in-process memory).
// WHY Redis: an in-process MemoryStore is reset on every server restart and doesn't
// share state across horizontally scaled instances — both let users bypass limits trivially.
import { Request, Response, NextFunction } from 'express';
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
 * /api/content/repurpose, /api/demo/jobs/create
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

// FLOW: makeStore() returns a RedisStore when Redis is available, or undefined which
// causes express-rate-limit to fall back to its built-in in-process MemoryStore.
//
// WHY reuse the redisClient.ts singleton directly (not a dedicated connection like
// BullMQ needs): rate-limit-redis only issues plain get/set/incr-style commands, none
// of which are blocking, so sharing the singleton connection is safe and preferred —
// it avoids opening yet another Redis socket per process (see CLAUDE.md finding 1.15).
function makeStore(prefix: string): RedisStore | undefined {
  const client = getRedisClient();
  if (!client) {
    // SECURITY: CLAUDE.md hard-bans in-memory rate limiters (MemoryStore resets on
    // restart and isn't shared across instances — trivially bypassable). This fallback
    // firing is a production misconfiguration, not a benign dev default, so it must be
    // loud (logger.error) rather than degrading silently.
    logger.error('Redis unavailable — rate limiter falling back to in-process MemoryStore', { prefix });
    return undefined;
  }
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

/**
 * Authenticated users: configurable generation jobs per hour per user ID.
 * Override for local dev by setting RATE_LIMIT_MAX_JOBS=100 in .env
 */
const AUTH_JOB_MAX = parseInt(env.RATE_LIMIT_MAX_JOBS, 10);

export const authJobRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: AUTH_JOB_MAX,
  store: makeStore('auth'),
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || authReq.dbUserId || ipKeyGenerator(req as any) || (req.socket?.remoteAddress ?? 'unknown') || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many generation requests. You can create up to 10 pieces of content per hour.',
      code: 'RATE_LIMITED',
      retryable: false,
      retryAfterMs: 60 * 60 * 1000,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

/**
 * Demo mode: 3 generation jobs per hour per IP.
 */
export const demoJobRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  store: makeStore('demo'),
  keyGenerator: (req: Request) => ipKeyGenerator(req as any) || (req.socket?.remoteAddress ?? 'unknown') || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Demo limit reached. Sign up for free to create up to 10 pieces per hour.',
      code: 'RATE_LIMITED',
      retryable: false,
      retryAfterMs: 60 * 60 * 1000,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

// NOTE: renderRateLimit and renderStreamRateLimit were removed along with the
// /render-slides endpoints they guarded. Carousel rendering now happens only inside the
// export route below, which exportRateLimit already covers.

/**
 * Carousel export endpoint: 10 exports per hour per user.
 */
export const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  store: makeStore('export'),
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || authReq.dbUserId || ipKeyGenerator(req as any) || (req.socket?.remoteAddress ?? 'unknown') || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many export requests. Limit: 10 carousel exports per hour.',
      code: 'RATE_LIMITED',
      retryable: false,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * /api/content/* (POST): ideate, hashtags, repurpose, competitor, regenerate.
 * Each of these calls at least one paid LLM API, and repurpose/competitor also
 * fire outbound fetches — without a limiter a scripted loop burns real cost
 * and can exhaust the shared provider API keys for every user.
 */
export const contentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  store: makeStore('content'),
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || authReq.dbUserId || ipKeyGenerator(req as any) || (req.socket?.remoteAddress ?? 'unknown') || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests. Limit: 30 content-tool calls per hour.',
      code: 'RATE_LIMITED',
      retryable: false,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

/**
 * /api/image/generate (POST): can chain up to 5 sequential paid providers
 * (OpenAI gpt-image-1 → DALL-E 3 → Together AI → Gemini image → Pollinations)
 * per single request — the most expensive per-call route in the app.
 */
export const imageRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  store: makeStore('image'),
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || authReq.dbUserId || ipKeyGenerator(req as any) || (req.socket?.remoteAddress ?? 'unknown') || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many image generation requests. Limit: 20 per hour.',
      code: 'RATE_LIMITED',
      retryable: false,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

