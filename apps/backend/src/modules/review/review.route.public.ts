// Public Reviews Routes - View product reviews
import { FastifyInstance } from 'fastify';
import { idParamSchema, listQuerySchema } from './review.schema.js';
import { reviewService } from './review.service.js';

export default async function publicReviewsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/reviews/product/:id - Get reviews for a product
  fastify.get('/product/:id', {
    schema: {
      tags: ['Public'],
      summary: 'List product reviews',
      description: 'Browse published reviews for a specific product in the current store',
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const query = listQuerySchema.parse(request.query);
    const result = await reviewService.findByProductId(id, request.storeId, query);
    return result;
  });
}