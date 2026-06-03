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
    // PERF-008: use the dedicated lightweight public method, not
    // getDashboardStats which runs 6 queries.
    const stats = await analyticsService.getPublicStats(request.storeId);
    return {
      totalProducts: stats.totalProducts,
    };
  });
}