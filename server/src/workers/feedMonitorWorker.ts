// workers/feedMonitorWorker.ts — polls active feed_monitors rows every 30 min,
// parses RSS/Atom XML, and creates a Repurpose job for each new item.
//
// WHY: node-cron (not BullMQ): feed checking is not "work that can be retried
// from a queue" — it's a recurring scheduled scan. BullMQ's repeatable jobs
// add the overhead of a Bull queue + worker process for what is essentially
// a setInterval. node-cron gives us the same cron-syntax schedule in ~0 deps.
//
// WHY: rss-parser: it handles both RSS 2.0 and Atom 1.0, normalises item.guid
// (which is the dedupe key), and handles edge-cases like CDATA and namespaced
// tags that a hand-rolled regex would get wrong.
import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';
import cron from 'node-cron';
import type Parser from 'rss-parser';
import { and, eq } from 'drizzle-orm';
import { feedMonitors, users, type FeedMonitor } from '../db/schema.js';
import { db } from '../db/index.js';
import { getUserProfile } from '../lib/profileStore.js';
import { fetchAndExtractArticle } from '../lib/articleExtract.js';
import { createJobsForPlatforms } from '../lib/repurposeJobs.js';
import {
  assertUrlIsPublic,
  formatFetchError,
  toClientFetchFailureMessage,
} from '../lib/ssrfGuard.js';
import { CLIENT_FEED_JOB_FAILURE } from '../lib/clientErrors.js';
import { fetchFeedXml, parseFeedXml } from '../lib/feedFetch.js';
import { getRedisClient } from '../lib/redisClient.js';
import { reserveGenerationBudget, releaseGenerationBudget } from '../middleware/rateLimit.js';
import { logger } from '../lib/logger.js';
import {
  asOptionalString,
  selectNextItem,
  sortNewestFirst,
} from '../lib/feedMonitorCheck.js';

// WHY: Lua: compare-and-delete/extend must be atomic so a check whose lock TTL
// expired can never delete or extend a lock now owned by a different check.
const RELEASE_LOCK_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const RENEW_LOCK_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end";
const FEED_LOCK_TTL_SECONDS = 300;
const FEED_LOCK_RENEW_MS = 60_000;

