// Merchant Customers Routes - Customer listing, detail, create
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { customerService } from './customer.service.js';
import { idParamSchema } from '../_shared/schema.js';
import { customerListQuerySchema, createCustomerSchema, updateCustomerSchema } from './customer.schema.js';

export default async function merchantCustomersRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/customers
  fastify.get('/', {
    schema: {
      tags: ['Merchant Customers'],
      summary: 'List customers',
      description: 'List all customers for the authenticated merchant store with pagination, search, and tag filtering',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = customerListQuerySchema.parse(request.query);
    const result = await customerService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/customers
  fastify.post('/', {
    schema: {
      tags: ['Merchant Customers'],
      summary: 'Create customer',
      description: 'Create a new customer in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
    preHandler: requirePermission('customers:write'),
  }, async (request, reply) => {
    const parsed = createCustomerSchema.parse(request.body);
    const customer = await customerService.create({
      ...parsed,
      storeId: request.storeId,
    });
    reply.status(201).send({ customer });
  });

  // GET /api/v1/merchant/customers/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Customers'],
      summary: 'Get customer detail',
      description: 'Retrieve a single customer by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const customer = await customerService.findById(id, request.storeId);
    return { customer };
  });

  // PATCH /api/v1/merchant/customers/:id
  fastify.patch('/:id', {
    schema: {
      tags: ['Merchant Customers'],
      summary: 'Update customer',
      description: 'Partial update of a customer in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
    preHandler: requirePermission('customers:write'),
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateCustomerSchema.parse(request.body);
    // Filter out undefined values to match service type expectations
    const updateData: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        updateData[key] = value as string | boolean;
      }
    }
    const customer = await customerService.update(id, request.storeId, updateData as Parameters<typeof customerService.update>[2]);
    return { customer };
  });
}
