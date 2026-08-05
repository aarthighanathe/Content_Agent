import { Router } from 'express';
import brandVoiceRouter from './users/brandVoice.js';
import meRouter from './users/me.js';
import onboardingRouter from './users/onboarding.js';
import accountRouter from './users/account.js';

const router = Router();

// Mount sub-routers — order matters: specific paths before param-based paths
router.use('/', brandVoiceRouter);  // POST /brand-voice, POST /analyze-voice
router.use('/', meRouter);          // GET /me
router.use('/', onboardingRouter);  // GET /onboarding, POST /onboarding
router.use('/', accountRouter);     // GET /me/export, DELETE /me

export { userProfiles, getUserProfile, saveUserProfile, seedUserProfilesFromDB } from './users/profileStore.js';
export type { UserProfile } from './users/profileStore.js';
export default router;
