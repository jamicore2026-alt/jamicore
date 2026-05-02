// Public CMS Page Routes — Read-only access to published pages
import { FastifyInstance } from 'fastify';
import { cmsService } from './cms.service.js';
import { slugParamSchema } from './cms.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

interface TypedError extends Error {
  code: string;
}

export default async function publicCmsRoutes(fastify: FastifyInstance) {
  fastify.get('/:slug', {
    schema: {
      tags: ['Public'],
      summary: 'Get published CMS page',
      description: 'Retrieve a single published CMS page by slug for the current store',
    },
  }, async (request, reply) => {
    const { slug } = slugParamSchema.parse(request.params);
    try {
      const page = await cmsService.getPublishedPageBySlug(slug, request.storeId);
      return { page };
    } catch (err: unknown) {
      const typedErr = err as TypedError;
      if (typedErr.code === ErrorCodes.CMS_PAGE_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: typedErr.code, message: 'Page not found' });
        return;
      }
      throw err;
    }
  });
}
