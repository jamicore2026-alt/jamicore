// SuperAdmin Scope - Authentication required
// Platform administrators - merchant approval, plans, analytics

import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';
import { generateCsrfToken, setCsrfCookie, validateCsrf } from '../lib/csrf.js';
import { superAdminService } from '../modules/superAdmin/superAdmin.service.js';

export default async function superAdminScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
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

  // SuperAdmin JWT verification hook - runs on ALL admin routes EXCEPT public auth endpoints
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for login, logout, and refresh routes only
    const path = request.url.split('?')[0];
    if (path.endsWith('/auth/login') || path.endsWith('/auth/logout') || path.endsWith('/auth/refresh')) {
      return;
    }
    try {
      const decoded = await request.jwtVerify() as Record<string, string>;
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Verify superAdmin token
      if (!decoded.superAdminId) {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid token',
        });
        return;
      }

      // Attach to request
      request.superAdminId = decoded.superAdminId;
      request.adminRole = decoded.role;
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

  // Dashboard stats - registered at scope root (/api/v1/admin/stats)
  fastify.get('/stats', {
    schema: {
      tags: ['SuperAdmin'],
      summary: 'Platform statistics',
      description: 'Get platform-wide statistics for the admin dashboard',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    return superAdminService.getPlatformStats();
  });

  // Register superAdmin routes (from modules/)
  fastify.register(import('../modules/auth/auth.route.superAdmin.js'), { prefix: '/auth' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.js'), { prefix: '/merchants' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.plans.js'), { prefix: '/plans' });
  fastify.register(import('../modules/store/store.route.superAdmin.js'), { prefix: '/stores' });
  fastify.register(import('../modules/order/order.route.superAdmin.js'), { prefix: '/orders' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.revenue.js'), { prefix: '/revenue' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.audit.js'), { prefix: '/audit-logs' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.tickets.js'), { prefix: '/tickets' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.settings.js'), { prefix: '/settings' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.invoices.js'), { prefix: '/invoices' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.notifications.js'), { prefix: '/notifications' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.domains.js'), { prefix: '/domains' });
  fastify.register(import('../modules/superAdmin/superAdmin.route.staff.js'), { prefix: '/staff' });
}

/**
 * Fastify preHandler hook factory to enforce super-admin role restrictions.
 * Use on sensitive super-admin routes (merchant deletion, plan changes, revenue, staff deletion, audit logs).
 * OWNER-equivalent roles always pass if included in allowedRoles.
 */
export function requireAdminRole(...allowedRoles: string[]) {
  return async function requireAdminRoleHook(request: FastifyRequest, reply: FastifyReply) {
    if (!request.adminRole) {
      reply.status(403).send({
        error: 'Forbidden',
        code: ErrorCodes.PERMISSION_DENIED,
        message: 'Admin role required',
      });
      return;
    }
    if (allowedRoles.includes(request.adminRole)) return;
    reply.status(403).send({
      error: 'Forbidden',
      code: ErrorCodes.PERMISSION_DENIED,
      message: `Admin role '${allowedRoles.join(' or ')}' required`,
    });
  };
}