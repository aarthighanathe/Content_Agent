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
import type Parser from 'rss-parser';
import { eq } from 'drizzle-orm';
import { feedMonitors, users, type FeedMonitor } from '../db/schema.js';
import { db } from '../db/index.js';
import { getUserProfile } from '../routes/users.js';
import { fetchAndExtractArticle, createJobsForPlatforms } from '../routes/content/repurpose.js';
import { assertUrlIsPublic, formatFetchError } from '../lib/ssrfGuard.js';
import { fetchFeedXml, parseFeedXml } from '../lib/feedFetch.js';
import { getRedisClient } from '../lib/redisClient.js';
import { reserveGenerationBudget, releaseGenerationBudget } from '../middleware/rateLimit.js';
import { logger } from '../lib/logger.js';

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

  // SECURITY: single-flight lock so cron + POST /:id/check cannot race and
  // create duplicate jobs for the same new feed item (SEC-005).
  const redis = getRedisClient();
  const lockKey = `feed:check:${monitor.id}`;
  if (redis) {
    try {
      const got = await redis.set(lockKey, '1', 'EX', 120, 'NX');
      if (got !== 'OK') {
        logger.info('[FeedMonitor] Check already in progress, skipping', { monitorId: monitor.id });
        return;
      }
    } catch (err: unknown) {
      logger.warn('[FeedMonitor] Lock acquire failed — continuing without lock', {
        monitorId: monitor.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    await runFeedMonitorCheck(monitor, userId);
  } finally {
    if (redis) {
      try {
        await redis.del(lockKey);
      } catch {
        // lock TTL will expire
      }
    }
  }
}

async function runFeedMonitorCheck(monitor: FeedMonitor, userId: string): Promise<void> {
  if (!db) return;

  // DEFENSE IN DEPTH: DELETE /api/users/me now deletes this user's feedMonitors
  // rows explicitly (feed_monitors.userId has no FK constraint, so nothing
  // enforces this automatically). This check catches any monitor that still
  // becomes orphaned some other way (e.g. a manual DB edit) before spending a
  // Gemini/Tavily call on it — without it, the failure mode is the eventual
  // job insert failing on contentJobs.userId's FK constraint, landing in the
  // catch block below, which still advances the cursor and repeats every
  // 30-minute tick indefinitely.
  const owner = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, clerkId: true },
  });
  if (!owner) {
    logger.warn('[FeedMonitor] Owning user no longer exists, deactivating monitor', { monitorId: monitor.id, userId });
    await db.delete(feedMonitors).where(eq(feedMonitors.id, monitor.id));
    return;
  }
  // WHY Clerk id for budget: same key authJobRateLimit uses (req.userId).
  const budgetKey = owner.clerkId || userId;

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

  // SECURITY: fetchFeedXml uses fetchWithSsrfGuard (redirect hops re-checked)
  // instead of rss-parser parseURL(), which would follow redirects without
  // re-validating private/metadata targets.
  let feed: Parser.Output<Record<string, unknown>>;
  try {
    const xml = await fetchFeedXml(feedUrl);
    feed = await parseFeedXml(xml);
  } catch (err) {
    const message = formatFetchError(err);
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

  // Cap at one job per tick. First check (no cursor): take the newest item only
  // so a new monitor against a long feed does not enqueue historic backlog.
  // Later checks: take the oldest unseen so intermediate items are not skipped
  // when the cursor previously jumped to the tip (CORR-012).
  if (newItems.length === 0) {
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastError: null }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  const item = !monitor.lastItemGuid
    ? newItems[0]
    : newItems[newItems.length - 1];
  const itemUrl = asOptionalString(item.link) || '';
  const newGuid = asOptionalString(item.guid) || itemUrl;

  if (!itemUrl) {
    logger.warn('[FeedMonitor] Item has no link/url, skipping', { feedUrl });
    // Advance past unusable items so we do not stall the cursor forever.
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastItemGuid: newGuid || null, lastError: null }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  // SECURITY / COST-001: feed-monitor jobs sit outside authJobRateLimit —
  // atomically reserve the same hourly generation budget as Create/Repurpose.
  // Fail closed when Redis is down (HTTP limiters already 503 in that case).
  const budget = await reserveGenerationBudget(budgetKey, 1, { alreadyCounted: false });
  if (!budget.allowed) {
    logger.warn('[FeedMonitor] Generation budget unavailable or exhausted — deferring item', {
      feedUrl, itemUrl, monitorId: monitor.id,
    });
    await db.update(feedMonitors)
      .set({
        lastCheckedAt: new Date(),
        lastError: 'Generation budget unavailable or exhausted — will retry on the next check',
      })
      .where(eq(feedMonitors.id, monitor.id));
    return;
  }

  try {
    // WHY parallel profile + article fetch (O4): they don't depend on each other;
    // sequential awaits added ~network RTT before createJobsForPlatforms every tick.
    const [userProfile, extracted] = await Promise.all([
      getUserProfile(userId),
      fetchAndExtractArticle(itemUrl),
    ]);
    if (!extracted.ok) {
      logger.warn('[FeedMonitor] Failed to extract article from new item', { feedUrl, itemUrl, error: extracted.error });
      await releaseGenerationBudget(budgetKey, budget.reserved);
      // WHY do NOT advance lastItemGuid: a transient extract failure would
      // permanently skip the item if we moved the cursor (CORR-012).
      await db.update(feedMonitors)
        .set({ lastCheckedAt: new Date(), lastError: `Failed to extract article: ${extracted.error}` })
        .where(eq(feedMonitors.id, monitor.id));
      return;
    }

    const jobs = await createJobsForPlatforms(
      userId, userProfile, itemUrl, extracted.article,
      [monitor.platform], monitor.tone, monitor.targetAudience,
    );
    if (jobs.length === 0) {
      await releaseGenerationBudget(budgetKey, budget.reserved);
    } else {
      logger.info('[FeedMonitor] Created job for new feed item', { feedUrl, itemUrl, jobId: jobs[0].jobId });
    }

    await db.update(feedMonitors)
      .set({ lastCheckedAt: new Date(), lastItemGuid: newGuid || null, lastError: null })
      .where(eq(feedMonitors.id, monitor.id));
  } catch (err) {
    await releaseGenerationBudget(budgetKey, budget.reserved);
    logger.error('[FeedMonitor] Error creating job for feed item', {
      feedUrl, itemUrl, error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, { tags: { action: 'feed-monitor' }, extra: { feedUrl, itemUrl } });
    await db.update(feedMonitors)
      .set({
        lastCheckedAt: new Date(),
        lastError: err instanceof Error ? err.message.slice(0, 500) : 'Failed to create job for feed item',
      })
      .where(eq(feedMonitors.id, monitor.id));
  }
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
