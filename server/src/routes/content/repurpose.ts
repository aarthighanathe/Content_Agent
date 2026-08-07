import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { promises as dns } from 'dns';
import { isIP } from 'net';
import { AuthRequest } from '../../middleware/auth.js';
import { jobsMemory, runPipelineDirect } from '../jobs/index.js';
import { generateWithAI } from '../../lib/ai.js';
import { getUserProfile } from '../users.js';
import { addJobToQueue } from '../../lib/queue.js';
import { stripScriptsAndEventHandlers } from '../../lib/carousel.js';
import { parseBody, repurposeSchema, repurposeBatchSchema } from '../../schemas/index.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import { logger } from '../../lib/logger.js';

const router = Router();

interface ExtractedArticle {
  text: string;
  topicSentence: string;
}

// WHY extracted from the route handler: this is the expensive, URL-specific
// half of the old single-platform flow (network fetch + HTML sanitize/strip +
// one Gemini call to summarize a topic) — factored out so a multi-platform
// submission can run it exactly once and reuse the result for every platform,
// instead of re-fetching and re-summarizing the same article once per platform
// (the actual inefficiency FUTURE_FEATURES.md's item called out). Returns a
// discriminated result rather than throwing so the route can map failure
// reasons to the same specific error codes/messages the single-platform path
// always returned.
type ExtractResult =
  | { ok: true; article: ExtractedArticle }
  | { ok: false; status: number; error: string; code: string; retryable: boolean };

