import { Router, Request, Response } from 'express';
import { generateWithAI } from '../lib/ai.js';
import { parseBody, demoSchema } from '../schemas/index.js';

const router = Router();

// POST /api/demo/generate — no auth required, returns a truncated sample
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const body = parseBody(demoSchema, req.body, res);
    if (!body) return;
    const { topic: topicTrimmed, platform } = body;

    const platformPrompts: Record<string, string> = {
      instagram_carousel: `Generate the FIRST 3 slides only of an Instagram carousel about "${topicTrimmed}" in JSON format:
[{ "slideNumber": 1, "headline": "...", "body": "..." }, { "slideNumber": 2, "headline": "...", "body": "..." }, { "slideNumber": 3, "headline": "...", "body": "..." }]
Slide 1 is a compelling hook. Body max 60 words per slide. Return ONLY the JSON array.`,

      linkedin_post: `Generate a SHORT LinkedIn post preview about "${topicTrimmed}" in JSON format:
{ "hook": "...", "body": "..." }
Hook: 1 attention-grabbing line. Body: 80 words max (cut off naturally — the full version will have more). Return ONLY the JSON.`,

      twitter_thread: `Generate the FIRST 3 tweets of a Twitter thread about "${topicTrimmed}" in JSON format:
{ "tweets": [{ "number": 1, "text": "..." }, { "number": 2, "text": "..." }, { "number": 3, "text": "..." }] }
Each tweet max 280 chars. Tweet 1 is a hook. Return ONLY the JSON.`,

      instagram_caption: `Generate a SHORT Instagram caption preview about "${topicTrimmed}" in JSON format:
{ "caption": "...", "hashtags": ["...", "...", "..."] }
Caption: 60 words max (natural cutoff). 3 sample hashtags only. Return ONLY the JSON.`,

      video_script: `Generate a SHORT video script hook + first segment about "${topicTrimmed}" in JSON format:
{ "hook": { "text": "...", "duration": "0-3s" }, "segments": [{ "number": 1, "script": "...", "duration": "10s" }] }
Hook: 1-2 punchy sentences. Segment: 50 words max. Return ONLY the JSON.`,
    };

    const result = await generateWithAI(
      platformPrompts[platform],
      'You are a social media content writer. Respond with valid JSON only. Keep it brief — this is a demo preview.'
    );

    let parsed: any;
    try {
      const jsonMatch = result.match(/[[{][\s\S]*[\]}]/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result);
    } catch {
      res.status(500).json({ error: 'Failed to generate demo content' });
      return;
    }

    res.json({ platform, topic: topicTrimmed, preview: parsed, truncated: true });
  } catch (error: any) {
    console.error('Demo generation failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Demo generation failed. Please try again.' });
  }
});

export default router;
