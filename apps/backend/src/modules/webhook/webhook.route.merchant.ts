// Merchant Webhook Routes � CRUD for merchant webhooks
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { webhookService } from './webhook.service.js';
import { createWebhookSchema, updateWebhookSchema, idParamSchema } from './webhook.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

interface TypedError extends Error {
  code: string;
}

export default async function merchantWebhookRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    preHandler: requirePermission('webhooks:read'),
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'List webhooks',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const webhooks = await webhookService.getWebhooks(request.storeId);
    return { webhooks };
  });

  fastify.post('/', {
    preHandler: requirePermission('webhooks:write'),
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'Create webhook',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createWebhookSchema.parse(request.body);
    const webhook = await webhookService.createWebhook(request.storeId, parsed);
    reply.status(201).send({ webhook });
  });

  fastify.get('/:id', {
    preHandler: requirePermission('webhooks:read'),
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'Get webhook',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const webhook = await webhookService.getWebhook(id, request.storeId);
      return { webhook };
    } catch (err: unknown) {
      const typedErr = err as TypedError;
      if (typedErr.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: typedErr.code, message: typedErr.message });
        return;
      }
      throw err;
    }
  });

  fastify.patch('/:id', {
    preHandler: requirePermission('webhooks:write'),
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'Update webhook',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, _reply) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateWebhookSchema.parse(request.body);
    await webhookService.getWebhook(id, request.storeId);
    const webhook = await webhookService.updateWebhook(id, request.storeId, parsed);
    return { webhook };
  });

  fastify.delete('/:id', {
    preHandler: requirePermission('webhooks:write'),
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'Delete webhook',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await webhookService.getWebhook(id, request.storeId);
    await webhookService.deleteWebhook(id, request.storeId);
    reply.status(204).send();
  });

  fastify.get('/:id/deliveries', {
    preHandler: requirePermission('webhooks:read'),
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'List webhook deliveries',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, _reply) => {
    const { id } = idParamSchema.parse(request.params);
    await webhookService.getWebhook(id, request.storeId);
    const deliveries = await webhookService.getDeliveries(id);
    return { deliveries };
  });
}