// Puppeteer browser pool: launch, acquire/release, health-replace, and shutdown.
//
// WHY split out of carousel.ts: carousel.ts grew past the 400-line file cap
// (CLAUDE.md §"Code Style Rules" / "Never Do These") once the carousel template
// system added templateId/paletteId cache-key handling. The pool machinery below
// has no dependency on rendering/caching logic — it's a self-contained resource
// pool consumed only by renderSlideWithPuppeteer() in carousel.ts — so it's the
// cleanest extraction that doesn't touch any external import path (carousel.ts
// re-exports closeBrowserPool for its existing callers).
import * as Sentry from '@sentry/node';
import puppeteer from 'puppeteer';
import type { Browser, LaunchOptions } from 'puppeteer';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { logger } from './logger.js';
import { env } from '../config.js';

// WHY Browser pool: launching a new Chromium process takes ~800ms and ~150MB RAM.
// Pre-warming POOL_MIN browsers at startup eliminates cold-start latency for the
// first render requests. The pool auto-scales up to POOL_MAX and then queues.
// Prevents OOM when many users render carousels concurrently.

export const POOL_MIN = 2;
export const POOL_MAX = 8;
export const RENDER_TIMEOUT_MS = 60_000;
// WHY: puppeteer.launch() and browser.close() have no built-in timeout — a hung
// Chromium subprocess (OS-level stall, sandbox issue, zombie process) would block
// the caller indefinitely with no error to recover from. Racing both against this
// deadline turns a hang into a rejection, which callers' existing catch/replace
// paths (replaceBrokenBrowser, initPool's allSettled) already know how to handle.
const BROWSER_LAUNCH_TIMEOUT_MS = 10_000;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--font-render-hinting=none',
  '--allow-running-insecure-content',
];

export interface PoolEntry {
  browser: Browser | null;
  busy: boolean;
  // WHY a separate flag from `busy` (not fully redundant, even though every
  // current read site also checks `!busy`): `reserved` is what lets
  // `_pool.length` count an in-flight spawnBrowser() reservation *before* the
  // browser itself exists (browser: null). `busy` alone would give the same
  // exclusion at the two findFreeSlot() call sites below, but a future caller
  // that needs an accurate in-flight-reservation count from pool length still
  // needs this flag to exist independently of `busy`.
  reserved: boolean;
}

const _pool: PoolEntry[] = [];
let _poolReady = false;

// WHY a shared helper: acquireBrowser's fast path and its poll loop both need
// the identical "find an unclaimed slot" predicate — inlining it twice already
// drifted once when `reserved` was added alongside the pre-existing `busy`.
function findFreeSlot(): PoolEntry | undefined {
  return _pool.find((e) => !e.busy && !e.reserved);
}

// WHY a shared helper: both spawnBrowser and replaceBrokenBrowser's close() need
// the identical "race against a deadline, reject on timeout" behavior — inlining
// it twice would risk the two timeouts drifting apart later.
// WHY the onLateResolve hook: Promise.race never cancels the losing side — if
// `promise` resolves after the timeout already rejected the race, the caller
// treats it as failed and nothing else references the resolved value. For a
// browser launch specifically, that value is a live Chromium process; without
// this hook it leaks for the life of the server (orphaned OS process).
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  onLateResolve?: (value: T) => void,
): Promise<T> {
  let settled = false;
  return Promise.race([
    promise.then((value) => {
      settled = true;
      return value;
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => {
        if (settled) return;
        if (onLateResolve) {
          promise.then(onLateResolve).catch(() => {});
        }
        reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs),
    ),
  ]);
}

// WHY resolved once and cached at module scope: spawnBrowser() runs on every pool
// slot at initPool(), every replaceBrokenBrowser() respawn after a crash, and every
// pool-growth event under load — re-running existsSync() over the same 3 fixed paths
// each time is pure repeated filesystem I/O for an answer that can't change within
// a process's lifetime. null = "not yet resolved", undefined = "resolved, none found".
let _resolvedSystemChromePath: string | undefined | null = null;

// WHY PUPPETEER_EXECUTABLE_PATH takes priority over the guessed paths below: an
// explicit env var is a verified install contract (set by whoever configured the
// deploy target), whereas the hardcoded paths are a guess specific to Render's
// Debian/Ubuntu-based image that silently stops applying on any other platform.
// WHY async fs.access instead of sync existsSync: avoids blocking the event loop
// on the first call during pool initialization or browser respawn.
async function resolveSystemChromePath(): Promise<string | undefined> {
  if (_resolvedSystemChromePath !== null) return _resolvedSystemChromePath;

  const envPath = env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath) {
    try {
      await access(envPath, constants.F_OK);
      logger.info('[BrowserPool] Using Chrome from PUPPETEER_EXECUTABLE_PATH', { path: envPath });
      _resolvedSystemChromePath = envPath;
      return _resolvedSystemChromePath;
    } catch {
      // Path doesn't exist or isn't accessible, continue to fallback
    }
  }

  // Only guess Render's known system-Chrome install locations when we have direct
  // evidence we're actually running there — NODE_ENV=production alone is true on
  // any production deploy target, not just Render, and these paths are Render-image-
  // specific (see the note above re: PUPPETEER_EXECUTABLE_PATH being the portable fix).
  if (env.RENDER === 'true') {
    const possiblePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    for (const path of possiblePaths) {
      try {
        await access(path, constants.F_OK);
        logger.info('[BrowserPool] Using system Chrome at', { path });
        _resolvedSystemChromePath = path;
        return _resolvedSystemChromePath;
      } catch {
        // Path doesn't exist or isn't accessible, try next
      }
    }
    logger.warn('[BrowserPool] RENDER=true but no known system Chrome path exists — falling back to Puppeteer auto-discovery', { checked: possiblePaths });
  }

  _resolvedSystemChromePath = undefined;
  return _resolvedSystemChromePath;
}

