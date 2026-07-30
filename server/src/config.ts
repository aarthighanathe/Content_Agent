/**
 * Centralised environment-variable configuration.
 *
 * All process.env access in the application should go through this module.
 * The schema is validated once at startup — a missing required variable throws
 * immediately with a clear "VARIABLE_NAME: Required" message rather than a
 * cryptic runtime failure deep inside a route handler.
 *
 * Variables marked .optional() degrade gracefully (feature disabled, fallback
 * used).  Variables marked .min(1) are required at runtime.
 */

import { z } from 'zod';

const envSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),

  // ── Database ─────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ── Auth (Clerk) ─────────────────────────────────────────────────────────
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),

  // ── AI providers ─────────────────────────────────────────────────────────
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GROQ_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),

  // ── Redis / BullMQ ────────────────────────────────────────────────────────
  UPSTASH_REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),
  // Generic Redis URL (provided by some platforms like Railway)
  REDIS_URL: z.string().optional(),

  // ── Security ─────────────────────────────────────────────────────────────
  // TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64, 'TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    .optional(),
  // SECURITY: without this secret, OAuth state HMAC falls back to a hardcoded
  // dev string, making OAuth state tokens trivially forgeable. Make it required
  // in production environments — set a generous default for local dev only.
  OAUTH_STATE_SECRET: z
    .string()
    .min(32, 'OAUTH_STATE_SECRET must be at least 32 characters')
    .default('dev-oauth-state-secret-min-32-chars!!'),

  // ── CORS / URLs ───────────────────────────────────────────────────────────
  CORS_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  APP_URL: z.string().url().default('http://localhost:3001'),

  // ── OAuth credentials ─────────────────────────────────────────────────────
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),

  // ── Observability ─────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().url().optional(),

  // ── Rate limiting ─────────────────────────────────────────────────────────
  RATE_LIMIT_MAX_JOBS: z.string().default('10'),
});

const DEV_OAUTH_STATE_SECRET = 'dev-oauth-state-secret-min-32-chars!!';

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // Fail fast — misconfigured env is a startup error, not a runtime one
    throw new Error(`Environment configuration invalid:\n${issues}`);
  }

  // SECURITY: the dev default makes OAuth state HMAC trivially forgeable —
  // acceptable for local dev, unacceptable once real users can hit the OAuth
  // flow in production. Fail startup rather than silently running insecurely.
  if (result.data.NODE_ENV === 'production' && result.data.OAUTH_STATE_SECRET === DEV_OAUTH_STATE_SECRET) {
    throw new Error(
      'Environment configuration invalid:\n  OAUTH_STATE_SECRET: must be set to a unique value in production (dev default detected)',
    );
  }

  return result.data;
}

export const env = parseEnv();
