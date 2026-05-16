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
  // Cached in Redis to prevent DB pool exhaustion under load
  fastify.addHook('onRequest', async (request, _reply) => {
    async function resolveDomain(domain: string) {
      const cacheKey = `store:domain:${domain}`;
      const cached = await fastify.cacheService.get<string | { id: string }>(cacheKey);
      if (cached === '__NOT_FOUND__') return null;
      if (cached && typeof cached === 'object' && 'id' in cached) return cached as { id: string };

      const store = await fastify.storeService.findByDomain(domain);
      if (store) {
        await fastify.cacheService.set(cacheKey, { id: store.id }, 300);
        return store;
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
    const fallbackDomain = process.env.PUBLIC_STORE_FALLBACK_DOMAIN || 'techgear';
    fastify.log.debug({ host, hostIsIp, fallbackDomain, hasStoreId: !!request.storeId }, 'IP fallback check');
    if (!request.storeId && hostIsIp) {
      const fallback = await fastify.storeService.findByDomain(fallbackDomain);
      fastify.log.debug({ fallbackFound: !!fallback, fallbackDomain }, 'IP fallback result');
      if (fallback) {
        request.storeId = fallback.id;
      }
    }
  });

  // Centralized storeId validation for all public routes (except global endpoints)
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
