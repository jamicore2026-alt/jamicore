// Customer Payment Routes — create payment intent, check payment status
import { FastifyInstance } from 'fastify';
import { paymentService } from './payment.service.js';
import { createPaymentIntentSchema, orderIdParamSchema } from './payment.schema.js';
import { ErrorCodes } from '../../errors/codes.js';
import { orderRepo } from '../order/order.repo.js';

export default async function customerPaymentRoutes(fastify: FastifyInstance) {
  // POST /api/v1/customer/payments/intent
  fastify.post('/intent', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Customer Payments'],
      summary: 'Create a payment intent',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, _reply) => {
    const parsed = createPaymentIntentSchema.parse(request.body);
    const intent = await paymentService.createPaymentIntent(
      request.storeId,
      parsed.orderId,
      parsed.provider,
    );
    return { data: intent };
  });

  // GET /api/v1/customer/payments/orders/:orderId
  fastify.get('/orders/:orderId', {
    schema: {
      tags: ['Customer Payments'],
      summary: 'Get payment status for own order',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { orderId } = orderIdParamSchema.parse(request.params);

    // Verify the order belongs to this customer
    const order = await orderRepo.findByIdSimple(orderId, request.storeId);
    if (!order) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ORDER_NOT_FOUND, message: 'Order not found' });
      return;
    }
    if (order.customerId !== request.customerId) {
      reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.INSUFFICIENT_PERMISSIONS, message: 'Not your order' });
      return;
    }

    const status = await paymentService.getPaymentStatus(orderId, request.storeId);
    return status;
  });
}