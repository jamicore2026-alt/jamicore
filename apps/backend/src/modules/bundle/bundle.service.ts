// Bundle service — business logic, calls bundleRepo, never imports db directly.
// RLS Phase 1 (Approach A): every entry runs inside withTenant(storeId, fn)
// so app.tenant_id is set on the tx. withTenant opens its own transaction, so
// the createBundle+createBundleItems / updateBundle+deleteBundleItems+createBundleItems
// pairs stay atomic (single tx) — the previous bare db.transaction is removed.
import { bundleRepo } from './bundle.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';

export const bundleService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number; isActive?: boolean }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const { items, total } = await withTenant(storeId, (tx) =>
      bundleRepo.findManyByStoreId(storeId, { limit, offset, isActive: opts?.isActive }, tx),
    );

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(bundleId: string, storeId: string) {
    const bundle = await withTenant(storeId, (tx) => bundleRepo.findById(bundleId, storeId, tx));

    if (!bundle) {
      throw Object.assign(new Error('Bundle not found'), {
        code: ErrorCodes.NOT_FOUND,
      });
    }

    return bundle;
  },

  async findBundlesByProductId(productId: string, storeId: string) {
    return withTenant(storeId, (tx) => bundleRepo.findBundlesByProductId(productId, storeId, tx));
  },

  async create(data: {
    storeId: string;
    name: string;
    description?: string;
    price: string;
    isActive?: boolean;
    items: Array<{ productId: string; quantity: number; sortOrder?: number }>;
  }) {
    if (data.items.length < 2) {
      throw Object.assign(new Error('Bundle must contain at least 2 items'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return withTenant(data.storeId, async (tx) => {
      const productIds = data.items.map((item) => item.productId);
      const products = await bundleRepo.findProductsByIds(productIds, data.storeId, tx);

      if (products.length !== productIds.length) {
        throw Object.assign(new Error('One or more products not found in this store'), {
          code: ErrorCodes.PRODUCT_NOT_FOUND,
        });
      }

      const unpublished = products.filter((p) => !p.isPublished);
      if (unpublished.length > 0) {
        throw Object.assign(new Error('All products in a bundle must be published'), {
          code: ErrorCodes.PRODUCT_UNPUBLISHED,
        });
      }

      const bundle = await bundleRepo.createBundle(
        {
          storeId: data.storeId,
          name: data.name,
          description: data.description,
          price: data.price,
          isActive: data.isActive ?? true,
        },
        tx,
      );

      if (!bundle) {
        throw Object.assign(new Error('Failed to create bundle'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }

      const bundleItems = data.items.map((item) => ({
        storeId: data.storeId,
        bundleId: bundle.id,
        productId: item.productId,
        quantity: item.quantity,
        sortOrder: item.sortOrder ?? 0,
      }));

      await bundleRepo.createBundleItems(bundleItems, tx);

      return bundleRepo.findById(bundle.id, data.storeId, tx);
    });
  },

  async update(
    bundleId: string,
    storeId: string,
    data: Partial<{
      name: string;
      description: string;
      price: string;
      isActive: boolean;
      items: Array<{ productId: string; quantity: number; sortOrder?: number }>;
    }>,
  ) {
    return withTenant(storeId, async (tx) => {
      const bundle = await bundleRepo.findById(bundleId, storeId, tx);

      if (!bundle) {
        throw Object.assign(new Error('Bundle not found'), {
          code: ErrorCodes.NOT_FOUND,
        });
      }

      if (data.items) {
        if (data.items.length < 2) {
          throw Object.assign(new Error('Bundle must contain at least 2 items'), {
            code: ErrorCodes.VALIDATION_ERROR,
          });
        }

        const productIds = data.items.map((item) => item.productId);
        const products = await bundleRepo.findProductsByIds(productIds, storeId, tx);

        if (products.length !== productIds.length) {
          throw Object.assign(new Error('One or more products not found in this store'), {
            code: ErrorCodes.PRODUCT_NOT_FOUND,
          });
        }

        const unpublished = products.filter((p) => !p.isPublished);
        if (unpublished.length > 0) {
          throw Object.assign(new Error('All products in a bundle must be published'), {
            code: ErrorCodes.PRODUCT_UNPUBLISHED,
          });
        }
      }

      await bundleRepo.updateBundle(
        bundleId,
        storeId,
        {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
        tx,
      );

      if (data.items) {
        await bundleRepo.deleteBundleItemsByBundleId(bundleId, storeId, tx);

        const bundleItems = data.items.map((item) => ({
          storeId,
          bundleId,
          productId: item.productId,
          quantity: item.quantity,
          sortOrder: item.sortOrder ?? 0,
        }));

        await bundleRepo.createBundleItems(bundleItems, tx);
      }

      return bundleRepo.findById(bundleId, storeId, tx);
    });
  },

  async delete(bundleId: string, storeId: string) {
    const bundle = await withTenant(storeId, (tx) => bundleRepo.findById(bundleId, storeId, tx));

    if (!bundle) {
      throw Object.assign(new Error('Bundle not found'), {
        code: ErrorCodes.NOT_FOUND,
      });
    }

    await withTenant(storeId, async (tx) => {
      await bundleRepo.deleteBundleItemsByBundleId(bundleId, storeId, tx);
      await bundleRepo.deleteBundle(bundleId, storeId, tx);
    });

    return { id: bundleId, deleted: true };
  },
};