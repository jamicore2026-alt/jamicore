// Public Store Routes - Store info for storefront
import { FastifyInstance } from 'fastify';
import { storeService } from './store.service.js';

export default async function publicStoreRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/store - Get public store info
  fastify.get('/', {
    schema: {
      tags: ['Public'],
      summary: 'Get store info',
      description: 'Get public store information resolved from Host header',
    },
  }, async (request) => {
    const store = await storeService.findById(request.storeId);
    if (!store) {
      return { store: null, message: 'Store not found' };
    }

    // Strip sensitive owner fields
    const { ownerEmail: _ownerEmail, ownerName: _ownerName, ownerPhone: _ownerPhone, ...publicStore } = store;
    return { store: publicStore };
  });

  // GET /api/v1/public/store/currency
  fastify.get('/currency', {
    schema: {
      tags: ['Public'],
      summary: 'Get store currency',
    },
  }, async (request) => {
    const store = await storeService.findById(request.storeId);
    if (!store) {
      return { currency: null, message: 'Store not found' };
    }

    return { currency: store.currency };
  });
}
