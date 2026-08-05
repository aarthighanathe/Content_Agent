import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { generateWithAI } from '../../lib/ai.js';
import { parseBody, hashtagsSchema, hashtagsResponseSchema } from '../../schemas/index.js';
import { parseAIJson } from './shared.js';

const router = Router();

// POST /api/content/hashtags — research hashtags for a topic/platform
router.post('/hashtags', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(hashtagsSchema, req.body, res);
    if (!body) return;
    const { topic, platform, content } = body;

    const platformLabel = platform?.replace(/_/g, ' ') || 'social media';
    const contentSnippet = content
      ? (typeof content === 'string' ? content.slice(0, 300) : JSON.stringify(content).slice(0, 300))
      : '';

    const prompt = `You are a social media hashtag strategist. Generate the best hashtag strategy for:
<topic>${topic}</topic>
<platform>${platformLabel}</platform>
${contentSnippet ? `<content_preview>${contentSnippet}</content_preview>` : ''}

Create three tiers:
1. Broad hashtags (high-volume, general audience)
2. Niche hashtags (targeted audience, better engagement rate)
3. Branded/unique hashtags (original for this brand/topic)

Return ONLY this JSON (no markdown):
{
  "broad": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "niche": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7"],
  "branded": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "strategy": "<2-sentence explanation of the best way to mix these tiers>",
  "reachTier": "large | medium | niche"
}`;

    const result = await generateWithAI(prompt, 'You are a hashtag research specialist. Respond with valid JSON only.');

    const parsed = parseAIJson(hashtagsResponseSchema, result);
    if (!parsed) {
      res.status(500).json({ error: 'Failed to parse hashtags' });
      return;
    }

    res.json(parsed);
  } catch (error: unknown) {
    console.error('Hashtag research failed:', error);
    Sentry.captureException(error, { tags: { route: 'POST /hashtags' } });
    res.status(500).json({ error: 'Failed to research hashtags' });
  }
});

export default router;