async function fetchAndExtractArticle(url: string): Promise<ExtractResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('protocol');
  } catch {
    return { ok: false, status: 400, error: 'Invalid URL — must start with http:// or https://', code: 'VALIDATION_ERROR', retryable: false };
  }

  // SSRF protection — block requests to private/loopback IP ranges.
  // SECURITY: checking the literal hostname string alone is bypassable via DNS
  // rebinding (a public hostname whose A/AAAA record points at a private/
  // loopback/link-local address, e.g. a cloud metadata endpoint) — fetch()
  // would still happily connect to whatever the resolver returns. Resolving
  // here and validating every returned address closes that gap; a residual
  // TOCTOU window between this lookup and fetch()'s own internal lookup is a
  // standard, accepted risk tier for this mitigation (eliminating it fully
  // would require pinning fetch to a specific resolved IP via a custom
  // dispatcher, which isn't available without adding a new dependency).
  const hostname = parsedUrl.hostname;
  // WHY both a raw string pattern AND a normalized check: an IPv6 address has
  // multiple textual forms for the same address (e.g. "::ffff:127.0.0.1" and
  // "::ffff:7f00:1" both mean IPv4-mapped 127.0.0.1) — a single regex anchored
  // to one form misses the others. isPrivateOrReservedIp normalizes via
  // Node's own IPv4-mapped-IPv6 unwrapping before falling back to the regex,
  // so DNS-resolved addresses are checked in whatever form the resolver
  // returns them, not just the exact strings the regex enumerates.
  const ssrfPattern = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|::$|0\.0\.0\.0|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;
  function isPrivateOrReservedIp(address: string): boolean {
    if (ssrfPattern.test(address)) return true;
    // Unwrap IPv4-mapped/compatible IPv6 forms ("::ffff:a.b.c.d" or its
    // hex-quad equivalent "::ffff:7f00:1") down to the plain IPv4 string and
    // re-check — Node's `net.isIPv6` family alone won't do this unwrapping.
    const mappedMatch = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mappedMatch) return ssrfPattern.test(mappedMatch[1]);
    const hexMappedMatch = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (hexMappedMatch) {
      const hi = parseInt(hexMappedMatch[1], 16);
      const lo = parseInt(hexMappedMatch[2], 16);
      const ipv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
      return ssrfPattern.test(ipv4);
    }
    return false;
  }
  if (isPrivateOrReservedIp(hostname)) {
    return { ok: false, status: 400, error: 'URL points to a private or reserved address', code: 'VALIDATION_ERROR', retryable: false };
  }
  try {
    const addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await dns.lookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (isPrivateOrReservedIp(address)) {
        return { ok: false, status: 400, error: 'URL points to a private or reserved address', code: 'VALIDATION_ERROR', retryable: false };
      }
    }
  } catch {
    return { ok: false, status: 422, error: 'Could not resolve that URL — check that it is publicly accessible', code: 'FETCH_FAILED', retryable: true };
  }

  // Fetch and extract readable text from the URL
  let rawHtml: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const fetchRes = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentAgent/1.0; +https://contentAgent.ai)' },
    });
    clearTimeout(timeout);
    if (!fetchRes.ok) {
      return { ok: false, status: 422, error: `URL returned HTTP ${fetchRes.status} — make sure it is publicly accessible`, code: 'FETCH_FAILED', retryable: true };
    }
    rawHtml = await fetchRes.text();
  } catch {
    return { ok: false, status: 422, error: 'Could not fetch that URL — check that it is publicly accessible', code: 'FETCH_FAILED', retryable: true };
  }

  // SECURITY: strip scripts/event-handlers via the shared sanitizer first (same
  // function Puppeteer rendering relies on — see lib/carousel.ts) before the
  // remaining plain-text extraction below, instead of a locally reimplemented
  // script-stripping regex that could drift from it.
  const text = stripScriptsAndEventHandlers(rawHtml)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);

  if (text.length < 120) {
    return { ok: false, status: 422, error: 'Not enough readable text found at that URL', code: 'INSUFFICIENT_CONTENT', retryable: false };
  }

  // Extract topic from the content — one platform-agnostic summary, reused
  // for every platform's job (the topic itself doesn't vary by platform).
  const summaryPrompt = `Extract the core topic of this web content as a single phrase (max 10 words). Make it specific and punchy — suitable as a social content brief.\n\nContent: "${text.slice(0, 1800)}"\n\nReturn ONLY the topic phrase. No quotes, no explanation.`;
  const topicSentence = (await generateWithAI(summaryPrompt)).trim().replace(/^["']|["']$/g, '');

  return { ok: true, article: { text, topicSentence } };
}

// POST /api/content/repurpose — extract text from URL and create a content job
// (or, when `platforms` is present, one job per platform from a single fetch).
router.post('/repurpose', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(repurposeSchema, req.body, res);
    if (!body) return;
    const { url, platform, platforms, tone, targetAudience } = body;

    const extracted = await fetchAndExtractArticle(url);
    if (!extracted.ok) {
      return res.status(extracted.status).json({ error: extracted.error, code: extracted.code, retryable: extracted.retryable });
    }
    const { text, topicSentence } = extracted.article;

    const userId = req.dbUserId || req.userId || 'demo';
    const userProfile = await getUserProfile(userId);

    // WHY platforms ?? [platform]: multi-platform is purely additive — a
    // request that never sent `platforms` behaves exactly as before (one
    // platform, one job, same response shape below).
    const targetPlatforms = platforms ?? [platform];

    // WHY Promise.allSettled, not sequential creation: each platform's job
    // creation is independent (own jobId, own queue/direct-pipeline kickoff)
    // — awaiting them one at a time would serialize N queue round-trips for
    // no reason, same reasoning as jobs/batch's own WHY comment.
    const settled = await Promise.allSettled(
      targetPlatforms.map(async (targetPlatform) => {
        const jobId = uuidv4();
        const repurposeContext = `SOURCE URL: ${url}\n\nRepurpose the following web content into high-quality ${targetPlatform.replace(/_/g, ' ')} content. Extract the key insights, data points, and value from the source, but rewrite completely in the brand voice. Do NOT copy-paste:\n\n${text.slice(0, 2500)}`;

        const job: PipelineJob = {
          id: jobId,
          userId,
          topic: topicSentence,
          platform: targetPlatform,
          tone,
          targetAudience,
          brandVoice: userProfile.brandVoice || 'professional',
          phrasesUse: userProfile.phrasesUse || '',
          phrasesAvoid: userProfile.phrasesAvoid || '',
          contentDna: userProfile.contentDna || null,
          sourceUrl: url,
          initialFeedback: repurposeContext,
          status: 'pending',
          retryCount: 0,
          deleted: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        jobsMemory.set(jobId, job);

        const queued = await addJobToQueue(jobId, { ...job });
        if (!queued) {
          // WHY .catch(), not a bare fire-and-forget call: if acquirePipelineSlot()
          // itself throws before runPipelineDirect's internal try/finally, the
          // rejection would otherwise be unhandled at this call site.
          runPipelineDirect(jobId, job).catch((err: unknown) => {
            logger.error('Repurpose direct pipeline failed', { jobId, platform: targetPlatform, error: err instanceof Error ? err.message : String(err) });
          });
        }

        return { jobId, platform: targetPlatform };
      }),
    );

    const jobs: Array<{ jobId: string; platform: string }> = [];
    for (const r of settled) {
      if (r.status === 'fulfilled') jobs.push(r.value);
    }

    if (jobs.length === 0) {
      return res.status(500).json({ error: 'Failed to start repurpose job for any platform', code: 'SERVER_ERROR', retryable: true });
    }

    // WHY jobId/topic kept at the top level (not just inside jobs[]): every
    // existing caller (Repurpose.tsx's single-platform submit) reads
    // `{ jobId, topic }` off the response directly — this keeps that call
    // shape working unchanged (jobs[0] and the top-level jobId are the same
    // job whenever only one platform was requested) while jobs[] carries the
    // full fan-out for a multi-platform submission.
    return res.status(201).json({ jobId: jobs[0].jobId, topic: topicSentence, jobs });
  } catch (error: unknown) {
    console.error('Repurpose failed:', error);
    Sentry.captureException(error, { tags: { route: 'POST /repurpose' } });
    return res.status(500).json({ error: 'Failed to start repurpose job', code: 'SERVER_ERROR', retryable: true });
  }
});
export type UserProfile = Awaited<ReturnType<typeof getUserProfile>>;

