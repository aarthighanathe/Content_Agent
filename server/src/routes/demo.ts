import { Router, Request, Response } from 'express';
import type { z } from 'zod';
import { generateWithAI } from '../lib/ai.js';
import { parseBody, demoSchema } from '../schemas/index.js';
import type { platformEnum } from '../schemas/jobs.js';

const router = Router();

// POST /api/demo/generate — no auth required, returns a truncated sample
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const body = parseBody(demoSchema, req.body, res);
    if (!body) return;
    const { topic: topicTrimmed, platform } = body;

    // WHY typed against the enum, not Record<string, string>: this only has
    // meaningful entries for the current 5 platforms today, but nothing would
    // catch drift if VALID_PLATFORMS grows — typing the key set against the
    // enum makes TypeScript itself enforce every platform has a demo prompt.
    const platformPrompts: Record<z.infer<typeof platformEnum>, string> = {
      instagram_carousel: `Generate the FIRST 3 slides only of an Instagram carousel about <topic>${topicTrimmed}</topic> in JSON format:
[{ "slideNumber": 1, "headline": "...", "body": "..." }, { "slideNumber": 2, "headline": "...", "body": "..." }, { "slideNumber": 3, "headline": "...", "body": "..." }]
Slide 1 is a compelling hook. Body max 60 words per slide. Return ONLY the JSON array.`,

      linkedin_post: `Generate a SHORT LinkedIn post preview about <topic>${topicTrimmed}</topic> in JSON format:
{ "hook": "...", "body": "..." }
Hook: 1 attention-grabbing line. Body: 80 words max (cut off naturally — the full version will have more). Return ONLY the JSON.`,

      twitter_thread: `Generate the FIRST 3 tweets of a Twitter thread about <topic>${topicTrimmed}</topic> in JSON format:
{ "tweets": [{ "number": 1, "text": "..." }, { "number": 2, "text": "..." }, { "number": 3, "text": "..." }] }
Each tweet max 280 chars. Tweet 1 is a hook. Return ONLY the JSON.`,

      instagram_caption: `Generate a SHORT Instagram caption preview about <topic>${topicTrimmed}</topic> in JSON format:
{ "caption": "...", "hashtags": ["...", "...", "..."] }
Caption: 60 words max (natural cutoff). 3 sample hashtags only. Return ONLY the JSON.`,

      video_script: `Generate a SHORT video script hook + first segment about <topic>${topicTrimmed}</topic> in JSON format:
{ "hook": { "text": "...", "duration": "0-3s" }, "segments": [{ "number": 1, "script": "...", "duration": "10s" }] }
Hook: 1-2 punchy sentences. Segment: 50 words max. Return ONLY the JSON.`,
    };

    const result = await generateWithAI(
      platformPrompts[platform],
      'You are a social media content writer. Respond with valid JSON only. Keep it brief — this is a demo preview.'
    );

    // WHY unknown, not a Zod schema like the other LLM-JSON boundaries in this
    // codebase: this route never reads a field off `parsed` server-side — it's
    // parsed only to confirm valid JSON, then forwarded to the client opaquely
    // as `preview`. A schema would just be dead validation code for a value
    // this route doesn't interpret; unknown is the honest type for "valid JSON,
    // shape decided entirely by the platform-specific prompt above."
    let parsed: unknown;
    try {
      const jsonMatch = result.match(/[[{][\s\S]*[\]}]/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result);
    } catch {
      res.status(500).json({ error: 'Failed to generate demo content', code: 'AI_PARSE_ERROR', retryable: true });
      return;
    }

    // SECURITY: enforce server-side truncation to prevent full LLM output exposure
    // The prompts ask for limited content, but we enforce caps here as a safety net
    if (platform === 'instagram_carousel' && Array.isArray(parsed)) {
      // Cap at 3 slides, 60 words per slide body
      parsed = parsed.slice(0, 3).map((slide: unknown) => {
        if (!slide || typeof slide !== 'object') return slide;
        const s = slide as Record<string, unknown>;
        const body = typeof s.body === 'string' ? s.body.split(/\s+/).slice(0, 60).join(' ') : s.body;
        return { ...s, body };
      });
    } else if (platform === 'twitter_thread' && parsed && typeof parsed === 'object' && 'tweets' in parsed && Array.isArray((parsed as Record<string, unknown>).tweets)) {
      // Cap at 3 tweets, 280 chars each
      const p = parsed as Record<string, unknown>;
      const tweets = p.tweets as unknown[];
      parsed = {
        ...p,
        tweets: tweets.slice(0, 3).map((tweet: unknown) => {
          if (!tweet || typeof tweet !== 'object') return tweet;
          const t = tweet as Record<string, unknown>;
          const text = typeof t.text === 'string' ? t.text.slice(0, 280) : t.text;
          return { ...t, text };
        }),
      };
    } else if (platform === 'linkedin_post' && parsed && typeof parsed === 'object' && 'body' in parsed) {
      // Cap body at 80 words
      const p = parsed as Record<string, unknown>;
      const words = typeof p.body === 'string' ? p.body.split(/\s+/) : [];
      parsed = {
        ...p,
        body: words.slice(0, 80).join(' '),
      };
    } else if (platform === 'instagram_caption' && parsed && typeof parsed === 'object' && 'caption' in parsed) {
      // Cap caption at 60 words
      const p = parsed as Record<string, unknown>;
      const words = typeof p.caption === 'string' ? p.caption.split(/\s+/) : [];
      parsed = {
        ...p,
        caption: words.slice(0, 60).join(' '),
        hashtags: Array.isArray(p.hashtags) ? p.hashtags.slice(0, 3) : p.hashtags,
      };
    } else if (platform === 'video_script' && parsed && typeof parsed === 'object' && 'segments' in parsed && Array.isArray((parsed as Record<string, unknown>).segments)) {
      // Cap at 1 segment, 50 words
      const p = parsed as Record<string, unknown>;
      const segments = p.segments as unknown[];
      parsed = {
        ...p,
        segments: segments.slice(0, 1).map((seg: unknown) => {
          if (!seg || typeof seg !== 'object') return seg;
          const sg = seg as Record<string, unknown>;
          const script = typeof sg.script === 'string' ? sg.script.split(/\s+/).slice(0, 50).join(' ') : sg.script;
          return { ...sg, script };
        }),
      };
    }

    res.json({ platform, topic: topicTrimmed, preview: parsed, truncated: true });
    return;
  } catch (error: unknown) {
    console.error('Demo generation failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Demo generation failed. Please try again.', code: 'SERVER_ERROR', retryable: true });
    return;
  }
});

export default router;
