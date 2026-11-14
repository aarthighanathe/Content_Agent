// lib/ssrfGuard.ts — shared SSRF guard for any route/worker that fetches a
// user-supplied URL server-side (Repurpose's article fetch, feed monitors'
// RSS fetch). Extracted from routes/content/repurpose.ts (the original
// implementation) so both call sites share one hardening pass instead of
// drifting — see CODE_REVIEW_FULL_CODEBASE.md's feed-monitors SSRF finding.
import { promises as dns } from 'dns';
import { BlockList, isIP } from 'net';
import { pinnedRequest } from './pinnedRequest.js';

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
}

// WHY: both a raw string pattern AND a normalized check: an IPv6 address has
// multiple textual forms for the same address (e.g. "::ffff:127.0.0.1" and
// "::ffff:7f00:1" both mean IPv4-mapped 127.0.0.1) — a single regex anchored
// to one form misses the others. isPrivateOrReservedIp normalizes via
// Node's own IPv4-mapped-IPv6 unwrapping before falling back to the regex,
// so DNS-resolved addresses are checked in whatever form the resolver
// returns them, not just the exact strings the regex enumerates.
const ssrfPattern = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|::$|0\.0\.0\.0|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

/** Strip URL.hostname IPv6 brackets (`[::1]` → `::1`) before isIP / private checks. */
export function unwrapHostnameIp(address: string): string {
  if (address.startsWith('[') && address.endsWith(']') && address.length > 2) {
    return address.slice(1, -1);
  }
  return address;
}

// SECURITY: CIDR-based blocklist (Node built-in, no new deps) covers ranges the
// literal-prefix regex above misses: all of 0.0.0.0/8, multicast/reserved
// 224.0.0.0/3, benchmarking and documentation nets, IPv6 ULA/link-local/
// multicast, 6to4 and NAT64 (which can embed private IPv4 addresses).
const reservedBlockList = new BlockList();
const RESERVED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 3],
];
// WHY: no ::ffff:0:0/96: Node's BlockList treats that mapped range as matching
// EVERY IPv4 address when check(..., 'ipv4') runs — Cloudflare/public A records
// were rejected as "private". IPv4-mapped forms are unwrapped below instead.
const RESERVED_V6: Array<[string, number]> = [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96],
  ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
];
for (const [net, prefix] of RESERVED_V4) reservedBlockList.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of RESERVED_V6) reservedBlockList.addSubnet(net, prefix, 'ipv6');

export function isPrivateOrReservedIp(address: string): boolean {
  // WHY: unwrap first: Node's URL.hostname for http://[::1]/ is "[::1]", and
  // net.isIP('[::1]') is 0 — without this, loopback IPv6 was only fail-closed
  // via DNS ENOTFOUND, not recognized as private (SEC-004).
  const normalized = unwrapHostnameIp(address);
  if (ssrfPattern.test(normalized)) return true;
  const family = isIP(normalized);
  if (family === 4 || family === 6) {
    try {
      if (reservedBlockList.check(normalized, family === 4 ? 'ipv4' : 'ipv6')) return true;
    } catch {
      // WHY: fail closed: an address the blocklist can't evaluate is not provably public.
      return true;
    }
  }
  // Unwrap IPv4-mapped/compatible IPv6 forms ("::ffff:a.b.c.d" or its
  // hex-quad equivalent "::ffff:7f00:1") down to the plain IPv4 string and
  // re-check — Node's `net.isIPv6` family alone won't do this unwrapping.
  // SECURITY: unwrap IPv4-mapped IPv6 and re-run the full IPv4 check (regex +
  // BlockList), not just the prefix regex — otherwise 10.0.0.1 via ::ffff: would
  // be caught but 192.0.2.1 (documentation net, BlockList-only) would slip through.
  const mappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch?.[1]) return isPrivateOrReservedIp(mappedMatch[1]);
  const hexMappedMatch = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hexMappedMatch) {
    const hi = parseInt(hexMappedMatch[1], 16);
    const lo = parseInt(hexMappedMatch[2], 16);
    const ipv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    return isPrivateOrReservedIp(ipv4);
  }
  return false;
}

