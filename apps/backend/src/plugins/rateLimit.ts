import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest } from 'fastify';

function getRoutePath(request: FastifyRequest): string {
  return request.routeOptions?.url || request.url;
}

function getRateLimitTier(path: string): { max: number; name: string } {
  // Auth endpoints (login, register, refresh, etc.) — strict brute-force protection
  if (
    path.startsWith('/api/v1/public/auth') ||
    path.startsWith('/api/v1/customer/auth') ||
    path.startsWith('/api/v1/merchant/auth') ||
    path.startsWith('/api/v1/admin/auth')
  ) {
    return { max: 5, name: 'auth' };
  }

  // Checkout and payment endpoints
  if (
    path.startsWith('/api/v1/customer/checkout') ||
    path.startsWith('/api/v1/customer/payments') ||
    path.startsWith('/api/v1/public/payments')
  ) {
    return { max: 5, name: 'checkout' };
  }

  // Public read (product listing, search, store info, reviews)
  if (
    path.startsWith('/api/v1/public/products') ||
    path.startsWith('/api/v1/public/store') ||
    path.startsWith('/api/v1/public/reviews') ||
    path.startsWith('/api/v1/public/categories')
  ) {
    return { max: 300, name: 'public-read' };
  }

  // Merchant write endpoints
  if (path.startsWith('/api/v1/merchant')) {
    return { max: 60, name: 'merchant' };
  }

  // General API fallback
  return { max: 100, name: 'general' };
}

export default fp(async function rateLimitPlugin(fastify: FastifyInstance) {
  // Skip rate limiting in development/test environments for e2e compatibility
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  await fastify.register(rateLimit, {
    max: (request) => {
      const tier = getRateLimitTier(getRoutePath(request));
      return tier.max;
    },
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      const tier = getRateLimitTier(getRoutePath(request));
      return `${request.ip}:${tier.name}`;
    },
  });
}, { name: 'rate-limit', dependencies: [] });
