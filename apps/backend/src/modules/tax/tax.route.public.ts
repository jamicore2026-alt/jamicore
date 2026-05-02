// Public Tax Routes - Calculate tax
import { FastifyInstance } from 'fastify';
import { taxCalculateSchema } from './tax.schema.js';
import { taxService } from './tax.service.js';
export default async function publicTaxRoutes(fastify: FastifyInstance) {
  // POST /api/v1/public/tax/calculate
  fastify.post('/calculate', {
    schema: { tags: ['Public Tax'], summary: 'Calculate tax' },
  }, async (request, _reply) => {
    const parsed = taxCalculateSchema.parse(request.body);
    const result = await taxService.calculateTax(
      request.storeId,
      { country: parsed.country, state: parsed.state, postalCode: parsed.postalCode },
      parsed.subtotal,
      parsed.shipping,
    );
    return result;
  });
}