async function spawnBrowser(): Promise<Browser> {
  // WHY: Configure Puppeteer to use Chrome with proper configuration for cloud environments.
  // Render provides system Chrome, so we try that first, then fall back to Puppeteer's bundled Chrome.
  const launchOptions: LaunchOptions = {
    headless: true,
    args: LAUNCH_ARGS,
  };

  const systemChromePath = await resolveSystemChromePath();
  if (systemChromePath) {
    launchOptions.executablePath = systemChromePath;
  }

  // WHY closeOrphanedLaunch: if puppeteer.launch() resolves after withTimeout()
  // already rejected the race, this hook closes the orphaned browser instead of
  // leaking the OS process (see withTimeout's own WHY comment above).
  const closeOrphanedLaunch = (browser: Browser): void => {
    logger.warn('[BrowserPool] Launch resolved after timeout — closing orphaned browser');
    browser.close().catch(() => {});
  };

  try {
    const browser = await withTimeout(
      puppeteer.launch(launchOptions),
      BROWSER_LAUNCH_TIMEOUT_MS,
      'Browser launch',
      closeOrphanedLaunch,
    );
    return browser;
  } catch (error) {
    // If Chrome fails with explicit path, try without it (auto-discovery).
    // Also invalidate the cached resolved path — a path that exists but fails
    // to launch (stale/incompatible binary) shouldn't keep being retried by
    // every subsequent spawnBrowser() call in this process.
    if (launchOptions.executablePath) {
      logger.warn('[BrowserPool] Failed with explicit path, trying auto-discovery', { path: launchOptions.executablePath });
      _resolvedSystemChromePath = undefined;
      delete launchOptions.executablePath;
      return await withTimeout(
        puppeteer.launch(launchOptions),
        BROWSER_LAUNCH_TIMEOUT_MS,
        'Browser launch (fallback)',
        closeOrphanedLaunch,
      );
    }
    throw error;
  }
}

async function initPool(): Promise<void> {
  if (_poolReady) return;
  _poolReady = true;
  // WHY: use allSettled, not all — if one launch rejects, Promise.all's
  // rejection would leave any already-spawned browsers from the other
  // launches unpushed to _pool (leaked, ungoverned Chromium processes) and
  // _poolReady reset to false would re-spawn POOL_MIN more on the next call,
  // growing the pool unbounded across repeated transient failures.
  const results = await Promise.allSettled(Array.from({ length: POOL_MIN }, () => spawnBrowser()));
  const failures: unknown[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      _pool.push({ browser: result.value, busy: false, reserved: false });
    } else {
      failures.push(result.reason);
    }
  }
  if (_pool.length > 0) {
    logger.info('[BrowserPool] Ready', { instances: _pool.length, max: POOL_MAX });
  } else {
    // NOTE: If no browsers could be launched, the app should still start.
    // Carousel export will fail gracefully when called.
    logger.warn('[BrowserPool] No browsers available - carousel export will be disabled');
  }
  if (failures.length > 0) {
    logger.error('[BrowserPool] Failed to launch some browsers', {
      failedCount: failures.length,
      attempted: POOL_MIN,
      firstError: failures[0] instanceof Error ? failures[0].message : String(failures[0]),
    });
    Sentry.captureException(failures[0], { tags: { action: 'browser-pool-init' } });
    // Allow a retry on the next acquireBrowser() call only if the pool ended
    // up empty — a partial pool (>=1 browser) is still usable, so don't
    // re-trigger POOL_MIN more launches on top of what already succeeded.
    if (_pool.length === 0) _poolReady = false;
  }
}

initPool().catch(() => {});

