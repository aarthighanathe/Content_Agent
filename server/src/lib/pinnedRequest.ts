// lib/pinnedRequest.ts — one HTTP(S) request whose TCP connection is pinned to an
// already-validated IP. Used only by ssrfGuard.ts's fetchPublicUrl().
import http from 'http';
import https from 'https';
import { Readable } from 'stream';
import zlib from 'zlib';

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

// SECURITY: the `lookup` override makes the socket connect to `pinnedIp` no
// matter what the hostname resolves to later, closing the DNS-rebinding TOCTOU
// window between validation and connect. The URL (and so Host header + TLS SNI
// / certificate verification) keeps the original hostname.
export function pinnedRequest(
  url: URL,
  pinnedIp: string,
  family: 4 | 6,
  init: RequestInit,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const headers = new Headers(init.headers);
    // WHY: identity-first: we decode gzip/br/deflate ourselves below, but asking
    // for identity keeps memory/CPU predictable for hostile servers.
    if (!headers.has('accept-encoding')) headers.set('accept-encoding', 'identity');
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });

    const req = client.request(
      url,
      {
        method: init.method ?? 'GET',
        headers: headerObj,
        signal: init.signal ?? undefined,
        lookup: (_host, _opts, cb) => {
          // WHY: both shapes: Node may request all addresses (`all: true`) or one.
          (cb as (err: null, address: unknown, fam?: number) => void)(
            null,
            _opts && (_opts as { all?: boolean }).all
              ? [{ address: pinnedIp, family }]
              : pinnedIp,
            family,
          );
        },
      },
      (incoming) => {
        const status = incoming.statusCode ?? 502;
        const resHeaders = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) value.forEach((v) => resHeaders.append(key, v));
          else if (typeof value === 'string') resHeaders.set(key, value);
        }
        if (status >= 300 && status < 400) {
          incoming.resume();
          resolve(new Response(null, { status, headers: resHeaders }));
          return;
        }
        let stream: Readable = incoming;
        const encoding = (resHeaders.get('content-encoding') ?? '').toLowerCase();
        if (encoding === 'gzip') stream = incoming.pipe(zlib.createGunzip());
        else if (encoding === 'br') stream = incoming.pipe(zlib.createBrotliDecompress());
        else if (encoding === 'deflate') stream = incoming.pipe(zlib.createInflate());
        if (encoding) {
          resHeaders.delete('content-encoding');
          resHeaders.delete('content-length');
        }
        if (NULL_BODY_STATUSES.has(status)) {
          incoming.resume();
          resolve(new Response(null, { status, headers: resHeaders }));
          return;
        }
        const body = Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;
        resolve(new Response(body, { status, statusText: incoming.statusMessage, headers: resHeaders }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}
