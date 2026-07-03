// SSRF guard — validates that an outbound URL (merchant webhooks, etc.)
// does not point at a private/loopback/link-local/metadata address.
//
// In production we both require https and resolve the hostname to confirm
// none of its addresses are blocked. In development we only require a
// parseable http(s) URL so local webhook testing keeps working.

import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { env } from '../config/env.js';
import { ErrorCodes } from '../errors/codes.js';

// Literal hostnames that should never be reachable, regardless of resolution.
const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  'metadata',
  'metadata.aws.internal',
]);

function fail(message: string): never {
  throw Object.assign(new Error(message), { code: ErrorCodes.VALIDATION_ERROR });
}

/**
 * Returns true for IP addresses a server-side fetch must never reach:
 * loopback, RFC-1918 private, link-local (169.254/16 incl. cloud metadata),
 * 0.0.0.0/8, CGNAT 100.64/10, and IPv6 loopback/ULA/link-local.
 */
export function isBlockedIp(ip: string): boolean {
  const ipv4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  // IPv6 special-cases
  if (ip === '::1' || ipv4 === '::1') return true;
  if (ip === '::' || ipv4 === '::') return true;
  if (ipv4.startsWith('fe80')) return true; // IPv6 link-local
  if (ipv4.startsWith('fc') || ipv4.startsWith('fd')) return true; // IPv6 ULA

  const parts = ipv4.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  // 0.0.0.0/8
  if (parts[0] === 0) return true;
  // 127.0.0.0/8 loopback
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 private
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 private
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 private
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 link-local (incl. 169.254.169.254 cloud metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 100.64.0.0/10 CGNAT
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

/**
 * Validate that a webhook/outbound URL is safe to fetch from the server.
 * Throws a VALIDATION_ERROR-tagged error on violation.
 */
export async function assertSafeWebhookUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail('Invalid webhook URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail('Webhook URL must use http or https');
  }

  // P1-S2: in production, merchant webhooks must be HTTPS to keep payload
  // + HMAC secret off the wire, and must not resolve to internal addresses
  // (prevents SSRF to the cloud metadata service and internal endpoints).
  if (env.isProduction) {
    if (parsed.protocol !== 'https:') {
      fail('Webhook URL must use https in production');
    }

    const host = parsed.hostname.toLowerCase();
    if (!host) fail('Webhook URL has no hostname');
    if (BLOCKED_HOSTS.has(host)) fail('Webhook URL host is not allowed');

    if (isIP(host) !== 0) {
      if (isBlockedIp(host)) fail('Webhook URL points to a blocked address');
      return;
    }

    // Resolve hostname and reject if any address is blocked.
    let addresses: { address: string }[];
    try {
      addresses = await dnsLookup(host, { all: true });
    } catch {
      fail('Webhook URL hostname could not be resolved');
    }
    if (addresses.length === 0) fail('Webhook URL hostname could not be resolved');
    for (const a of addresses) {
      if (isBlockedIp(a.address)) fail('Webhook URL resolves to a blocked address');
    }
  }
}