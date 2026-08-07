import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { generateWithAI } from '../../lib/ai.js';
import { parseBody, brandVoiceSchema, analyzeVoiceSchema, contentDnaSchema } from '../../schemas/index.js';
import { getUserProfile, saveUserProfile } from './profileStore.js';
import { contentRateLimit } from '../../middleware/rateLimit.js';

const router = Router();

// POST /api/users/brand-voice
router.post('/brand-voice', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(brandVoiceSchema, req.body, res);
    if (!body) return;
    const { brandName, brandVoice, phrasesUse, phrasesAvoid, industry } = body;

    const userId = req.dbUserId || req.userId || 'demo';
    const current = await getUserProfile(userId);

    const result = await saveUserProfile(userId, {
      brandName: brandName ?? current.brandName ?? '',
      brandVoice: brandVoice ?? current.brandVoice ?? 'professional',
      phrasesUse: phrasesUse ?? current.phrasesUse ?? '',
      phrasesAvoid: phrasesAvoid ?? current.phrasesAvoid ?? '',
      industry: industry ?? current.industry ?? '',
    });

    if (!result.success) {
      res.status(500).json({ error: 'Failed to save brand voice — please try again', code: 'DB_WRITE_FAILED', retryable: true });
      return;
    }

    res.json({ success: true, profile: result.profile });
    return;
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand voice', code: 'SERVER_ERROR', retryable: true });
    return;
  }
});

// POST /api/users/analyze-voice — extract Content DNA fingerprint from sample posts
// WHY rate-limited: calls generateWithAI (Gemini) which burns real API quota. Without
// rate limiting, a user could script repeated calls and incur unbounded costs, unlike
// /ideate or /hashtags which are covered by contentRateLimit. This endpoint has the
// same external-LLM-call profile and needs the same protection.
router.post('/analyze-voice', contentRateLimit, async (req: AuthRequest, res: Response) => {
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

    let contentDna;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const raw: unknown = JSON.parse(jsonMatch ? jsonMatch[0] : result);
      contentDna = contentDnaSchema.parse(raw);
    } catch {
      res.status(500).json({ error: 'Failed to parse style analysis' });
      return;
    }

    // Save to user profile
    // WHY persist here, not just in-memory: contentDna was previously held only
    // in the userProfiles Map, so it silently reverted to "not set up" on any
    // server restart or (in a multi-instance deployment) a request landing on a
    // different instance (FUNCTIONAL_AUDIT_2026-07.md finding #9). saveUserProfile
    // now additionally guarantees the Map is never updated unless the DB write it
    // just attempted actually succeeded (see saveUserProfile's cache-aside note).
    const userId = req.dbUserId || req.userId || 'demo';
    const saveResult = await saveUserProfile(userId, { contentDna });

    if (!saveResult.success) {
      res.status(500).json({ error: 'Style analysis succeeded but could not be saved — please try again', code: 'DB_WRITE_FAILED', retryable: true });
      return;
    }

    res.json({ success: true, contentDna });
    return;
  } catch (error: unknown) {
    console.error('Failed to analyze voice:', error);
    res.status(500).json({ error: 'Failed to analyze writing style' });
    return;
  }
});

export default router;
