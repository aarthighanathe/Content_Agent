// workers/feedMonitorWorker.ts — polls active feed_monitors rows every 30 min,
// parses RSS/Atom XML, and creates a Repurpose job for each new item.
//
// WHY node-cron (not BullMQ): feed checking is not "work that can be retried
// from a queue" — it's a recurring scheduled scan. BullMQ's repeatable jobs
// add the overhead of a Bull queue + worker process for what is essentially
// a setInterval. node-cron gives us the same cron-syntax schedule in ~0 deps.
//
// WHY rss-parser: it handles both RSS 2.0 and Atom 1.0, normalises item.guid
// (which is the dedupe key), and handles edge-cases like CDATA and namespaced
// tags that a hand-rolled regex would get wrong.
import * as Sentry from '@sentry/node';
import cron from 'node-cron';
import Parser from 'rss-parser';
import { eq } from 'drizzle-orm';
import { feedMonitors, type FeedMonitor } from '../db/schema.js';
import { db } from '../db/index.js';
import { getUserProfile } from '../routes/users.js';
import { fetchAndExtractArticle, createJobsForPlatforms } from '../routes/content/repurpose.js';
import { assertUrlIsPublic } from '../lib/ssrfGuard.js';
import { logger } from '../lib/logger.js';

const rssParser = new Parser({
  timeout: 12_000,
  headers: { 'User-Agent': 'ContentAgent-FeedMonitor/1.0 (+https://contentAgent.ai)' },
});

