// Public Theme Routes - Store theme settings for storefront
import { FastifyInstance } from 'fastify';
import { ErrorCodes } from '../../errors/codes.js';
import { themeService } from './theme.service.js';

export default async function themePublicRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/stores/:slug/theme
  fastify.get('/stores/:slug/theme', {
    schema: {
      tags: ['Public Theme'],
      summary: 'Get store theme settings',
      description: 'Retrieve theme configuration for a store by domain/slug',
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const store = await fastify.storeService.findByDomain(slug);
    if (!store) {
      return reply.status(404).send({
        error: 'Not Found',
        code: ErrorCodes.STORE_NOT_FOUND,
        message: 'Store not found',
      });
    }

    const settings = await themeService.findByStoreId(store.id);
    return { theme: settings };
  });
}
