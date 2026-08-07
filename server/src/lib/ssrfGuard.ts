// lib/ssrfGuard.ts — shared SSRF guard for any route/worker that fetches a
// user-supplied URL server-side (Repurpose's article fetch, feed monitors'
// RSS fetch). Extracted from routes/content/repurpose.ts (the original
// implementation) so both call sites share one hardening pass instead of
// drifting — see CODE_REVIEW_FULL_CODEBASE.md's feed-monitors SSRF finding.
import { promises as dns } from 'dns';
import { isIP } from 'net';

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
}

// WHY both a raw string pattern AND a normalized check: an IPv6 address has
// multiple textual forms for the same address (e.g. "::ffff:127.0.0.1" and
// "::ffff:7f00:1" both mean IPv4-mapped 127.0.0.1) — a single regex anchored
// to one form misses the others. isPrivateOrReservedIp normalizes via
// Node's own IPv4-mapped-IPv6 unwrapping before falling back to the regex,
// so DNS-resolved addresses are checked in whatever form the resolver
// returns them, not just the exact strings the regex enumerates.
const ssrfPattern = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|::$|0\.0\.0\.0|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

export function isPrivateOrReservedIp(address: string): boolean {
  if (ssrfPattern.test(address)) return true;
  // Unwrap IPv4-mapped/compatible IPv6 forms ("::ffff:a.b.c.d" or its
  // hex-quad equivalent "::ffff:7f00:1") down to the plain IPv4 string and
  // re-check — Node's `net.isIPv6` family alone won't do this unwrapping.
  const mappedMatch = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch) return ssrfPattern.test(mappedMatch[1]);
  const hexMappedMatch = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hexMappedMatch) {
    const hi = parseInt(hexMappedMatch[1], 16);
    const lo = parseInt(hexMappedMatch[2], 16);
    const ipv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    return ssrfPattern.test(ipv4);
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

  const hostname = parsedUrl.hostname;
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
