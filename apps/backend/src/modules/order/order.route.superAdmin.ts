// SuperAdmin Order Routes — View and manage all platform orders
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';
import { orderRepo } from '../order/order.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  search: z.string().max(200).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export default async function superAdminOrderRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/orders - List all orders across all stores
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Orders'],
      summary: 'List all orders',
      description: 'List all orders across the platform with optional status filter and pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const { page, limit } = query;

    // Default to last 30 days when no explicit date range or narrow filters are provided
    // to prevent unbounded COUNT(*) scans across the entire orders table
    const dateFrom = query.dateFrom ?? (!query.status && !query.search ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : undefined);
    const dateTo = query.dateTo;

    const result = await orderRepo.findAll({ ...query, dateFrom, dateTo });
    return {
      data: result.data,
      meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    };
  });

  // GET /api/v1/admin/orders/:id - Get order detail (admin can view any order)
  fastify.get('/:id', {
    schema: {
      tags: ['SuperAdmin Orders'],
      summary: 'Get order detail',
      description: 'Retrieve detailed information for any order by ID',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const order = await orderRepo.findByIdAdmin(id);
    if (!order) {
      reply.status(404).send({ error: 'Order not found', code: ErrorCodes.ORDER_NOT_FOUND, message: 'Order not found' });
      return;
    }
    return { order };
  });
}
