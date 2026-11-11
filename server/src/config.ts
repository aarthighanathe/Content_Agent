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

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

// WHY before schema parse: index.ts used to call dotenv AFTER importing this
// module, so `npm start` (without Node --env-file) never saw root/server .env
// values. Platform-injected env (Render/Vercel) already populates process.env
// before boot — loadDotenv is a no-op for keys that are already set.
loadDotenv({ path: resolve(process.cwd(), '.env') });
loadDotenv({ path: resolve(process.cwd(), '../.env') });

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
  // SECURITY: required, not optional — without it, social OAuth tokens would
  // have no way to be encrypted at rest. Missing this must fail startup, not
  // silently fall back to plaintext storage (see routes/social.ts's dbUpsertToken).
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)',
    ),
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

  // ── Puppeteer / carousel rendering ──────────────────────────────────────
  // Explicit path to a system Chrome/Chromium install — takes priority over
  // browserPool.ts's guessed Render-image paths. Set this on any deploy
  // target other than Render (or if Render's known paths ever change).
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  // Directory for `npx puppeteer browsers install chrome` (Render pins this
  // under the service root so Chrome survives the slug upload).
  PUPPETEER_CACHE_DIR: z.string().optional(),
  // Set by Render's own platform (not something you configure) — used only
  // to gate browserPool.ts's Render-specific system-Chrome path guesses so
  // they aren't attempted on other platforms where those paths don't exist.
  RENDER: z.string().optional(),
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
  // flow. Reject when NODE_ENV=production (even if APP_URL still defaults to
  // localhost — Render can omit APP_URL and leave the zod default) OR when
  // APP_URL is a non-localhost host (staging/preview with NODE_ENV=development).
  let appHost = '';
  try {
    appHost = new URL(result.data.APP_URL).hostname.toLowerCase();
  } catch {
    appHost = '';
  }
  const isLocalhost = appHost === 'localhost' || appHost === '127.0.0.1' || appHost === '::1';
  if (
    result.data.OAUTH_STATE_SECRET === DEV_OAUTH_STATE_SECRET
    && (result.data.NODE_ENV === 'production' || !isLocalhost)
  ) {
    throw new Error(
      'Environment configuration invalid:\n  OAUTH_STATE_SECRET: must be set to a unique value when NODE_ENV=production or APP_URL is not localhost (dev default detected)',
    );
  }
  // SECURITY: a production boot with the default localhost APP_URL would also
  // break OAuth redirects and CORS — fail fast rather than serving half-configured.
  if (result.data.NODE_ENV === 'production' && isLocalhost) {
    throw new Error(
      'Environment configuration invalid:\n  APP_URL: must be set to the public API origin in production (localhost default detected)',
    );
  }

  return result.data;
}

export const env = parseEnv();
