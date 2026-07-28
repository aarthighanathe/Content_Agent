import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { jobsMemory } from './jobs/index.js';
import { generateWithAI } from '../lib/ai.js';
import { db } from '../db/index.js';
import {
  users,
  userOnboarding,
  contentJobs,
  contentOutputs,
  agentLogs,
  templates,
  socialTokens,
} from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { parseBody, brandVoiceSchema, analyzeVoiceSchema, onboardingSchema } from '../schemas/index.js';
import { logger } from '../lib/logger.js';

const router = Router();

// User profile store (in-memory) — exported so other routes can read brand voice settings
export const userProfiles = new Map<string, any>();

// POST /api/users/brand-voice
router.post('/brand-voice', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(brandVoiceSchema, req.body, res);
    if (!body) return;
    const { brandName, brandVoice, phrasesUse, phrasesAvoid, industry } = body;

    const userId = req.dbUserId || req.userId || 'demo';
    const profile = userProfiles.get(userId) || {};

    const updatedProfile = {
      ...profile,
      brandName: brandName ?? profile.brandName ?? '',
      brandVoice: brandVoice ?? profile.brandVoice ?? 'professional',
      phrasesUse: phrasesUse ?? profile.phrasesUse ?? '',
      phrasesAvoid: phrasesAvoid ?? profile.phrasesAvoid ?? '',
      industry: industry ?? profile.industry ?? '',
      updatedAt: new Date().toISOString(),
    };

    userProfiles.set(userId, updatedProfile);

    // Persist to DB
    if (db && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      try {
        await db.update(users)
          .set({
            brandName: updatedProfile.brandName,
            brandVoice: updatedProfile.brandVoice,
            phrasesUse: updatedProfile.phrasesUse,
            phrasesAvoid: updatedProfile.phrasesAvoid,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      } catch (dbErr) {
        console.error('[DB] Failed to update brand voice:', dbErr);
      }
    }

    res.json({ success: true, profile: updatedProfile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand voice', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /api/users/analyze-voice — extract Content DNA fingerprint from sample posts
router.post('/analyze-voice', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(analyzeVoiceSchema, req.body, res);
    if (!body) return;
    const { samples } = body;

    const prompt = `You are a writing style analyst. Analyze these social media posts and extract a precise style fingerprint.

Sample posts:
${samples}

Extract the writing style and return ONLY this JSON (no markdown, no extra text):
{
  "avgSentenceWords": <number: average words per sentence, e.g. 12>,
  "hookPattern": "<pattern name, e.g. 'Question hook', 'Bold claim', 'Data-led', 'Story opening', 'Contrarian'>",
  "emojiFrequency": "<'None' | 'Sparse (1-2)' | 'Moderate (3-5)' | 'Heavy (6+)'>",
  "ctaStyle": "<e.g. 'Direct question', 'Save this post', 'Follow for more', 'Tag a friend', 'Comment below'>",
  "structuralSignature": "<e.g. 'Lists and bullets', 'Short punchy paragraphs', 'Long-form paragraphs', 'Numbered steps'>",
  "vocabularyLevel": "<'Simple & conversational' | 'Professional & formal' | 'Technical & jargon-heavy' | 'Mixed'>",
  "writingPersonality": "<one sentence describing the distinct voice pattern>",
  "keyPhrasePatterns": ["<phrase pattern 1>", "<phrase pattern 2>", "<phrase pattern 3>"]
}`;

    const result = await generateWithAI(prompt, 'You are a writing style analyst. Always respond with valid JSON only.');

    let contentDna: any;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      contentDna = JSON.parse(jsonMatch ? jsonMatch[0] : result);
    } catch {
      res.status(500).json({ error: 'Failed to parse style analysis' });
      return;
    }

    // Save to user profile
    const userId = req.dbUserId || req.userId || 'demo';
    const profile = userProfiles.get(userId) || {};
    userProfiles.set(userId, { ...profile, contentDna, updatedAt: new Date().toISOString() });

    // WHY persist here, not just in-memory: contentDna was previously held only
    // in the userProfiles Map, so it silently reverted to "not set up" on any
    // server restart or (in a multi-instance deployment) a request landing on a
    // different instance (FUNCTIONAL_AUDIT_2026-07.md finding #9).
    if (db && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      try {
        await db.update(users).set({ contentDna, updatedAt: new Date() }).where(eq(users.id, userId));
      } catch (dbErr) {
        console.error('[DB] Failed to persist content DNA:', dbErr);
      }
    }

    res.json({ success: true, contentDna });
  } catch (error: any) {
    console.error('Failed to analyze voice:', error);
    res.status(500).json({ error: 'Failed to analyze writing style' });
  }
});

// GET /api/users/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUserId || req.userId || 'demo';

    // Load profile from DB if not in memory
    let profile = userProfiles.get(userId);
    if (!profile && db && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      try {
        const dbUser = await db.query.users.findFirst({ where: (u, { eq: ueq }) => ueq(u.id, userId) });
        if (dbUser) {
          profile = {
            brandName: dbUser.brandName || '',
            brandVoice: dbUser.brandVoice || 'professional',
            phrasesUse: dbUser.phrasesUse || '',
            phrasesAvoid: dbUser.phrasesAvoid || '',
            industry: '',
            contentDna: dbUser.contentDna || undefined,
          };
          userProfiles.set(userId, profile);
        }
      } catch (dbErr) {
        console.error('[DB] Failed to load user profile:', dbErr);
      }
    }
    profile = profile || {
      brandName: '',
      brandVoice: 'professional',
      phrasesUse: '',
      phrasesAvoid: '',
      industry: '',
    };

    // WHY: stats are read from DB rather than jobsMemory — completed jobs are evicted
    // from memory after 10 min, so jobsMemory is always empty for aged-out jobs.
    let totalPosts = 0;
    let avgScore = 0;
    let bestPlatform = 'none';
    let platformBreakdown: Array<{ platform: string; avgScore: number; count: number }> = [];

    if (db && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      try {
        const completedJobs = await db.query.contentJobs.findMany({
          where: (j, { eq: jeq, and: jand }) =>
            jand(jeq(j.userId, userId), jeq(j.deleted, 0), jeq(j.status, 'done')),
          columns: { id: true, platform: true },
          with: {
            outputs: {
              columns: { outputType: true, qualityScore: true, content: true },
            },
          },
        });

        totalPosts = completedJobs.length;

        const platformCounts: Record<string, number> = {};
        const platformStats: Record<string, { totalScore: number; count: number }> = {};
        const allScores: number[] = [];

        for (const job of completedJobs) {
          platformCounts[job.platform] = (platformCounts[job.platform] || 0) + 1;
          if (!platformStats[job.platform]) platformStats[job.platform] = { totalScore: 0, count: 0 };

          const critique = job.outputs.find((o) => o.outputType === 'critique');
          let score = 0;
          if (critique) {
            if (typeof critique.qualityScore === 'number' && critique.qualityScore > 0) {
              score = critique.qualityScore;
            } else {
              const c = critique.content;
              if (c !== null && typeof c === 'object' && 'totalScore' in c) {
                const ts = (c as Record<string, unknown>).totalScore;
                score = typeof ts === 'number' ? ts : 0;
              }
            }
          }
          if (score > 0) {
            allScores.push(score);
            platformStats[job.platform].totalScore += score;
            platformStats[job.platform].count += 1;
          }
        }

        avgScore = allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : 0;
        bestPlatform =
          Object.entries(platformCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
        platformBreakdown = Object.entries(platformStats)
          .map(([platform, data]) => ({
            platform,
            avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
            count: platformCounts[platform] || 0,
          }))
          .sort((a, b) => b.count - a.count);
      } catch (dbErr) {
        console.error('[DB] Failed to compute stats:', dbErr);
      }
    } else {
      // Fallback: jobsMemory when DB is unavailable or userId is not a UUID (e.g. demo)
      const allJobs = Array.from(jobsMemory.values()).filter(
        (j) => j.deleted !== 1 && j.userId === userId
      );
      const completedJobs = allJobs.filter((j) => j.status === 'done');
      totalPosts = completedJobs.length;

      const platformCounts: Record<string, number> = {};
      const platformStats: Record<string, { totalScore: number; count: number }> = {};
    
      const allScores: number[] = [];
      completedJobs.forEach((j) => {
        platformCounts[j.platform] = (platformCounts[j.platform] || 0) + 1;
        if (!platformStats[j.platform]) platformStats[j.platform] = { totalScore: 0, count: 0 };
        const critic = j.outputs?.find((o: any) => o.outputType === 'critique');
        const score: number = critic?.qualityScore || critic?.content?.totalScore || 0;
        if (score > 0) {
          allScores.push(score);
          platformStats[j.platform].totalScore += score;
          platformStats[j.platform].count += 1;
        }
      });

      avgScore = allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;
      bestPlatform =
        Object.entries(platformCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
      platformBreakdown = Object.entries(platformStats)
        .map(([platform, data]) => ({
          platform,
          avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
          count: platformCounts[platform] || 0,
        }))
        .sort((a, b) => b.count - a.count);
    }

    // Generate dynamic quick tips
    const quickTips: string[] = [];
    if (!profile.brandVoice || profile.brandVoice === 'professional') {
      quickTips.push('Setting up Brand Settings will improve voice consistency across generations.');
    }
    if (totalPosts === 0) {
      quickTips.push('Try a LinkedIn Post next — it takes under 30 seconds to set up.');
    } else {
      quickTips.push('Add a hook in your first slide or sentence to boost engagement by up to 3×.');
    }
    if (bestPlatform.includes('instagram')) {
      quickTips.push('Your Instagram content is performing well! Keep focusing on visual hooks.');
    } else if (bestPlatform.includes('linkedin')) {
      quickTips.push('LinkedIn audiences love actionable takeaways. Keep delivering high value.');
    } else if (bestPlatform.includes('twitter')) {
      quickTips.push('For Twitter threads, try asking a question in the last tweet to drive replies.');
    }
    
    // Fallback tips if we don't have 3
    if (quickTips.length < 3) quickTips.push('Experiment with different tones (e.g., Witty or Casual) to see what resonates.');
    if (quickTips.length < 3) quickTips.push('Review the Critic agent feedback to understand how to improve your prompts.');

    res.json({
      ...profile,
      stats: {
        totalPosts,
        avgScore,
        bestPlatform,
        platformBreakdown,
        quickTips: quickTips.slice(0, 3),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', code: 'SERVER_ERROR', retryable: true });
  }
});

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

  // Also persist brand name/tone to user profile if provided
  if (brandName || preferredTone) {
    const profile = userProfiles.get(userId) || {};
    userProfiles.set(userId, {
      ...profile,
      brandName: brandName || profile.brandName || '',
      brandVoice: preferredTone || profile.brandVoice || 'professional',
    });
    if (db && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      try {
        await db.update(users).set({ brandName: brandName || undefined, brandVoice: preferredTone || undefined, updatedAt: new Date() }).where(eq(users.id, userId));
      } catch { /* non-critical */ }
    }
  }

  res.json({ success: true });
});

// GET /api/users/me/export — full data export (GDPR-style "download my data")
router.get('/me/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUserId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false });
      return;
    }
    if (!db) {
      res.status(503).json({ error: 'Export unavailable — database not configured', code: 'SERVICE_UNAVAILABLE', retryable: true });
      return;
    }

    const [user, jobs, userTemplates, tokens, onboarding] = await Promise.all([
      db.query.users.findFirst({ where: (u, { eq: ueq }) => ueq(u.id, userId) }),
      db.query.contentJobs.findMany({
        where: (j, { eq: jeq }) => jeq(j.userId, userId),
        with: { outputs: true, logs: true },
      }),
      db.select().from(templates).where(eq(templates.userId, userId)),
      // SECURITY: access/refresh tokens are encrypted at rest and excluded from the
      // export — only metadata about which platforms are connected is included.
      db.select({
        id: socialTokens.id,
        platform: socialTokens.platform,
        displayName: socialTokens.displayName,
        createdAt: socialTokens.createdAt,
      }).from(socialTokens).where(eq(socialTokens.userId, userId)),
      db.query.userOnboarding.findFirst({ where: (t, { eq: teq }) => teq(t.userId, userId) }),
    ]);

    res.setHeader('Content-Disposition', `attachment; filename="contentagent-export-${userId}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.email,
        brandName: user.brandName,
        brandVoice: user.brandVoice,
        phrasesUse: user.phrasesUse,
        phrasesAvoid: user.phrasesAvoid,
        createdAt: user.createdAt,
      } : null,
      contentJobs: jobs,
      templates: userTemplates,
      connectedSocialAccounts: tokens,
      onboarding: onboarding || null,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'GET /me/export' } });
    res.status(500).json({ error: 'Failed to export data', code: 'SERVER_ERROR', retryable: true });
  }
});

// DELETE /api/users/me — permanently delete the account and all associated data
router.delete('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUserId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false });
      return;
    }
    if (!db) {
      res.status(503).json({ error: 'Account deletion unavailable — database not configured', code: 'SERVICE_UNAVAILABLE', retryable: true });
      return;
    }

    // WHY: wrap every table's deletion in one transaction — a partial failure
    // (e.g. jobs deleted but outputs/logs left behind due to a mid-way error)
    // would orphan rows referencing a userId that no longer exists.
    await db.transaction(async (tx) => {
      const jobRows = await tx.select({ id: contentJobs.id }).from(contentJobs).where(eq(contentJobs.userId, userId));
      const jobIds = jobRows.map((j) => j.id);

      if (jobIds.length > 0) {
        await tx.delete(agentLogs).where(inArray(agentLogs.jobId, jobIds));
        await tx.delete(contentOutputs).where(inArray(contentOutputs.jobId, jobIds));
        await tx.delete(contentJobs).where(eq(contentJobs.userId, userId));
      }

      await tx.delete(templates).where(eq(templates.userId, userId));
      await tx.delete(socialTokens).where(eq(socialTokens.userId, userId));
      await tx.delete(userOnboarding).where(eq(userOnboarding.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    // Clear in-memory state so a re-signup with the same Clerk identity
    // doesn't inherit stale brand-voice data from before the deletion.
    userProfiles.delete(userId);
    for (const [jobId, job] of jobsMemory.entries()) {
      if (job.userId === userId) jobsMemory.delete(jobId);
    }

    res.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: 'DELETE /me' } });
    res.status(500).json({ error: 'Failed to delete account', code: 'SERVER_ERROR', retryable: true });
  }
});

export async function seedUserProfilesFromDB(): Promise<void> {
  if (!db) return;
  try {
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      userProfiles.set(user.id, {
        brandName:    user.brandName    || '',
        brandVoice:   user.brandVoice   || 'professional',
        phrasesUse:   user.phrasesUse   || '',
        phrasesAvoid: user.phrasesAvoid || '',
        industry:     '',
        contentDna:   user.contentDna   || undefined,
      });
    }
    logger.info('[users] Seeded user profiles from DB', { count: allUsers.length });
  } catch (err) {
    console.warn('[users] Could not seed profiles from DB:', err);
  }
}

export default router;
