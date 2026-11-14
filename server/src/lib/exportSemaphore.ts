// WHY: process-wide cap on concurrent carousel ZIP exports, separate from
// EXPORT_RENDER_CONCURRENCY (per-ZIP slide batching in carouselSsr.ts). Without
// this, N simultaneous export requests each fire 2 Puppeteer screenshots and
// contend for the same browser pool — exhausting slots / hitting acquire
// timeouts so ZIPs fail or ship incomplete. Fail-fast 429 rather than queueing
// so free-tier RAM stays bounded and clients can retry.

const MAX_CONCURRENT_EXPORTS = 2;
let _activeExports = 0;

/** Returns true if a slot was taken; caller MUST releaseExportSlot() in finally. */
export function tryAcquireExportSlot(): boolean {
  if (_activeExports >= MAX_CONCURRENT_EXPORTS) {
    return false;
  }
  _activeExports += 1;
  return true;
}

export function releaseExportSlot(): void {
  _activeExports = Math.max(0, _activeExports - 1);
}
