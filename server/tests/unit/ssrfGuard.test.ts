import { describe, it, expect } from 'vitest';
import {
  assertUrlIsPublic,
  isPrivateOrReservedIp,
  unwrapHostnameIp,
} from '../../src/lib/ssrfGuard.js';

describe('assertUrlIsPublic ports', () => {
  it.each([
    'http://8.8.8.8:8080/', 'https://8.8.8.8:8443/', 'http://8.8.8.8:6379/',
  ])('rejects non-standard port %s', async (url) => {
    const result = await assertUrlIsPublic(url);
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/default http\/https port/);
  });

  it.each(['http://8.8.8.8/', 'https://8.8.8.8/', 'http://8.8.8.8:80/', 'https://8.8.8.8:443/'])(
    'allows default port %s',
    async (url) => {
      expect((await assertUrlIsPublic(url)).safe).toBe(true);
    },
  );
});

describe('isPrivateOrReservedIp', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '192.168.1.1', '172.16.0.1', '172.31.255.255',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '192.0.2.1', '224.0.0.1',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12::1', '[::1]', 'localhost',
    'fec0::1', 'feff::1', '2001:0:4136:e378:8000:63bf:3fff:fdd2', '192.88.99.1',
    '64:ff9b::1', '64:ff9b:1::1', '64:ff9b:1:ffff::abcd',
  ])('blocks %s', (ip) => {
    expect(isPrivateOrReservedIp(ip)).toBe(true);
  });

  it.each([
    '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '::ffff:192.0.2.1',
    '::ffff:a9fe:a9fe',
  ])('blocks IPv4-mapped IPv6 %s', (ip) => {
    expect(isPrivateOrReservedIp(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '93.184.216.34', '2606:4700:4700::1111', '192.88.100.1', '2001:4860:4860::8888', '64:ff9b:2::1'])(
    'allows public %s',
    (ip) => {
      expect(isPrivateOrReservedIp(ip)).toBe(false);
    },
  );

  it('allows IPv4-mapped public address', () => {
    expect(isPrivateOrReservedIp('::ffff:8.8.8.8')).toBe(false);
  });

  it('unwraps IPv6 brackets only when fully bracketed', () => {
    expect(unwrapHostnameIp('[::1]')).toBe('::1');
    expect(unwrapHostnameIp('example.com')).toBe('example.com');
  });
});
