// Merchant CMS Page Routes — CRUD for merchant-managed pages
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { cmsService } from './cms.service.js';
import { createCmsPageSchema, updateCmsPageSchema, idParamSchema, listCmsPageQuerySchema } from './cms.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

interface TypedError extends Error {
  code: string;
}

export default async function merchantCmsRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['Merchant CMS'],
      summary: 'List CMS pages',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listCmsPageQuerySchema.parse(request.query);
    const { items, total } = await cmsService.listPages(request.storeId, query);
    return { items, total, limit: query.limit, offset: query.offset };
  });

  fastify.post('/', {
    preHandler: requirePermission('cms:write'),
    schema: {
      tags: ['Merchant CMS'],
      summary: 'Create CMS page',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createCmsPageSchema.parse(request.body);
    const page = await cmsService.createPage(request.storeId, parsed);
    reply.status(201).send({ page });
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Merchant CMS'],
      summary: 'Get CMS page',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const page = await cmsService.getPage(id, request.storeId);
      return { page };
    } catch (err: unknown) {
      const typedErr = err as TypedError;
      if (typedErr.code === ErrorCodes.CMS_PAGE_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: typedErr.code, message: typedErr.message });
        return;
      }
      throw err;
    }
  });

  fastify.patch('/:id', {
    preHandler: requirePermission('cms:write'),
    schema: {
      tags: ['Merchant CMS'],
      summary: 'Update CMS page',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const parsed = updateCmsPageSchema.parse(request.body);
      const page = await cmsService.updatePage(id, request.storeId, parsed);
      return { page };
    } catch (err: unknown) {
      const typedErr = err as TypedError;
      if (typedErr.code === ErrorCodes.CMS_PAGE_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: typedErr.code, message: typedErr.message });
        return;
      }
      throw err;
    }
  });

  fastify.delete('/:id', {
    preHandler: requirePermission('cms:write'),
    schema: {
      tags: ['Merchant CMS'],
      summary: 'Delete CMS page',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      await cmsService.deletePage(id, request.storeId);
      reply.status(204).send();
    } catch (err: unknown) {
      const typedErr = err as TypedError;
      if (typedErr.code === ErrorCodes.CMS_PAGE_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: typedErr.code, message: typedErr.message });
        return;
      }
      throw err;
    }
  });
}
