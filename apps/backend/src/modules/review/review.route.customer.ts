// Customer Reviews Routes - Create and manage product reviews
import { FastifyInstance } from 'fastify';
import { createReviewSchema, updateReviewSchema, idParamSchema } from './review.schema.js';
import { reviewService } from './review.service.js';

export default async function customerReviewsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/reviews - List customer's reviews
  fastify.get('/', {
    schema: {
      tags: ['Customer Reviews'],
      summary: 'List customer reviews',
      description: 'List all reviews written by the authenticated customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const result = await reviewService.findByStoreId(request.storeId, { page: 1, limit: 100 });
    // Filter to only show this customer's reviews
    const customerReviews = result.data.filter((r: { customerId: string | null }) =>
      r.customerId === request.customerId,
    );
    return { reviews: customerReviews };
  });

  // POST /api/v1/customer/reviews - Create a review
  fastify.post('/', {
    schema: {
      tags: ['Customer Reviews'],
      summary: 'Create review',
      description: 'Submit a new product review as an authenticated customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createReviewSchema.parse(request.body);
    const review = await reviewService.create({
      storeId: request.storeId,
      productId: parsed.productId,
      customerId: request.customerId,
      orderId: parsed.orderId,
      rating: parsed.rating,
      title: parsed.title,
      content: parsed.content,
      images: parsed.images,
    });
    reply.status(201).send({ review });
  });

  // PATCH /api/v1/customer/reviews/:id - Update own review
  fastify.patch('/:id', {
    schema: {
      tags: ['Customer Reviews'],
      summary: 'Update review',
      description: 'Partial update of a review owned by the authenticated customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateReviewSchema.parse(request.body);
    const review = await reviewService.findById(id, request.storeId);
    if (review.customerId !== request.customerId) {
      return reply.status(403).send({ error: 'Forbidden', code: 'REVIEW_NOT_OWNED' });
    }
    const updated = await reviewService.update(id, request.storeId, parsed);
    return { review: updated };
  });

  // DELETE /api/v1/customer/reviews/:id - Delete own review
  fastify.delete('/:id', {
    schema: {
      tags: ['Customer Reviews'],
      summary: 'Delete review',
      description: 'Delete a review owned by the authenticated customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const review = await reviewService.findById(id, request.storeId);
    if (review.customerId !== request.customerId) {
      return reply.status(403).send({ error: 'Forbidden', code: 'REVIEW_NOT_OWNED' });
    }
    await reviewService.delete(id, request.storeId);
    reply.status(204).send();
  });
}