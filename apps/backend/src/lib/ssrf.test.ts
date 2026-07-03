import { describe, it, expect } from 'vitest';
import { isBlockedIp, assertSafeWebhookUrl } from './ssrf.js';
import { ErrorCodes } from '../errors/codes.js';

describe('isBlockedIp', () => {
  it('blocks cloud metadata and link-local', () => {
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('169.254.0.1')).toBe(true);
  });

  it('blocks loopback and private ranges', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('10.0.0.1')).toBe(true);
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
    expect(isBlockedIp('0.0.0.0')).toBe(true);
  });

  it('blocks IPv6 loopback and link-local', () => {
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
  });

  it('allows public IPs', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('203.0.113.5')).toBe(false);
  });
});

describe('assertSafeWebhookUrl', () => {
  // In the test environment (NODE_ENV=test) only scheme validation runs.
  it('rejects non-http(s) schemes', async () => {
    await expect(assertSafeWebhookUrl('ftp://example.com/hook')).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
    });
  });

  it('rejects an unparseable URL', async () => {
    await expect(assertSafeWebhookUrl('not-a-url')).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
    });
  });

  it('accepts an https URL in the test environment', async () => {
    await expect(assertSafeWebhookUrl('https://example.com/hook')).resolves.toBeUndefined();
  });
});