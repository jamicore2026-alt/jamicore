// Merchant Currency Routes - Exchange rate management
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { currencyService } from './currency.service.js';
import { exchangeRateSchema } from './currency.schema.js';
import * as repo from './currency.repo.js';
import { idParamSchema } from '../_shared/schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function merchantCurrencyRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/currency
  fastify.get('/', {
    schema: { tags: ['Merchant Currency'], summary: 'List exchange rates for store currency', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const storeCurrency = await currencyService.getStoreCurrency(request.storeId);
    const rates = await currencyService.listRates(request.storeId);
    const filtered = rates.filter((r) => r.baseCurrency === storeCurrency);
    return { baseCurrency: storeCurrency, rates: filtered };
  });

  // POST /api/v1/merchant/currency
  fastify.post('/', {
    preHandler: requirePermission('currency:write'),
    schema: { tags: ['Merchant Currency'], summary: 'Create or update exchange rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const parsed = exchangeRateSchema.parse(request.body);
    const existing = await currencyService.getRate(parsed.baseCurrency, parsed.targetCurrency, request.storeId);
    const rate = await repo.upsertRate({ ...parsed, storeId: request.storeId });
    reply.status(existing ? 200 : 201).send({ rate });
  });

  // DELETE /api/v1/merchant/currency/:id
  fastify.delete('/:id', {
    preHandler: requirePermission('currency:write'),
    schema: { tags: ['Merchant Currency'], summary: 'Delete exchange rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const rate = await repo.findRateById(id);
    if (!rate || rate.storeId !== request.storeId) {
      return reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.PERMISSION_DENIED });
    }
    const [deleted] = await repo.deleteRate(id);
    if (!deleted) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Rate not found' });
      return;
    }
    reply.status(204).send();
  });
}
