// Public Scope - No authentication required
// Used for storefront browsing, product viewing, cart operations

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { generateCsrfToken, setCsrfCookie, validateCsrf } from '../lib/csrf.js';
import seoPublicRoutes from '../modules/seo/seo.route.public.js';
import consentPublicRoutes from '../modules/consent/consent.route.public.js';

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
  fastify.addHook('onRequest', async (request, _reply) => {
    // Prefer X-Store-Domain header (BFF/proxy cannot override Host with Node.js fetch)
    const xDomain = request.headers['x-store-domain'];
    if (xDomain) {
      const domain = Array.isArray(xDomain) ? xDomain[0] : xDomain;
      const store = await fastify.storeService.findByDomain(domain);
      if (store) {
        request.storeId = store.id;
        return;
      }
    }

    const rawHost = request.headers.host;
    const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
    if (host) {
      // Try exact match first
      const store = await fastify.storeService.findByDomain(host);
      if (store) {
        request.storeId = store.id;
        return;
      }
      // Try extracting subdomain (e.g. "techgear.localhost:3000" -> "techgear")
      const parts = host.split('.');
      if (parts.length > 1) {
        const subdomain = parts[0];
        const found = await fastify.storeService.findByDomain(subdomain);
        if (found) {
          request.storeId = found.id;
          return;
        }
      }
    }

    // Development fallback: default to techgear store when no domain matches
    if (!request.storeId && process.env.NODE_ENV !== 'production') {
      const fallback = await fastify.storeService.findByDomain('techgear');
      if (fallback) {
        request.storeId = fallback.id;
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
  fastify.register(seoPublicRoutes, { prefix: '' });
  fastify.register(consentPublicRoutes, { prefix: '/cookie-consent' });
}
