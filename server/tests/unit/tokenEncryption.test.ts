import { describe, it, expect } from 'vitest';
import {
  encryptToken, decryptToken, encryptTokenOptional, decryptTokenOptional,
} from '../../src/lib/tokenEncryption.js';

// NOTE: key comes from tests/setupEnv.ts (a fake all-zero key), never a real secret.
describe('tokenEncryption', () => {
  it('roundtrips', () => {
    const enc = encryptToken('oauth-access-token');
    expect(enc).not.toContain('oauth-access-token');
    expect(decryptToken(enc)).toBe('oauth-access-token');
  });

  it('uses a fresh IV per call', () => {
    expect(encryptToken('same')).not.toBe(encryptToken('same'));
  });

  it('rejects tampered ciphertext (GCM auth tag)', () => {
    const [, iv, tag, data] = encryptToken('secret').split(':');
    const flipped = Buffer.from(data ?? '', 'base64url');
    flipped[0] = (flipped[0] ?? 0) ^ 0xff;
    expect(() => decryptToken(`v1:${iv}:${tag}:${flipped.toString('base64url')}`)).toThrow();
  });

  it('prefixes new ciphertexts with v1:', () => {
    expect(encryptToken('x').startsWith('v1:')).toBe(true);
  });

  it('still decrypts legacy unversioned ciphertexts', () => {
    const legacy = encryptToken('legacy-token').slice('v1:'.length);
    expect(decryptToken(legacy)).toBe('legacy-token');
  });

  it('rejects truncated auth tags', () => {
    const [, iv, tag, data] = encryptToken('secret').split(':');
    const short = Buffer.from(tag ?? '', 'base64url').subarray(0, 8).toString('base64url');
    expect(() => decryptToken(`v1:${iv}:${short}:${data}`)).toThrow('Invalid token format');
  });

  it('rejects malformed payloads', () => {
    expect(() => decryptToken('not-valid')).toThrow('Invalid token format');
  });

  it('optional helpers handle empty and bad input', () => {
    expect(encryptTokenOptional(undefined)).toBeUndefined();
    expect(encryptTokenOptional('')).toBeUndefined();
    expect(decryptTokenOptional(null)).toBeUndefined();
    expect(decryptTokenOptional('garbage:garbage:garbage')).toBeUndefined();
    expect(decryptTokenOptional(encryptToken('x'))).toBe('x');
  });
});