// WHY: exported: POST /api/feed-monitors/:id/check calls this directly so a
// user can trigger an on-demand check without waiting for the cron tick.
export async function checkFeedMonitor(monitor: FeedMonitor, userId: string): Promise<void> {
  if (!db) return;

  // SECURITY: single-flight lock so cron + POST /:id/check cannot race and
  // create duplicate jobs for the same new feed item. Fail closed without Redis
  // (or on lock error) — continuing unlocked caused duplicate generations.
  const redis = getRedisClient();
  const lockKey = `feed:check:${monitor.id}`;
  if (!redis) {
    logger.warn('[FeedMonitor] Redis unavailable — refusing check without lock', {
      monitorId: monitor.id,
    });
    try {
      await db.update(feedMonitors)
        .set({
          lastCheckedAt: new Date(),
          lastError: 'Feed check unavailable — please try again shortly',
        })
        .where(eq(feedMonitors.id, monitor.id));
    } catch {
      // best-effort UI signal
    }
    return;
  }

  let lockHeld = false;
  // SECURITY: unique token proves ownership on release (no blind del).
  const lockToken = randomUUID();
  try {
    const got = await redis.set(lockKey, lockToken, 'EX', FEED_LOCK_TTL_SECONDS, 'NX');
    if (got !== 'OK') {
      logger.info('[FeedMonitor] Check already in progress, skipping', { monitorId: monitor.id });
      return;
    }
    lockHeld = true;
  } catch (err: unknown) {
    logger.warn('[FeedMonitor] Lock acquire failed — refusing check', {
      monitorId: monitor.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // WHY: renew like contentJobLock — Lua 0 or a full TTL of failed renews means
  // we lost ownership; abort before createJobsForPlatforms so we never enqueue
  // under another checker's lock.
  let lastRenewOkAt = Date.now();
  const renewTimer = setInterval(() => {
    redis
      .eval(RENEW_LOCK_LUA, 1, lockKey, lockToken, String(FEED_LOCK_TTL_SECONDS))
      .then((result: unknown) => {
        if (result === 0 || result === '0') {
          lockHeld = false;
          logger.error('[FeedMonitor] Lock lost mid-check (renew owned by another)', {
            monitorId: monitor.id,
          });
          return;
        }
        lastRenewOkAt = Date.now();
      })
      .catch((err: unknown) => {
        logger.warn('[FeedMonitor] Lock renew failed', {
          monitorId: monitor.id,
          error: err instanceof Error ? err.message : String(err),
        });
        if (Date.now() - lastRenewOkAt >= FEED_LOCK_TTL_SECONDS * 1000) {
          lockHeld = false;
          logger.error('[FeedMonitor] Lock lost mid-check (renew failing longer than TTL)', {
            monitorId: monitor.id,
          });
        }
      });
  }, FEED_LOCK_RENEW_MS);
  try {
    // WHY: re-read after the lock: the cron's preloaded row (or a caller's copy)
    // may predate a concurrent check that already advanced lastItemGuid, which
    // would make us re-create a job for an already-processed item.
    const fresh = await db.query.feedMonitors.findFirst({
      where: and(eq(feedMonitors.id, monitor.id), eq(feedMonitors.userId, userId)),
    });
    if (!fresh) {
      logger.info('[FeedMonitor] Monitor gone before check, skipping', { monitorId: monitor.id });
      return;
    }
    await runFeedMonitorCheck(fresh, userId, () => lockHeld);
  } finally {
    clearInterval(renewTimer);
    if (lockHeld) {
      try {
        await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, lockToken);
      } catch {
        // lock TTL will expire
      }
    }
  }
}

async function runFeedMonitorCheck(
  monitor: FeedMonitor,
  userId: string,
  isLockHeld: () => boolean,
): Promise<void> {
  if (!db) return;

  // DEFENSE IN DEPTH: feed_monitors.userId has no FK, so an orphaned monitor (e.g. manual
  // DB edit) must be caught here before spending a generation call on it.
  const owner = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, clerkId: true },
  });
  if (!owner) {
    logger.warn('[FeedMonitor] Owning user no longer exists, deactivating monitor', { monitorId: monitor.id, userId });
    await db.delete(feedMonitors).where(eq(feedMonitors.id, monitor.id));
    return;
  }
  // WHY: Clerk id for budget: same key authJobRateLimit uses (req.userId).
  const budgetKey = owner.clerkId || userId;

  const feedUrl = monitor.feedUrl;

  // SECURITY: create-time validation only checks that feedUrl is a URL. Re-apply
  // the DNS-rebinding-resistant SSRF guard before each cron and POST /:id/check
  // fetch — article extract's own guard is not a substitute.
  const urlSafety = await assertUrlIsPublic(feedUrl);
  if (!urlSafety.safe) {
    logger.warn('[FeedMonitor] Feed URL failed SSRF check, skipping', { feedUrl, reason: urlSafety.reason });
    // WHY: lastError, not just lastCheckedAt: without this, a monitor whose feed
    // URL starts resolving to a private address (DNS rebinding, or the domain
    // simply changing owners) fails silently forever — `active` stays true and
    // the UI showed it as healthy with no way to discover it had stopped working.
    await db.update(feedMonitors)
      .set({
        lastCheckedAt: new Date(),
        // SECURITY: lastError is shown in the UI — use client-safe copy (SEC-002).
        lastError: toClientFetchFailureMessage(
          urlSafety.reason || 'URL points to a private or reserved address',
        ),
      })
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
      .set({
        lastCheckedAt: new Date(),
        lastError: toClientFetchFailureMessage(message),
      })
      .where(eq(feedMonitors.id, monitor.id));
    return;
  }

  const items = feed.items ?? [];
  if (items.length === 0) {
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastError: null }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  const sorted = sortNewestFirst(items);
  const item = selectNextItem(sorted, monitor.lastItemGuid);
  if (!item) {
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastError: null }).where(eq(feedMonitors.id, monitor.id));
    return;
  }
  const itemUrl = asOptionalString(item.link) || '';
  const newGuid = asOptionalString(item.guid) || itemUrl;

  if (!itemUrl) {
    logger.warn('[FeedMonitor] Item has no link/url, skipping', { feedUrl });
    // Advance past unusable items so we do not stall the cursor forever.
    await db.update(feedMonitors).set({ lastCheckedAt: new Date(), lastItemGuid: newGuid || null, lastError: null }).where(eq(feedMonitors.id, monitor.id));
    return;
  }

  // SECURITY: / COST-001: feed-monitor jobs sit outside authJobRateLimit —
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

  // WHY: single-shot refund: a throw inside the release (or a later catch) must
  // never refund the same reservation twice.
  let budgetSettled = false;
  const refundBudgetOnce = async (): Promise<void> => {
    if (budgetSettled) return;
    budgetSettled = true;
    try {
      await releaseGenerationBudget(budgetKey, budget.reserved);
    } catch (refundErr: unknown) {
      logger.error('[FeedMonitor] Budget refund failed', {
        monitorId: monitor.id, error: refundErr instanceof Error ? refundErr.message : String(refundErr),
      });
    }
  };

  let jobsCreated = false;
  try {
    // WHY: parallel profile + article fetch (O4): they don't depend on each other;
    // sequential awaits added ~network RTT before createJobsForPlatforms every tick.
    const [userProfile, extracted] = await Promise.all([
      getUserProfile(userId),
      fetchAndExtractArticle(itemUrl),
    ]);
    if (!extracted.ok) {
      logger.warn('[FeedMonitor] Failed to extract article from new item', { feedUrl, itemUrl, error: extracted.error });
      await refundBudgetOnce();
      // WHY: do NOT advance lastItemGuid: a transient extract failure would
      // permanently skip the item if we moved the cursor (CORR-012).
      // extracted.error is already client-safe from fetchAndExtractArticle.
      await db.update(feedMonitors)
        .set({
          lastCheckedAt: new Date(),
          lastError: extracted.error.slice(0, 500),
        })
        .where(eq(feedMonitors.id, monitor.id));
      return;
    }

    // WHY: abort after extract if renew lost the lock — do not create jobs under
    // another checker's ownership. Durable CAS in insertPendingJobAndAdvanceCursor
    // still prevents double-create if the lock expires mid-createJobsForPlatforms.
    if (!isLockHeld()) {
      await refundBudgetOnce();
      logger.warn('[FeedMonitor] Aborting before job create — lock lost', {
        monitorId: monitor.id, feedUrl, itemUrl,
      });
      return;
    }
    const jobs = await createJobsForPlatforms(
      userId, userProfile, itemUrl, extracted.article,
      [monitor.platform], monitor.tone, monitor.targetAudience,
      // WHY: same DB txn as pending insert — crash between insert and cursor
      // advance must not recreate this item. expectedOldGuid CAS blocks a second
      // pending UUID if the Redis check lock expires mid-create (TOCTOU).
      {
        advanceFeedCursor: {
          monitorId: monitor.id,
          newGuid,
          expectedOldGuid: monitor.lastItemGuid ?? null,
        },
      },
    );
    if (jobs.length === 0) {
      await refundBudgetOnce();
      // WHY: [] means the insert failed (cursor not advanced in that case).
      await db.update(feedMonitors)
        .set({ lastCheckedAt: new Date(), lastError: CLIENT_FEED_JOB_FAILURE })
        .where(eq(feedMonitors.id, monitor.id));
      return;
    }
    // WHY: budget is spent — cursor already advanced in the insert txn.
    jobsCreated = true;
    budgetSettled = true;
    logger.info('[FeedMonitor] Created job for new feed item', {
      feedUrl, itemUrl, jobId: jobs[0]?.jobId,
    });
  } catch (err) {
    if (jobsCreated) {
      // WHY: job+cursor already committed; surface unexpected post-create errors
      // without refunding budget or rolling back the cursor.
      logger.error('[FeedMonitor] Error after job+cursor commit', {
        feedUrl, itemUrl, monitorId: monitor.id, error: err instanceof Error ? err.message : String(err),
      });
      Sentry.captureException(err, { tags: { action: 'feed-monitor-post-create' }, extra: { feedUrl, itemUrl } });
      return;
    }
    await refundBudgetOnce();
    logger.error('[FeedMonitor] Error creating job for feed item', {
      feedUrl, itemUrl, error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, { tags: { action: 'feed-monitor' }, extra: { feedUrl, itemUrl } });
    await db.update(feedMonitors)
      .set({
        lastCheckedAt: new Date(),
        lastError: CLIENT_FEED_JOB_FAILURE,
      })
      .where(eq(feedMonitors.id, monitor.id));
  }
}

