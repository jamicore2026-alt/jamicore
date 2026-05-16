// Merchant API Key Routes — CRUD for merchant API keys
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { apiKeyService } from './apiKey.service.js';
import { createApiKeySchema, updateApiKeySchema, idParamSchema, listApiKeyQuerySchema } from './apiKey.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

interface TypedError extends Error {
  code: string;
}

export default async function merchantApiKeyRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    preHandler: requirePermission('apiKeys:read'),
    schema: {
      tags: ['Merchant API Keys'],
      summary: 'List API keys',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listApiKeyQuerySchema.parse(request.query);
    return apiKeyService.listKeys(request.storeId, query);
  });

  fastify.post('/', {
    preHandler: requirePermission('apiKeys:write'),
    schema: {
      tags: ['Merchant API Keys'],
      summary: 'Create API key',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createApiKeySchema.parse(request.body);
    const result = await apiKeyService.createKey(request.storeId, parsed);
    reply.status(201).send({ apiKey: result });
  });

  fastify.get('/:id', {
    preHandler: requirePermission('apiKeys:read'),
    schema: {
      tags: ['Merchant API Keys'],
      summary: 'Get API key',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const key = await apiKeyService.getKey(id, request.storeId);
      return { apiKey: key };
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
    preHandler: requirePermission('apiKeys:write'),
    schema: {
      tags: ['Merchant API Keys'],
      summary: 'Update API key',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const parsed = updateApiKeySchema.parse(request.body);
      const key = await apiKeyService.updateKey(id, request.storeId, parsed);
      return { apiKey: key };
    } catch (err: unknown) {
      const typedErr = err as TypedError;
      if (typedErr.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: typedErr.code, message: typedErr.message });
        return;
      }
      throw err;
    }
  });

  fastify.delete('/:id', {
    preHandler: requirePermission('apiKeys:write'),
    schema: {
      tags: ['Merchant API Keys'],
      summary: 'Delete API key',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      await apiKeyService.deleteKey(id, request.storeId);
      reply.status(204).send();
    } catch (err: unknown) {
      const typedErr = err as TypedError;
      if (typedErr.code === ErrorCodes.NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: typedErr.code, message: typedErr.message });
        return;
      }
      throw err;
    }
  });
}
