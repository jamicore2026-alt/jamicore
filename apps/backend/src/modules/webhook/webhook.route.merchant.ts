// Merchant Webhook Routes � CRUD for merchant webhooks
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { webhookService } from './webhook.service.js';
import { createWebhookSchema, updateWebhookSchema, idParamSchema } from './webhook.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function merchantWebhookRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
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
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'Get webhook',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const webhook = await webhookService.getWebhook(id);
      if (webhook.storeId !== request.storeId) {
        return reply.status(403).send({ error: 'Forbidden', code: 'WEBHOOK_NOT_FOUND' });
      }
      return { webhook };
    } catch (err: any) {
      if (err.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: err.code, message: err.message });
        return;
      }
      throw err;
    }
  });

  fastify.patch('/:id', {
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'Update webhook',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateWebhookSchema.parse(request.body);
    const existing = await webhookService.getWebhook(id);
    if (existing.storeId !== request.storeId) {
      return reply.status(403).send({ error: 'Forbidden', code: 'WEBHOOK_NOT_FOUND' });
    }
    const webhook = await webhookService.updateWebhook(id, parsed);
    return { webhook };
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'Delete webhook',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const existing = await webhookService.getWebhook(id);
    if (existing.storeId !== request.storeId) {
      return reply.status(403).send({ error: 'Forbidden', code: 'WEBHOOK_NOT_FOUND' });
    }
    await webhookService.deleteWebhook(id);
    reply.status(204).send();
  });

  fastify.get('/:id/deliveries', {
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'List webhook deliveries',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const existing = await webhookService.getWebhook(id);
    if (existing.storeId !== request.storeId) {
      return reply.status(403).send({ error: 'Forbidden', code: 'WEBHOOK_NOT_FOUND' });
    }
    const deliveries = await webhookService.getDeliveries(id);
    return { deliveries };
  });
}