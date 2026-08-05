// Puppeteer rendering for carousel slides: a pooled browser, a PNG cache, and the
// screenshot call itself.
//
// NOTE: this file previously also generated slide HTML by prompting Gemini from a
// per-theme "brief" (THEME_META, SYSTEM_PROMPT, generateCarouselTemplate,
// injectSlideContent — roughly 1100 lines). That produced a design unrelated to the one
// users saw on screen, and a different one on each run. Slide HTML is now server-rendered
// from the same React components the client draws (see lib/carouselSsr.ts), so all of
// that was removed along with the /render-slides endpoints.
import * as Sentry from '@sentry/node';
import puppeteer from 'puppeteer';
import type { Browser, LaunchOptions } from 'puppeteer';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { createHash } from 'crypto';
import { logger } from './logger.js';
import {
  getPngCacheEntry,
  isPngCacheEntryFresh,
  touchAndGetPngCacheEntry,
  removeStalePngCacheEntry,
  addPngCacheEntry,
  stopPngCacheSweep,
} from './pngCache.js';

export { stopPngCacheSweep };

// Retained because the export route and PNG cache key still identify slides by theme.
export type ThemeKey = 'aurora' | 'magazine' | 'split' | 'bold' | 'minimal' | 'neon' | 'violet' | 'crimson' | 'rose';

// SECURITY: strips scripts and event handlers from HTML before Puppeteer loads it.
// setJavaScriptEnabled(false) in the renderer is the primary defense; this is a
// defense-in-depth layer that removes JS before the page is even parsed.
//
// WHY <\/script\s*> not <\/script>: whitespace between a tag name and its
// closing `>` is valid in an HTML end tag per the WHATWG tokenizer spec (e.g.
// `</script >` or `</script\n>` both parse as a real closing </script> tag in
// any conformant browser, including headless Chromium) — the original literal
// `<\/script>` didn't tolerate that, so a payload like
// `<script\n>fetch(...)</script\n>` slipped through unstripped. Caught by
// tests/unit/carousel.test.ts's "irregular internal whitespace/newlines" case.
export function stripScriptsAndEventHandlers(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'removed:')
    .replace(/data\s*:\s*text\/html/gi, 'removed:')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
}

// WHY Browser pool: launching a new Chromium process takes ~800ms and ~150MB RAM.
// Pre-warming POOL_MIN browsers at startup eliminates cold-start latency for the
// first render requests. The pool auto-scales up to POOL_MAX and then queues.
// Prevents OOM when many users render carousels concurrently.

const POOL_MIN = 2;
const POOL_MAX = 8;
const RENDER_TIMEOUT_MS = 60_000;
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

interface PoolEntry {
  browser: Browser;
  busy: boolean;
}

const _pool: PoolEntry[] = [];
let _poolReady = false;

// WHY a shared helper: both spawnBrowser and replaceBrokenBrowser's close() need
// the identical "race against a deadline, reject on timeout" behavior — inlining
// it twice would risk the two timeouts drifting apart later.
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs),
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

  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
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
  if (process.env.RENDER === 'true') {
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

  try {
    const browser = await withTimeout(
      puppeteer.launch(launchOptions),
      BROWSER_LAUNCH_TIMEOUT_MS,
      'Browser launch',
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
      _pool.push({ browser: result.value, busy: false });
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
    console.error('[BrowserPool] Failed to launch', failures.length, 'of', POOL_MIN, 'browsers:', failures[0]);
    Sentry.captureException(failures[0], { tags: { action: 'browser-pool-init' } });
    // Allow a retry on the next acquireBrowser() call only if the pool ended
    // up empty — a partial pool (>=1 browser) is still usable, so don't
    // re-trigger POOL_MIN more launches on top of what already succeeded.
    if (_pool.length === 0) _poolReady = false;
  }
}

initPool().catch(() => {});

async function acquireBrowser(): Promise<PoolEntry> {
  await initPool();

  const free = _pool.find((e) => !e.busy);
  if (free) { free.busy = true; return free; }

  if (_pool.length < POOL_MAX) {
    const browser = await spawnBrowser();
    const entry: PoolEntry = { browser, busy: true };
    _pool.push(entry);
    return entry;
  }

  // All slots busy — wait up to RENDER_TIMEOUT_MS
  const deadline = Date.now() + RENDER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 150));
    const slot = _pool.find((e) => !e.busy);
    if (slot) { slot.busy = true; return slot; }
  }
  throw new Error('Browser pool exhausted — all slots busy');
}

function releaseBrowser(entry: PoolEntry): void {
  entry.busy = false;
}

async function replaceBrokenBrowser(entry: PoolEntry): Promise<void> {
  // WHY timeout here too: a browser already in a broken state (the reason we're
  // replacing it) is exactly the kind of process most likely to hang on close() —
  // without a deadline this would block the pool slot from ever being freed.
  try { await withTimeout(entry.browser.close(), BROWSER_LAUNCH_TIMEOUT_MS, 'Browser close'); } catch { /* ignore — treat as failure regardless, we're discarding this entry */ }
  const idx = _pool.indexOf(entry);
  try {
    entry.browser = await spawnBrowser();
    entry.busy = false;
  } catch (err) {
    if (idx !== -1) _pool.splice(idx, 1);
    console.error('[BrowserPool] Removed dead browser, pool size:', _pool.length);
  }
}

export async function closeBrowserPool() {
  await Promise.allSettled(_pool.map((e) => e.browser.close()));
}

