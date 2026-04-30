// Merchant Tax Routes - Tax rate CRUD
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { taxService } from './tax.service.js';
import { idParamSchema } from '../_shared/schema.js';
import { createTaxRateSchema, updateTaxRateSchema } from './tax.schema.js';

export default async function merchantTaxRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/tax
  fastify.get('/', {
    preHandler: requirePermission('tax:read'),
    schema: { tags: ['Merchant Tax'], summary: 'List tax rates', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const rates = await taxService.listRates(request.storeId);
    return { rates };
  });

  // POST /api/v1/merchant/tax
  fastify.post('/', {
    preHandler: requirePermission('tax:write'),
    schema: { tags: ['Merchant Tax'], summary: 'Create tax rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const parsed = createTaxRateSchema.parse(request.body);
    const rate = await taxService.createRate(request.storeId, parsed);
    reply.status(201).send({ rate });
  });

  // GET /api/v1/merchant/tax/:id
  fastify.get('/:id', {
    schema: { tags: ['Merchant Tax'], summary: 'Get tax rate', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const rate = await taxService.getRate(id, request.storeId);
    if (!rate) return { rate: null };
    return { rate };
  });

  // PATCH /api/v1/merchant/tax/:id
  fastify.patch('/:id', {
    preHandler: requirePermission('tax:write'),
    schema: { tags: ['Merchant Tax'], summary: 'Update tax rate', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateTaxRateSchema.parse(request.body);
    const rate = await taxService.updateRate(id, request.storeId, parsed);
    return { rate };
  });

  // DELETE /api/v1/merchant/tax/:id
  fastify.delete('/:id', {
    preHandler: requirePermission('tax:write'),
    schema: { tags: ['Merchant Tax'], summary: 'Delete tax rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await taxService.deleteRate(id, request.storeId);
    reply.status(204).send();
  });
}
