import { Router, Response, NextFunction } from 'express';
import { parseBody, imageGenSchema, inspectSlideImageDataUrl } from '../schemas/index.js';
import { env } from '../config.js';
import { logger } from '../lib/logger.js';

// WHY: these interfaces: each covers only the fields this route actually reads off
// the corresponding provider's JSON response, matching the same "type what you
// use" scope as routes/social.ts's OAuth response types.
interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
}
// WHY: shared, not per-provider: OpenAI and Gemini's error envelopes both use
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

const MAX_IMAGE_DOWNLOAD_BYTES = 8 * 1024 * 1024;

// SECURITY: (SEC-017): only fetch image bytes from known provider hosts — a
// poisoned provider JSON URL must not become an SSRF foothold from this route.
const ALLOWED_IMAGE_HOSTS = new Set([
  'oaidalleapiprodscus.blob.core.windows.net',
  'dalleprodsec.blob.core.windows.net',
  'image.pollinations.ai',
]);
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

function assertAllowedImageUrl(imageUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new Error('Invalid image URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Image URL must be https');
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = [...ALLOWED_IMAGE_HOSTS].some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
  if (!allowed) {
    throw new Error(`Image host not allowlisted: ${host}`);
  }
  return parsed;
}

function normalizeImageContentType(raw: string | null): string {
  const base = (raw || 'image/png').split(';')[0]?.trim().toLowerCase() || 'image/png';
  if (!ALLOWED_IMAGE_TYPES.has(base)) {
    throw new Error(`Unsupported image content-type: ${base}`);
  }
  return base === 'image/jpg' ? 'image/jpeg' : base;
}

// WHY: provider-supplied mimeType is interpolated into a data: URL — default
// and allowlist it rather than emitting "data:undefined" or an arbitrary type.
function normalizeGeminiMime(raw: string | undefined): string {
  const base = (raw ?? 'image/png').split(';')[0]?.trim().toLowerCase() ?? 'image/png';
  if (!ALLOWED_IMAGE_TYPES.has(base)) return 'image/png';
  return base === 'image/jpg' ? 'image/jpeg' : base;
}

async function readCappedArrayBuffer(
  res: { headers: { get(name: string): string | null }; arrayBuffer(): Promise<ArrayBuffer> },
  maxBytes = MAX_IMAGE_DOWNLOAD_BYTES,
): Promise<ArrayBuffer> {
  const lenHeader = res.headers.get('content-length');
  if (lenHeader) {
    const len = Number(lenHeader);
    if (Number.isFinite(len) && len > maxBytes) {
      throw new Error(`Image download exceeds ${maxBytes} byte cap`);
    }
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new Error(`Image download exceeds ${maxBytes} byte cap`);
  }
  return buffer;
}

const router = Router();

// WHY: in-process cap (max 2) — each generation fans out to OpenAI/Together/
// Gemini/Pollinations with multi-MB payloads; unbounded concurrency OOMs the
// free-tier host. 429 when full so clients retry rather than queue forever.
const MAX_IMAGE_GEN_CONCURRENT = 2;
let _activeImageGens = 0;

