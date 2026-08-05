// AUDIT FIX #7 — Sentry must be initialized before all other imports
import * as Sentry from '@sentry/node';

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolve } from 'path';
import { env } from './config.js';
import { logger } from './lib/logger.js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });

// Initialize Sentry only when DSN is configured (skipped in local dev without account)
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.2,
  });
  logger.info('Sentry error tracking initialized');
}

import helmet from 'helmet';
import { sql } from 'drizzle-orm';
import jobRoutes from './routes/jobs/index.js';
import contentRoutes from './routes/content.js';
import userRoutes, { seedUserProfilesFromDB } from './routes/users.js';
import socialRoutes from './routes/social.js';
import demoRoutes from './routes/demo.js';
import imageGenRoutes from './routes/imageGen.js';
import scheduledPostsRoutes from './routes/scheduledPosts.js';
import collectionsRoutes from './routes/collections.js';
import feedMonitorsRoutes from './routes/feedMonitors.js';
import { clerkMiddleware } from '@clerk/express';
import { authMiddleware } from './middleware/auth.js';
import { startWorker, stopWorker } from './workers/contentWorker.js';
import { startPublishWorker, stopPublishWorker } from './workers/publishWorker.js';
import { startFeedMonitorWorker, stopFeedMonitorWorker } from './workers/feedMonitorWorker.js';
import { closeBrowserPool, stopPngCacheSweep } from './lib/carousel.js';
import { demoJobRateLimit, sanitizeGenerationInput, contentRateLimit, imageRateLimit } from './middleware/rateLimit.js';

const app = express();
const PORT = parseInt(env.PORT, 10);

// WHY: IP-keyed rate limiters (demo limiter) read req.ip, which without this
// setting reflects the proxy's IP on Railway/Render/Fly.io, collapsing all
// traffic onto one bucket. `1` trusts exactly one hop (the platform's edge proxy).
app.set('trust proxy', 1);

// Security headers — helmet must come before cors and routes
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  ...(env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : []),
];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://*.clerk.accounts.dev',
        'https://*.clerk.com',
        'https://*.clerk.dev',
        'https://challenges.cloudflare.com',
        "'unsafe-inline'",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        'https://*.clerk.accounts.dev',
        'https://*.clerk.com',
        'https://*.clerk.dev',
        'https://app.posthog.com',
        'https://eu.posthog.com',
        ...allowedOrigins,
      ],
      frameSrc: [
        'https://accounts.google.com',
        'https://challenges.cloudflare.com',
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// Enforce X-Frame-Options: DENY explicitly
app.use(helmet.frameguard({ action: 'deny' }));

// CORS — allowlist replaces hardcoded dev-tunnel URL
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(clerkMiddleware({
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
}));

// Liveness check — process is up, no dependency checks. Safe for a fast/frequent probe.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness check — verifies the DB and Redis are actually reachable, each with
// its own timeout so a hung dependency can't hang this endpoint itself. Use this
// (not /api/health) for a load balancer's readiness probe, since /api/health
// returns 200 even when the DB or Redis is down.
async function pingWithTimeout(fn: () => Promise<void>, ms: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' };
  }
}

app.get('/api/ready', async (_req, res) => {
  const [dbCheck, redisCheck] = await Promise.all([
    pingWithTimeout(async () => {
      const { db } = await import('./db/index.js');
      if (!db) throw new Error('DATABASE_URL not configured');
      await db.execute(sql`select 1`);
    }, 3000),
    pingWithTimeout(async () => {
      const { getRedisClient } = await import('./lib/redisClient.js');
      const client = getRedisClient();
      if (!client) throw new Error('Redis not configured');
      await client.ping();
    }, 3000),
  ]);

  const ready = dbCheck.ok && redisCheck.ok;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks: { database: dbCheck, redis: redisCheck },
    timestamp: new Date().toISOString(),
  });
});

