// SuperAdmin Audit Log Routes — View platform activity logs
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { superAdminService } from './superAdmin.service.js';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.string().max(50).optional(),
  action: z.string().max(50).optional(),
});

export default async function superAdminAuditRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/audit-logs - List all activity logs
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Audit'],
      summary: 'List audit logs',
      description: 'List all platform activity logs with optional filters',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    return superAdminService.listActivityLogs(query);
  });
}
