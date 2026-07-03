// Shared auth helpers — used across customer auth route files
import type { FastifyRequest } from 'fastify';
import { storeService } from '../store/store.service.js';
import { isPrivateIp } from '../../lib/ip.js';
import { isPlatformHost, leadingSubdomain } from '../../lib/domain.js';

/**
 * Resolve storeId from request: existing JWT-attached storeId, X-Store-Domain header,
 * or Host header. Falls back to leading-label subdomain extraction ONLY for
 * platform-suffixed hosts (D2) and honors X-Store-Domain ONLY from trusted internal
 * callers (D8). Used by public-scope customer auth routes (login, register, etc.).
 */
export async function resolveStoreId(request: FastifyRequest): Promise<string | null> {
  if (request.storeId) return request.storeId;

  // D8: X-Store-Domain only from trusted internal callers (BFF in the Docker net).
  const xDomain = request.headers['x-store-domain'];
  if (xDomain && isPrivateIp(request.ip)) {
    const domain = Array.isArray(xDomain) ? xDomain[0] : xDomain;
    const store = await storeService.findByDomain(domain);
    if (store) return store.id;
    // D2: leading-label fallback only for platform-suffixed hosts.
    if (isPlatformHost(domain)) {
      const subdomain = leadingSubdomain(domain);
      if (subdomain) {
        const found = await storeService.findByDomain(subdomain);
        if (found) return found.id;
      }
    }
  }

  const rawHost = request.headers.host;
  const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
  if (host) {
    const store = await storeService.findByDomain(host);
    if (store) return store.id;
    // D2: leading-label fallback only for platform-suffixed hosts.
    if (isPlatformHost(host)) {
      const subdomain = leadingSubdomain(host);
      if (subdomain) {
        const found = await storeService.findByDomain(subdomain);
        if (found) return found.id;
      }
    }
  }
  return null;
}
