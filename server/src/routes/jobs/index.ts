import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../../middleware/auth.js';
import { authJobRateLimit } from '../../middleware/rateLimit.js';
import createRouter from './create.js';
import streamRouter from './stream.js';
import renderRouter from './render.js';
import manageRouter from './manage.js';

const router = Router();

// Protect all job routes except SSE streams (which verify their own auth via ?token=)
// SECURITY: '/render-slides/stream' was dropped from this list when that endpoint was
// removed — leaving it would keep an auth-bypass rule alive for a path that no longer
// exists, and any future route ending in it would silently inherit the exemption.
router.use(async (req: Request, res: Response, next) => {
  const openPaths = ['/stream'];
  if (openPaths.some((path) => req.path.endsWith(path) || req.path.includes(path))) {
    return next();
  }
  return authMiddleware(req as AuthRequest, res, next);
});

// SECURITY: authJobRateLimit must run AFTER authMiddleware resolves req.userId/
// req.dbUserId — mounted any earlier (e.g. at the app.use('/api/jobs', ...) call
// in index.ts) its keyGenerator would always fall back to IP-keying, silently
// turning the documented per-user cap into a per-IP one (shared-office users
// collide into one bucket; a user who rotates IP escapes their own cap).
router.use(authJobRateLimit);

// Mount sub-routers — order matters: specific paths before param-based paths
router.use('/', createRouter);    // POST /create, POST /batch
router.use('/', streamRouter);    // GET /:jobId/stream, POST /:jobId/stream-token
router.use('/', renderRouter);    // POST /:jobId/export/carousel-png
router.use('/', manageRouter);    // GET /, GET /:jobId, DELETE /:jobId, PATCH /:jobId/content, POST /:jobId/regenerate, POST /:jobId/multiply

export { jobsMemory } from './ownership.js';
export { runPipelineDirect } from './create.js';
export default router;
