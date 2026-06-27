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
  // P1-F: rate limiting must be ON whenever the server is reachable.
  //
  // We deliberately key off the RAW `process.env.NODE_ENV` — NOT the Zod-validated
  // `env` from config/env.ts, which DEFAULTS NODE_ENV to 'development'. If we used
  // `env.isDevelopment`, a production deploy that forgot to set NODE_ENV would
  // silently get the 'development' default and SKIP rate limiting. Reading the raw
  // value means a missing NODE_ENV keeps limits ON (safe-by-default); the only way
  // to disable is to explicitly set NODE_ENV=development|test.
  const rawNodeEnv = process.env.NODE_ENV;
  const isDevOrTest = rawNodeEnv === 'development' || rawNodeEnv === 'test';
  if (isDevOrTest && !process.env.FORCE_RATE_LIMIT) {
    return;
  }
  if (!rawNodeEnv) {
    fastify.log.warn(
      'NODE_ENV is not set — rate limiting is enabled (safe default). Set NODE_ENV explicitly in production to silence this warning.'
    );
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
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
}, { name: 'rate-limit', dependencies: [] });