// ── Helper: create content jobs for extracted article across N platforms ──────
// WHY extracted from the single-URL handler: POST /repurpose/batch reuses the
// exact same job-creation fan-out so a batch of N URLs gets identical behavior.
export async function createJobsForPlatforms(
  userId: string,
  userProfile: UserProfile,
  url: string,
  article: ExtractedArticle,
  targetPlatforms: string[],
  tone: string,
  targetAudience: string,
): Promise<Array<{ jobId: string; platform: string; topic: string }>> {
  const settled = await Promise.allSettled(
    targetPlatforms.map(async (targetPlatform) => {
      const jobId = uuidv4();
      const repurposeContext = `SOURCE URL: ${url}\n\nRepurpose the following web content into high-quality ${targetPlatform.replace(/_/g, ' ')} content. Extract the key insights, data points, and value from the source, but rewrite completely in the brand voice. Do NOT copy-paste:\n\n${article.text.slice(0, 2500)}`;

      const job: PipelineJob = {
        id: jobId,
        userId,
        topic: article.topicSentence,
        platform: targetPlatform,
        tone,
        targetAudience,
        brandVoice: userProfile.brandVoice || 'professional',
        phrasesUse: userProfile.phrasesUse || '',
        phrasesAvoid: userProfile.phrasesAvoid || '',
        contentDna: userProfile.contentDna || null,
        sourceUrl: url,
        initialFeedback: repurposeContext,
        status: 'pending',
        retryCount: 0,
        deleted: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      jobsMemory.set(jobId, job);
      const queued = await addJobToQueue(jobId, { ...job });
      if (!queued) {
        runPipelineDirect(jobId, job).catch((err: unknown) => {
          logger.error('Repurpose direct pipeline failed', { jobId, platform: targetPlatform, error: err instanceof Error ? err.message : String(err) });
        });
      }
      return { jobId, platform: targetPlatform, topic: article.topicSentence };
    }),
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<{ jobId: string; platform: string; topic: string }> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// POST /api/content/repurpose/batch — N different URLs, each to its own
// platform list, processed concurrently. Each URL is independently
// fetch+extracted (unlike multi-platform mode which shares one extraction).
// WHY allSettled at the top level: a URL that 404s shouldn't abort the rest —
// the response carries successfully-created jobs AND failedItems[] so the
// client can report partial failures gracefully.
router.post('/repurpose/batch', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(repurposeBatchSchema, req.body, res);
    if (!body) return;
    const { items } = body;

    const userId = req.dbUserId || req.userId || 'demo';
    const userProfile = await getUserProfile(userId);

    // WHY resolve instead of throw on failure: keeping every outcome (expected
    // extraction failure AND unexpected error) inside the fulfilled branch of
    // Promise.allSettled gives each result a single known shape, so downstream
    // code never has to narrow `unknown`/PromiseRejectedResult.reason.
    const itemResults = await Promise.allSettled(
      items.map(async (item) => {
        try {
          const extracted = await fetchAndExtractArticle(item.url);
          if (!extracted.ok) {
            return { ok: false as const, url: item.url, error: extracted.error };
          }
          const targetPlatforms = item.platforms ?? [item.platform];
          const jobs = await createJobsForPlatforms(userId, userProfile, item.url, extracted.article, targetPlatforms, item.tone, item.targetAudience);
          return { ok: true as const, url: item.url, jobs };
        } catch (err) {
          return { ok: false as const, url: item.url, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    );

    const allJobs: Array<{ jobId: string; platform: string; topic: string }> = [];
    const failedItems: Array<{ url: string; error: string }> = [];

    for (const r of itemResults) {
      if (r.status === 'rejected') {
        failedItems.push({ url: '', error: r.reason instanceof Error ? r.reason.message : String(r.reason) });
        continue;
      }
      if (!r.value.ok) {
        failedItems.push({ url: r.value.url, error: r.value.error });
      } else {
        allJobs.push(...r.value.jobs);
      }
    }

    if (allJobs.length === 0) {
      return res.status(422).json({ error: 'All URLs in the batch failed to process', code: 'BATCH_ALL_FAILED', retryable: true, failedItems });
    }

    return res.status(201).json({ jobs: allJobs, failedItems });
  } catch (error: unknown) {
    console.error('Repurpose batch failed:', error);
    Sentry.captureException(error, { tags: { route: 'POST /repurpose/batch' } });
    return res.status(500).json({ error: 'Failed to start batch repurpose', code: 'SERVER_ERROR', retryable: true });
  }
});

export { fetchAndExtractArticle };
export default router;
