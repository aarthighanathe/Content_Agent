import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../../middleware/auth.js';
import { authJobRateLimit } from '../../middleware/rateLimit.js';
import createRouter from './create.js';
import streamRouter from './stream.js';
import renderRouter from './render.js';
import insightsRouter from './insights.js';
import versionsRouter from './versions.js';
import listRouter from './list.js';
import manageRouter from './manage.js';

const router = Router();

// Protect all job routes except SSE streams (which verify their own auth via ?token=)
// SECURITY: '/render-slides/stream' was dropped from this list when that endpoint was
// removed — leaving it would keep an auth-bypass rule alive for a path that no longer
// exists, and any future route ending in it would silently inherit the exemption.
//
// SECURITY: this must match the exact SSE stream path only, never by substring —
// a bare `.includes('/stream')` also matches `/stream-token`, which exempted the
// token-minting route from authMiddleware and silently broke SSE auth for every
// user (see CHANGELOG). `/^\/[^/]+\/stream$/` anchors to "jobId segment, then
// literally /stream, then end of string", so it cannot accidentally match any
// future route that merely contains "/stream" as part of a longer path segment.
const SSE_STREAM_PATH = /^\/[^/]+\/stream$/;
router.use(async (req: Request, res: Response, next) => {
  if (SSE_STREAM_PATH.test(req.path)) {
    return next();
  }
  return authMiddleware(req as AuthRequest, res, next);
});

// SECURITY: authJobRateLimit must run AFTER authMiddleware resolves req.userId/
// req.dbUserId — mounted any earlier (e.g. at the app.use('/api/jobs', ...) call
// in index.ts) its keyGenerator would always fall back to IP-keying, silently
// turning the documented per-user cap into a per-IP one (shared-office users
// collide into one bucket; a user who rotates IP escapes their own cap).
//
// SECURITY: POST /:jobId/stream-token must be exempted from rate limiting —
// SSE reconnects during a generation should not consume the user's hourly
// job-creation budget. The stream endpoint itself is already exempted via
// SSE_STREAM_PATH; this exemption covers the token-minting endpoint.
const STREAM_TOKEN_PATH = /^\/[^/]+\/stream-token$/;
router.use((req: Request, res: Response, next) => {
  if (STREAM_TOKEN_PATH.test(req.path)) {
    return next();
  }
  // WHY run the array's handlers manually instead of `router.use(...authJobRateLimit)`:
  // that would apply the limiter to every path unconditionally — the stream-token
  // exemption above needs to short-circuit before the limiter chain runs at all,
  // so the two middlewares in the array are invoked in sequence here, with each
  // one's `next` chaining to the next entry (or to the outer `next` on the last).
  const [failClosed, limiter] = authJobRateLimit;
  return failClosed(req, res, (err?: unknown) => {
    if (err) return next(err);
    return limiter(req, res, next);
  });
});

// Mount sub-routers — order matters: specific paths before param-based paths
router.use('/', createRouter);    // POST /create, POST /batch
router.use('/', streamRouter);    // GET /:jobId/stream, POST /:jobId/stream-token
router.use('/', renderRouter);    // POST /:jobId/export/carousel-png
router.use('/', insightsRouter);  // GET /audience-defaults — must precede manageRouter's GET /:jobId
router.use('/', versionsRouter);  // GET /:jobId/versions, POST /:jobId/versions/:versionId/restore
router.use('/', listRouter);      // GET / — paginated, searchable, filterable, sortable job list
router.use('/', manageRouter);    // GET /:jobId, DELETE /:jobId, PATCH /:jobId/content, POST /:jobId/regenerate, POST /:jobId/multiply

export { jobsMemory } from './ownership.js';
export { runPipelineDirect } from './create.js';
export default router;
