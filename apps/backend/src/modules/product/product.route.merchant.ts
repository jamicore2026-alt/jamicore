// Merchant Products Routes - CRUD for products with variants
import { FastifyInstance } from 'fastify';
import { productService } from './product.service.js';
import { productRepo } from './product.repo.js';
import { categoryService } from '../category/category.service.js';
import { planLimitsService } from '../planLimits/planLimits.service.js';
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
        } catch (err: unknown) {
          const e = err instanceof Error ? err : new Error(String(err));
          const code = (e as Error & { code?: string }).code;
          if (code === ErrorCodes.PLAN_LIMIT_EXCEEDED) {
            reply.status(403).send({
              error: 'Forbidden',
              code,
              message: e.message,
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
    if (parsed.categoryId) {
      await categoryService.findById(parsed.categoryId, request.storeId);
    }
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
    if (parsed.categoryId) {
      await categoryService.findById(parsed.categoryId, request.storeId);
    }
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
    await productService.findById(id, request.storeId);
    const variant = await productService.createVariant({
      ...parsed,
      productId: id,
      storeId: request.storeId,
    });
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
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
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
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
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
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
    const variant = await productRepo.findVariantById(variantId, request.storeId);
    if (!variant) {
      throw Object.assign(new Error('Variant not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }
    await productService.findById(variant.productId, request.storeId);
    const parsed = createVariantOptionSchema.parse(request.body);
    const option = await productService.createVariantOption({
      ...parsed,
      variantId,
      storeId: request.storeId,
    });
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
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
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
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
    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
    reply.status(204).send();
  });

  // POST /api/v1/merchant/products/bulk-import
  fastify.post('/bulk-import', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Bulk import products from CSV',
      description: 'Import multiple products from a CSV file',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: 'No file uploaded' });
      return;
    }

    const buffer = await file.toBuffer();
    const csv = buffer.toString('utf-8');
    const lines = csv.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: 'CSV is empty or missing header' });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const required = ['titleEn', 'salePrice', 'categoryId'];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.VALIDATION_ERROR, message: `Missing required columns: ${missing.join(', ')}` });
      return;
    }

    const rows = lines.slice(1);
    const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values: Record<string, string> = {};
      let inQuotes = false;
      let current = '';
      let colIndex = 0;
      for (const char of row) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values[headers[colIndex]] = current.trim().replace(/^"|"$/g, '');
          current = '';
          colIndex++;
        } else {
          current += char;
        }
      }
      if (colIndex < headers.length) {
        values[headers[colIndex]] = current.trim().replace(/^"|"$/g, '');
      }

      try {
        const data = {
          titleEn: values.titleEn,
          titleAr: values.titleAr || undefined,
          descriptionEn: values.descriptionEn || undefined,
          descriptionAr: values.descriptionAr || undefined,
          salePrice: values.salePrice,
          purchasePrice: values.purchasePrice || undefined,
          categoryId: values.categoryId,
          subcategoryId: values.subcategoryId || undefined,
          currentQuantity: values.currentQuantity ? parseInt(values.currentQuantity, 10) : 0,
          inventoryAlertThreshold: values.inventoryAlertThreshold ? parseInt(values.inventoryAlertThreshold, 10) : 0,
          discountType: values.discountType || 'Percent',
          discount: values.discount || '0',
          tags: values.tags ? values.tags.split(';').map((t) => t.trim()) : [],
          images: values.images ? values.images.split(';').map((t) => t.trim()) : [],
          isPublished: values.isPublished === 'true' || values.isPublished === '1',
        };
        await productService.create({ ...data, storeId: request.storeId });
        results.success++;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error(String(err));
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${e.message || 'Unknown error'}`);
      }
    }

    await fastify.cacheService.deletePattern(`products:public:${request.storeId}:*`);
    reply.status(200).send({ results });
  });

  // GET /api/v1/merchant/products/export
  fastify.get('/export', {
    preHandler: requirePermission('products:read'),
    schema: {
      tags: ['Merchant Products'],
      summary: 'Export products as CSV',
      description: 'Download all products as a CSV file',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const result = await productService.findByStoreId(request.storeId, { limit: 1000 });
    const items = result.items ?? [];
    const headers = ['id', 'titleEn', 'titleAr', 'salePrice', 'purchasePrice', 'categoryId', 'subcategoryId', 'currentQuantity', 'inventoryAlertThreshold', 'discountType', 'discount', 'tags', 'images', 'isPublished'];
    const csvRows = [headers.join(',')];
    for (const p of items) {
      const row = [
        p.id,
        `"${(p.titleEn ?? '').replace(/"/g, '""')}"`,
        `"${(p.titleAr ?? '').replace(/"/g, '""')}"`,
        p.salePrice,
        p.purchasePrice ?? '',
        p.categoryId,
        p.subcategoryId ?? '',
        p.currentQuantity ?? 0,
        p.inventoryAlertThreshold ?? 0,
        p.discountType ?? 'Percent',
        p.discount ?? '0',
        `"${(Array.isArray(p.tags) ? p.tags.join(';') : p.tags ?? '').replace(/"/g, '""')}"`,
        `"${(Array.isArray(p.images) ? p.images.join(';') : p.images ?? '').replace(/"/g, '""')}"`,
        p.isPublished ? 'true' : 'false',
      ];
      csvRows.push(row.join(','));
    }
    const csv = csvRows.join('\n');
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="products.csv"');
    reply.send(csv);
  });
}
