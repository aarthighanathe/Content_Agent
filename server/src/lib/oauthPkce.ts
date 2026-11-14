// lib/oauthPkce.ts — server-side storage for PKCE code verifiers, keyed by the
// OAuth nonce. SECURITY: the verifier used to ride inside the signed `state`
// param, which is only HMAC-signed (not encrypted) and therefore visible in the
// browser URL/history/referrers; keeping it in Redis means it never leaves the server.
import { getRedisClient } from './redisClient.js';
import { env } from '../config.js';

const PKCE_TTL_SECONDS = 600;
const NONCE_RE = /^[0-9a-f-]{36}$/i;

// NOTE: dev-only fallback when Redis is absent; production fails closed.
const devStore = new Map<string, { verifier: string; expiresAt: number }>();

export async function storePkceVerifier(nonce: string, verifier: string): Promise<boolean> {
  // SECURITY: validate before using in a Redis key.
  if (!NONCE_RE.test(nonce)) return false;
  const client = getRedisClient();
  if (!client) {
    if (env.NODE_ENV === 'production') return false;
    devStore.set(nonce, { verifier, expiresAt: Date.now() + PKCE_TTL_SECONDS * 1000 });
    return true;
  }
  try {
    await client.set(`oauth:pkce:${nonce}`, verifier, 'EX', PKCE_TTL_SECONDS);
    return true;
  } catch {
    return false;
  }
}

// WHY: GETDEL semantics: a verifier is single-use; deleting on read prevents replay.
export async function takePkceVerifier(nonce: string): Promise<string | null> {
  if (!NONCE_RE.test(nonce)) return null;
  const client = getRedisClient();
  if (!client) {
    const entry = devStore.get(nonce);
    devStore.delete(nonce);
    return entry && entry.expiresAt > Date.now() ? entry.verifier : null;
  }
  try {
    const key = `oauth:pkce:${nonce}`;
    const value = await client.get(key);
    if (value) await client.del(key);
    return value;
  } catch {
    return null;
  }
}
