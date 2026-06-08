// Customer Scope - Authentication required
// Registered customers - wishlist, orders, reviews, checkout

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';
import { generateCsrfToken, setCsrfCookie, validateCsrf } from '../lib/csrf.js';

export default async function customerScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
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

  // Customer JWT verification hook - runs on ALL customer routes EXCEPT public auth endpoints
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for login, register, logout, verify-email, forgot-password, reset-password, refresh
    // NOTE: resend-verification REQUIRES auth (needs customerId from JWT)
    const path = request.url.split('?')[0];
    if (
      path.endsWith('/auth/login') ||
      path.endsWith('/auth/register') ||
      path.endsWith('/auth/logout') ||
      path.endsWith('/auth/verify-email') ||
      path.endsWith('/auth/forgot-password') ||
      path.endsWith('/auth/reset-password') ||
      path.endsWith('/auth/refresh') ||
      path.endsWith('/auth/verify-mfa') ||
      path.endsWith('/auth/mfa/resend')
    ) {
      return;
    }
    try {
      const decoded = await request.jwtVerify() as Record<string, string>;
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // CRITICAL: Check store status (NEVER skip this)
      const store = await fastify.storeService.findById(decoded.storeId);
      if (!store) {
        reply.status(404).send({
          error: 'Not Found',
          code: ErrorCodes.STORE_NOT_FOUND,
          message: 'Store not found',
        });
        return;
      }
      if (store.status !== 'active') {
        reply.status(403).send({
          error: 'Forbidden',
          code: ErrorCodes.STORE_SUSPENDED,
          message: `Store is ${store.status}`,
        });
        return;
      }

      // Check plan expiration
      if (store.planExpiresAt && new Date(store.planExpiresAt) < new Date()) {
        reply.status(403).send({
          error: 'Forbidden',
          code: ErrorCodes.PLAN_EXPIRED,
          message: 'Plan expired',
        });
        return;
      }

      // Verify customer token has customerId and storeId
      if (!decoded.customerId || !decoded.storeId) {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid token',
        });
        return;
      }

      // Attach to request
      request.customerId = decoded.customerId;
      request.storeId = decoded.storeId;
      request.store = store;

      // Fetch customer to check verification status
      const customer = await fastify.authService.findCustomerForVerification(decoded.customerId);
      if (!customer) {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.CUSTOMER_NOT_FOUND,
          message: 'Customer not found',
        });
        return;
      }

      // Gate: require email verification for protected endpoints
      if (!customer.isVerified) {
        reply.status(403).send({
          error: 'Forbidden',
          code: ErrorCodes.EMAIL_NOT_VERIFIED,
          message: 'Email not verified. Please check your inbox for the verification link.',
        });
        return;
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Authentication failed');
      const jwtCode = (err as { code?: string })?.code;
      if (jwtCode === 'FST_JWT_NO_AUTHORIZATION_IN_COOKIE' || jwtCode === 'FST_JWT_BAD_COOKIE_REQUEST') {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.TOKEN_MISSING,
          message: 'Authentication required',
        });
        return;
      }
      if (jwtCode === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.TOKEN_EXPIRED,
          message: 'Access token expired',
        });
        return;
      }
      reply.status(401).send({
        error: 'Unauthorized',
        code: ErrorCodes.TOKEN_INVALID,
        message: 'Invalid token',
      });
      return;
    }
  });

  // Register customer routes (from modules/)
  fastify.register(import('../modules/auth/auth.route.customer.js'), { prefix: '/auth' });
  fastify.register(import('../modules/customer/customer.route.customer.js'), { prefix: '/profile' });
  fastify.register(import('../modules/customer/customer.route.gdpr.js'), { prefix: '/profile' });
  fastify.register(import('../modules/order/order.route.customer.js'), { prefix: '/orders' });
  fastify.register(import('../modules/checkout/checkout.route.customer.js'), { prefix: '/checkout' });
  fastify.register(import('../modules/coupon/coupon.route.customer.js'), { prefix: '/coupons' });
  fastify.register(import('../modules/wishlist/wishlist.route.customer.js'), { prefix: '/wishlist' });
  fastify.register(import('../modules/review/review.route.customer.js'), { prefix: '/reviews' });
  fastify.register(import('../modules/address/address.route.customer.js'), { prefix: '/addresses' });
  fastify.register(import('../modules/payment/payment.route.customer.js'), { prefix: '/payments' });
  fastify.register(import('../modules/return/return.route.customer.js'), { prefix: '/returns' });
}