export async function acquireBrowser(): Promise<PoolEntry> {
  await initPool();

  const free = findFreeSlot();
  if (free) { free.busy = true; return free; }

  // WHY reserve synchronously before awaiting spawnBrowser(): pushing the
  // placeholder entry (reserved:true) here, before any `await`, makes
  // `_pool.length` reflect the reservation immediately. Without this, two
  // concurrent acquireBrowser() calls could both read `_pool.length <
  // POOL_MAX` as true before either finished spawning, growing the pool
  // past POOL_MAX (the documented OOM-prevention cap — see the WHY comment
  // above POOL_MIN/POOL_MAX).
  if (_pool.length < POOL_MAX) {
    const entry: PoolEntry = { browser: null, busy: true, reserved: true };
    _pool.push(entry);
    try {
      entry.browser = await spawnBrowser();
      entry.reserved = false;
      return entry;
    } catch (err) {
      const idx = _pool.indexOf(entry);
      if (idx !== -1) _pool.splice(idx, 1);
      throw err;
    }
  }

  // All slots busy — wait up to RENDER_TIMEOUT_MS
  const deadline = Date.now() + RENDER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 150));
    const slot = findFreeSlot();
    if (slot) { slot.busy = true; return slot; }
  }
  throw new Error('Browser pool exhausted — all slots busy');
}

export function releaseBrowser(entry: PoolEntry): void {
  entry.busy = false;
}

export async function replaceBrokenBrowser(entry: PoolEntry): Promise<void> {
  // WHY timeout here too: a browser already in a broken state (the reason we're
  // replacing it) is exactly the kind of process most likely to hang on close() —
  // without a deadline this would block the pool slot from ever being freed.
  if (entry.browser) {
    try { await withTimeout(entry.browser.close(), BROWSER_LAUNCH_TIMEOUT_MS, 'Browser close'); } catch { /* ignore — treat as failure regardless, we're discarding this entry */ }
  }
  // WHY re-derive idx only at splice time, not cached across the await below:
  // spawnBrowser() awaits, during which _pool can be mutated by a concurrent
  // acquireBrowser()/replaceBrokenBrowser() splice — indexOf by reference
  // (entry identity) computed fresh here (not before the await) always finds
  // this exact entry's current position, or -1 if it was already removed.
  entry.reserved = true;
  try {
    entry.browser = await spawnBrowser();
    entry.busy = false;
    entry.reserved = false;
  } catch (respawnErr) {
    const idx = _pool.indexOf(entry);
    if (idx !== -1) _pool.splice(idx, 1);
    logger.error('[BrowserPool] Removed dead browser after respawn failure', {
      poolSize: _pool.length,
      error: respawnErr instanceof Error ? respawnErr.message : String(respawnErr),
    });
  }
}

// WHY exposed: renderSlideWithPuppeteer's finally block checks pool membership
// before releasing (an entry removed by replaceBrokenBrowser must not be
// released back into a pool it's no longer part of).
export function isInPool(entry: PoolEntry): boolean {
  return _pool.includes(entry);
}

// WHY exposed: renderSlideWithCache needs to fail fast with a clear error when
// no browser could ever be launched, rather than having every caller reach
// into pool internals. Awaits initPool() first so this is race-free the same
// way the pre-extraction inline check was (see the call site's own NOTE).
export async function isPoolAvailable(): Promise<boolean> {
  await initPool();
  return _pool.length > 0;
}

// WHY wait for in-flight reservations first: a synchronous snapshot of _pool
// taken while acquireBrowser() has reserved a slot (browser: null, reserved:
// true) but is still awaiting spawnBrowser() would skip that entry — closing
// only what existed at the instant of the snapshot leaks the browser that
// resolves moments later (orphaned Chromium process surviving shutdown). We
// poll briefly for reservations to settle (bounded by BROWSER_LAUNCH_TIMEOUT_MS,
// the same deadline spawnBrowser() itself is racing against) before taking the
// close snapshot.
async function waitForReservationsToSettle(): Promise<void> {
  const deadline = Date.now() + BROWSER_LAUNCH_TIMEOUT_MS;
  while (Date.now() < deadline && _pool.some((e) => e.reserved)) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

export async function closeBrowserPool() {
  await waitForReservationsToSettle();
  await Promise.allSettled(
    _pool.filter((e): e is PoolEntry & { browser: Browser } => e.browser !== null).map((e) => e.browser.close()),
  );
}

// WHY: shutdown is coordinated centrally in index.ts (HTTP server drain → BullMQ
// worker close → this pool close), not here — registering our own SIGTERM/SIGINT
// handler that calls process.exit(0) directly would race the other two and kill
// in-flight HTTP requests / pipeline jobs before they finish. The 'exit' handler
// stays as a last-resort synchronous cleanup for paths that bypass the
// coordinated shutdown (e.g. an uncaught exception).
process.on('exit', () => { _pool.forEach((e) => { e.browser?.close().catch(() => {}); }); });
