import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '../config.js';

const ALG = 'aes-256-gcm';
const KEY_HEX = env.TOKEN_ENCRYPTION_KEY;

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(KEY_HEX, 'hex');
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptToken(encoded: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = encoded.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid token format');
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}

export function encryptTokenOptional(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  return encryptToken(value);
}

export function decryptTokenOptional(encoded: string | undefined | null): string | undefined {
  if (!encoded) return undefined;
  try { return decryptToken(encoded); } catch { return undefined; }
}
