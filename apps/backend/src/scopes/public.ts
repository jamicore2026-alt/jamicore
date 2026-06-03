// Public Scope - No authentication required
// Used for storefront browsing, product viewing, cart operations

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';
import { generateCsrfToken, setCsrfCookie, validateCsrf } from '../lib/csrf.js';
import seoPublicRoutes from '../modules/seo/seo.route.public.js';
import consentPublicRoutes from '../modules/consent/consent.route.public.js';
import themePublicRoutes from '../modules/theme/theme.route.public.js';

export default async function publicScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // CSRF: set cookie on safe methods if missing; validate on mutating methods
  fastify.addHook('onRequest', async (request, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !request.cookies.csrf_token) {
      setCsrfCookie(reply, generateCsrfToken());
      return;
    }
    if (!validateCsrf(request, reply)) {
      return;
    }
  });

  // Tenant resolution from Host header or X-Store-Domain header
  // Cached in Redis to prevent DB pool exhaustion under load.
  // CONS-007: cache value includes status + planExpiresAt so the public
  // scope can reject suspended/expired stores without an extra DB hit.
  fastify.addHook('onRequest', async (request, _reply) => {
    type DomainCacheEntry = { id: string; status: string; planExpiresAt: string | null };
    async function resolveDomain(domain: string): Promise<DomainCacheEntry | null> {
      const cacheKey = `store:domain:${domain}`;
      const cached = await fastify.cacheService.get<string | DomainCacheEntry>(cacheKey);
      if (cached === '__NOT_FOUND__') return null;
      if (cached && typeof cached === 'object' && 'id' in cached) return cached;

      const store = await fastify.storeService.findByDomain(domain);
      if (store) {
        const entry: DomainCacheEntry = {
          id: store.id,
          status: store.status,
          // Redis cache: serialize Date -> ISO string so JSON round-trips cleanly
          planExpiresAt: store.planExpiresAt ? new Date(store.planExpiresAt).toISOString() : null,
        };
        await fastify.cacheService.set(cacheKey, entry, 300);
        return entry;
      }
      // Negative cache with shorter TTL to prevent DB exhaustion from random domains
      await fastify.cacheService.set(cacheKey, '__NOT_FOUND__', 60);
      return null;
    }

    // Prefer X-Store-Domain header (BFF/proxy cannot override Host with Node.js fetch)
    const xDomain = request.headers['x-store-domain'];
    if (xDomain) {
      const domain = Array.isArray(xDomain) ? xDomain[0] : xDomain;
      const store = await resolveDomain(domain);
      if (store) {
        request.storeId = store.id;
        return;
      }
    }

    const rawHost = request.headers.host;
    const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
    if (host) {
      // Try exact match first
      const store = await resolveDomain(host);
      if (store) {
        request.storeId = store.id;
        return;
      }
      // Try extracting subdomain (e.g. "techgear.localhost:3000" -> "techgear")
      const parts = host.split('.');
      if (parts.length > 1) {
        const subdomain = parts[0];
        const found = await resolveDomain(subdomain);
        if (found) {
          request.storeId = found.id;
          return;
        }
      }
    }

    const hostIsIp = host && /^[\d.:]+$/.test(host);
    const isInternalHost = host && (host === 'backend' || host.startsWith('backend:') || host === 'localhost' || host.startsWith('localhost:'));
    const fallbackDomain = process.env.PUBLIC_STORE_FALLBACK_DOMAIN || 'techgear';
    fastify.log.debug({ host, hostIsIp, isInternalHost, fallbackDomain, hasStoreId: !!request.storeId }, 'IP fallback check');
    if (!request.storeId && (hostIsIp || isInternalHost)) {
      const fallback = await fastify.storeService.findByDomain(fallbackDomain);
      fastify.log.debug({ fallbackFound: !!fallback, fallbackDomain }, 'IP fallback result');
      if (fallback) {
        request.storeId = fallback.id;
      }
    }
  });

  // Centralized storeId validation for all public routes (except global endpoints).
  // CONS-007: also block suspended / plan-expired stores so the public storefront
  // matches the merchant scope. Global endpoints (currency, robots) are exempt
  // because they are platform-level, not store-scoped.
  fastify.addHook('onRequest', async (request, reply) => {
    // Currency conversion/rates and robots.txt are global (not store-specific)
    if (request.url.includes('/currency/')) return;
    if (request.url.endsWith('/robots.txt')) return;
    if (!request.storeId) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.STORE_NOT_FOUND,
        message: 'Store not found (v2-fallback). Please access via your store domain.',
      });
      return;
    }

    // CONS-007: enforce store status + plan expiry on the public surface.
    // Re-derive the cached entry from the current request — this hook runs on
    // every public request, but the domain resolution hook has already populated
    // the cache, so this is a single Redis GET (no DB hit on the hot path).
    const xDomain = request.headers['x-store-domain'];
    const hostHeader = request.headers.host;
    const rawHost = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    const xDomainStr = Array.isArray(xDomain) ? xDomain[0] : xDomain;

    // Mirror the resolution algorithm from the tenant hook so we hit the
    // same cache key. We try the explicit header, then the full host, then
    // the leading subdomain — same fallback chain.
    const candidateDomains: string[] = [];
    if (xDomainStr) candidateDomains.push(xDomainStr);
    if (rawHost) {
      candidateDomains.push(rawHost);
      const parts = rawHost.split('.');
      if (parts.length > 1) candidateDomains.push(parts[0]);
    }
    if (candidateDomains.length === 0) return;

    type DomainCacheEntry = { id: string; status: string; planExpiresAt: string | null };
    let entry: DomainCacheEntry | string | null = null;
    for (const domain of candidateDomains) {
      const key = `store:domain:${domain.split(':')[0]}`;
      const candidate = await fastify.cacheService.get<DomainCacheEntry>(key);
      if (candidate && typeof candidate === 'object' && 'id' in candidate) {
        entry = candidate;
        break;
      }
    }
    if (!entry || typeof entry === 'string' || entry.id !== request.storeId) {
      return; // Cache miss or negative cache — let the route handle the discrepancy.
    }

    if (entry.status !== 'active') {
      reply.status(403).send({
        error: 'Forbidden',
        code: ErrorCodes.STORE_SUSPENDED,
        message: `Store is ${entry.status}`,
      });
      return;
    }

    if (entry.planExpiresAt) {
      const expiresAt = new Date(entry.planExpiresAt);
      const now = new Date();
      if (expiresAt.getTime() < now.getTime()) {
        reply.status(403).send({
          error: 'Forbidden',
          code: ErrorCodes.PLAN_EXPIRED,
          message: 'Plan expired',
        });
        return;
      }
      // 7-day warning header — mirrors merchant scope behavior so FE can show
      // an upsell banner consistently across the public + merchant surface.
      const daysUntilExpiry = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        reply.header('x-plan-expires-soon', 'true');
        reply.header('x-plan-expires-in-days', String(daysUntilExpiry));
      }
    }
  });

  // Register public routes (from modules/)
  fastify.register(import('../modules/store/store.route.public.js'), { prefix: '/store' });
  fastify.register(import('../modules/product/product.route.public.js'), { prefix: '/products' });
  fastify.register(import('../modules/bundle/bundle.route.public.js'), { prefix: '/bundles' });
  fastify.register(import('../modules/review/review.route.public.js'), { prefix: '/reviews' });
  fastify.register(import('../modules/cart/cart.route.public.js'), { prefix: '/cart' });
  fastify.register(import('../modules/analytics/analytics.route.public.js'), { prefix: '/analytics' });
  fastify.register(import('../modules/shipping/shipping.route.public.js'), { prefix: '/shipping' });
  fastify.register(import('../modules/tax/tax.route.public.js'), { prefix: '/tax' });
  fastify.register(import('../modules/currency/currency.route.public.js'), { prefix: '/currency' });
  fastify.register(import('../modules/payment/payment.route.public.js'), { prefix: '/payments' });
  fastify.register(import('../modules/order/order.route.public.js'), { prefix: '/orders' });
  fastify.register(import('../modules/newsletter/newsletter.route.public.js'), { prefix: '/newsletter' });
  fastify.register(import('../modules/cms/cms.route.public.js'), { prefix: '/pages' });
  fastify.register(seoPublicRoutes, { prefix: '' });
  fastify.register(consentPublicRoutes, { prefix: '/cookie-consent' });
  fastify.register(themePublicRoutes, { prefix: '' });
}
