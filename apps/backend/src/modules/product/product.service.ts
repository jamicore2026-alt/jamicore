// Product service — business logic, calls productRepo, never imports db directly
import { productRepo } from './product.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import type { ProductInsert, ProductUpdate, VariantInsert, VariantUpdate, VariantOptionInsert, VariantOptionUpdate } from './product.types.js';

// Fields that must NEVER appear in public (storefront) product responses.
// purchasePrice = merchant cost (financial), storeId = tenant id, inventoryAlertThreshold
// = merchant ops config, deletedAt = soft-delete tombstone. Public shoppers must not see these.
const SENSITIVE_PRODUCT_FIELDS = ['purchasePrice', 'storeId', 'inventoryAlertThreshold', 'deletedAt'] as const;

type ProductLike = Record<string, unknown>;

function stripSensitive<T extends ProductLike>(product: T): Omit<T, (typeof SENSITIVE_PRODUCT_FIELDS)[number]> {
  const { purchasePrice: _pp, storeId: _si, inventoryAlertThreshold: _it, deletedAt: _da, ...rest } = product;
  return rest;
}

/**
 * Strip merchant-internal fields from a product (or array of products) before
 * returning it on a public route. Does not mutate the input.
 * NOTE: nested relations (variants/options/category) may still carry their own
 * storeId — see commerce-path-p2-backlog for the nested-storeId follow-up.
 */
export function sanitizePublicProduct<T extends ProductLike | ProductLike[]>(
  product: T,
): T extends ProductLike[] ? Array<Omit<T[number], (typeof SENSITIVE_PRODUCT_FIELDS)[number]>> : Omit<T, (typeof SENSITIVE_PRODUCT_FIELDS)[number]> {
  if (Array.isArray(product)) {
    return product.map(stripSensitive) as T extends ProductLike[]
      ? Array<Omit<T[number], (typeof SENSITIVE_PRODUCT_FIELDS)[number]>>
      : never;
  }
  return stripSensitive(product as ProductLike) as T extends ProductLike[]
    ? never
    : Omit<T, (typeof SENSITIVE_PRODUCT_FIELDS)[number]>;
}

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
    page?: number;
    limit?: number;
  }) {
    // Business logic: clamp page/limit and convert page -> offset for the repo
    const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
    const page = Math.max(1, opts.page ?? 1);
    const offset = (page - 1) * limit;

    return productRepo.search(storeId, {
      ...opts,
      limit,
      offset,
    });
  },
};