// SuperAdmin Custom Domain Verification Routes — migrated to domain module
import type { FastifyInstance } from 'fastify';
import { idParamSchema, customDomainListQuerySchema } from './domain.schema.js';
import { domainRepo } from './domain.repo.js';
import { domainService } from './domain.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function superAdminDomainRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/domains — List stores with custom domains
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Domains'],
      summary: 'List custom domains',
      description: 'List stores with custom domains, optionally filtered by verification status',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = customDomainListQuerySchema.parse(request.query);
    return domainRepo.findStoresWithCustomDomains(query);
  });

  // POST /api/v1/admin/domains/:id/verify — Verify custom domain
  fastify.post('/:id/verify', {
    schema: {
      tags: ['SuperAdmin Domains'],
      summary: 'Verify domain',
      description: 'Approve and verify a store\'s custom domain',
      params: idParamSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const result = await domainService.verifyCustomDomain(id);
      return { verified: result.verified, status: result.status };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      const code = (e as Error & { code?: string }).code;
      if (code === ErrorCodes.DOMAIN_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.DOMAIN_NOT_FOUND, message: 'Domain verification not found' });
        return;
      }
      if (code === ErrorCodes.STORE_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
        return;
      }
      if (code === ErrorCodes.VALIDATION_ERROR) {
        reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: e.message });
        return;
      }
      throw err;
    }
  });

  // POST /api/v1/admin/domains/:id/reject — Reject custom domain
  fastify.post('/:id/reject', {
    schema: {
      tags: ['SuperAdmin Domains'],
      summary: 'Reject domain',
      description: 'Reject a store\'s custom domain verification',
      params: idParamSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    await domainRepo.updateStatus(id, { status: 'failed', errorMessage: 'Rejected by admin' });
    return { rejected: true };
  });
}
