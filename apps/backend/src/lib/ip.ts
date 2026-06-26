// Shared IP utilities — used by health-check allowlists, tenant resolution
// trust gates, and the on-demand TLS ask endpoint.

/**
 * Returns true for loopback / RFC-1918 private addresses.
 * Handles IPv4-mapped IPv6 (::ffff:127.0.0.1).
 */
export function isPrivateIp(ip: string): boolean {
  const ipv4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (ipv4 === '127.0.0.1' || ip === '::1') return true;
  const parts = ipv4.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  // 127.0.0.0/8 (full loopback range)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}