// SECURITY: checking the literal hostname string alone is bypassable via DNS
// rebinding (a public hostname whose A/AAAA record points at a private/
// loopback/link-local address, e.g. a cloud metadata endpoint) — fetch()
// would still happily connect to whatever the resolver returns. Resolving
// here and validating every returned address closes that gap; a residual
// TOCTOU window between this lookup and the caller's own fetch/parse internal
// lookup is a standard, accepted risk tier for this mitigation (eliminating it
// fully would require pinning fetch to a specific resolved IP via a custom
// dispatcher, which isn't available without adding a new dependency).
export async function assertUrlIsPublic(url: string): Promise<UrlSafetyResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('protocol');
  } catch {
    return { safe: false, reason: 'Invalid URL — must start with http:// or https://' };
  }

  const hostname = unwrapHostnameIp(parsedUrl.hostname);
  if (isPrivateOrReservedIp(hostname)) {
    return { safe: false, reason: 'URL points to a private or reserved address' };
  }

  try {
    const addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await dns.lookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (isPrivateOrReservedIp(address)) {
        return { safe: false, reason: 'URL points to a private or reserved address' };
      }
    }
  } catch {
    return { safe: false, reason: 'Could not resolve that URL — check that it is publicly accessible' };
  }

  return { safe: true };
}

export type PinResult =
  | { safe: true; address: string; family: 4 | 6 }
  | { safe: false; reason: string };

// SECURITY: resolve once, validate EVERY returned address, and hand back the
// first one so the caller can pin its connection to it (no re-resolution).
export async function lookupAndAssertPublic(url: string): Promise<PinResult> {
  const safety = await assertUrlIsPublic(url);
  if (!safety.safe) {
    return { safe: false, reason: safety.reason ?? 'URL points to a private or reserved address' };
  }
  const hostname = unwrapHostnameIp(new URL(url).hostname);
  const literal = isIP(hostname);
  if (literal === 4 || literal === 6) return { safe: true, address: hostname, family: literal };
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    // WHY: re-validate: this is a fresh lookup (assertUrlIsPublic's result isn't
    // returned), so the pinned address itself must pass the check.
    const first = addresses[0];
    if (!first || addresses.some((a) => isPrivateOrReservedIp(a.address))) {
      return { safe: false, reason: 'URL points to a private or reserved address' };
    }
    return { safe: true, address: first.address, family: first.family === 6 ? 6 : 4 };
  } catch {
    return { safe: false, reason: 'Could not resolve that URL — check that it is publicly accessible' };
  }
}

export interface GuardedFetchResult {
  ok: true;
  response: Response;
}
export interface GuardedFetchFailure {
  ok: false;
  reason: string;
}

const MAX_REDIRECT_HOPS = 5;

// SECURITY: assertUrlIsPublic() alone only validates the *initial* URL — the
// native fetch() (and rss-parser's own HTTP client) follow HTTP redirects by
// default with no re-validation of the redirect target, so a public URL that
// 302s to http://169.254.169.254/... (cloud metadata) or an internal service
// transparently bypasses the guard entirely. This wrapper follows redirects
// manually (`redirect: 'manual'`) and re-runs assertUrlIsPublic() on every
// `Location` header before following it, capped at MAX_REDIRECT_HOPS to avoid
// an infinite/hostile redirect chain becoming a hang. Both consumers of
// user-supplied URLs (repurpose.ts's article fetch, feedMonitorWorker.ts's
// RSS fetch) should call this instead of fetch()/parseURL() directly.
// WHY: body is rejected outright rather than forwarded across hops: a
// ReadableStream (or any other one-shot body) consumed by hop 0's fetch()
// would be exhausted by the time a later hop tries to resend the identical
// `options` object, throwing or hanging depending on the stream
// implementation. Both current callers (repurpose.ts, feedMonitorWorker.ts)
// only ever pass GET-shaped options (signal/headers, no body), so this is a
// documented restriction on a general-purpose export, not a functional
// change for any real call site today.
export async function fetchWithSsrfGuard(
  url: string,
  options: RequestInit = {},
): Promise<GuardedFetchResult | GuardedFetchFailure> {
  if (options.body) {
    return { ok: false, reason: 'fetchWithSsrfGuard does not support request bodies (redirect hops cannot safely resend a consumed body)' };
  }

  let currentUrl = url;

  try {
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const pin = await lookupAndAssertPublic(currentUrl);
      if (!pin.safe) {
        return { ok: false, reason: pin.reason };
      }

      // SECURITY: connect to the IP we just validated (not a second DNS lookup).
      const response = await pinnedRequest(new URL(currentUrl), pin.address, pin.family, options);

      // A `redirect: 'manual'` response for a 3xx is an "opaqueredirect" type
      // response in browser fetch semantics, but Node's undici implementation
      // surfaces it as a normal response object with status 3xx and a
      // Location header — check status directly rather than response.type.
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return { ok: false, reason: 'Redirect response had no Location header' };
        }
        if (hop === MAX_REDIRECT_HOPS) {
          return { ok: false, reason: 'Too many redirects' };
        }
        // Location may be relative — resolve against the current URL.
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      return { ok: true, response };
    }

    // WHY: unreachable in practice, kept as a type-safety backstop: every
    // in-loop path returns before falling through, and the loop's own
    // `hop === MAX_REDIRECT_HOPS` guard above returns before the final
    // iteration could ever fall off the end — but TypeScript can't prove
    // that from the loop shape alone, so the function needs an explicit
    // return here to type-check as always returning.
    return { ok: false, reason: 'Too many redirects' };
  } catch (err) {
    // WHY: caught here instead of left to propagate: folds a raw network
    // error (DNS failure, connection reset, abort) into the same
    // {ok:false, reason} shape every other failure in this function already
    // returns, so callers don't need a second, differently-shaped error path
    // just for network-level failures.
    // WHY: formatFetchError: undici often surfaces only the opaque "fetch failed"
    // message while the actionable code (ETIMEDOUT, CERT_*, etc.) lives on
    // `error.cause` — without unwrapping, feed-monitor lastError / Repurpose
    // failures look identical and are impossible to diagnose or retry by class.
    return { ok: false, reason: formatFetchError(err) };
  }
}

