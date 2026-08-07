import { Router } from 'express';
import ideateRouter from './content/ideate.js';
import hashtagsRouter from './content/hashtags.js';
import repurposeRouter from './content/repurpose.js';
import competitorRouter from './content/competitor.js';

const router = Router();

// Mount sub-routers — order matters: specific paths before param-based paths
router.use('/', ideateRouter);      // POST /ideate
router.use('/', hashtagsRouter);    // POST /hashtags
router.use('/', repurposeRouter);   // POST /repurpose
router.use('/', competitorRouter);  // POST /competitor

export default router;
