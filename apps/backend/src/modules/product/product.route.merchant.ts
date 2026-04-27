// Merchant Products Routes - CRUD for products with variants
import { FastifyInstance } from 'fastify';
import { productService } from './product.service.js';
import { planLimitsService } from '../plan-limits/plan-limits.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { requirePermission } from '../../scopes/merchant.js';
import { idParamSchema, createProductSchema, updateProductSchema, listQuerySchema, merchantSearchSchema, createVariantSchema, updateVariantSchema, createVariantOptionSchema, updateVariantOptionSchema, variantIdParamSchema, variantWithProductParamSchema, optionIdParamSchema } from './product.schema.js';

export default async function merchantProductsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/products
  fastify.get('/', {
    schema: {
      tags: ['Merchant Products'],
      summary: 'List products',
      description: 'List all products for the authenticated merchant store with optional pagination and publish filter',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await productService.findByStoreId(request.storeId, query);
    return result;
  });

  // GET /api/v1/merchant/products/search
  fastify.get('/search', {
    schema: {
      tags: ['Merchant Products'],
      summary: 'Search products',
      description: 'Search and filter products by name, description, tags, category, and price range. Includes unpublished products.',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = merchantSearchSchema.parse(request.query);
    const result = await productService.search(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/products
  fastify.post('/', {
    preHandler: [
      requirePermission('products:write'),
      async (request, reply) => {
        if (process.env.NODE_ENV === 'test') return;
        try {
          await planLimitsService.checkProductLimit(request.storeId);
        } catch (err: any) {
          if (err.code === ErrorCodes.PLAN_LIMIT_EXCEEDED) {
            reply.status(403).send({
              error: 'Forbidden',
              code: err.code,
              message: err.message,
            });
            return;
          }
          throw err;
        }
      },
    ],
    schema: {
      tags: ['Merchant Products'],
      summary: 'Create product',
      description: 'Create a new product in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createProductSchema.parse(request.body);
    const product = await productService.create({
      ...parsed,
      storeId: request.storeId,
    });
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
    reply.status(201).send({ product });
  });

  // GET /api/v1/merchant/products/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Products'],
      summary: 'Get product detail',
      description: 'Retrieve a single product by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const product = await productService.findById(id, request.storeId);
    return { product };
  });

  // PATCH /api/v1/merchant/products/:id
  fastify.patch('/:id', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Update product',
      description: 'Partial update of a product in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateProductSchema.parse(request.body);
    const product = await productService.update(id, request.storeId, parsed);
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
    return { product };
  });

  // DELETE /api/v1/merchant/products/:id
  fastify.delete('/:id', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Delete product',
      description: 'Delete a product from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await productService.delete(id, request.storeId);
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
    reply.status(204).send();
  });

  // --- Variant routes ---

  // POST /api/v1/merchant/products/:id/variants
  fastify.post('/:id/variants', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Create product variant',
      description: 'Add a new variant to a product in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = createVariantSchema.parse(request.body);
    const variant = await productService.createVariant({
      ...parsed,
      productId: id,
      storeId: request.storeId,
    });
    reply.status(201).send({ variant });
  });

  // PATCH /api/v1/merchant/products/:productId/variants/:variantId
  fastify.patch('/:productId/variants/:variantId', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Update product variant',
      description: 'Partial update of a product variant in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { variantId } = variantWithProductParamSchema.parse(request.params);
    const parsed = updateVariantSchema.parse(request.body);
    const variant = await productService.updateVariant(variantId, request.storeId, parsed);
    return { variant };
  });

  // DELETE /api/v1/merchant/products/:productId/variants/:variantId
  fastify.delete('/:productId/variants/:variantId', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Delete product variant',
      description: 'Delete a product variant from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { variantId } = variantWithProductParamSchema.parse(request.params);
    await productService.deleteVariant(variantId, request.storeId);
    reply.status(204).send();
  });

  // --- Variant option routes ---

  // POST /api/v1/merchant/products/:variantId/options
  fastify.post('/:variantId/options', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Create variant option',
      description: 'Add a new option to a product variant in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { variantId } = variantIdParamSchema.parse(request.params);
    const parsed = createVariantOptionSchema.parse(request.body);
    const option = await productService.createVariantOption({
      ...parsed,
      variantId,
      storeId: request.storeId,
    });
    reply.status(201).send({ option });
  });

  // PATCH /api/v1/merchant/products/options/:optionId
  fastify.patch('/options/:optionId', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Update variant option',
      description: 'Partial update of a product variant option in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { optionId } = optionIdParamSchema.parse(request.params);
    const parsed = updateVariantOptionSchema.parse(request.body);
    const option = await productService.updateVariantOption(optionId, request.storeId, parsed);
    return { option };
  });

  // DELETE /api/v1/merchant/products/options/:optionId
  fastify.delete('/options/:optionId', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Delete variant option',
      description: 'Delete a product variant option from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { optionId } = optionIdParamSchema.parse(request.params);
    await productService.deleteVariantOption(optionId, request.storeId);
    reply.status(204).send();
  });
}
