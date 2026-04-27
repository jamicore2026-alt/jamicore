// Plan Limits Service � enforces SaaS plan quotas per store
import { db } from '../../db/index.js';
import { products, users, stores } from '../../db/schema.js';
import { eq, count, sql } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';

export const planLimitsService = {
  async getPlanForStore(storeId: string) {
    const store = await db.query.stores.findFirst({
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

  async countProducts(storeId: string) {
    const [result] = await db.select({ value: count() }).from(products).where(eq(products.storeId, storeId));
    return result?.value ?? 0;
  },

  async countStaff(storeId: string) {
    const [result] = await db.select({ value: count() }).from(users).where(eq(users.storeId, storeId));
    return result?.value ?? 0;
  },

  async checkProductLimit(storeId: string) {
    const { plan } = await this.getPlanForStore(storeId);
    const used = await this.countProducts(storeId);
    if (plan.maxProducts !== null && used >= plan.maxProducts) {
      throw Object.assign(
        new Error(`Product limit reached: ${plan.maxProducts} products allowed. Current: ${used}`),
        { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
      );
    }
    return { max: plan.maxProducts, used };
  },

  async checkStorageLimit(storeId: string, additionalBytes: number = 0) {
    const { store, plan } = await this.getPlanForStore(storeId);
    const used = store.usedStorage ?? 0;
    const maxMB = plan.maxStorage ?? 1024;
    const maxBytes = maxMB * 1024 * 1024;
    if (used + additionalBytes > maxBytes) {
      throw Object.assign(
        new Error(`Storage limit reached: ${maxMB}MB allowed. Current: ${Math.round(used / 1024 / 1024)}MB`),
        { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
      );
    }
    return { max: maxBytes, used };
  },

  async checkStaffLimit(storeId: string) {
    const { plan } = await this.getPlanForStore(storeId);
    const used = await this.countStaff(storeId);
    if (plan.maxStaff !== null && used >= plan.maxStaff) {
      throw Object.assign(
        new Error(`Staff limit reached: ${plan.maxStaff} staff members allowed. Current: ${used}`),
        { code: ErrorCodes.PLAN_LIMIT_EXCEEDED }
      );
    }
    return { max: plan.maxStaff, used };
  },

  async incrementStorage(storeId: string, bytes: number) {
    await db.update(stores)
      .set({ usedStorage: sql`${stores.usedStorage} + ${bytes}` })
      .where(eq(stores.id, storeId));
  },

  async decrementStorage(storeId: string, bytes: number) {
    await db.update(stores)
      .set({ usedStorage: sql`GREATEST(0, ${stores.usedStorage} - ${bytes})` })
      .where(eq(stores.id, storeId));
  },

  async getPlanLimits(storeId: string) {
    const { plan } = await this.getPlanForStore(storeId);
    const [productCount] = await db.select({ value: count() }).from(products).where(eq(products.storeId, storeId));
    const [staffCount] = await db.select({ value: count() }).from(users).where(eq(users.storeId, storeId));
    const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId) });

    return {
      maxProducts: plan.maxProducts,
      maxStorage: plan.maxStorage,
      maxStaff: plan.maxStaff,
      usedProducts: productCount?.value ?? 0,
      usedStorage: store?.usedStorage ?? 0,
      usedStaff: staffCount?.value ?? 0,
    };
  },
};
