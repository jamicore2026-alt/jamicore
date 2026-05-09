// GDPR Routes - Data export and account deletion
import { FastifyInstance } from 'fastify';
import { customerService } from './customer.service.js';

export default async function customerGdprRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/profile/data-export
  fastify.get('/data-export', {
    schema: {
      tags: ['Customer Profile'],
      summary: 'Export personal data',
      description: 'Retrieve all personal data associated with the authenticated customer (GDPR data export)',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const customerId = request.customerId!;
    const storeId = request.storeId!;

    const data = await customerService.gdprExport(customerId, storeId);

    return {
      success: true,
      exportedAt: new Date().toISOString(),
      data,
    };
  });

  // POST /api/v1/customer/profile/delete
  fastify.post('/delete', {
    schema: {
      tags: ['Customer Profile'],
      summary: 'Delete personal data',
      description: 'Anonymize the authenticated customer account and clear all active sessions (GDPR right to erasure)',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const customerId = request.customerId!;
    const storeId = request.storeId!;

    // Anonymize customer record in database
    await customerService.deleteProfile(customerId, storeId);

    // Clear all Redis refresh tokens for this customer
    try {
      const pattern = `refresh:customer:${customerId}:*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await fastify.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await fastify.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Best-effort session clearing; don't fail the request if Redis is unreachable
    }

    // Clear auth cookies
    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/' });

    return {
      success: true,
      message: 'Your account has been anonymized and all sessions have been cleared.',
    };
  });
}