// WHY a typeof guard, not a bare `as string` cast: rss-parser types every
// custom/namespaced field (pubDate/guid/link) as `unknown` on
// Parser.Output<Record<string, unknown>> — a malformed feed could send a
// non-string value through, which a bare cast would silently trust and let
// flow into `new Date()`/dedupe-key comparisons/an eventual fetch() URL.
function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// WHY exported: POST /api/feed-monitors/:id/check calls this directly so a
// user can trigger an on-demand check without waiting for the cron tick.
export async function checkFeedMonitor(monitor: FeedMonitor, userId: string): Promise<void> {
  if (!db) return;
  const feedUrl = monitor.feedUrl;

  // SECURITY: feedMonitorSchema only validates feedUrl as a well-formed URL —
  // nothing stops a user from pointing a monitor at an internal/private address
  // (e.g. a cloud metadata endpoint). This is the same DNS-rebinding-resistant
  // guard Repurpose's article fetch already applies (lib/ssrfGuard.ts); the RSS
  // fetch below runs every 30 min via the cron sweep AND on-demand via
  // POST /:id/check, so it needs the identical protection, not just the
  // downstream article-extraction step (which already goes through
  // fetchAndExtractArticle's own call to the same guard).
  const urlSafety = await assertUrlIsPublic(feedUrl);
  if (!urlSafety.safe) {
    logger.warn('[FeedMonitor] Feed URL failed SSRF check, skipping', { feedUrl, reason: urlSafety.reason });
    // WHY lastError, not just lastCheckedAt: without this, a monitor whose feed
    // URL starts resolving to a private address (DNS rebinding, or the domain
    // simply changing owners) fails silently forever — `active` stays true and
    // the UI showed it as healthy with no way to discover it had stopped working.
    await db.update(feedMonitors)
      .set({ lastCheckedAt: new Date(), lastError: `Feed URL is not publicly reachable: ${urlSafety.reason || 'blocked'}` })
      .where(eq(feedMonitors.id, monitor.id));
    return;
  }

  let feed: Parser.Output<Record<string, unknown>>;
  try {
    feed = await rssParser.parseURL(feedUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('[FeedMonitor] Failed to fetch/parse feed', { feedUrl, error: message });
    // Update lastCheckedAt even on failure so we don't hammer a broken feed
    await db.update(feedMonitors)
      .set({ lastCheckedAt: new Date(), lastError: `Failed to fetch/parse feed: ${message}` })
      .where(eq(feedMonitors.id, monitor.id));
    return;
  }

  const items = feed.items ?? [];
  if (items.length === 0) {
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastError: null }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  // WHY sort by pubDate descending (newest first): this means item[0] is
  // always the most-recent, and we stop processing once we hit the known
  // lastItemGuid — so the first run after creating a monitor processes only
  // the very latest item (not the entire feed history).
  // WHY parseDate: a pubDate string can be present but unparseable (malformed
  // RSS date), which makes `new Date(x).getTime()` return NaN — NaN propagating
  // into the `bDate - aDate` subtraction breaks the sort's total order (an item
  // can land at an arbitrary position instead of sorting as oldest), silently
  // violating the "sorted[0] is always most-recent" invariant this comment relies
  // on. A malformed date is treated the same as a missing one: fall back to 0.
  const parseDate = (value: string | undefined): number => {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  };
  const sorted = [...items].sort((a, b) => {
    const aDate = parseDate(asOptionalString(a.pubDate));
    const bDate = parseDate(asOptionalString(b.pubDate));
    return bDate - aDate;
  });

  // Determine which items are new (not yet seen)
  const newItems: typeof sorted = [];
  for (const item of sorted) {
    const guid = asOptionalString(item.guid) || asOptionalString(item.link) || '';
    if (guid && guid === monitor.lastItemGuid) break; // we've reached known items
    newItems.push(item);
  }

  // WHY process only the latest unseen item, not ALL unseen items:
  // if a monitor is first created against a feed with 100 historic items,
  // processing every one would create 100 jobs at once — overwhelming the AI
  // pipeline and the user's Library. One-at-a-time matches the \"strictly
  // one-shot\" original behavior while extending it to \"repeating one-shot\".
  // Power users can always manually trigger another check to advance the cursor.
  const toProcess = newItems.slice(0, 1);
  if (toProcess.length === 0) {
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastError: null }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  const item = toProcess[0];
  const itemUrl = asOptionalString(item.link) || '';
  const newGuid = asOptionalString(item.guid) || itemUrl;

  if (!itemUrl) {
    logger.warn('[FeedMonitor] Item has no link/url, skipping', { feedUrl });
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastItemGuid: newGuid || null, lastError: null }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  try {
    const userProfile = await getUserProfile(userId);
    const extracted = await fetchAndExtractArticle(itemUrl);
    if (!extracted.ok) {
      logger.warn('[FeedMonitor] Failed to extract article from new item', { feedUrl, itemUrl, error: extracted.error });
    } else {
      const jobs = await createJobsForPlatforms(
        userId, userProfile, itemUrl, extracted.article,
        [monitor.platform], monitor.tone, monitor.targetAudience,
      );
      if (jobs.length > 0) {
        logger.info('[FeedMonitor] Created job for new feed item', { feedUrl, itemUrl, jobId: jobs[0].jobId });
      }
    }
  } catch (err) {
    logger.error('[FeedMonitor] Error creating job for feed item', {
      feedUrl, itemUrl, error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, { tags: { action: 'feed-monitor' }, extra: { feedUrl, itemUrl } });
  }

  // Always advance the cursor so we don't reprocess this item on the next tick.
  // WHY lastError: null here too: an article-extraction failure above is
  // logged but non-fatal to the monitor itself (the feed fetch succeeded), so
  // clear any stale error from a previous tick now that the feed is reachable again.
  await db.update(feedMonitors)
    .set({ lastCheckedAt: new Date(), lastItemGuid: newGuid || null, lastError: null })
    .where(eq(feedMonitors.id, monitor.id));
}

async function runAllActiveMonitors(): Promise<void> {
  if (!db) return;
  try {
    const activeMonitors = await db.select().from(feedMonitors).where(eq(feedMonitors.active, true));
    logger.info('[FeedMonitor] Running scheduled check', { count: activeMonitors.length });

    // WHY sequential per monitor (not Promise.all): feed checks each make 1–2
    // outbound HTTP requests + a Gemini call. Running N of them in parallel
    // when there are many monitors could spike memory/connections; sequential
    // processing keeps the impact predictable. A user with many monitors will
    // wait a bit longer, but that's acceptable for a background job that runs
    // every 30 min.
    for (const monitor of activeMonitors) {
      try {
        await checkFeedMonitor(monitor, monitor.userId);
      } catch (err) {
        logger.error('[FeedMonitor] Uncaught error for monitor', {
          monitorId: monitor.id, error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    logger.error('[FeedMonitor] Failed to query active monitors', { error: err instanceof Error ? err.message : String(err) });
    Sentry.captureException(err, { tags: { action: 'feed-monitor-cron' } });
  }
}

let cronTask: ReturnType<typeof cron.schedule> | null = null;

// WHY every 30 minutes (*/30 * * * *): most content blogs publish at most a
// few times per day — a 30-min polling window balances freshness against
// not hammering external servers or the AI pipeline. Users can always trigger
// an immediate check via POST /api/feed-monitors/:id/check.
export function startFeedMonitorWorker(): void {
  if (cronTask) return; // already running
  cronTask = cron.schedule('*/30 * * * *', () => {
    runAllActiveMonitors().catch((err: unknown) => {
      logger.error('[FeedMonitor] Cron callback threw', { error: err instanceof Error ? err.message : String(err) });
    });
  });
  logger.info('[FeedMonitor] Feed monitor worker started (runs every 30 min)');
}

export function stopFeedMonitorWorker(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('[FeedMonitor] Feed monitor worker stopped');
  }
}
