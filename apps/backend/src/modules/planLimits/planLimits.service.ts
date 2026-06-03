// Plan Limits Service — enforces SaaS plan quotas per store
import { db } from '../../db/index.js';
import { products, users, stores, merchantPlans } from '../../db/schema.js';
import { eq, count } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';
import type { DbOrTx } from '../_shared/db-types.js';

export const planLimitsService = {
  async getPlanForStore(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const store = await executor.query.stores.findFirst({
      where: eq(stores.id, storeId),
      with: { plan: true },
    });
    if (!store || !store.plan) {
      throw Object.assign(new Error('No plan found for store'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }
    return { store, plan: store.plan };
  },

  async countProducts(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [result] = await executor.select({ value: count() }).from(products).where(eq(products.storeId, storeId));
    return result?.value ?? 0;
  },

  async countStaff(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [result] = await executor.select({ value: count() }).from(users).where(eq(users.storeId, storeId));
    return result?.value ?? 0;
  },

  async checkProductLimit(storeId: string, tx?: DbOrTx) {
    const check = async (executor: DbOrTx) => {
      const [store] = await executor.select().from(stores).where(eq(stores.id, storeId)).for('update');
      if (!store) {
        throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
      }
      if (!store.planId) {
        return { max: null, used: await this.countProducts(storeId, executor) };
      }
      const [plan] = await executor.select().from(merchantPlans).where(eq(merchantPlans.id, store.planId));
      const used = await this.countProducts(storeId, executor);
      if (plan?.maxProducts !== null && used >= plan.maxProducts) {
        throw Object.assign(
          new Error(`Product limit reached: ${plan.maxProducts} products allowed. Current: ${used}`),
          { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
        );
      }
      return { max: plan?.maxProducts, used };
    };
    if (tx) {
      return check(tx);
    }
    return db.transaction(async (trx) => check(trx));
  },

  async checkStorageLimit(storeId: string, additionalBytes: number = 0, tx?: DbOrTx) {
    const check = async (executor: DbOrTx) => {
      const [store] = await executor.select().from(stores).where(eq(stores.id, storeId)).for('update');
      if (!store) {
        throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
      }
      const used = store.usedStorage ?? 0;
      const maxMB = store.planId
        ? (await executor.select().from(merchantPlans).where(eq(merchantPlans.id, store.planId)))[0]?.maxStorage ?? 1024
        : 1024;
      const maxBytes = maxMB * 1024 * 1024;
      if (used + additionalBytes > maxBytes) {
        throw Object.assign(
          new Error(`Storage limit reached: ${maxMB}MB allowed. Current: ${Math.round(used / 1024 / 1024)}MB`),
          { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
        );
      }
      return { max: maxBytes, used };
    };
    if (tx) {
      return check(tx);
    }
    return db.transaction(async (trx) => check(trx));
  },

  async checkStaffLimit(storeId: string, tx?: DbOrTx) {
    const check = async (executor: DbOrTx) => {
      const [store] = await executor.select().from(stores).where(eq(stores.id, storeId)).for('update');
      if (!store) {
        throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
      }
      if (!store.planId) {
        return { max: null, used: await this.countStaff(storeId, executor) };
      }
      const [plan] = await executor.select().from(merchantPlans).where(eq(merchantPlans.id, store.planId));
      const used = await this.countStaff(storeId, executor);
      if (plan?.maxStaff !== null && used >= plan.maxStaff) {
        throw Object.assign(
          new Error(`Staff limit reached: ${plan.maxStaff} staff members allowed. Current: ${used}`),
          { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
        );
      }
      return { max: plan?.maxStaff, used };
    };
    if (tx) {
      return check(tx);
    }
    return db.transaction(async (trx) => check(trx));
  },

  async checkAndIncrementProductCount(storeId: string, tx?: DbOrTx) {
    const check = async (executor: DbOrTx) => {
      const [store] = await executor.select().from(stores).where(eq(stores.id, storeId)).for('update');
      if (!store) {
        throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
      }
      if (!store.planId) {
        return;
      }
      const [plan] = await executor.select().from(merchantPlans).where(eq(merchantPlans.id, store.planId));
      const [usedResult] = await executor.select({ value: count() }).from(products).where(eq(products.storeId, storeId));
      const used = usedResult?.value ?? 0;
      if (plan?.maxProducts !== null && used >= plan.maxProducts) {
        throw Object.assign(
          new Error(`Product limit reached: ${plan.maxProducts} products allowed. Current: ${used}`),
          { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
        );
      }
    };
    if (tx) {
      return check(tx);
    }
    return db.transaction(async (trx) => check(trx));
  },

  async checkAndIncrementStaffCount(storeId: string, tx?: DbOrTx) {
    const check = async (executor: DbOrTx) => {
      const [store] = await executor.select().from(stores).where(eq(stores.id, storeId)).for('update');
      if (!store) {
        throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
      }
      if (!store.planId) {
        return;
      }
      const [plan] = await executor.select().from(merchantPlans).where(eq(merchantPlans.id, store.planId));
      const [usedResult] = await executor.select({ value: count() }).from(users).where(eq(users.storeId, storeId));
      const used = usedResult?.value ?? 0;
      if (plan?.maxStaff !== null && used >= plan.maxStaff) {
        throw Object.assign(
          new Error(`Staff limit reached: ${plan.maxStaff} staff members allowed. Current: ${used}`),
          { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
        );
      }
    };
    if (tx) {
      return check(tx);
    }
    return db.transaction(async (trx) => check(trx));
  },

  async incrementStorage(storeId: string, bytes: number) {
    return db.transaction(async (tx) => {
      const [store] = await tx.select().from(stores).where(eq(stores.id, storeId)).for('update');
      if (!store) {
        throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
      }
      let maxMB = 1024;
      if (store.planId) {
        const [plan] = await tx.select().from(merchantPlans).where(eq(merchantPlans.id, store.planId));
        maxMB = plan?.maxStorage ?? 1024;
      }
      const currentUsed = store.usedStorage ?? 0;
      const maxBytes = maxMB * 1024 * 1024;
      const newUsed = currentUsed + bytes;
      if (newUsed > maxBytes) {
        throw Object.assign(
          new Error(`Storage limit reached: ${maxMB}MB allowed. Current: ${Math.round(currentUsed / 1024 / 1024)}MB`),
          { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
        );
      }
      await tx.update(stores).set({ usedStorage: newUsed }).where(eq(stores.id, storeId));
    });
  },

  async decrementStorage(storeId: string, bytes: number) {
    return db.transaction(async (tx) => {
      const [store] = await tx.select().from(stores).where(eq(stores.id, storeId)).for('update');
      if (!store) {
        throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
      }
      const newUsed = Math.max(0, (store.usedStorage ?? 0) - bytes);
      await tx.update(stores).set({ usedStorage: newUsed }).where(eq(stores.id, storeId));
    });
  },

  async getPlanLimits(storeId: string) {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      with: { plan: true },
    });
    if (!store) {
      throw Object.assign(new Error('Store not found'), { code: ErrorCodes.STORE_NOT_FOUND });
    }
    const plan = store.plan;
    const [productCount] = await db.select({ value: count() }).from(products).where(eq(products.storeId, storeId));
    const [staffCount] = await db.select({ value: count() }).from(users).where(eq(users.storeId, storeId));

    return {
      maxProducts: plan?.maxProducts ?? null,
      maxStorage: plan?.maxStorage ?? 1024,
      maxStaff: plan?.maxStaff ?? null,
      usedProducts: productCount?.value ?? 0,
      usedStorage: store.usedStorage ?? 0,
      usedStaff: staffCount?.value ?? 0,
    };
  },
};