router.post('/generate', async (req, res: Response, next: NextFunction) => {
  // WHY: the whole handler wrapped in try/catch, not relying solely on each
  // provider block's own try/catch: every fetch block below already self-
  // catches, so no provider exception can escape today — but that only holds
  // as long as every one of the 5 blocks stays correctly wrapped forever. This
  // outer boundary is defense-in-depth so a future edit that adds code between/
  // after the provider blocks without its own try/catch doesn't throw unhandled.
  if (_activeImageGens >= MAX_IMAGE_GEN_CONCURRENT) {
    return res.status(429).json({
      error: 'Image generation is busy — please retry shortly',
      code: 'IMAGE_GEN_BUSY',
      retryable: true,
    });
  }
  _activeImageGens += 1;
  try {
    const body = parseBody(imageGenSchema, req.body, res);
    if (!body) return;
    const { prompt, mode } = body;

    // WHY: no sharp in this package — do not return a data URL slide PATCH
    // and export will reject. Skip that provider and keep falling back; if
    // every image is over the cap, 413 before the client can preview it.
    let rejectedOversized = false;
    const acceptProviderImage = (mime: string, base64: string): string | null => {
      const inspected = inspectSlideImageDataUrl(mime, base64);
      if (inspected.ok) return inspected.image;
      if (inspected.reason === 'too_large') {
        rejectedOversized = true;
        logger.warn('[imageGen] skipped image over slide save limit', { mime });
      }
      return null;
    };

    const openaiKey   = env.OPENAI_API_KEY;
    const togetherKey = env.TOGETHER_API_KEY;
    const geminiKey   = env.GEMINI_API_KEY;
    const isFullSlide = mode === 'full_slide';

    const enhanced = isFullSlide
      ? `${prompt.trim()} Flat graphic design. Every word must be in English. All text must be sharp, crisp, and fully legible. No human faces. No people.`
      : `Professional abstract social media background. Absolutely no text, no words, no letters, no numbers anywhere. Clean minimal composition. No human faces. ${prompt.trim()}`;

    // FLOW: fallback 1 — OpenAI gpt-image-1 (newest, b64_json)
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
            const image = acceptProviderImage('image/png', b64);
            if (image) {
              logger.info('[imageGen] gpt-image-1 succeeded');
              return res.json({ image, source: 'gpt-image-1' });
            }
          }
        } else {
          const err = await r.json().catch(() => ({})) as ProviderErrorResponse;
          console.warn('[imageGen] gpt-image-1 non-ok:', r.status, err.error?.message?.slice(0, 120));
        }
      } catch (e: unknown) {
        console.warn('[imageGen] gpt-image-1 error:', errorMessage(e).slice(0, 120));
      }
    }

    // FLOW: fallback 2 — OpenAI DALL-E 3 (URL → download)
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
            assertAllowedImageUrl(imageUrl);
            const dlCtrl = new AbortController();
            const dlTimer = setTimeout(() => dlCtrl.abort(), 30_000);
            // SECURITY: redirect:'error' — an allowlisted host must not bounce us elsewhere.
            const dl = await fetch(imageUrl, { signal: dlCtrl.signal, redirect: 'error' });
            clearTimeout(dlTimer);
            const contentType = normalizeImageContentType(dl.headers.get('content-type'));
            const buffer = await readCappedArrayBuffer(dl);
            const image = acceptProviderImage(contentType, Buffer.from(buffer).toString('base64'));
            if (image) {
              logger.info('[imageGen] DALL-E 3 succeeded');
              return res.json({ image, source: 'dalle3' });
            }
          }
        } else {
          const err = await r.json().catch(() => ({})) as ProviderErrorResponse;
          console.warn('[imageGen] DALL-E 3 non-ok:', r.status, err.error?.message?.slice(0, 120));
        }
      } catch (e: unknown) {
        console.warn('[imageGen] DALL-E 3 error:', errorMessage(e).slice(0, 120));
      }
    }

    // FLOW: fallback 3 — Together AI FLUX.1-schnell-Free
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
            const image = acceptProviderImage('image/jpeg', b64);
            if (image) {
              logger.info('[imageGen] Together AI FLUX succeeded');
              return res.json({ image, source: 'together' });
            }
          }
        } else {
          console.warn('[imageGen] Together AI non-ok:', r.status);
        }
      } catch (e: unknown) {
        console.warn('[imageGen] Together AI error:', errorMessage(e).slice(0, 120));
      }
    }

    // FLOW: fallback 4 — Gemini image generation (current image-capable Flash models)
    if (geminiKey) {
      for (const modelId of [
        'gemini-2.5-flash-image',
        'gemini-2.0-flash-preview-image-generation',
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
                const image = acceptProviderImage(
                  normalizeGeminiMime(part.inlineData.mimeType),
                  part.inlineData.data,
                );
                if (image) {
                  logger.info('[imageGen] Gemini model succeeded', { modelId });
                  return res.json({ image, source: 'gemini' });
                }
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

    // FLOW: fallback 5 — Pollinations.AI (no key, last resort)
    try {
      const pollinationsUrl =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}` +
        `?width=1024&height=1024&model=flux&nologo=true&seed=${Date.now() % 99999}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 50_000);
      const r = await fetch(pollinationsUrl, { signal: controller.signal, redirect: 'error' });
      clearTimeout(timer);

      if (r.ok) {
        const contentType = normalizeImageContentType(r.headers.get('content-type'));
        const buffer = await readCappedArrayBuffer(r);
        const image = acceptProviderImage(contentType, Buffer.from(buffer).toString('base64'));
        if (image) {
          logger.info('[imageGen] Pollinations.AI succeeded');
          return res.json({ image, source: 'pollinations' });
        }
      }
      console.warn('[imageGen] Pollinations non-ok:', r.status);
    } catch (e: unknown) {
      console.warn('[imageGen] Pollinations error:', errorMessage(e).slice(0, 120));
    }

    if (rejectedOversized) {
      return res.status(413).json({
        error:
          'Generated image is too large to save on a slide. Try again or use a simpler prompt.',
        code: 'IMAGE_TOO_LARGE',
        retryable: true,
      });
    }

    res.status(500).json({
      // SECURITY: generic message — never reveal which provider keys/config exist.
      error: 'Image generation failed. Please try again later.',
      code: 'IMAGE_GEN_FAILED',
      retryable: true,
    });
  } catch (error) {
    next(error);
  } finally {
    _activeImageGens = Math.max(0, _activeImageGens - 1);
  }
});

export default router;
