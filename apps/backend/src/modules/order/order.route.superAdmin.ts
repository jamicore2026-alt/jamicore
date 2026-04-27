// SuperAdmin Order Routes — View and manage all platform orders
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';
import { orderRepo } from '../order/order.repo.js';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  search: z.string().max(200).optional(),
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
    const result = await orderRepo.findAll(query);
    return result;
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
      reply.status(404).send({ error: 'Order not found' });
      return;
    }
    return { order };
  });
}
