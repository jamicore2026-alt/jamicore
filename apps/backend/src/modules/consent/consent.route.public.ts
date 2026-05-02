import type { FastifyInstance } from 'fastify';
import { consentService } from './consent.service.js';
import { z } from 'zod';
import { ErrorCodes } from '../../errors/codes.js';

const createConsentSchema = z.object({
  cookiePreferences: z.record(z.string(), z.boolean()),
  marketingConsent: z.boolean().optional(),
  analyticsConsent: z.boolean().optional(),
});

const updateConsentSchema = z.object({
  cookiePreferences: z.record(z.string(), z.boolean()).optional(),
  marketingConsent: z.boolean().optional(),
  analyticsConsent: z.boolean().optional(),
});

export default async function (fastify: FastifyInstance) {
  // POST /api/v1/public/cookie-consent - Record cookie consent
  fastify.post('/', {
    schema: {
      tags: ['Public'],
      summary: 'Record cookie consent',
      description: 'Store visitor cookie consent preferences for compliance',
    },
  }, async (request, reply) => {
    const storeId = request.storeId;
    if (!storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }
    const body = createConsentSchema.parse(request.body);
    const consent = await consentService.createConsent(storeId, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      customerId: request.customerId,
      analytics: body.analyticsConsent,
      marketing: body.marketingConsent,
    });
    reply.status(201);
    return { data: consent };
  });

  // GET /api/v1/public/cookie-consent - Get current cookie consent
  fastify.get('/', {
    schema: {
      tags: ['Public'],
      summary: 'Get cookie consent',
      description: 'Retrieve the current cookie consent for the authenticated customer',
    },
  }, async (request, reply) => {
    const storeId = request.storeId;
    if (!storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }
    if (!request.customerId) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Customer authentication required' });
      return;
    }
    const consent = await consentService.getConsent(storeId, request.customerId);
    if (!consent) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Cookie consent not found' });
      return;
    }
    return { data: consent };
  });

  // PATCH /api/v1/public/cookie-consent - Update cookie consent
  fastify.patch('/', {
    schema: {
      tags: ['Public'],
      summary: 'Update cookie consent',
      description: 'Update cookie consent preferences for the authenticated customer',
    },
  }, async (request, reply) => {
    const storeId = request.storeId;
    if (!storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }
    if (!request.customerId) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Customer authentication required' });
      return;
    }
    const body = updateConsentSchema.parse(request.body);
    const existing = await consentService.getConsent(storeId, request.customerId);
    if (!existing) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.NOT_FOUND, message: 'Cookie consent not found' });
      return;
    }
    const consent = await consentService.updateConsent(existing.id, {
      analytics: body.analyticsConsent,
      marketing: body.marketingConsent,
    });
    return { data: consent };
  });
}
