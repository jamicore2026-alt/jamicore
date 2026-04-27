// Fastify API integration tests for merchant product routes.
// Tests the request->response cycle including Zod validation, status codes, and response shapes
// by mocking the service layer and using fastify.inject() for HTTP simulation.
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock productService ───
vi.mock('./product.service.js', () => ({
  productService: {
    findByStoreId: vi.fn(),
    search: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createVariant: vi.fn(),
    updateVariant: vi.fn(),
    deleteVariant: vi.fn(),
    createVariantOption: vi.fn(),
    updateVariantOption: vi.fn(),
    deleteVariantOption: vi.fn(),
  },
}));

import { productService as _productService } from './product.service.js';

// Mock planLimitsService
vi.mock('../plan-limits/plan-limits.service.js', () => ({
  planLimitsService: {
    checkProductLimit: vi.fn().mockResolvedValue({ max: 100, used: 0 }),
    getPlanLimits: vi.fn().mockResolvedValue({ maxProducts: 100, maxStorage: 1024, maxStaff: 3, usedProducts: 0, usedStorage: 0, usedStaff: 1 }),
  },
}));
const productService = _productService as any;
import productRoutes from './product.route.merchant.js';

// ─── Fixtures ───
const mockProduct = {
  id: 'prod-1',
  storeId: 'test-store-id',
  categoryId: 'cat-1',
  titleEn: 'Test Product',
  salePrice: '19.99',
  isPublished: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockVariant = {
  id: 'var-1',
  productId: 'prod-1',
  storeId: 'test-store-id',
  nameEn: 'Color',
  sortOrder: 0,
};

const mockVariantOption = {
  id: 'vo-1',
  variantId: 'var-1',
  storeId: 'test-store-id',
  nameEn: 'Red',
  priceAdjustment: '2.00',
  isAvailable: true,
  sortOrder: 0,
};

async function buildApp() {
  const fastify = Fastify();

  // Error handler matching production setup
  fastify.setErrorHandler((error: unknown, _request, reply) => {
    if (error && typeof error === 'object' && 'issues' in (error as object)) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      reply.status(400).send({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        message: zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    const code = 'code' in err ? (err as unknown as { code: string }).code : undefined;

    const codeToStatus: Record<string, number> = {
      PRODUCT_NOT_FOUND: 404,
      VALIDATION_ERROR: 400,
    };

    const statusCode = (code && codeToStatus[code]) || 500;
    reply.status(statusCode).send({
      error: err.name || 'Internal Server Error',
      ...(code ? { code } : {}),
      message: err.message,
    });
  });

  fastify.decorate('cacheService', {
    deletePattern: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    wrap: vi.fn().mockImplementation((_k: string, fn: any) => fn()),
    getTTL: vi.fn().mockResolvedValue(0),
  });

  fastify.addHook('onRequest', async (request: any) => {
    request.storeId = 'test-store-id';
    request.userId = 'test-user-id';
    request.userRole = 'OWNER';
  });
  await fastify.register(productRoutes, { prefix: '/products' });
  return fastify;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// GET /products — list products
// ═══════════════════════════════════════════
describe('GET /products', () => {
  it('returns products with default pagination', async () => {
    const mockResult = { items: [mockProduct], total: 1 };
    (productService.findByStoreId).mockResolvedValueOnce(mockResult);

    const fastify = await buildApp();
    const response = await fastify.inject({ method: 'GET', url: '/products' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockResult);
    expect(productService.findByStoreId).toHaveBeenCalledWith('test-store-id', {
      limit: 20,
      offset: 0,
    });
    await fastify.close();
  });

  it('passes query params for pagination and isPublished filter', async () => {
    const mockResult = { items: [], total: 0 };
    (productService.findByStoreId).mockResolvedValueOnce(mockResult);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/products?limit=10&offset=5&isPublished=true',
    });

    expect(response.statusCode).toBe(200);
    expect(productService.findByStoreId).toHaveBeenCalledWith('test-store-id', {
      limit: 10,
      offset: 5,
      isPublished: true,
    });
    await fastify.close();
  });

  it('rejects invalid limit (negative)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/products?limit=-1',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// GET /products/search — search with filters
// ═══════════════════════════════════════════
describe('GET /products/search', () => {
  it('returns search results with query string', async () => {
    const mockResult = { items: [mockProduct], total: 1, limit: 20, offset: 0 };
    (productService.search).mockResolvedValueOnce(mockResult);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/products/search?q=shirt',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockResult);
    expect(productService.search).toHaveBeenCalledWith('test-store-id', expect.objectContaining({
      q: 'shirt',
    }));
    await fastify.close();
  });

  it('passes all search filter params', async () => {
    const mockResult = { items: [], total: 0, limit: 50, offset: 0 };
    (productService.search).mockResolvedValueOnce(mockResult);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/products/search?q=shirt&categoryId=550e8400-e29b-41d4-a716-446655440001&minPrice=10.00&maxPrice=50.00&isPublished=false&sort=price_asc&limit=50&offset=0',
    });

    expect(response.statusCode).toBe(200);
    expect(productService.search).toHaveBeenCalledWith('test-store-id', expect.objectContaining({
      q: 'shirt',
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      minPrice: '10.00',
      maxPrice: '50.00',
      isPublished: false,
      sort: 'price_asc',
      limit: 50,
    }));
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// POST /products — create product
// ═══════════════════════════════════════════
describe('POST /products', () => {
  it('creates a product and returns 201', async () => {
    (productService.create).mockResolvedValueOnce(mockProduct);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/products',
      payload: {
        categoryId: '550e8400-e29b-41d4-a716-446655440001',
        titleEn: 'New Product',
        salePrice: '29.99',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ product: mockProduct });
    expect(productService.create).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      titleEn: 'New Product',
      salePrice: '29.99',
      storeId: 'test-store-id',
    }));
    await fastify.close();
  });

  it('rejects missing required fields', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/products',
      payload: { titleEn: 'No category' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects invalid salePrice format', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/products',
      payload: {
        categoryId: '550e8400-e29b-41d4-a716-446655440001',
        titleEn: 'Bad Price',
        salePrice: 'not-a-price',
      },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('rejects invalid categoryId (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/products',
      payload: {
        categoryId: 'not-a-uuid',
        titleEn: 'Bad Category',
        salePrice: '10.00',
      },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// GET /products/:id — get by ID
// ═══════════════════════════════════════════
describe('GET /products/:id', () => {
  it('returns a product by ID', async () => {
    (productService.findById).mockResolvedValueOnce(mockProduct);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/products/550e8400-e29b-41d4-a716-446655440099',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ product: mockProduct });
    expect(productService.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440099', 'test-store-id');
    await fastify.close();
  });

  it('returns 404 when product is not found (service throws)', async () => {
    (productService.findById).mockRejectedValueOnce(
      Object.assign(new Error('Product not found'), { code: 'PRODUCT_NOT_FOUND' }),
    );

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/products/550e8400-e29b-41d4-a716-446655440099',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('PRODUCT_NOT_FOUND');
    await fastify.close();
  });

  it('rejects invalid id format', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'GET',
      url: '/products/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// PATCH /products/:id — update product
// ═══════════════════════════════════════════
describe('PATCH /products/:id', () => {
  it('updates a product and returns it', async () => {
    const updated = { ...mockProduct, titleEn: 'Updated' };
    (productService.update).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/products/550e8400-e29b-41d4-a716-446655440099',
      payload: { titleEn: 'Updated' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ product: updated });
    expect(productService.update).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      'test-store-id',
      { titleEn: 'Updated' },
    );
    await fastify.close();
  });

  it('rejects invalid salePrice in update body', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/products/550e8400-e29b-41d4-a716-446655440099',
      payload: { salePrice: 'abc' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// DELETE /products/:id — delete product
// ═══════════════════════════════════════════
describe('DELETE /products/:id', () => {
  it('deletes a product and returns 204', async () => {
    (productService.delete).mockResolvedValueOnce(mockProduct);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/products/550e8400-e29b-41d4-a716-446655440099',
    });

    expect(response.statusCode).toBe(204);
    expect(productService.delete).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      'test-store-id',
    );
    await fastify.close();
  });

  it('rejects invalid id format', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/products/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// POST /products/:id/variants — create variant
// ═══════════════════════════════════════════
describe('POST /products/:id/variants', () => {
  it('creates a variant and returns 201', async () => {
    (productService.createVariant).mockResolvedValueOnce(mockVariant);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/products/550e8400-e29b-41d4-a716-446655440099/variants',
      payload: { nameEn: 'Color' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ variant: mockVariant });
    expect(productService.createVariant).toHaveBeenCalledWith(expect.objectContaining({
      nameEn: 'Color',
      productId: '550e8400-e29b-41d4-a716-446655440099',
      storeId: 'test-store-id',
    }));
    await fastify.close();
  });

  it('rejects missing required nameEn', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/products/550e8400-e29b-41d4-a716-446655440099/variants',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// PATCH /products/:productId/variants/:variantId — update variant
// ═══════════════════════════════════════════
describe('PATCH /products/:productId/variants/:variantId', () => {
  it('updates a variant and returns it', async () => {
    const updated = { ...mockVariant, nameEn: 'Size' };
    (productService.updateVariant).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/products/550e8400-e29b-41d4-a716-446655440099/variants/550e8400-e29b-41d4-a716-446655440100',
      payload: { nameEn: 'Size' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ variant: updated });
    expect(productService.updateVariant).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440100',
      'test-store-id',
      { nameEn: 'Size' },
    );
    await fastify.close();
  });

  it('rejects invalid variantId (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/products/550e8400-e29b-41d4-a716-446655440099/variants/not-a-uuid',
      payload: { nameEn: 'Size' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// DELETE /products/:productId/variants/:variantId — delete variant
// ═══════════════════════════════════════════
describe('DELETE /products/:productId/variants/:variantId', () => {
  it('deletes a variant and returns 204', async () => {
    (productService.deleteVariant).mockResolvedValueOnce(mockVariant);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/products/550e8400-e29b-41d4-a716-446655440099/variants/550e8400-e29b-41d4-a716-446655440100',
    });

    expect(response.statusCode).toBe(204);
    expect(productService.deleteVariant).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440100',
      'test-store-id',
    );
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// POST /products/:variantId/options — create variant option
// ═══════════════════════════════════════════
describe('POST /products/:variantId/options', () => {
  it('creates a variant option and returns 201', async () => {
    (productService.createVariantOption).mockResolvedValueOnce(mockVariantOption);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/products/550e8400-e29b-41d4-a716-446655440100/options',
      payload: { nameEn: 'Red', priceAdjustment: '2.00' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ option: mockVariantOption });
    expect(productService.createVariantOption).toHaveBeenCalledWith(expect.objectContaining({
      nameEn: 'Red',
      priceAdjustment: '2.00',
      variantId: '550e8400-e29b-41d4-a716-446655440100',
      storeId: 'test-store-id',
    }));
    await fastify.close();
  });

  it('rejects missing required nameEn', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'POST',
      url: '/products/550e8400-e29b-41d4-a716-446655440100/options',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// PATCH /products/options/:optionId — update variant option
// ═══════════════════════════════════════════
describe('PATCH /products/options/:optionId', () => {
  it('updates a variant option and returns it', async () => {
    const updated = { ...mockVariantOption, nameEn: 'Blue' };
    (productService.updateVariantOption).mockResolvedValueOnce(updated);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/products/options/550e8400-e29b-41d4-a716-446655440200',
      payload: { nameEn: 'Blue' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ option: updated });
    expect(productService.updateVariantOption).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440200',
      'test-store-id',
      { nameEn: 'Blue' },
    );
    await fastify.close();
  });

  it('rejects invalid optionId (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/products/options/not-a-uuid',
      payload: { nameEn: 'Blue' },
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});

// ═══════════════════════════════════════════
// DELETE /products/options/:optionId — delete variant option
// ═══════════════════════════════════════════
describe('DELETE /products/options/:optionId', () => {
  it('deletes a variant option and returns 204', async () => {
    (productService.deleteVariantOption).mockResolvedValueOnce(mockVariantOption);

    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/products/options/550e8400-e29b-41d4-a716-446655440200',
    });

    expect(response.statusCode).toBe(204);
    expect(productService.deleteVariantOption).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440200',
      'test-store-id',
    );
    await fastify.close();
  });

  it('rejects invalid optionId (non-uuid)', async () => {
    const fastify = await buildApp();
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/products/options/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });
});


