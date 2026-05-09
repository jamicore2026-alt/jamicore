// Customer Orders Routes - View orders, track status
import { FastifyInstance } from 'fastify';
import { listQuerySchema, idParamSchema } from './order.schema.js';
import { orderService } from './order.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function customerOrdersRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/orders - List customer's orders
  fastify.get('/', {
    schema: {
      tags: ['Customer Orders'],
      summary: 'List customer orders',
      description: 'List orders belonging to the authenticated customer with pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await orderService.findByCustomerId(request.storeId, request.customerId!, query);
    
    return result;
  });

  // GET /api/v1/customer/orders/:id - Get order detail
  fastify.get('/:id', {
    schema: {
      tags: ['Customer Orders'],
      summary: 'Get order detail',
      description: 'Retrieve a specific order belonging to the authenticated customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const order = await orderService.findById(id, request.storeId);

    // Ensure the order belongs to this customer
    if (order.customerId !== request.customerId) {
      reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.INSUFFICIENT_PERMISSIONS, message: 'Not your order' });
      return;
    }

    return { order };
  });
}