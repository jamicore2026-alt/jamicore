// Product service — business logic, calls productRepo, never imports db directly
import { productRepo } from './product.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import type { ProductInsert, ProductUpdate, VariantInsert, VariantUpdate, VariantOptionInsert, VariantOptionUpdate } from './product.types.js';

export const productService = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number; isPublished?: boolean; search?: string; categoryId?: string },
  ) {
    return productRepo.findByStoreId(storeId, options);
  },

  async findById(id: string, storeId: string) {
    const product = await productRepo.findById(id, storeId);

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  async create(data: ProductInsert) {
    const product = await productRepo.create(data);

    if (!product) {
      throw Object.assign(new Error('Failed to create product'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return product;
  },

  async update(id: string, storeId: string, data: ProductUpdate) {
    const product = await productRepo.update(id, storeId, data);

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  async delete(id: string, storeId: string) {
    const product = await productRepo.delete(id, storeId);

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  // ─── Variant operations ───

  async createVariant(data: VariantInsert) {
    const variant = await productRepo.createVariant(data);

    if (!variant) {
      throw Object.assign(new Error('Failed to create product variant'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return variant;
  },

  async updateVariant(id: string, storeId: string, data: VariantUpdate) {
    const variant = await productRepo.updateVariant(id, storeId, data);

    if (!variant) {
      throw Object.assign(new Error('Product variant not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return variant;
  },

  async deleteVariant(id: string, storeId: string) {
    const variant = await productRepo.deleteVariant(id, storeId);

    if (!variant) {
      throw Object.assign(new Error('Product variant not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return variant;
  },

  // ─── Variant option operations ───

  async createVariantOption(data: VariantOptionInsert) {
    const option = await productRepo.createVariantOption(data);

    if (!option) {
      throw Object.assign(new Error('Failed to create variant option'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return option;
  },

  async updateVariantOption(
    id: string,
    storeId: string,
    data: VariantOptionUpdate,
  ) {
    const option = await productRepo.updateVariantOption(id, storeId, data);

    if (!option) {
      throw Object.assign(new Error('Variant option not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return option;
  },

  async deleteVariantOption(id: string, storeId: string) {
    const option = await productRepo.deleteVariantOption(id, storeId);

    if (!option) {
      throw Object.assign(new Error('Variant option not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return option;
  },

  async search(storeId: string, opts: {
    q?: string;
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    isPublished?: boolean;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc' | 'name_desc';
    limit?: number;
    offset?: number;
  }) {
    // Business logic: clamp limit and offset
    const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
    const offset = Math.max(0, opts.offset ?? 0);

    return productRepo.search(storeId, {
      ...opts,
      limit,
      offset,
    });
  },
};