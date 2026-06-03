// Super Admin DLQ Routes - Inspect failed jobs across all queues
// PERF-009: BullMQ DLQ inspection. Failed jobs are bounded by the queue's
// removeOnFail policy, so this view shows what the system has retained.
import { FastifyInstance } from 'fastify';
import { getCacheService } from '../../services/cache.service.js';

export default async function superAdminDlqRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/queues/dlq
  fastify.get('/dlq', {
    schema: {
      tags: ['Super Admin'],
      summary: 'List failed jobs (DLQ view)',
      description: 'Retrieve the most recent failed jobs across all queues, ordered newest first.',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const limitParam = (request.query as { limit?: string }).limit;
    const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 200);

    // The queueService instance is decorated on fastify in index.ts.
    const queueService = fastify.queueService as {
      getFailedJobs: (n: number) => Promise<Array<{ queueName: string; id: string; name: string; data: unknown; failedReason: string; timestamp: number }>>;
    };

    const cache = getCacheService();
    const cacheKey = `dlq:recent:${limit}`;
    const failed = await cache.wrap(
      cacheKey,
      async () => queueService.getFailedJobs(limit),
      30, // 30s — DLQ is mostly read, but reflects fresh failures
    );

    return { jobs: failed, count: failed.length };
  });
}
