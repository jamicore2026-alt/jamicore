// Public Store Routes - Store info for storefront
import { FastifyInstance } from 'fastify';
import { storeService } from './store.service.js';
import { getCacheService } from '../../services/cache.service.js';

export default async function publicStoreRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/store - Get public store info
  // PERF-007: wrap in cache with CACHE_TTL.STORE (60s) so a hot storefront
  // doesn't hit the DB on every request.
  fastify.get('/', {
    schema: {
      tags: ['Public'],
      summary: 'Get store info',
      description: 'Get public store information resolved from Host header',
    },
  }, async (request) => {
    const cache = getCacheService();
    const result = await cache.wrap(
      `store:public:${request.storeId}`,
      async () => {
        const store = await storeService.findById(request.storeId);
        if (!store) {
          return { store: null, message: 'Store not found' };
        }
        // Strip sensitive owner fields
        const { ownerEmail: _ownerEmail, ownerName: _ownerName, ownerPhone: _ownerPhone, ...publicStore } = store;
        return { store: publicStore };
      },
      cache.getTTL('STORE'),
    );
    return result;
  });

  // GET /api/v1/public/store/currency
  fastify.get('/currency', {
    schema: {
      tags: ['Public'],
      summary: 'Get store currency',
    },
  }, async (request) => {
    const cache = getCacheService();
    const result = await cache.wrap(
      `store:public:currency:${request.storeId}`,
      async () => {
        const store = await storeService.findById(request.storeId);
        if (!store) {
          return { currency: null, message: 'Store not found' };
        }
        return { currency: store.currency };
      },
      cache.getTTL('STORE'),
    );
    return result;
  });
}
