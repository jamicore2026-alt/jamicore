// Customer Wishlist Routes - Add/remove wishlist items
import { FastifyInstance } from 'fastify';
import { addWishlistSchema, productIdParamSchema } from './wishlist.schema.js';
import { wishlistService } from './wishlist.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function customerWishlistRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/wishlist - Get customer's wishlist
  fastify.get('/', {
    schema: {
      tags: ['Customer Wishlist'],
      summary: 'Get wishlist',
      description: 'Retrieve the authenticated customer wishlist with product details',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const result = await wishlistService.getWishlist(request.customerId!, request.storeId);
    return result;
  });

  // POST /api/v1/customer/wishlist - Add item to wishlist
  fastify.post('/', {
    schema: {
      tags: ['Customer Wishlist'],
      summary: 'Add to wishlist',
      description: 'Add a product to the authenticated customer wishlist',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = addWishlistSchema.parse(request.body);

    const result = await wishlistService.addItem(
      request.customerId!,
      request.storeId,
      parsed.productId,
    );

    if (result.duplicate) {
      reply.status(409).send({
        error: 'Conflict',
        code: ErrorCodes.WISHLIST_ITEM_EXISTS,
        message: 'Product already in wishlist',
      });
      return;
    }

    reply.status(201).send({ wishlistItem: result.wishlistItem });
  });

  // DELETE /api/v1/customer/wishlist/:productId - Remove from wishlist
  fastify.delete('/:productId', {
    schema: {
      tags: ['Customer Wishlist'],
      summary: 'Remove from wishlist',
      description: 'Remove a product from the authenticated customer wishlist',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { productId } = productIdParamSchema.parse(request.params);

    await wishlistService.removeItem(request.customerId!, productId);

    reply.status(204).send();
  });
}