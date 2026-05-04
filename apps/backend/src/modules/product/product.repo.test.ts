/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for Product repository — all Drizzle queries, mocked db
// Tests verify that repo methods call the correct Drizzle query builders
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock db ───
// Must define mock functions inline inside vi.mock factory because
// vi.mock is hoisted to the top of the file — top-level const values
// are not yet initialized when the factory runs.
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      products: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '../../db/index.js';
import { productRepo } from './product.repo.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ───
// Chain builder for Drizzle's fluent API: db.select().from().where()
function setupSelectChain(returnValue: any) {
  const mockWhere = vi.fn().mockResolvedValue(returnValue);
  const mockFromFn = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.select).mockReturnValue({ from: mockFromFn } as any);
  return { mockWhere, mockFromFn: mockFromFn };
}

// Chain builder for db.insert().values().returning()
function setupInsertChain(returnValue: any) {
  const mockReturning = vi.fn().mockResolvedValue(returnValue);
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
  return { mockReturning, mockValues };
}

// Chain builder for db.update().set().where().returning()
function setupUpdateChain(returnValue: any) {
  const mockReturning = vi.fn().mockResolvedValue(returnValue);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);
  return { mockReturning, mockWhere, mockSet };
}

// Chain builder for db.delete().where().returning()
function setupDeleteChain(returnValue: any) {
  const mockReturning = vi.fn().mockResolvedValue(returnValue);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);
  return { mockReturning, mockWhere };
}

// Shorthand for db.query.products access
const findMany = () => vi.mocked(db.query.products.findMany);
const findFirst = () => vi.mocked(db.query.products.findFirst);

// ═══════════════════════════════════════════
// findByStoreId
// ═══════════════════════════════════════════
describe('productRepo.findByStoreId', () => {
  it('returns items and total count', async () => {
    const mockItems = [
      { id: 'p1', titleEn: 'Product 1', storeId: 's1' },
      { id: 'p2', titleEn: 'Product 2', storeId: 's1' },
    ];
    findMany().mockResolvedValueOnce(mockItems as any);
    setupSelectChain([{ count: 2 }]);

    const result = await productRepo.findByStoreId('s1');
    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(2);
    expect(findMany()).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.anything(),
      orderBy: expect.any(Array),
    }));
  });

  it('passes limit and offset options', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.findByStoreId('s1', { limit: 10, offset: 5 });
    expect(findMany()).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      offset: 5,
    }));
  });

  it('passes isPublished filter when provided', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.findByStoreId('s1', { isPublished: true });
    expect(findMany()).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.anything(),
    }));
  });

  it('works without isPublished filter', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.findByStoreId('s1', { limit: 10, offset: 0 });
    expect(findMany()).toHaveBeenCalled();
  });

  it('uses default limit/offset when options not provided', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.findByStoreId('s1');
    expect(findMany()).toHaveBeenCalledWith(expect.objectContaining({
      limit: undefined,
      offset: undefined,
    }));
  });
});

// ═══════════════════════════════════════════
// findById
// ═══════════════════════════════════════════
describe('productRepo.findById', () => {
  it('returns product when found', async () => {
    const mockProduct = { id: 'p1', titleEn: 'Product 1', storeId: 's1' };
    findFirst().mockResolvedValueOnce(mockProduct as any);

    const result = await productRepo.findById('p1', 's1');
    expect(result).toEqual(mockProduct);
    expect(findFirst()).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.anything(),
      with: expect.objectContaining({
        category: true,
        subcategory: true,
        variants: expect.any(Object),
        modifierGroups: expect.any(Object),
      }),
    }));
  });

  it('returns undefined when product not found', async () => {
    findFirst().mockResolvedValueOnce(undefined);

    const result = await productRepo.findById('nonexistent', 's1');
    expect(result).toBeUndefined();
  });
});