// WHY: in-process overlap guard — a slow tick must not start a second pass
// when the next */30 fires while the first is still iterating monitors.
let tickRunning = false;

async function runAllActiveMonitors(): Promise<void> {
  if (!db) return;
  if (tickRunning) {
    logger.warn('[FeedMonitor] Skipping cron tick — previous tick still running');
    return;
  }
  tickRunning = true;

  // WHY: cross-instance tick lock — every API replica runs the same cron;
  // per-monitor locks prevent duplicate jobs, but this avoids N× feed fetches.
  const redis = getRedisClient();
  const tickLockKey = 'feed:tick';
  const tickToken = randomUUID();
  let tickLockHeld = false;
  if (redis) {
    try {
      const got = await redis.set(tickLockKey, tickToken, 'EX', 25 * 60, 'NX');
      if (got !== 'OK') {
        logger.info('[FeedMonitor] Skipping cron tick — another instance holds feed:tick');
        tickRunning = false;
        return;
      }
      tickLockHeld = true;
    } catch (lockErr: unknown) {
      logger.warn('[FeedMonitor] Tick lock failed — continuing single-process', {
        error: lockErr instanceof Error ? lockErr.message : String(lockErr),
      });
    }
  }

  try {
    const activeMonitors = await db.select().from(feedMonitors).where(eq(feedMonitors.active, true));
    logger.info('[FeedMonitor] Running scheduled check', { count: activeMonitors.length });

    // WHY: sequential per monitor (not Promise.all): feed checks each make 1–2
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
  } finally {
    if (tickLockHeld && redis) {
      try {
        await redis.eval(RELEASE_LOCK_LUA, 1, tickLockKey, tickToken);
      } catch {
        // TTL will expire
      }
    }
    tickRunning = false;
  }
}

let cronTask: ReturnType<typeof cron.schedule> | null = null;

// WHY: every 30 minutes (*/30 * * * *): most content blogs publish at most a
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
