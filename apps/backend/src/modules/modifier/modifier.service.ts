// Modifier Service - CRUD for modifier groups with options.
// RLS Phase 1 (Approach A): every entry runs inside withTenant(storeId, fn)
// so app.tenant_id is set on the tx and forwarded to the repo.
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';
import * as repo from './modifier.repo.js';

export const modifierService = {
  // --- Modifier Group operations ---

  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return withTenant(storeId, (tx) => repo.findGroupsByStoreId(storeId, options, tx));
  },

  async findById(id: string, storeId: string) {
    const group = await withTenant(storeId, (tx) => repo.findGroupById(id, storeId, tx));

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  async findByProductId(productId: string, storeId: string) {
    return withTenant(storeId, (tx) => repo.findGroupsByProductId(productId, storeId, 50, tx));
  },

  async create(data: typeof import('../../db/schema.js').modifierGroups.$inferInsert) {
    const group = await withTenant(data.storeId, (tx) => repo.insertGroup(data, tx));

    if (!group) {
      throw Object.assign(new Error('Failed to create modifier group'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return group;
  },

  async update(
    id: string,
    storeId: string,
    data: Partial<typeof import('../../db/schema.js').modifierGroups.$inferInsert>,
  ) {
    const group = await withTenant(storeId, (tx) => repo.updateGroup(id, storeId, data, tx));

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  async delete(id: string, storeId: string) {
    const group = await withTenant(storeId, (tx) => repo.deleteGroup(id, storeId, tx));

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  // --- Modifier Option operations ---

  async findOptionById(id: string, storeId: string) {
    const option = await withTenant(storeId, (tx) => repo.findOptionById(id, storeId, tx));

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },

  async createOption(data: typeof import('../../db/schema.js').modifierOptions.$inferInsert) {
    const option = await withTenant(data.storeId, (tx) => repo.insertOption(data, tx));

    if (!option) {
      throw Object.assign(new Error('Failed to create modifier option'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return option;
  },

  async updateOption(
    id: string,
    storeId: string,
    data: Partial<typeof import('../../db/schema.js').modifierOptions.$inferInsert>,
  ) {
    const option = await withTenant(storeId, (tx) => repo.updateOption(id, storeId, data, tx));

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },

  async deleteOption(id: string, storeId: string) {
    const option = await withTenant(storeId, (tx) => repo.deleteOption(id, storeId, tx));

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },
};