// Routes — all job routes go through authMiddleware.
// The SSE stream endpoint (/:jobId/stream) verifies
// their own Clerk JWT via the ?token= query param inside the route handler,
// so they do NOT need to bypass authMiddleware here. The previous bypass has
// been removed — every request to /api/jobs now passes through the middleware
// chain and the route handlers enforce auth themselves for unauthenticated-
// capable connections (EventSource).
app.use('/api/jobs', sanitizeGenerationInput, jobRoutes);
app.use('/api/content', authMiddleware, sanitizeGenerationInput, contentRateLimit, contentRoutes);
app.use('/api/users', authMiddleware, sanitizeGenerationInput, userRoutes);
app.use('/api/social', authMiddleware, socialRoutes);
app.use('/api/scheduled-posts', authMiddleware, scheduledPostsRoutes);
app.use('/api/collections', authMiddleware, collectionsRoutes);
app.use('/api/feed-monitors', authMiddleware, feedMonitorsRoutes);
app.use('/api/demo', demoJobRateLimit, sanitizeGenerationInput, demoRoutes);
app.use('/api/image', authMiddleware, sanitizeGenerationInput, imageRateLimit, imageGenRoutes);

// AUDIT FIX #7 — Sentry error handler must come before all other error handlers
if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Error handling
// WHY the ErrorRequestHandler type, not a plain 4-arg arrow function: Express
// dispatches error middleware by counting the handler's declared parameters
// (exactly 4 marks it as an error handler, not a route handler) — the `err`
// parameter must stay structurally `any` at the express.d.ts boundary for
// that arity check to work, which is why express's own ErrorRequestHandler
// type declares `err: any`. `unknownErr` immediately re-types it as `unknown`
// inside the body, so this file's own code never treats `err` as `any`.
const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
  const unknownErr: unknown = err;
  console.error('Unhandled error:', unknownErr);
  res.status(500).json({
    error: 'Internal server error',
    code: 'SERVER_ERROR',
    retryable: true,
  });
};
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  logger.info('ContentAgent API running', { port: PORT });

  // Pre-populate in-memory user profiles so brand voice is available immediately
  await seedUserProfilesFromDB();

  // Try to start the BullMQ worker
  try {
    startWorker();
  } catch (error) {
    logger.warn('BullMQ worker not started (Redis may not be available)');
    logger.warn('Jobs will run directly in the Express process');
  }

  // Try to start the scheduled-publish worker (Calendar auto-publish)
  try {
    startPublishWorker();
  } catch (error) {
    logger.warn('Publish worker not started (Redis may not be available) — scheduled posts will stay reminder-only');
  }

  // Start the RSS/feed monitor cron (no Redis dependency — uses node-cron)
  try {
    startFeedMonitorWorker();
  } catch (error) {
    logger.warn('Feed monitor worker not started — RSS monitoring will be unavailable');
  }
});

// Coordinated graceful shutdown — order matters: stop accepting new HTTP
// connections first, then let BullMQ finish/requeue its in-flight job, then
// close the Puppeteer pool, then exit. On Railway/Render/Fly/Docker/k8s, SIGTERM
// arrives before a hard kill; without this sequence an in-flight LLM pipeline
// job or HTTP request gets abruptly terminated instead of finishing or requeuing.
let _shuttingDown = false;
async function shutdown(signal: string) {
  if (_shuttingDown) return;
  _shuttingDown = true;
  logger.info('Signal received — starting graceful shutdown', { signal });

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 30_000);
  forceExit.unref();

  server.close(() => logger.info('HTTP server closed'));

  try {
    await stopWorker();
    logger.info('BullMQ worker closed');
  } catch (err) {
    console.error('Error closing BullMQ worker:', err);
  }

  try {
    await stopPublishWorker();
    logger.info('Publish worker closed');
  } catch (err) {
    console.error('Error closing publish worker:', err);
  }

  stopFeedMonitorWorker();

  try {
    await closeBrowserPool();
    logger.info('Browser pool closed');
  } catch (err) {
    console.error('Error closing browser pool:', err);
  }

  // WHY here even though the interval is unref()'d (so it wouldn't block exit on its
  // own): explicit cleanup during the coordinated shutdown sequence, consistent with
  // how the browser pool above is closed rather than left to the 'exit' handler.
  stopPngCacheSweep();

  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGTERM', () => { shutdown('SIGTERM').catch(() => process.exit(1)); });
process.on('SIGINT', () => { shutdown('SIGINT').catch(() => process.exit(1)); });

export default app;
