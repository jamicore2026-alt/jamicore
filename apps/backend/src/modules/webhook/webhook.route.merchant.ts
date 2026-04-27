// Merchant Webhook Routes — CRUD for merchant webhooks
import { FastifyInstance } from 'fastify';
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
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateWebhookSchema.parse(request.body);
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
    await webhookService.deleteWebhook(id);
    reply.status(204).send();
  });

  fastify.get('/:id/deliveries', {
    schema: {
      tags: ['Merchant Webhooks'],
      summary: 'List webhook deliveries',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const deliveries = await webhookService.getDeliveries(id);
    return { deliveries };
  });
}