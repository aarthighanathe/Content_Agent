// WHY: extracted from rateLimit.ts so that file stays under the 400-line cap
// after top-level `content` sanitization grew; callers still import via
// rateLimit re-exports (index.ts / route mounts unchanged).
import { Request, Response, NextFunction } from 'express';
import { getInjectionTestPatterns } from '../lib/injectionPatterns.js';
import {
  CONTENT_PAYLOAD_MAX_BYTES,
  PATCH_CONTENT_MAX_BYTES,
} from '../schemas/jobs.js';

// SECURITY: short-circuit prompt injection before Gemini — patterns live in
// lib/injectionPatterns.ts (shared with sanitizeSearchText) so reject + redact
// cannot drift apart again.
const INJECTION_PATTERNS = getInjectionTestPatterns();

function containsInjection(value: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(value));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

/**
 * Sanitizes and validates all LLM-facing text fields on the request body.
 * Applied to all generation routes: /api/jobs/create, /api/jobs/batch,
 * /api/content/* (including /ideate's focusTopic), /api/demo/jobs/create
 */
export function sanitizeGenerationInput(req: Request, res: Response, next: NextFunction): void {
  // NOTE: topic=500 vs schemas/jobs.ts's TOPIC_MAX_LENGTH=250: this middleware runs
  // BEFORE zod validation as a generous outer pre-filter (reject obviously-abusive
  // payloads early, cheaply), not the source of truth for the real business-rule cap.
  // createJobSchema (and jobs/create.ts's batch route, and the client's Create form's
  // maxLength) all enforce the tighter 250 downstream — don't "fix" this by making
  // them match; they're deliberately different layers with different jobs.
  // WHY: these caps equal (not undercut) the zod schema maxes: a lower cap here
  // rejected input the schema explicitly allows (e.g. 10k-char voice samples,
  // 300-char profile URLs) with a misleading length error before zod ran.
  const LIMITS: Record<string, number> = {
    topic: 500,
    targetAudience: 300,
    brandVoice: 300,
    brandName: 100,
    phrasesUse: 1000,
    phrasesAvoid: 1000,
    custom_feedback: 1000,
    feedback: 1000,
    handle: 300,
    industry: 200,
    samples: 10000,
    focusTopic: 200,
    competitorContext: 300,
    prompt: 2000,
  };

  // Returns cleaned string, or null after writing a 400 (caller must return).
  function sanitizeField(raw: unknown, fieldPath: string, maxLen: number): string | null {
    if (typeof raw !== 'string') {
      res.status(400).json({
        error: `Field "${fieldPath}" must be a string`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return null;
    }

    const cleaned = stripHtml(raw);

    if (cleaned.length > maxLen) {
      res.status(400).json({
        error: `Field "${fieldPath}" exceeds maximum length of ${maxLen} characters (got ${cleaned.length})`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return null;
    }

    if (containsInjection(cleaned)) {
      res.status(400).json({
        error: `Field "${fieldPath}" contains disallowed content. Please rephrase your request.`,
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return null;
    }

    return cleaned;
  }

  for (const [field, maxLen] of Object.entries(LIMITS)) {
    const raw = req.body?.[field];
    if (raw === undefined || raw === null) continue;
    const cleaned = sanitizeField(raw, field, maxLen);
    if (cleaned === null) return;
    req.body[field] = cleaned;
  }

  // SECURITY: string `content` = regenerate feedback / LLM-facing text (8k +
  // injection). Object/array `content` = PATCH platform payloads (carousel
  // slides with ~1–3MB imageDataUrl) — use PATCH_CONTENT_MAX_BYTES for the
  // total size gate and skip imageDataUrl leaves (zod / inspectSlideImageDataUrl
  // own those; injection regexes false-positive on base64).
  const FEEDBACK_CONTENT_MAX = 8000;
  if (req.body?.content !== undefined && req.body?.content !== null) {
    const topContent = req.body.content;
    if (typeof topContent === 'string') {
      const cleaned = sanitizeField(topContent, 'content', FEEDBACK_CONTENT_MAX);
      if (cleaned === null) return;
      req.body.content = cleaned;
    } else if (typeof topContent === 'object') {
      let serialized: string;
      try {
        serialized = JSON.stringify(topContent);
      } catch {
        res.status(400).json({
          error: 'Field "content" is not valid JSON-serializable data',
          code: 'VALIDATION_ERROR',
          retryable: false,
        });
        return;
      }
      if (serialized.length > PATCH_CONTENT_MAX_BYTES) {
        res.status(400).json({
          error:
            `Field "content" exceeds maximum length of ${PATCH_CONTENT_MAX_BYTES} ` +
            `characters (got ${serialized.length})`,
          code: 'VALIDATION_ERROR',
          retryable: false,
        });
        return;
      }
      // WHY: leaf cap matches CONTENT_PAYLOAD_MAX_BYTES (social payload / generous
      // prefilter); platform schemas enforce tighter per-field maxima downstream.
      const sanitizeLeaves = (
        value: unknown,
        path: string,
        key: string | undefined,
      ): unknown | null => {
        if (typeof value === 'string') {
          // SECURITY: imageDataUrl is raster data URL validated by slide schemas —
          // do not stripHtml / injection-scan (base64 can false-positive).
          if (key === 'imageDataUrl') {
            return value;
          }
          return sanitizeField(value, path, CONTENT_PAYLOAD_MAX_BYTES);
        }
        if (Array.isArray(value)) {
          const next: unknown[] = [];
          for (let i = 0; i < value.length; i++) {
            const leaf = sanitizeLeaves(value[i], `${path}[${i}]`, undefined);
            if (leaf === null) return null;
            next.push(leaf);
          }
          return next;
        }
        if (value !== null && typeof value === 'object') {
          const next: Record<string, unknown> = {};
          for (const [childKey, val] of Object.entries(value as Record<string, unknown>)) {
            const leaf = sanitizeLeaves(val, `${path}.${childKey}`, childKey);
            if (leaf === null) return null;
            next[childKey] = leaf;
          }
          return next;
        }
        return value;
      };
      const cleanedContent = sanitizeLeaves(topContent, 'content', undefined);
      if (cleanedContent === null) return;
      req.body.content = cleanedContent;
    } else {
      res.status(400).json({
        error: 'Field "content" must be a string or object',
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
      return;
    }
  }

  // SECURITY: batch / nested payloads (items[].topic, items[].targetAudience)
  // used to skip the top-level-only loop above — walk them with the same caps.
  // NOTE: items[].content stays string-only (batch feedback / topic text) — not
  // structured carousel payloads.
  const nestedFields: Array<{ key: string; maxLen: number }> = [
    { key: 'topic', maxLen: LIMITS.topic },
    { key: 'targetAudience', maxLen: LIMITS.targetAudience },
    { key: 'content', maxLen: FEEDBACK_CONTENT_MAX },
    { key: 'feedback', maxLen: LIMITS.feedback },
  ];
  if (Array.isArray(req.body?.items)) {
    for (let i = 0; i < req.body.items.length; i++) {
      const item = req.body.items[i] as Record<string, unknown> | null;
      if (!item || typeof item !== 'object') continue;
      for (const { key, maxLen } of nestedFields) {
        if (item[key] === undefined || item[key] === null) continue;
        const cleaned = sanitizeField(item[key], `items[${i}].${key}`, maxLen);
        if (cleaned === null) return;
        item[key] = cleaned;
      }
    }
  }

  next();
}
