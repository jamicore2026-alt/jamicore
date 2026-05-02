// SuperAdmin Revenue Routes — Platform revenue analytics
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';
import { requireAdminRole } from '../../scopes/superAdmin.js';
import { revenueQuerySchema } from './superAdmin.schema.js';

export default async function superAdminRevenueRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/revenue - Platform revenue stats
  fastify.get('/', {
    preHandler: requireAdminRole('superAdmin'),
    schema: {
      tags: ['SuperAdmin Revenue'],
      summary: 'Platform revenue',
      description: 'Get platform-wide revenue analytics and breakdowns',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = revenueQuerySchema.parse(request.query);
    return superAdminService.getRevenueStats(query.days);
  });
}
