// Merchant Scope - Authentication required
// Store owners and staff - manage products, orders, settings

import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';
import { generateCsrfToken, setCsrfCookie, validateCsrf } from '../lib/csrf.js';
import { apiKeyService } from '../modules/apiKey/apiKey.service.js';

export default async function merchantScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
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

  // JWT verification hook - runs on ALL merchant routes EXCEPT public auth endpoints
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for login, register, logout, verify-email, forgot-password, reset-password, refresh
    const url = request.url;
    // Use pathname (strip query) for reliable matching
    const path = url.split('?')[0];
    const isPublicAuth =
      path.endsWith('/auth/login') ||
      path.endsWith('/auth/register') ||
      path.endsWith('/auth/logout') ||
      path.endsWith('/auth/verify-email') ||
      path.endsWith('/auth/forgot-password') ||
      path.endsWith('/auth/reset-password') ||
      path.endsWith('/auth/refresh') ||
      path.endsWith('/auth/verify-mfa') ||
      path.endsWith('/auth/mfa/resend') ||
      // Staff invitation accept/reject (no auth - new user)
      path.includes('/staff/invitations/');
    if (isPublicAuth) {
      return;
    }

    // ─── API Key authentication (alternative to JWT cookie) ───
    const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
    const authHeader = request.headers.authorization;
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const rawApiKey = apiKeyHeader || bearerKey;

    if (rawApiKey) {
      try {
        const validated = await apiKeyService.validateKey(rawApiKey);
        if (!validated) {
          reply.status(401).send({
            error: 'Unauthorized',
            code: ErrorCodes.API_KEY_INVALID,
            message: 'Invalid or expired API key',
          });
          return;
        }
        if (!validated.scopes.includes('merchant')) {
          reply.status(403).send({
            error: 'Forbidden',
            code: ErrorCodes.INSUFFICIENT_PERMISSIONS,
            message: 'API key does not have merchant scope',
          });
          return;
        }

        const store = await fastify.storeService.findById(validated.storeId);
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

        request.storeId = validated.storeId;
        request.userId = 'api-key';
        request.userRole = 'OWNER';
        request.store = store;
        request.userPermissions = ['*'];
        return;
      } catch (err) {
        fastify.log.warn({ err }, 'API key authentication failed');
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.API_KEY_INVALID,
          message: 'Invalid API key',
        });
        return;
      }
    }

    try {
      const decoded = await request.jwtVerify() as Record<string, string>;
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Verify storeId from JWT
      if (!decoded.storeId) {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid token',
        });
        return;
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

      // Warn if plan expires within 7 days
      if (store.planExpiresAt) {
        const daysUntilExpiry = Math.ceil(
          (new Date(store.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          reply.header('x-plan-expires-soon', 'true');
          reply.header('x-plan-expires-in-days', String(daysUntilExpiry));
        }
      }

      // Attach to request for route handlers
      request.storeId = decoded.storeId;
      request.userId = decoded.userId;
      request.userRole = decoded.role;
      request.store = store;

      // Load permissions: OWNER gets all; others get DB override or role defaults
      if (decoded.role === 'OWNER') {
        request.userPermissions = ['*'];
      } else {
        const override = await fastify.staffService.findRoleOverride(decoded.storeId, decoded.role);
        if (override) {
          request.userPermissions = override.permissions;
        } else {
          const defaults = fastify.staffService.getDefaultPermissions(decoded.role);
          request.userPermissions = defaults;
        }
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Authentication failed');
      reply.status(401).send({
        error: 'Unauthorized',
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid token',
      });
      return;
    }
  });

  // Register merchant routes (from modules/)
  fastify.register(import('../modules/auth/auth.route.merchant.js'), { prefix: '/auth' });
  fastify.register(import('../modules/store/store.route.merchant.js'), { prefix: '/store' });
  fastify.register(import('../modules/product/product.route.merchant.js'), { prefix: '/products' });
  fastify.register(import('../modules/bundle/bundle.route.merchant.js'), { prefix: '/bundles' });
  fastify.register(import('../modules/category/category.route.merchant.js'), { prefix: '/categories' });
  fastify.register(import('../modules/modifier/modifier.route.merchant.js'), { prefix: '/modifiers' });
  fastify.register(import('../modules/order/order.route.merchant.js'), { prefix: '/orders' });
  fastify.register(import('../modules/customer/customer.route.merchant.js'), { prefix: '/customers' });
  fastify.register(import('../modules/review/review.route.merchant.js'), { prefix: '/reviews' });
  fastify.register(import('../modules/coupon/coupon.route.merchant.js'), { prefix: '/coupons' });
  fastify.register(import('../modules/analytics/analytics.route.merchant.js'), { prefix: '/analytics' });
  fastify.register(import('../modules/upload/upload.route.merchant.js'), { prefix: '/upload' });
  fastify.register(import('../modules/staff/staff.route.merchant.js'), { prefix: '/staff' });
  fastify.register(import('../modules/shipping/shipping.route.merchant.js'), { prefix: '/shipping' });
  fastify.register(import('../modules/tax/tax.route.merchant.js'), { prefix: '/tax' });
  fastify.register(import('../modules/currency/currency.route.merchant.js'), { prefix: '/currency' });
  fastify.register(import('../modules/webhook/webhook.route.merchant.js'), { prefix: '/webhooks' });
  fastify.register(import('../modules/notifications/notifications.route.merchant.js'), { prefix: '/notifications' });
  fastify.register(import('../modules/payment/payment.route.merchant.js'), { prefix: '/payments' });
  fastify.register(import('../modules/ticket/ticket.route.merchant.js'), { prefix: '/tickets' });
  fastify.register(import('../modules/return/return.route.merchant.js'), { prefix: '/returns' });
  fastify.register(import('../modules/billing/billing.route.merchant.js'), { prefix: '/billing' });
  fastify.register(import('../modules/cms/cms.route.merchant.js'), { prefix: '/cms' });
  fastify.register(import('../modules/apiKey/apiKey.route.merchant.js'), { prefix: '/api-keys' });
  fastify.register(import('../modules/newsletter/newsletter.route.merchant.js'), { prefix: '/newsletter' });
  fastify.register(import('../modules/theme/theme.route.merchant.js'), { prefix: '/theme' });
}

/**
 * Fastify preHandler hook factory to enforce staff permissions.
 * Use on sensitive merchant routes (product write, order write, payment config, etc.).
 * OWNER role always passes. Other roles require the specific permission.
 */
export function requirePermission(permission: string) {
  return async function requirePermissionHook(request: FastifyRequest, reply: FastifyReply) {
    if (request.userRole === 'OWNER') return;
    const perms: string[] = request.userPermissions || [];
    if (perms.includes('*') || perms.includes(permission)) return;
    reply.status(403).send({
      error: 'Forbidden',
      code: ErrorCodes.PERMISSION_DENIED,
      message: `Permission '${permission}' required`,
    });
  };
}