// ═══════════════════════════════════════════
// create
// ═══════════════════════════════════════════
describe('productRepo.create', () => {
  it('inserts a product and returns it', async () => {
    const insertData = {
      storeId: 's1',
      categoryId: 'c1',
      titleEn: 'New Product',
      salePrice: '29.99',
    };
    const mockProduct = { id: 'p1', ...insertData };
    setupInsertChain([mockProduct]);

    const result = await productRepo.create(insertData);
    expect(result).toEqual(mockProduct);
    expect(vi.mocked(db.insert)).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════
// update
// ═══════════════════════════════════════════
describe('productRepo.update', () => {
  it('updates a product and returns it', async () => {
    const updateData = { titleEn: 'Updated Product' };
    const mockProduct = { id: 'p1', titleEn: 'Updated Product', storeId: 's1' };
    setupUpdateChain([mockProduct]);

    const result = await productRepo.update('p1', 's1', updateData);
    expect(result).toEqual(mockProduct);
  });

  it('includes updatedAt in the set data', async () => {
    const updateData = { titleEn: 'Updated Product' };
    const mockProduct = { id: 'p1', titleEn: 'Updated Product' };
    const { mockSet } = setupUpdateChain([mockProduct]);

    await productRepo.update('p1', 's1', updateData);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      titleEn: 'Updated Product',
      updatedAt: expect.any(Date),
    }));
  });
});

// ═══════════════════════════════════════════
// delete
// ═══════════════════════════════════════════
describe('productRepo.delete', () => {
  it('deletes a product and returns it', async () => {
    const mockProduct = { id: 'p1', storeId: 's1' };
    setupDeleteChain([mockProduct]);

    const result = await productRepo.delete('p1', 's1');
    expect(result).toEqual(mockProduct);
  });
});

// ═══════════════════════════════════════════
// createVariant
// ═══════════════════════════════════════════
describe('productRepo.createVariant', () => {
  it('inserts a variant and returns it', async () => {
    const variantData = {
      productId: 'p1',
      storeId: 's1',
      nameEn: 'Color',
      sortOrder: 0,
    };
    const mockVariant = { id: 'v1', ...variantData };
    setupInsertChain([mockVariant]);

    const result = await productRepo.createVariant(variantData);
    expect(result).toEqual(mockVariant);
  });
});

// ═══════════════════════════════════════════
// updateVariant
// ═══════════════════════════════════════════
describe('productRepo.updateVariant', () => {
  it('updates a variant and returns it', async () => {
    const updateData = { nameEn: 'Updated Variant' };
    const mockVariant = { id: 'v1', nameEn: 'Updated Variant' };
    setupUpdateChain([mockVariant]);

    const result = await productRepo.updateVariant('v1', 's1', updateData);
    expect(result).toEqual(mockVariant);
  });

  it('includes updatedAt in the set data', async () => {
    const updateData = { nameEn: 'Updated Variant' };
    const mockVariant = { id: 'v1', nameEn: 'Updated Variant' };
    const { mockSet } = setupUpdateChain([mockVariant]);

    await productRepo.updateVariant('v1', 's1', updateData);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      nameEn: 'Updated Variant',
      updatedAt: expect.any(Date),
    }));
  });
});

// ═══════════════════════════════════════════
// deleteVariant
// ═══════════════════════════════════════════
describe('productRepo.deleteVariant', () => {
  it('deletes a variant and returns it', async () => {
    const mockVariant = { id: 'v1', storeId: 's1' };
    setupDeleteChain([mockVariant]);

    const result = await productRepo.deleteVariant('v1', 's1');
    expect(result).toEqual(mockVariant);
  });
});

// ═══════════════════════════════════════════
// createVariantOption
// ═══════════════════════════════════════════
describe('productRepo.createVariantOption', () => {
  it('inserts a variant option and returns it', async () => {
    const optionData = {
      variantId: 'v1',
      storeId: 's1',
      nameEn: 'Red',
      priceAdjustment: '2.50',
      sortOrder: 0,
      isAvailable: true,
    };
    const mockOption = { id: 'o1', ...optionData };
    setupInsertChain([mockOption]);

    const result = await productRepo.createVariantOption(optionData);
    expect(result).toEqual(mockOption);
  });
});

