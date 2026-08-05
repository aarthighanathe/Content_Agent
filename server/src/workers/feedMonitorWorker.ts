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
import { logger } from '../lib/logger.js';

const rssParser = new Parser({
  timeout: 12_000,
  headers: { 'User-Agent': 'ContentAgent-FeedMonitor/1.0 (+https://contentAgent.ai)' },
});

// WHY exported: POST /api/feed-monitors/:id/check calls this directly so a
// user can trigger an on-demand check without waiting for the cron tick.
export async function checkFeedMonitor(monitor: FeedMonitor, userId: string): Promise<void> {
  if (!db) return;
  const feedUrl = monitor.feedUrl;

  let feed: Parser.Output<Record<string, unknown>>;
  try {
    feed = await rssParser.parseURL(feedUrl);
  } catch (err) {
    logger.warn('[FeedMonitor] Failed to fetch/parse feed', { feedUrl, error: err instanceof Error ? err.message : String(err) });
    // Update lastCheckedAt even on failure so we don't hammer a broken feed
    await db.update(feedMonitors).set({ lastCheckedAt: new Date() }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  const items = feed.items ?? [];
  if (items.length === 0) {
    await db.update(feedMonitors).set({ lastCheckedAt: new Date() }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  // WHY sort by pubDate descending (newest first): this means item[0] is
  // always the most-recent, and we stop processing once we hit the known
  // lastItemGuid — so the first run after creating a monitor processes only
  // the very latest item (not the entire feed history).
  const sorted = [...items].sort((a, b) => {
    const aDate = a.pubDate ? new Date(a.pubDate as string).getTime() : 0;
    const bDate = b.pubDate ? new Date(b.pubDate as string).getTime() : 0;
    return bDate - aDate;
  });

  // Determine which items are new (not yet seen)
  const newItems: typeof sorted = [];
  for (const item of sorted) {
    const guid = (item.guid as string | undefined) || (item.link as string | undefined) || '';
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
    await db.update(feedMonitors).set({ lastCheckedAt: new Date() }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  const item = toProcess[0];
  const itemUrl = (item.link as string | undefined) || '';
  const newGuid = (item.guid as string | undefined) || itemUrl;

  if (!itemUrl) {
    logger.warn('[FeedMonitor] Item has no link/url, skipping', { feedUrl });
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastItemGuid: newGuid || null }).where(eq(feedMonitors.id, monitor.id));
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

  // Always advance the cursor so we don't reprocess this item on the next tick
  await db.update(feedMonitors)
    .set({ lastCheckedAt: new Date(), lastItemGuid: newGuid || null })
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
