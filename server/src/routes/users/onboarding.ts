import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { db } from '../../db/index.js';
import { userOnboarding } from '../../db/schema.js';
import { parseBody, onboardingSchema } from '../../schemas/index.js';
import { getUserProfile, saveUserProfile } from './profileStore.js';

const router = Router();

// GET /api/users/onboarding — returns whether onboarding has been completed
router.get('/onboarding', async (req: AuthRequest, res: Response) => {
  const userId = req.dbUserId || req.userId || '';
  if (!userId) { res.json({ completed: false }); return; }

  if (db) {
    try {
      const row = await db.query.userOnboarding.findFirst({
        where: (t, { eq: ueq }) => ueq(t.userId, userId),
      });
      res.json({ completed: row ? row.completed === 1 : false });
      return;
    } catch { /* fall through */ }
  }
  res.json({ completed: false });
});

// POST /api/users/onboarding — mark onboarding complete + optionally save brand name/tone
router.post('/onboarding', async (req: AuthRequest, res: Response) => {
  const userId = req.dbUserId || req.userId || '';
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const body = parseBody(onboardingSchema, req.body, res);
  if (!body) return;
  const { brandName, preferredTone } = body;

  if (db) {
    try {
      await db.insert(userOnboarding)
        .values({ userId, completed: 1, brandName: brandName || '', preferredTone: preferredTone || 'professional', completedAt: new Date() })
        .onConflictDoUpdate({
          target: userOnboarding.userId,
          set: { completed: 1, brandName: brandName || '', preferredTone: preferredTone || 'professional', completedAt: new Date() },
        });
    } catch (err) {
      console.error('[DB] Failed to save onboarding:', err);
    }
  }

  // Also persist brand name/tone to user profile if provided. Onboarding
  // completion itself (the userOnboarding row above) already succeeded or was
  // best-effort by design — this profile sync uses saveUserProfile so it
  // can't silently diverge from the DB the way the old write-first Map update
  // could.
  if (brandName || preferredTone) {
    const current = await getUserProfile(userId);
    const result = await saveUserProfile(userId, {
      brandName: brandName || current.brandName || '',
      brandVoice: preferredTone || current.brandVoice || 'professional',
    });
    if (!result.success) {
      res.status(500).json({ error: 'Onboarding saved, but brand voice could not be persisted — please set it again in Brand Settings', code: 'DB_WRITE_FAILED', retryable: true });
      return;
    }
  }

  res.json({ success: true });
});

export default router;
