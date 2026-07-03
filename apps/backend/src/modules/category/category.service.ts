// Category service — business logic, calls repo, throws domain errors.
// RLS Phase 1 (Approach A): every entry runs inside withTenant(storeId, fn)
// so app.tenant_id is set on the tx and forwarded to categoryRepo.
import { categoryRepo } from './category.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';

export const categoryService = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return withTenant(storeId, async (tx) => {
      const [items, countResult] = await Promise.all([
        categoryRepo.findManyByStoreId(storeId, options, tx),
        categoryRepo.countByStoreId(storeId, tx),
      ]);

      const total = countResult[0]?.count ?? 0;

      return { items, total };
    });
  },

  async findById(id: string, storeId: string) {
    const category = await withTenant(storeId, (tx) => categoryRepo.findById(id, storeId, tx));

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  async create(data: Parameters<typeof categoryRepo.create>[0]) {
    const [category] = await withTenant(data.storeId, (tx) => categoryRepo.create(data, tx));

    if (!category) {
      throw Object.assign(new Error('Failed to create category'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return category;
  },

  async update(id: string, storeId: string, data: Parameters<typeof categoryRepo.update>[2]) {
    const [category] = await withTenant(storeId, (tx) => categoryRepo.update(id, storeId, data, tx));

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  async delete(id: string, storeId: string) {
    const [category] = await withTenant(storeId, (tx) => categoryRepo.delete(id, storeId, tx));

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  // --- Subcategory operations ---

  async createSubcategory(data: Parameters<typeof categoryRepo.createSubcategory>[0]) {
    const [subcategory] = await withTenant(data.storeId, (tx) =>
      categoryRepo.createSubcategory(data, tx),
    );

    if (!subcategory) {
      throw Object.assign(new Error('Failed to create subcategory'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return subcategory;
  },

  async updateSubcategory(
    id: string,
    storeId: string,
    data: Parameters<typeof categoryRepo.updateSubcategory>[2],
  ) {
    const [subcategory] = await withTenant(storeId, (tx) =>
      categoryRepo.updateSubcategory(id, storeId, data, tx),
    );

    if (!subcategory) {
      throw Object.assign(new Error('Subcategory not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return subcategory;
  },

  async deleteSubcategory(id: string, storeId: string) {
    const [subcategory] = await withTenant(storeId, (tx) =>
      categoryRepo.deleteSubcategory(id, storeId, tx),
    );

    if (!subcategory) {
      throw Object.assign(new Error('Subcategory not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return subcategory;
  },
};