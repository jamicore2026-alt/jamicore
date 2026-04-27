// SuperAdmin Revenue Routes — Platform revenue analytics
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';

export default async function superAdminRevenueRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/revenue - Platform revenue stats
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Revenue'],
      summary: 'Platform revenue',
      description: 'Get platform-wide revenue analytics and breakdowns',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    return superAdminService.getRevenueStats();
  });
}
