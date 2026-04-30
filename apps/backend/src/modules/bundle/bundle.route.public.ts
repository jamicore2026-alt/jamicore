// Public Bundle Routes - Read-only bundle access for storefront
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { bundleService } from './bundle.service.js';

const productIdParamSchema = z.strictObject({
  productId: z.string().uuid(),
});

import { ErrorCodes } from '../../errors/codes.js';

export default async function publicBundleRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/bundles/product/:productId - Get active bundles containing a product
  fastify.get('/product/:productId', {
    schema: {
      tags: ['Public'],
      summary: 'Get bundles for product',
      description: 'Retrieve active product bundles that contain the specified product',
    },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }

    const { productId } = productIdParamSchema.parse(request.params);
    const bundles = await bundleService.findBundlesByProductId(productId, request.storeId);
    return { bundles };
  });
}
