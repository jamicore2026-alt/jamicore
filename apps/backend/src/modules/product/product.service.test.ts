/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for productService — business logic with mocked productRepo.
// Tests cover CRUD operations, variant/variant-option operations, search, pagination, and error cases.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock productRepo ───
vi.mock('./product.repo.js', () => ({
  productRepo: {
    findByStoreId: vi.fn(),
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
    search: vi.fn(),
  },
}));

import { productService } from './product.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { productRepo } from './product.repo.js';
const mockProductRepo = productRepo as any;

// ─── Fixtures ───
const mockProduct = {
  id: 'prod-1',
  storeId: 'store-1',
  titleEn: 'Test Product',
  titleAr: 'منتج تجريبي',
  descriptionEn: 'A great product',
  salePrice: '19.99',
  isPublished: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: 'cat-1', nameEn: 'Electronics' },
  variants: [],
  modifierGroups: [],
};

const mockVariant = {
  id: 'var-1',
  productId: 'prod-1',
  storeId: 'store-1',
  nameEn: 'Color',
  nameAr: 'لون',
  createdAt: new Date(),
};

const mockVariantOption = {
  id: 'vo-1',
  variantId: 'var-1',
  storeId: 'store-1',
  nameEn: 'Red',
  nameAr: 'أحمر',
  priceAdjustment: '2.00',
  isAvailable: true,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// findByStoreId
// ═══════════════════════════════════════════
describe('productService.findByStoreId', () => {
  it('returns products with default pagination', async () => {
    const mockResult = { items: [mockProduct], total: 1 };
    mockProductRepo.findByStoreId.mockResolvedValueOnce(mockResult);

    const result = await productService.findByStoreId('store-1');
    expect(result).toEqual(mockResult);
    expect(mockProductRepo.findByStoreId).toHaveBeenCalledWith('store-1', undefined);
  });

  it('passes pagination and filter options to repo', async () => {
    const mockResult = { items: [mockProduct], total: 1 };
    mockProductRepo.findByStoreId.mockResolvedValueOnce(mockResult);

    const result = await productService.findByStoreId('store-1', {
      limit: 10,
      offset: 20,
      isPublished: true,
    });

    expect(result).toEqual(mockResult);
    expect(mockProductRepo.findByStoreId).toHaveBeenCalledWith('store-1', {
      limit: 10,
      offset: 20,
      isPublished: true,
    });
  });
});

// ═══════════════════════════════════════════
// findById
// ═══════════════════════════════════════════
describe('productService.findById', () => {
  it('returns product when found', async () => {
    mockProductRepo.findById.mockResolvedValueOnce(mockProduct);

    const result = await productService.findById('prod-1', 'store-1');
    expect(result).toEqual(mockProduct);
    expect(mockProductRepo.findById).toHaveBeenCalledWith('prod-1', 'store-1');
  });

  it('throws PRODUCT_NOT_FOUND when product does not exist', async () => {
    mockProductRepo.findById.mockResolvedValueOnce(null);

    await expect(productService.findById('nonexistent', 'store-1'))
      .rejects.toMatchObject({ code: ErrorCodes.PRODUCT_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// create
// ═══════════════════════════════════════════
describe('productService.create', () => {
  it('creates and returns a product', async () => {
    const insertData = {
      storeId: 'store-1',
      titleEn: 'New Product',
      salePrice: '29.99',
    };
    mockProductRepo.create.mockResolvedValueOnce(mockProduct);

    const result = await productService.create(insertData as any);
    expect(result).toEqual(mockProduct);
    expect(mockProductRepo.create).toHaveBeenCalledWith(insertData);
  });

  it('throws VALIDATION_ERROR when repo returns null', async () => {
    const insertData = { storeId: 'store-1', titleEn: 'Bad Product' };
    mockProductRepo.create.mockResolvedValueOnce(null);

    await expect(productService.create(insertData as any))
      .rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });
  });
});

// ═══════════════════════════════════════════
// update
// ═══════════════════════════════════════════
describe('productService.update', () => {
  it('updates and returns the product', async () => {
    const updatedProduct = { ...mockProduct, titleEn: 'Updated Product' };
    mockProductRepo.update.mockResolvedValueOnce(updatedProduct);

    const result = await productService.update('prod-1', 'store-1', { titleEn: 'Updated Product' } as any);
    expect(result).toEqual(updatedProduct);
    expect(mockProductRepo.update).toHaveBeenCalledWith('prod-1', 'store-1', { titleEn: 'Updated Product' });
  });

  it('throws PRODUCT_NOT_FOUND when product does not exist', async () => {
    mockProductRepo.update.mockResolvedValueOnce(null);

    await expect(productService.update('nonexistent', 'store-1', { titleEn: 'X' } as any))
      .rejects.toMatchObject({ code: ErrorCodes.PRODUCT_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// delete
// ═══════════════════════════════════════════
describe('productService.delete', () => {
  it('deletes and returns the product', async () => {
    mockProductRepo.delete.mockResolvedValueOnce(mockProduct);

    const result = await productService.delete('prod-1', 'store-1');
    expect(result).toEqual(mockProduct);
    expect(mockProductRepo.delete).toHaveBeenCalledWith('prod-1', 'store-1');
  });

  it('throws PRODUCT_NOT_FOUND when product does not exist', async () => {
    mockProductRepo.delete.mockResolvedValueOnce(null);

    await expect(productService.delete('nonexistent', 'store-1'))
      .rejects.toMatchObject({ code: ErrorCodes.PRODUCT_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// search
// ═══════════════════════════════════════════
describe('productService.search', () => {
  it('searches with default page and limit', async () => {
    const mockResult = { items: [mockProduct], total: 1, limit: 20, offset: 0 };
    mockProductRepo.search.mockResolvedValueOnce(mockResult);

    const result = await productService.search('store-1', { q: 'Test' });
    expect(result).toEqual(mockResult);
    expect(mockProductRepo.search).toHaveBeenCalledWith('store-1', expect.objectContaining({
      q: 'Test',
      limit: 20,
      offset: 0,
    }));
  });

  it('clamps limit to 100 max', async () => {
    const mockResult = { items: [], total: 0, limit: 100, offset: 0 };
    mockProductRepo.search.mockResolvedValueOnce(mockResult);

    await productService.search('store-1', { limit: 200 });
    expect(mockProductRepo.search).toHaveBeenCalledWith('store-1', expect.objectContaining({
      limit: 100,
    }));
  });

  it('clamps limit to minimum of 1', async () => {
    const mockResult = { items: [], total: 0, limit: 1, offset: 0 };
    mockProductRepo.search.mockResolvedValueOnce(mockResult);

    await productService.search('store-1', { limit: 0 });
    expect(mockProductRepo.search).toHaveBeenCalledWith('store-1', expect.objectContaining({
      limit: 1,
    }));
  });

  it('clamps negative limit to 1', async () => {
    const mockResult = { items: [], total: 0, limit: 1, offset: 0 };
    mockProductRepo.search.mockResolvedValueOnce(mockResult);

    await productService.search('store-1', { limit: -5 });
    expect(mockProductRepo.search).toHaveBeenCalledWith('store-1', expect.objectContaining({
      limit: 1,
    }));
  });

  it('clamps page to minimum of 1', async () => {
    const mockResult = { items: [], total: 0, limit: 20, offset: 0 };
    mockProductRepo.search.mockResolvedValueOnce(mockResult);

    await productService.search('store-1', { page: -10 });
    expect(mockProductRepo.search).toHaveBeenCalledWith('store-1', expect.objectContaining({
      offset: 0,
    }));
  });

  it('passes all search options through', async () => {
    const mockResult = { items: [], total: 0, limit: 50, offset: 100 };
    mockProductRepo.search.mockResolvedValueOnce(mockResult);

    await productService.search('store-1', {
      q: 'shirt',
      categoryId: 'cat-1',
      minPrice: '10.00',
      maxPrice: '50.00',
      isPublished: true,
      sort: 'price_asc',
      limit: 50,
      page: 3,
    });

    expect(mockProductRepo.search).toHaveBeenCalledWith('store-1', expect.objectContaining({
      q: 'shirt',
      categoryId: 'cat-1',
      minPrice: '10.00',
      maxPrice: '50.00',
      isPublished: true,
      sort: 'price_asc',
      limit: 50,
      offset: 100,
    }));
  });
});

// ═══════════════════════════════════════════
// Variant operations
// ═══════════════════════════════════════════
describe('productService.createVariant', () => {
  it('creates and returns a variant', async () => {
    const insertData = { productId: 'prod-1', storeId: 'store-1', nameEn: 'Color' };
    mockProductRepo.createVariant.mockResolvedValueOnce(mockVariant);

    const result = await productService.createVariant(insertData as any);
    expect(result).toEqual(mockVariant);
    expect(mockProductRepo.createVariant).toHaveBeenCalledWith(insertData);
  });

  it('throws VALIDATION_ERROR when repo returns null', async () => {
    mockProductRepo.createVariant.mockResolvedValueOnce(null);
    const insertData = { productId: 'prod-1', storeId: 'store-1', nameEn: 'Color' };

    await expect(productService.createVariant(insertData as any))
      .rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });
  });
});

describe('productService.updateVariant', () => {
  it('updates and returns the variant', async () => {
    const updatedVariant = { ...mockVariant, nameEn: 'Size' };
    mockProductRepo.updateVariant.mockResolvedValueOnce(updatedVariant);

    const result = await productService.updateVariant('var-1', 'store-1', { nameEn: 'Size' } as any);
    expect(result).toEqual(updatedVariant);
    expect(mockProductRepo.updateVariant).toHaveBeenCalledWith('var-1', 'store-1', { nameEn: 'Size' });
  });

  it('throws PRODUCT_NOT_FOUND when variant does not exist', async () => {
    mockProductRepo.updateVariant.mockResolvedValueOnce(null);

    await expect(productService.updateVariant('nonexistent', 'store-1', { nameEn: 'X' } as any))
      .rejects.toMatchObject({ code: ErrorCodes.PRODUCT_NOT_FOUND });
  });
});

describe('productService.deleteVariant', () => {
  it('deletes and returns the variant', async () => {
    mockProductRepo.deleteVariant.mockResolvedValueOnce(mockVariant);

    const result = await productService.deleteVariant('var-1', 'store-1');
    expect(result).toEqual(mockVariant);
    expect(mockProductRepo.deleteVariant).toHaveBeenCalledWith('var-1', 'store-1');
  });

  it('throws PRODUCT_NOT_FOUND when variant does not exist', async () => {
    mockProductRepo.deleteVariant.mockResolvedValueOnce(null);

    await expect(productService.deleteVariant('nonexistent', 'store-1'))
      .rejects.toMatchObject({ code: ErrorCodes.PRODUCT_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// Variant option operations
// ═══════════════════════════════════════════
describe('productService.createVariantOption', () => {
  it('creates and returns a variant option', async () => {
    const insertData = { variantId: 'var-1', storeId: 'store-1', nameEn: 'Red', priceAdjustment: '2.00' };
    mockProductRepo.createVariantOption.mockResolvedValueOnce(mockVariantOption);

    const result = await productService.createVariantOption(insertData as any);
    expect(result).toEqual(mockVariantOption);
    expect(mockProductRepo.createVariantOption).toHaveBeenCalledWith(insertData);
  });

  it('throws VALIDATION_ERROR when repo returns null', async () => {
    mockProductRepo.createVariantOption.mockResolvedValueOnce(null);
    const insertData = { variantId: 'var-1', storeId: 'store-1', nameEn: 'Red' };

    await expect(productService.createVariantOption(insertData as any))
      .rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });
  });
});

describe('productService.updateVariantOption', () => {
  it('updates and returns the variant option', async () => {
    const updatedOption = { ...mockVariantOption, nameEn: 'Blue' };
    mockProductRepo.updateVariantOption.mockResolvedValueOnce(updatedOption);

    const result = await productService.updateVariantOption('vo-1', 'store-1', { nameEn: 'Blue' } as any);
    expect(result).toEqual(updatedOption);
    expect(mockProductRepo.updateVariantOption).toHaveBeenCalledWith('vo-1', 'store-1', { nameEn: 'Blue' });
  });

  it('throws PRODUCT_NOT_FOUND when variant option does not exist', async () => {
    mockProductRepo.updateVariantOption.mockResolvedValueOnce(null);

    await expect(productService.updateVariantOption('nonexistent', 'store-1', { nameEn: 'X' } as any))
      .rejects.toMatchObject({ code: ErrorCodes.PRODUCT_NOT_FOUND });
  });
});

describe('productService.deleteVariantOption', () => {
  it('deletes and returns the variant option', async () => {
    mockProductRepo.deleteVariantOption.mockResolvedValueOnce(mockVariantOption);

    const result = await productService.deleteVariantOption('vo-1', 'store-1');
    expect(result).toEqual(mockVariantOption);
    expect(mockProductRepo.deleteVariantOption).toHaveBeenCalledWith('vo-1', 'store-1');
  });

  it('throws PRODUCT_NOT_FOUND when variant option does not exist', async () => {
    mockProductRepo.deleteVariantOption.mockResolvedValueOnce(null);

    await expect(productService.deleteVariantOption('nonexistent', 'store-1'))
      .rejects.toMatchObject({ code: ErrorCodes.PRODUCT_NOT_FOUND });
  });
});