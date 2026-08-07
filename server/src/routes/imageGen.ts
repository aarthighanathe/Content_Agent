import { Router, Response, NextFunction } from 'express';
import { parseBody, imageGenSchema } from '../schemas/index.js';
import { env } from '../config.js';
import { logger } from '../lib/logger.js';

// WHY these interfaces: each covers only the fields this route actually reads off
// the corresponding provider's JSON response, matching the same "type what you
// use" scope as routes/social.ts's OAuth response types.
interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
}
// WHY shared, not per-provider: OpenAI and Gemini's error envelopes both use
// this exact { error: { message } } shape — a shared type here avoids two
// identical interfaces.
interface ProviderErrorResponse {
  error?: { message?: string };
}
interface TogetherImageResponse {
  data?: Array<{ b64_json?: string }>;
}
interface GeminiImagePart {
  inlineData?: { data?: string; mimeType?: string };
}
interface GeminiImageResponse {
  candidates?: Array<{ content?: { parts?: GeminiImagePart[] } }>;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const router = Router();

router.post('/generate', async (req, res: Response, next: NextFunction) => {
  // WHY the whole handler wrapped in try/catch, not relying solely on each
  // provider block's own try/catch: every fetch block below already self-
  // catches, so no provider exception can escape today — but that only holds
  // as long as every one of the 5 blocks stays correctly wrapped forever. This
  // outer boundary is defense-in-depth so a future edit that adds code between/
  // after the provider blocks without its own try/catch doesn't throw unhandled.
  try {
    const body = parseBody(imageGenSchema, req.body, res);
    if (!body) return;
    const { prompt, mode } = body;

    const openaiKey   = env.OPENAI_API_KEY;
    const togetherKey = env.TOGETHER_API_KEY;
    const geminiKey   = env.GEMINI_API_KEY;
    const isFullSlide = mode === 'full_slide';

    const enhanced = isFullSlide
      ? `${prompt.trim()} Flat graphic design. Every word must be in English. All text must be sharp, crisp, and fully legible. No human faces. No people.`
      : `Professional abstract social media background. Absolutely no text, no words, no letters, no numbers anywhere. Clean minimal composition. No human faces. ${prompt.trim()}`;

    // ── Attempt 1: OpenAI gpt-image-1 (newest, b64_json) ─────────────────────────
    if (openaiKey) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 90_000);
        const r = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: enhanced,
            size: '1024x1024',
            quality: 'medium',
            n: 1,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json() as OpenAIImageResponse;
          const b64 = data.data?.[0]?.b64_json;
          if (b64) {
            logger.info('[imageGen] gpt-image-1 succeeded');
            return res.json({ image: `data:image/png;base64,${b64}`, source: 'gpt-image-1' });
          }
        } else {
          const err = await r.json().catch(() => ({})) as ProviderErrorResponse;
          console.warn('[imageGen] gpt-image-1 non-ok:', r.status, err.error?.message?.slice(0, 120));
        }
      } catch (e: unknown) {
        console.warn('[imageGen] gpt-image-1 error:', errorMessage(e).slice(0, 120));
      }
    }

    // ── Attempt 2: OpenAI DALL-E 3 (URL → download) ──────────────────────────────
    if (openaiKey) {
      try {
        const genCtrl = new AbortController();
        const genTimer = setTimeout(() => genCtrl.abort(), 60_000);
        const r = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: enhanced,
            size: '1024x1024',
            quality: 'standard',
            n: 1,
          }),
          signal: genCtrl.signal,
        });
        clearTimeout(genTimer);
        if (r.ok) {
          const data = await r.json() as OpenAIImageResponse;
          const imageUrl: string | undefined = data.data?.[0]?.url;
          if (imageUrl) {
            const dlCtrl = new AbortController();
            const dlTimer = setTimeout(() => dlCtrl.abort(), 30_000);
            const dl = await fetch(imageUrl, { signal: dlCtrl.signal });
            clearTimeout(dlTimer);
            const contentType = dl.headers.get('content-type') || 'image/png';
            const buffer = await dl.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            logger.info('[imageGen] DALL-E 3 succeeded');
            return res.json({ image: `data:${contentType};base64,${base64}`, source: 'dalle3' });
          }
        } else {
          const err = await r.json().catch(() => ({})) as ProviderErrorResponse;
          console.warn('[imageGen] DALL-E 3 non-ok:', r.status, err.error?.message?.slice(0, 120));
        }
      } catch (e: unknown) {
        console.warn('[imageGen] DALL-E 3 error:', errorMessage(e).slice(0, 120));
      }
    }

    // ── Attempt 3: Together AI FLUX.1-schnell-Free ───────────────────────────────
    if (togetherKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60_000);
        const r = await fetch('https://api.together.xyz/v1/images/generations', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${togetherKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'black-forest-labs/FLUX.1-schnell-Free',
            prompt: enhanced,
            width: 1024, height: 1024, steps: 4, n: 1,
            response_format: 'b64_json',
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json() as TogetherImageResponse;
          const b64 = data.data?.[0]?.b64_json;
          if (b64) {
            logger.info('[imageGen] Together AI FLUX succeeded');
            return res.json({ image: `data:image/jpeg;base64,${b64}`, source: 'together' });
          }
        } else {
          console.warn('[imageGen] Together AI non-ok:', r.status);
        }
      } catch (e: unknown) {
        console.warn('[imageGen] Together AI error:', errorMessage(e).slice(0, 120));
      }
    }

    // ── Attempt 4: Gemini image generation (direct REST, bypasses SDK model mangling) ─
    if (geminiKey) {
      for (const modelId of [
        'gemini-2.0-flash-preview-image-generation',
        'gemini-2.0-flash-exp-image-generation',
      ]) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 60_000);
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey,
              },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: enhanced }] }],
                generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
              }),
              signal: ctrl.signal,
            },
          );
          clearTimeout(timer);
          if (r.ok) {
            const data = await r.json() as GeminiImageResponse;
            const parts = data.candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                logger.info('[imageGen] Gemini model succeeded', { modelId });
                return res.json({
                  image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                  source: 'gemini',
                });
              }
            }
          } else {
            const err = await r.json().catch(() => ({})) as ProviderErrorResponse;
            console.warn(`[imageGen] Gemini ${modelId} non-ok:`, r.status, err.error?.message?.slice(0, 100));
          }
        } catch (e: unknown) {
          console.warn(`[imageGen] Gemini ${modelId} error:`, errorMessage(e).slice(0, 120));
        }
      }
    }

    // ── Attempt 5: Pollinations.AI (no key, last resort) ────────────────────────
    try {
      const pollinationsUrl =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}` +
        `?width=1024&height=1024&model=flux&nologo=true&seed=${Date.now() % 99999}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 50_000);
      const r = await fetch(pollinationsUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (r.ok) {
        const contentType = r.headers.get('content-type') || 'image/jpeg';
        const buffer = await r.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        logger.info('[imageGen] Pollinations.AI succeeded');
        return res.json({ image: `data:${contentType};base64,${base64}`, source: 'pollinations' });
      }
      console.warn('[imageGen] Pollinations non-ok:', r.status);
    } catch (e: unknown) {
      console.warn('[imageGen] Pollinations error:', errorMessage(e).slice(0, 120));
    }

    res.status(500).json({
      error: 'Image generation failed. Ensure OPENAI_API_KEY is set in .env for best results.',
      code: 'IMAGE_GEN_FAILED',
      retryable: true,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
