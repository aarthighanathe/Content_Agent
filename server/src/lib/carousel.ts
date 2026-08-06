// Puppeteer rendering for carousel slides: a pooled browser, a PNG cache, and the
// screenshot call itself.
//
// NOTE: this file previously also generated slide HTML by prompting Gemini from a
// per-theme "brief" (THEME_META, SYSTEM_PROMPT, generateCarouselTemplate,
// injectSlideContent — roughly 1100 lines). That produced a design unrelated to the one
// users saw on screen, and a different one on each run. Slide HTML is now server-rendered
// from the same React components the client draws (see lib/carouselSsr.ts), so all of
// that was removed along with the /render-slides endpoints.
import { createHash } from 'crypto';
import {
  getPngCacheEntry,
  isPngCacheEntryFresh,
  touchAndGetPngCacheEntry,
  removeStalePngCacheEntry,
  addPngCacheEntry,
  stopPngCacheSweep,
} from './pngCache.js';
// WHY imported from browserPool.ts, not defined here: the pool machinery (launch,
// acquire/release, health-replace) was extracted to keep this file under the
// 400-line cap once the carousel template system added templateId/paletteId
// cache-key handling below. closeBrowserPool is re-exported so index.ts's
// existing `import { closeBrowserPool } from './lib/carousel.js'` keeps working.
import {
  acquireBrowser,
  releaseBrowser,
  replaceBrokenBrowser,
  isInPool,
  isPoolAvailable,
  closeBrowserPool,
  RENDER_TIMEOUT_MS,
} from './browserPool.js';
import type { Browser } from 'puppeteer';

export { stopPngCacheSweep, closeBrowserPool };

// Retained because the export route and PNG cache key still identify slides by theme.
export type LegacyThemeKey =
  | 'aurora'
  | 'magazine'
  | 'split'
  | 'bold'
  | 'minimal'
  | 'neon'
  | 'violet'
  | 'crimson'
  | 'rose';

// New carousel-template-system IDs (client/src/lib/templateSystem.ts's TemplateId,
// mirrored server-side the same way schemas/jobs.ts's VALID_TEMPLATE_IDS is).
export type NewTemplateKey =
  | 'modern-minimal'
  | 'bold-statement'
  | 'editorial-classic'
  | 'tech-modern'
  | 'vibrant-pop'
  | 'luxury-dark'
  | 'clean-corporate'
  | 'creative-abstract'
  | 'storyteller'
  | 'social-media';

// WHY still a flat union, not kept fully separate: renderSlideWithCache's cache
// key picks between the two schemes at runtime via `templateId || paletteId`
// (see below) — a caller passing a legacy `theme` alongside a stray
// `templateId`/`paletteId` gets routed to the template branch and `theme` is
// discarded for key-building purposes, by design (the template selection wins).
// `theme` itself stays required in exportCarouselSsrSchema as the fallback key
// for callers with no template/palette selected.
export type ThemeKey = LegacyThemeKey | NewTemplateKey;

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
    if (isInPool(entry)) releaseBrowser(entry);
  }
}

export async function renderSlideWithCache(
  html: string,
  jobId: string,
  slideIndex: number,
  theme: ThemeKey,
  viewport: RenderViewport = DEFAULT_VIEWPORT,
  templateId?: string,
  paletteId?: string,
): Promise<string> {
  // NOTE: gate on the pool actually having a browser (checked live), not a
  // separately-tracked availability flag. POOL_MIN=2 browsers spawn
  // concurrently in initPool() via Promise.allSettled; a flag independently
  // written by each racing spawnBrowser() call has no ordering guarantee
  // between them and could get stuck reporting unavailable even after a
  // healthy browser landed in the pool. isPoolAvailable() awaits initPool's
  // allSettled before checking, so this is race-free.
  if (!(await isPoolAvailable())) {
    throw new Error('Carousel export is not available - Puppeteer browser pool could not be initialized');
  }

  const contentHash = createHash('sha256').update(html).digest('hex').slice(0, 12);
  // WHY the viewport is part of the key: the same HTML rendered at 1080x1080 and at
  // 1080x1350 produces different PNGs. Without it, entries cached by one size would be
  // served for the other.
  const size = `${viewport.width}x${viewport.height}@${viewport.deviceScaleFactor}`;
  // Include templateId/paletteId in the cache key whenever either is present —
  // previously this fell back to the legacy `theme` key unless BOTH were set,
  // so a caller sending only one of the two (both fields are independently
  // optional in the zod schema) would silently collide with plain-theme cache
  // entries that share no relationship to it.
  const templateKey = templateId || paletteId ? `${templateId ?? ''}:${paletteId ?? ''}` : theme;
  const key = `png:${jobId}:${slideIndex}:${templateKey}:${size}:${contentHash}`;

  const cached = getPngCacheEntry(key);
  if (cached && isPngCacheEntryFresh(cached)) {
    return touchAndGetPngCacheEntry(key, cached); // bump recency
  }
  if (cached) removeStalePngCacheEntry(key); // expired — remove rather than leave for the sweep

  const dataUrl = await renderSlideWithPuppeteer(html, viewport);
  addPngCacheEntry(key, dataUrl);
  return dataUrl;
}
