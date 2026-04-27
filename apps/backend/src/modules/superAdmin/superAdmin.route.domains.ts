// SuperAdmin Custom Domain Verification Routes
import { FastifyInstance } from 'fastify';
import { superAdminService } from './superAdmin.service.js';
import { customDomainListQuerySchema, idParamSchema } from './superAdmin.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function superAdminDomainRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/domains - List stores with custom domains
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Domains'],
      summary: 'List custom domains',
      description: 'List stores with custom domains, optionally filtered by verification status',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = customDomainListQuerySchema.parse(request.query);
    return superAdminService.listCustomDomains({
      page: query.page,
      limit: query.limit,
      verified: query.verified,
    });
  });

  // POST /api/v1/admin/domains/:id/verify - Verify custom domain
  fastify.post('/:id/verify', {
    schema: {
      tags: ['SuperAdmin Domains'],
      summary: 'Verify domain',
      description: 'Approve and verify a store\'s custom domain',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const store = await superAdminService.verifyCustomDomain(id);
      return { store };
    } catch (err: any) {
      if (err.code === ErrorCodes.STORE_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
        return;
      }
      if (err.code === ErrorCodes.VALIDATION_ERROR) {
        reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: err.message });
        return;
      }
      throw err;
    }
  });

  // POST /api/v1/admin/domains/:id/reject - Reject custom domain
  fastify.post('/:id/reject', {
    schema: {
      tags: ['SuperAdmin Domains'],
      summary: 'Reject domain',
      description: 'Reject a store\'s custom domain verification',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const store = await superAdminService.rejectCustomDomain(id);
      return { store };
    } catch (err: any) {
      if (err.code === ErrorCodes.STORE_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
        return;
      }
      throw err;
    }
  });
}
