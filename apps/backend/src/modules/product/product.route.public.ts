// Public Products Routes - Browse and search published products
import { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { productListSchema, productSearchSchema, idParamSchema } from './product.schema.js';
import { productService } from './product.service.js';
import { ErrorCodes } from '../../errors/codes.js';

function hashFilters(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 16);
}

export default async function publicProductsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/products - List published products
  fastify.get('/', {
    schema: {
      tags: ['Public'],
      summary: 'List published products',
      description: 'Browse all published products for the current store with pagination',
    },
  }, async (request) => {
    if (!request.storeId) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    const query = productListSchema.parse(request.query);
    const filters = { ...query, isPublished: true };
    const cacheKey = `products:public:${request.storeId}:list:${hashFilters(filters)}`;

    const { items, total } = await fastify.cacheService.wrap(
      cacheKey,
      () => productService.findByStoreId(request.storeId, filters),
      300, // 5 minutes
    );
    const page = Math.floor((query.offset ?? 0) / query.limit) + 1;
    return {
      data: items,
      meta: { page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  });

  // GET /api/v1/public/products/search - Search products
  fastify.get('/search', {
    schema: {
      tags: ['Public'],
      summary: 'Search products',
      description: 'Search and filter published products by name, description, tags, category, and price range',
    },
  }, async (request) => {
    if (!request.storeId) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    const query = productSearchSchema.parse(request.query);
    const filters = { ...query, isPublished: true };
    const cacheKey = `products:public:${request.storeId}:search:${hashFilters(filters)}`;

    const { items, total } = await fastify.cacheService.wrap(
      cacheKey,
      () => productService.search(request.storeId, filters),
      300, // 5 minutes
    );
    const page = Math.floor((query.offset ?? 0) / query.limit) + 1;
    return {
      data: items,
      meta: { page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  });

  // GET /api/v1/public/products/:id - Get single published product
  fastify.get('/:id', {
    schema: {
      tags: ['Public'],
      summary: 'Get published product',
      description: 'Retrieve a single published product by ID for the current store',
    },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
      return;
    }
    const { id } = idParamSchema.parse(request.params);
    const cacheKey = `products:public:${request.storeId}:${id}`;

    try {
      const product = await fastify.cacheService.wrap(
        cacheKey,
        () => productService.findById(id, request.storeId),
        600, // 10 minutes
      );
      if (!product.isPublished) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.PRODUCT_NOT_FOUND, message: 'Product not found' });
        return;
      }
      return { product };
    } catch {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.PRODUCT_NOT_FOUND, message: 'Product not found' });
    }
  });
}
