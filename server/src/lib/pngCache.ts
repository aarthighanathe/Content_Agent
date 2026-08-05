// Bounded, TTL-swept LRU cache for exported carousel-slide PNGs. Extracted out of
// carousel.ts (which was pushing past this repo's 400-line file cap) — this module
// owns only the cache's own state and eviction policy; carousel.ts calls into it.
import { logger } from './logger.js';

// WHY: PNG cache — a Puppeteer screenshot takes 0.5-2s per slide. Re-exporting without
// changing slide content returns the cached base64 PNG instantly.
// Key includes jobId + slideIndex + theme + viewport + content hash to ensure correctness.
const pngCache = new Map<string, { dataUrl: string; cachedAt: number; sizeBytes: number }>();
const PNG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// WHY these caps exist: PNG_CACHE_TTL_MS alone was only checked lazily on read — an
// expired entry was skipped when read but never actively evicted, and there was no
// upper bound at all otherwise. Each entry is a full base64 PNG (~200-800KB per the
// export route's own viewport sizes), so with no active eviction this Map only ever
// grows for the lifetime of the process — a slow, guaranteed OOM under sustained
// export volume, not just a theoretical concern.
//
// WHY ~40MB rather than a larger/rounder number: this app's Render deployment
// (render.yaml: plan: free) has 512MB total RAM, and the Puppeteer browser pool in
// carousel.ts already reserves ~150MB per browser — 300MB at POOL_MIN=2, up to
// 1.2GB at POOL_MAX=8 under load. A cache cap sized against a generic "how much PNG
// data is reasonable" heuristic (e.g. 100MB+) would leave dangerously little headroom
// once the browser pool is actually under load; 40MB is small enough to coexist with
// it on the free tier while still caching a meaningful number of recent exports.
// Both caps are checked — whichever is hit first triggers eviction — since entry
// count alone doesn't bound memory when individual sizes vary ~4x (200-800KB).
const PNG_CACHE_MAX_BYTES = 40 * 1024 * 1024; // ~40MB — see WHY above
const PNG_CACHE_MAX_ENTRIES = 100; // safety cap independent of size — see WHY above
let _pngCacheTotalBytes = 0;

function deletePngCacheEntry(key: string): void {
  const entry = pngCache.get(key);
  if (!entry) return;
  pngCache.delete(key);
  _pngCacheTotalBytes -= entry.sizeBytes;
}

// WHY delete+re-set rather than just returning the existing entry on a hit: Map
// iteration order is insertion order, and re-inserting a key moves it to the end —
// this is what makes evictOldestPngCacheEntries's "evict from the front" behavior a
// real LRU (least-recently-READ) instead of merely least-recently-WRITTEN. Without
// this, a frequently re-exported slide could still be evicted while sitting next to
// entries nobody has touched since they were cached.
function touchPngCacheEntry(key: string, entry: { dataUrl: string; cachedAt: number; sizeBytes: number }): void {
  pngCache.delete(key);
  pngCache.set(key, entry);
}

// WHY a function, not just "delete until under cap" inlined at the call site: this
// same eviction logic runs from two places — after every write (addPngCacheEntry)
// and from the periodic sweep (sweepExpiredPngCacheEntries) — so it needs to be
// idempotent and callable standalone rather than duplicated.
function evictOldestPngCacheEntries(): void {
  // Map iteration is insertion order, so the first key is the least-recently-used
  // entry (see touchPngCacheEntry above for why reads count as a fresh insertion).
  while (
    pngCache.size > 0 &&
    (pngCache.size > PNG_CACHE_MAX_ENTRIES || _pngCacheTotalBytes > PNG_CACHE_MAX_BYTES)
  ) {
    const oldestKey = pngCache.keys().next().value;
    if (oldestKey === undefined) break;
    deletePngCacheEntry(oldestKey);
  }
}

export function getPngCacheEntry(key: string): { dataUrl: string; cachedAt: number; sizeBytes: number } | undefined {
  return pngCache.get(key);
}

export function isPngCacheEntryFresh(entry: { cachedAt: number }): boolean {
  return Date.now() - entry.cachedAt < PNG_CACHE_TTL_MS;
}

export function touchAndGetPngCacheEntry(key: string, entry: { dataUrl: string; cachedAt: number; sizeBytes: number }): string {
  touchPngCacheEntry(key, entry);
  return entry.dataUrl;
}

export function removeStalePngCacheEntry(key: string): void {
  deletePngCacheEntry(key);
}

export function addPngCacheEntry(key: string, dataUrl: string): void {
  const sizeBytes = Buffer.byteLength(dataUrl, 'utf8');
  pngCache.set(key, { dataUrl, cachedAt: Date.now(), sizeBytes });
  _pngCacheTotalBytes += sizeBytes;
  evictOldestPngCacheEntries();
}

// WHY an active sweep, not just the lazy TTL check on read: an entry for a job that's
// never re-exported (the common case — most exports happen once) would otherwise sit
// in memory until the process restarts, since nothing ever reads it again to trigger
// the lazy expiry check. This periodic pass is what actually bounds memory over the
// process's real lifetime rather than only in the read-heavy case.
const PNG_CACHE_SWEEP_INTERVAL_MS = 45 * 60 * 1000; // 45 min — within the requested 30-60 min range

function sweepExpiredPngCacheEntries(): void {
  const now = Date.now();
  let evicted = 0;
  for (const [key, entry] of pngCache) {
    if (now - entry.cachedAt >= PNG_CACHE_TTL_MS) {
      deletePngCacheEntry(key);
      evicted++;
    }
  }
  if (evicted > 0) {
    logger.info('[PNGCache] Swept expired entries', { evicted, remaining: pngCache.size, totalBytes: _pngCacheTotalBytes });
  }
}

// WHY unref(): a setInterval keeps the Node event loop alive by default, which would
// prevent the process from exiting on its own even with no other pending work — the
// same reasoning as index.ts's forceExit.unref() in the shutdown handler. unref()
// lets the process exit naturally if this were the only thing left running; the
// shutdown handler still explicitly clears it for a clean, immediate stop during the
// coordinated graceful-shutdown sequence.
const _pngCacheSweepInterval = setInterval(sweepExpiredPngCacheEntries, PNG_CACHE_SWEEP_INTERVAL_MS);
_pngCacheSweepInterval.unref();

export function stopPngCacheSweep(): void {
  clearInterval(_pngCacheSweepInterval);
}