// WHY: shutdown is coordinated centrally in index.ts (HTTP server drain → BullMQ
// worker close → this pool close), not here — registering our own SIGTERM/SIGINT
// handler that calls process.exit(0) directly would race the other two and kill
// in-flight HTTP requests / pipeline jobs before they finish. The 'exit' handler
// stays as a last-resort synchronous cleanup for paths that bypass the
// coordinated shutdown (e.g. an uncaught exception).
process.on('exit', () => { _pool.forEach((e) => e.browser.close().catch(() => {})); });

/**
 * CSS-pixel box to lay out, plus the scale factor applied when rasterizing.
 * WHY deviceScaleFactor rather than a CSS transform: the layout runs at the same CSS
 * size as the on-screen preview (so text wraps on identical line breaks) and Chromium
 * rasterizes at higher resolution. A transform would scale blur radii and hardcoded
 * SVG viewports instead, which does not reproduce the preview.
 */
export interface RenderViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

const DEFAULT_VIEWPORT: RenderViewport = { width: 1080, height: 1080, deviceScaleFactor: 1 };

export async function renderSlideWithPuppeteer(
  html: string,
  viewport: RenderViewport = DEFAULT_VIEWPORT,
): Promise<string> {
  const entry = await acquireBrowser();
  let page: Awaited<ReturnType<Browser['newPage']>> | null = null;

  try {
    page = await entry.browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor,
    });

    // SECURITY: JS disabled — carousel slides are pure HTML/CSS; no JS is needed.
    // Even after stripScriptsAndEventHandlers, disabling the engine at the browser
    // level ensures any bypassed script tag is a no-op. Defense-in-depth.
    await page.setJavaScriptEnabled(false);

    // Block script/XHR/fetch; allow document, stylesheet, font (Google Fonts CDN)
    await page.setRequestInterception(true);
    page.on('request', (interceptedReq) => {
      const type = interceptedReq.resourceType();
      if (['script', 'xhr', 'fetch', 'websocket', 'other'].includes(type)) {
        interceptedReq.abort();
      } else {
        interceptedReq.continue();
      }
    });

    // networkidle2 = wait until ≤2 requests in-flight for 500ms; lets Google Font
    // requests complete in the background while the page is already visually ready.
    // WHY the cast: Puppeteer's SetContentWaitForOptions type deliberately
    // excludes 'networkidle0'/'networkidle2' from setContent()'s waitUntil (they're
    // typed as goto()-only), but setContent() still genuinely triggers real network
    // activity here — the HTML references Google Fonts, so waiting on network
    // idle is correct runtime behavior even though the type doesn't officially
    // sanction it for this method. TS requires the through-unknown two-step (a
    // direct cast is rejected as "insufficient overlap") — scoped to exactly this
    // options object, not a blanket `any` that would loosen type-checking on
    // anything else in this function.
    const setContentOptions = { waitUntil: 'networkidle2', timeout: 25000 } as unknown as Parameters<typeof page.setContent>[1];
    const contentLoad = page.setContent(html, setContentOptions);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Render timed out after ${RENDER_TIMEOUT_MS / 1000}s`)), RENDER_TIMEOUT_MS),
    );
    await Promise.race([contentLoad, timeout]);

    // small pause to ensure fonts/images painted
    await new Promise((r) => setTimeout(r, 50));

    // NOTE: clip is in CSS px; Puppeteer multiplies by deviceScaleFactor, so a
    // 420x525 clip at DSF 2.571 yields a 1080x1350 PNG.
    const buffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    }) as Buffer;

    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (err) {
    await replaceBrokenBrowser(entry);
    throw err;
  } finally {
    try { await page?.close(); } catch { /* ignore */ }
    if (_pool.includes(entry)) releaseBrowser(entry);
  }
}

export async function renderSlideWithCache(
  html: string,
  jobId: string,
  slideIndex: number,
  theme: ThemeKey,
  viewport: RenderViewport = DEFAULT_VIEWPORT,
): Promise<string> {
  // NOTE: gate on the pool actually having a browser (checked live), not a
  // separately-tracked availability flag. POOL_MIN=2 browsers spawn
  // concurrently in initPool() via Promise.allSettled; a flag independently
  // written by each racing spawnBrowser() call has no ordering guarantee
  // between them and could get stuck reporting unavailable even after a
  // healthy browser landed in the pool. initPool() awaits allSettled before
  // this check runs, so _pool.length here is race-free.
  await initPool();
  if (_pool.length === 0) {
    throw new Error('Carousel export is not available - Puppeteer browser pool could not be initialized');
  }

  const contentHash = createHash('sha256').update(html).digest('hex').slice(0, 12);
  // WHY the viewport is part of the key: the same HTML rendered at 1080x1080 and at
  // 1080x1350 produces different PNGs. Without it, entries cached by one size would be
  // served for the other.
  const size = `${viewport.width}x${viewport.height}@${viewport.deviceScaleFactor}`;
  const key = `png:${jobId}:${slideIndex}:${theme}:${size}:${contentHash}`;

  const cached = getPngCacheEntry(key);
  if (cached && isPngCacheEntryFresh(cached)) {
    return touchAndGetPngCacheEntry(key, cached); // bump recency
  }
  if (cached) removeStalePngCacheEntry(key); // expired — remove rather than leave for the sweep

  const dataUrl = await renderSlideWithPuppeteer(html, viewport);
  addPngCacheEntry(key, dataUrl);
  return dataUrl;
}
