// Public Analytics Routes - Public store stats
import { FastifyInstance } from 'fastify';
import { analyticsService } from './analytics.service.js';

export default async function publicAnalyticsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/analytics/stats - Public store stats (limited)
  fastify.get('/stats', {
    schema: {
      tags: ['Public'],
      summary: 'Get public store stats',
      description: 'Retrieve limited public statistics for the current store',
    },
  }, async (request) => {
    const stats = await analyticsService.getDashboardStats(request.storeId);
    // Only expose limited info to public
    return {
      totalProducts: stats.totalProducts,
    };
  });
}