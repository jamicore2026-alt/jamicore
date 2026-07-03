// Shared domain-resolution helpers.
//
// D2 (cross-tenant routing via leading-label collision): the public resolver used
// to fall back to `parts[0]` for *any* multi-label host, so `techgear.evil.com`
// resolved to the victim store `techgear`. We now only do that fallback for hosts
// on a platform suffix (e.g. `techgear.jamicore.com`), where `store.domain` holds
// the bare subdomain `techgear`. Arbitrary custom domains are matched exactly via
// `stores.customDomain` (D1) and never fall back to their leading label.

export const PLATFORM_DOMAIN_SUFFIXES = [
  '.jamicore.com',
  '.spaceship.dev',
  '.localhost',
] as const;

/** True if the host is on a platform-managed suffix (subdomain store host). */
export function isPlatformHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase();
  if (h === 'localhost') return true;
  return PLATFORM_DOMAIN_SUFFIXES.some((s) => h.endsWith(s));
}

/**
 * Returns the bare leading label of a platform host (`techgear.jamicore.com` →
 * `techgear`), or null for single-label / non-platform hosts. Callers must gate
 * on `isPlatformHost` before using this to avoid cross-tenant collisions.
 */
export function leadingSubdomain(host: string): string | null {
  const h = host.split(':')[0].toLowerCase();
  const parts = h.split('.');
  if (parts.length <= 1) return null;
  return parts[0];
}

/**
 * Maps a store to the storefront upstream Caddy should reverse-proxy a custom
 * domain to. Food/Brio stores are served by the food storefront; everything
 * else by the classic storefront. (D6 — custom-domain routes previously dialed
 * `backend:3000`, serving JSON 404s instead of the storefront UI.)
 */
export function storefrontUpstreamFor(storeType: string | null | undefined): string {
  return storeType === 'food' ? 'storefront-food:3003' : 'storefront:3002';
}