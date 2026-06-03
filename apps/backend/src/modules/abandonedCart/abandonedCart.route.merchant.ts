// Merchant Abandoned Cart Routes — list and count abandoned carts
import { FastifyInstance } from 'fastify';
import { abandonedCartService } from './abandonedCart.service.js';
import { listAbandonedCartsQuerySchema } from './abandonedCart.schema.js';

export default async function merchantAbandonedCartRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/abandoned-carts
  fastify.get('/', {
    schema: {
      tags: ['Merchant Abandoned Carts'],
      summary: 'List abandoned carts',
      description: 'List carts with items that have not been updated within the specified hours',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listAbandonedCartsQuerySchema.parse(request.query);
    const result = await abandonedCartService.findByStoreId(request.storeId, query);
    return result;
  });

  // GET /api/v1/merchant/abandoned-carts/count
  fastify.get('/count', {
    schema: {
      tags: ['Merchant Abandoned Carts'],
      summary: 'Count abandoned carts',
      description: 'Get the total count of abandoned carts for the store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listAbandonedCartsQuerySchema.parse(request.query);
    const count = await abandonedCartService.count(request.storeId, query.hoursSinceUpdate);
    return { count };
  });
}
