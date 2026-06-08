// Merchant Domain Routes — manage store subdomain and custom domains
import { FastifyInstance } from 'fastify';
import { domainService } from './domain.service.js';
import {
  checkDomainSchema,
  updateSubdomainSchema,
  addCustomDomainSchema,
  idParamSchema,
} from './domain.schema.js';

export default async function merchantDomainRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/domain — List all domains for the store
  fastify.get('/', {
    schema: {
      tags: ['Domain'],
      summary: 'List store domains',
      description: 'Returns the store subdomain and all custom domains',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    return domainService.getStoreDomains(request.storeId);
  });

  // GET /api/v1/merchant/domain/check — Check subdomain availability
  fastify.get('/check', {
    schema: {
      tags: ['Domain'],
      summary: 'Check subdomain availability',
      querystring: checkDomainSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { domain } = checkDomainSchema.parse(request.query);
    return domainService.checkSubdomainAvailability(domain, request.storeId);
  });

  // PATCH /api/v1/merchant/domain/subdomain — Update store subdomain
  fastify.patch('/subdomain', {
    schema: {
      tags: ['Domain'],
      summary: 'Update store subdomain',
      body: updateSubdomainSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { domain } = updateSubdomainSchema.parse(request.body);
    return domainService.updateSubdomain(request.storeId, domain);
  });

  // POST /api/v1/merchant/domain/custom — Add custom domain
  fastify.post('/custom', {
    schema: {
      tags: ['Domain'],
      summary: 'Add a custom domain',
      body: addCustomDomainSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { domain, verificationType } = addCustomDomainSchema.parse(request.body);
    const result = await domainService.addCustomDomain(request.storeId, domain, verificationType);

    // Enqueue domain verification job for periodic DNS polling
    const queueService = fastify.queueService;
    if (queueService.domainVerificationQueue) {
      await queueService.domainVerificationQueue.add(
        'domain-verification',
        { verificationId: result.id, storeId: request.storeId },
        {
          jobId: `domain-verify-${result.id}`,
          delay: 5 * 60 * 1000,
          attempts: 288,
          backoff: { type: 'fixed', delay: 5 * 60 * 1000 },
        },
      );
    }

    reply.status(201).send(result);
  });

  // GET /api/v1/merchant/domain/custom/:id/status — Get custom domain verification status
  fastify.get('/custom/:id/status', {
    schema: {
      tags: ['Domain'],
      summary: 'Get custom domain verification status',
      params: idParamSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return domainService.getCustomDomainStatus(id, request.storeId);
  });

  // POST /api/v1/merchant/domain/custom/:id/verify — Manual re-trigger verification
  fastify.post('/custom/:id/verify', {
    schema: {
      tags: ['Domain'],
      summary: 'Manually verify a custom domain',
      params: idParamSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return domainService.verifyCustomDomain(id, request.storeId);
  });

  // DELETE /api/v1/merchant/domain/custom/:id — Remove custom domain
  fastify.delete('/custom/:id', {
    schema: {
      tags: ['Domain'],
      summary: 'Remove a custom domain',
      params: idParamSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return domainService.removeCustomDomain(id, request.storeId);
  });
}
