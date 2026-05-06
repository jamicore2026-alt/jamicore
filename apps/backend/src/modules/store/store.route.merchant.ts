// Merchant Store Routes - GET/PATCH store info
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { storeService } from './store.service.js';
import { merchantUpdateStoreSchema as updateStoreSchema } from './store.schema.js';

export default async function merchantStoreRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/store
  fastify.get('/', {
    schema: {
      tags: ['Merchant Store'],
      summary: 'Get store details',
      description: 'Retrieve the authenticated merchant store information, excluding sensitive owner fields',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const store = await storeService.findByIdOrFail(request.storeId);
    // Strip sensitive owner fields from response
    const { ownerEmail: _ownerEmail, ownerName: _ownerName, ownerPhone: _ownerPhone, ...publicStore } = store;
    return { store: publicStore };
  });

  // PATCH /api/v1/merchant/store
  fastify.patch('/', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Store'],
      summary: 'Update store details',
      description: 'Partial update of the authenticated merchant store settings including branding and theme',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = updateStoreSchema.parse(request.body);
    const store = await storeService.update(request.storeId, parsed);

    const { ownerEmail: _ownerEmail, ownerName: _ownerName, ownerPhone: _ownerPhone, ...publicStore } = store;
    return { store: publicStore };
  });
}
