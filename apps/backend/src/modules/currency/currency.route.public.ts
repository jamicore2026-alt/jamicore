// Public Currency Routes - Currency conversion and rates
import { FastifyInstance } from 'fastify';
import { currencyService } from './currency.service.js';
import { convertSchema } from './currency.schema.js';

export default async function publicCurrencyRoutes(fastify: FastifyInstance) {
  // POST /api/v1/public/currency/convert
  fastify.post('/convert', {
    schema: { tags: ['Public Currency'], summary: 'Convert amount between currencies' },
  }, async (request) => {
    const parsed = convertSchema.parse(request.body);
    const converted = await currencyService.convert(parsed.amount, parsed.from, parsed.to);
    return {
      amount: parsed.amount,
      from: parsed.from,
      to: parsed.to,
      converted,
    };
  });

  // GET /api/v1/public/currency/rates
  fastify.get('/rates', {
    schema: { tags: ['Public Currency'], summary: 'List all exchange rates' },
  }, async () => {
    const rates = await currencyService.listRates();
    return { rates };
  });
}