// SECURITY: preferred name for new call sites — DNS-pinned, redirect-revalidated fetch.
export const fetchPublicUrl = fetchWithSsrfGuard;

// WHY: exported: feedMonitorWorker retries on transient classes and wants the
// same human-readable string it would store in lastError / return to create.
export function formatFetchError(err: unknown): string {
  if (!(err instanceof Error)) return String(err) || 'Network request failed';
  const parts: string[] = [];
  const push = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed && !parts.includes(trimmed)) parts.push(trimmed);
  };
  push(err.message || 'Network request failed');
  let current: unknown = err.cause;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) {
      push(current.message);
      const code = (current as NodeJS.ErrnoException).code;
      if (typeof code === 'string') push(code);
      current = current.cause;
      continue;
    }
    if (typeof current === 'object' && current !== null && 'code' in current) {
      const code = (current as { code?: unknown }).code;
      if (typeof code === 'string') push(code);
    }
    break;
  }
  return parts.join(': ') || 'Network request failed';
}

// WHY: feed monitor Check now / cron hit transient undici "fetch failed" /
// timeout / reset more often than permanent HTTP 4xx — those should retry,
// while SSRF blocks and "too many redirects" should not.
export function isRetryableFetchFailure(reason: string): boolean {
  const lower = reason.toLowerCase();
  return (
    lower.includes('fetch failed')
    || lower.includes('network request failed')
    || lower.includes('timeout')
    || lower.includes('aborted')
    || lower.includes('econnreset')
    || lower.includes('econnrefused')
    || lower.includes('etimedout')
    || lower.includes('enotfound')
    || lower.includes('eai_again')
    || lower.includes('socket')
    || lower.includes('tls')
    || lower.includes('cert')
  );
}

/**
 * Map internal fetch/SSRF failure strings to stable client copy.
 * SECURITY: formatFetchError() joins undici cause chains (IPs, errno codes,
 * TLS details) — never return that raw string in HTTP bodies or lastError UI.
 * Classify with isRetryableFetchFailure(detailed) first; then sanitize here.
 */
export function toClientFetchFailureMessage(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) {
    return 'Could not fetch that URL — make sure it is a public page and try again';
  }
  // Already-safe SSRF / validation messages from assertUrlIsPublic / guard hops.
  if (
    trimmed.startsWith('Invalid URL')
    || trimmed.startsWith('URL points to a private')
    || trimmed.startsWith('Could not resolve that URL')
    || trimmed === 'Too many redirects'
    || trimmed.startsWith('Redirect response had no Location')
  ) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('timeout')
    || lower.includes('etimedout')
    || lower.includes('aborted')
  ) {
    return 'That URL timed out — try again in a moment';
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo') || lower.includes('eai_again')) {
    return 'Could not resolve that URL — check that it is publicly accessible';
  }
  if (lower.includes('cert') || lower.includes('ssl') || lower.includes('tls')) {
    return 'Could not establish a secure connection to that URL';
  }
  if (
    lower.includes('byte cap')
    || lower.includes('too large')
    || lower.includes('exceeds')
  ) {
    return 'That feed or page is too large to process';
  }
  if (
    lower.includes('econnrefused')
    || lower.includes('econnreset')
    || lower.includes('fetch failed')
    || lower.includes('network request failed')
    || lower.includes('socket')
  ) {
    return 'Could not reach that URL — make sure it is publicly accessible';
  }
  return 'Could not fetch that URL — make sure it is a public page and try again';
}