// ═══════════════════════════════════════════
// updateVariantOption
// ═══════════════════════════════════════════
describe('productRepo.updateVariantOption', () => {
  it('updates a variant option and returns it', async () => {
    const updateData = { nameEn: 'Updated Option' };
    const mockOption = { id: 'o1', nameEn: 'Updated Option' };
    setupUpdateChain([mockOption]);

    const result = await productRepo.updateVariantOption('o1', 's1', updateData);
    expect(result).toEqual(mockOption);
  });

  it('includes updatedAt in the set data', async () => {
    const updateData = { nameEn: 'Updated Option' };
    const mockOption = { id: 'o1', nameEn: 'Updated Option' };
    const { mockSet } = setupUpdateChain([mockOption]);

    await productRepo.updateVariantOption('o1', 's1', updateData);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      nameEn: 'Updated Option',
      updatedAt: expect.any(Date),
    }));
  });
});

// ═══════════════════════════════════════════
// deleteVariantOption
// ═══════════════════════════════════════════
describe('productRepo.deleteVariantOption', () => {
  it('deletes a variant option and returns it', async () => {
    const mockOption = { id: 'o1', storeId: 's1' };
    setupDeleteChain([mockOption]);

    const result = await productRepo.deleteVariantOption('o1', 's1');
    expect(result).toEqual(mockOption);
  });
});

// ═══════════════════════════════════════════
// search
// ═══════════════════════════════════════════
describe('productRepo.search', () => {
  const baseOpts = {
    limit: 20,
    offset: 0,
    sort: 'newest' as const,
  };

  it('returns items and total with default sort', async () => {
    const mockItems = [
      { id: 'p1', titleEn: 'Product 1' },
      { id: 'p2', titleEn: 'Product 2' },
    ];
    findMany().mockResolvedValueOnce(mockItems as any);
    setupSelectChain([{ count: 2 }]);

    const result = await productRepo.search('s1', baseOpts);
    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('passes search query when q is provided', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.search('s1', { ...baseOpts, q: 'shirt' });
    expect(findMany()).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.anything(),
    }));
  });

  it('passes categoryId filter', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.search('s1', { ...baseOpts, categoryId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(findMany()).toHaveBeenCalled();
  });

  it('passes minPrice and maxPrice filters', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.search('s1', { ...baseOpts, minPrice: '10.00', maxPrice: '100.00' });
    expect(findMany()).toHaveBeenCalled();
  });

  it('passes isPublished filter', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.search('s1', { ...baseOpts, isPublished: true });
    expect(findMany()).toHaveBeenCalled();
  });

  it('handles all sort options', async () => {
    const sortOptions = ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest'] as const;

    for (const sort of sortOptions) {
      findMany().mockResolvedValueOnce([]);
      setupSelectChain([{ count: 0 }]);

      await productRepo.search('s1', { ...baseOpts, sort });
      expect(findMany()).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: expect.any(Array),
      }));
    }
  });

  it('defaults to newest sort for undefined sort', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.search('s1', { ...baseOpts, sort: undefined });
    expect(findMany()).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: expect.any(Array),
    }));
  });

  it('passes limit and offset to query', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    await productRepo.search('s1', { limit: 5, offset: 10, sort: 'newest' });
    expect(findMany()).toHaveBeenCalledWith(expect.objectContaining({
      limit: 5,
      offset: 10,
    }));
  });

  it('returns total as 0 when no results', async () => {
    findMany().mockResolvedValueOnce([]);
    setupSelectChain([{ count: 0 }]);

    const result = await productRepo.search('s1', baseOpts);
    expect(result.total).toBe(0);
  });
});