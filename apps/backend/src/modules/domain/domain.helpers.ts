import { randomBytes } from 'node:crypto';

/**
 * Generates a CNAME target for custom domain verification.
 * Format: store-{8-char-hex}.jamicore.com
 */
export function generateCnameTarget(storeId: string): string {
  const short = storeId.replace(/-/g, '').slice(0, 8);
  return `store-${short}.jamicore.com`;
}

/**
 * Generates TXT record verification token and its expected DNS name.
 */
export function generateTxtVerification(): { txtName: string; txtValue: string } {
  const value = `jamicore-verify=${randomBytes(16).toString('hex')}`;
  return { txtName: '_jamicore-verify', txtValue: value };
}

/**
 * Validates domain format: no protocol, no path, valid characters.
 */
export function isValidDomain(domain: string): boolean {
  const pattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return pattern.test(domain);
}

/**
 * Normalizes domain: lowercase, remove trailing dot, strip protocol and path.
 */
export function normalizeDomain(input: string): string {
  return input
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '')
    .toLowerCase();
}
