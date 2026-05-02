// Public Shipping Routes - Calculate shipping options
import { FastifyInstance } from 'fastify';
import { shippingCalculateSchema } from './shipping.schema.js';
import { shippingService } from './shipping.service.js';
export default async function publicShippingRoutes(fastify: FastifyInstance) {
  // POST /api/v1/public/shipping/calculate
  fastify.post('/calculate', {
    schema: { tags: ['Public Shipping'], summary: 'Calculate shipping options' },
  }, async (request, _reply) => {
    const parsed = shippingCalculateSchema.parse(request.body);
    const result = await shippingService.calculateShipping(
      request.storeId,
      { country: parsed.country, state: parsed.state, postalCode: parsed.postalCode },
      parsed.subtotal,
      parsed.weightKg,
    );
    return result;
  });
}