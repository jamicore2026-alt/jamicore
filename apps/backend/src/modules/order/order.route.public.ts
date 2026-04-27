// Public Order Routes - Guest order tracking
import { FastifyInstance } from 'fastify';
import { orderRepo } from './order.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function publicOrderRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/orders/track?orderNumber=XXX&email=XXX
  fastify.get('/track', {
    schema: {
      tags: ['Public'],
      summary: 'Track guest order',
      description: 'Look up an order by order number and email address',
    },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
      return;
    }

    const { orderNumber, email } = request.query as { orderNumber?: string; email?: string };

    if (!orderNumber || !email) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: 'orderNumber and email are required' });
      return;
    }

    const order = await orderRepo.findByOrderNumber(orderNumber, request.storeId);

    if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ORDER_NOT_FOUND, message: 'Order not found' });
      return;
    }

    return { order };
  });
}
