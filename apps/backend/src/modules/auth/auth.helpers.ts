// Shared auth helpers — used across customer auth route files
import type { FastifyRequest } from 'fastify';
import { storeService } from '../store/store.service.js';

/**
 * Resolve storeId from request: existing JWT-attached storeId, X-Store-Domain header,
 * or Host header. Falls back to subdomain extraction if exact match fails.
 * Used by public-scope customer auth routes (login, register, forgot-password).
 */
export async function resolveStoreId(request: FastifyRequest): Promise<string | null> {
  if (request.storeId) return request.storeId;

  // Prefer X-Store-Domain header (BFF cannot override Host with Node.js fetch)
  const xDomain = request.headers['x-store-domain'];
  if (xDomain) {
    const domain = Array.isArray(xDomain) ? xDomain[0] : xDomain;
    const store = await storeService.findByDomain(domain);
    if (store) return store.id;
    // Try extracting subdomain (e.g. "techgear.localhost" -> "techgear")
    const parts = domain.split('.');
    if (parts.length > 1) {
      const subdomain = parts[0];
      const found = await storeService.findByDomain(subdomain);
      if (found) return found.id;
    }
  }

  const rawHost = request.headers.host;
  const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
  if (host) {
    const store = await storeService.findByDomain(host);
    if (store) return store.id;
    // Try extracting subdomain
    const parts = host.split('.');
    if (parts.length > 1) {
      const subdomain = parts[0];
      const found = await storeService.findByDomain(subdomain);
      if (found) return found.id;
    }
  }
  return null;
}
