import type { FastifyInstance } from 'fastify';
import { posService } from './pos.service.js';
import {
  posProductQuerySchema,
  createPosOrderSchema,
  posOrderListQuerySchema,
  idParamSchema,
} from './pos.schema.js';

export default async function posRoutes(fastify: FastifyInstance) {
  fastify.get('/products', {
    schema: {
      tags: ['POS'],
      summary: 'Search products for POS',
      description: 'Search by name or barcode for quick sale',
      querystring: posProductQuerySchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = posProductQuerySchema.parse(request.query);
    return posService.searchProducts(request.storeId, query);
  });

  fastify.post('/orders', {
    schema: {
      tags: ['POS'],
      summary: 'Create POS order',
      description: 'Create a quick-sale POS order with inventory sync',
      body: createPosOrderSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const input = createPosOrderSchema.parse(request.body);
    const store = request.store!;
    const result = await posService.createPosOrder(
      request.storeId,
      request.userId,
      store.ownerEmail ?? 'pos@store.local', // cashier email (required by orders.email)
      store.currency ?? 'USD',
      input,
    );
    reply.status(201).send(result);
  });

  fastify.get('/orders', {
    schema: {
      tags: ['POS'],
      summary: 'List POS orders',
      description: 'List POS orders, filterable by date and cashier',
      querystring: posOrderListQuerySchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = posOrderListQuerySchema.parse(request.query);
    return posService.listPosOrders(request.storeId, query);
  });

  fastify.get('/orders/:id', {
    schema: {
      tags: ['POS'],
      summary: 'Get POS order detail',
      params: idParamSchema,
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return posService.getPosOrder(id, request.storeId);
  });
}
