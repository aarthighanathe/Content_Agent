// lib/feedFetch.ts — SSRF-guarded RSS/Atom body fetch + subscribe-time probe.
// Extracted from feedMonitorWorker so create-route probing and cron/check share
// one retrying fetch path (QA-FEED-001) without growing the worker past the
// 400-line cap.
import Parser from 'rss-parser';
import {
  assertUrlIsPublic,
  fetchWithSsrfGuard,
  formatFetchError,
  isRetryableFetchFailure,
} from './ssrfGuard.js';
import { logger } from './logger.js';

const FEED_FETCH_TIMEOUT_MS = 12_000;
const FEED_FETCH_MAX_ATTEMPTS = 3;
const MAX_FEED_BYTES = 500_000;
const FEED_USER_AGENT = 'Pensieve-FeedMonitor/1.0 (+https://contentAgent.ai)';

const rssParser = new Parser();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// WHY retries: undici occasionally returns opaque "fetch failed" against
// otherwise-healthy public feeds. One-shot Check now / cron then wrote
// lastError and gave up; short backoffs recover the transient class.
export async function fetchFeedXml(feedUrl: string): Promise<string> {
  let lastReason = 'Network request failed';
  for (let attempt = 1; attempt <= FEED_FETCH_MAX_ATTEMPTS; attempt += 1) {
    const fetchResult = await fetchWithSsrfGuard(feedUrl, {
      headers: { 'User-Agent': FEED_USER_AGENT },
      signal: AbortSignal.timeout(FEED_FETCH_TIMEOUT_MS),
    });
    if (!fetchResult.ok) {
      lastReason = fetchResult.reason;
      if (!isRetryableFetchFailure(lastReason) || attempt === FEED_FETCH_MAX_ATTEMPTS) {
        throw new Error(lastReason);
      }
      logger.warn('[FeedMonitor] Transient feed fetch failure — retrying', {
        feedUrl,
        attempt,
        reason: lastReason,
      });
      await sleep(400 * attempt);
      continue;
    }
    if (!fetchResult.response.ok) {
      throw new Error(`Feed URL returned HTTP ${fetchResult.response.status}`);
    }
    // SECURITY (SEC-015): same class of defense as repurpose's HTML byte cap —
    // an unbounded .text() here can OOM the API process (cron runs in-process).
    const lenHeader = fetchResult.response.headers.get('content-length');
    if (lenHeader) {
      const len = Number(lenHeader);
      if (Number.isFinite(len) && len > MAX_FEED_BYTES) {
        throw new Error(`Feed body exceeds ${MAX_FEED_BYTES} byte cap`);
      }
    }
    const reader = fetchResult.response.body?.getReader();
    if (!reader) {
      throw new Error('Feed response had no readable body');
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_FEED_BYTES) {
        try { await reader.cancel(); } catch { /* ignore */ }
        throw new Error(`Feed body exceeds ${MAX_FEED_BYTES} byte cap`);
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(merged);
  }
  throw new Error(lastReason);
}

export async function parseFeedXml(
  xml: string,
): Promise<Parser.Output<Record<string, unknown>>> {
  return rssParser.parseString(xml);
}

// WHY: POST /api/feed-monitors probes before insert so a dead / blocked URL
// fails at subscribe time instead of looking healthy until Check now / cron.
export async function probeFeedUrl(
  feedUrl: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const urlSafety = await assertUrlIsPublic(feedUrl);
  if (!urlSafety.safe) {
    return { ok: false, reason: urlSafety.reason || 'Feed URL is not publicly reachable' };
  }
  try {
    const xml = await fetchFeedXml(feedUrl);
    await parseFeedXml(xml);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: formatFetchError(err) };
  }
}
