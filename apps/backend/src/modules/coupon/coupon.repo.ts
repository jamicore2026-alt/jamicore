// Coupon repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { coupons, couponUsages } from '../../db/schema.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type CouponSelect = typeof coupons.$inferSelect;
export type CouponInsert = typeof coupons.$inferInsert;

export const couponRepo = {
  async findManyByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
    tx?: DbOrTx,
  ): Promise<CouponSelect[]> {
    const executor = tx ?? db;
    const where = eq(coupons.storeId, storeId);
    return executor.query.coupons.findMany({
      where,
      orderBy: desc(coupons.createdAt),
      limit: options?.limit,
      offset: options?.offset,
    });
  },

  countByStoreId(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = eq(coupons.storeId, storeId);
    return executor
      .select({ count: count() })
      .from(coupons)
      .where(where);
  },

  async findById(couponId: string, storeId: string, tx?: DbOrTx): Promise<CouponSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.coupons.findFirst({
      where: and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)),
    });
  },

  async findByCode(code: string, storeId: string, tx?: DbOrTx): Promise<CouponSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.coupons.findFirst({
      where: and(
        eq(coupons.storeId, storeId),
        eq(sql`UPPER(${coupons.code})`, code.toUpperCase()),
      ),
    });
  },

  create(data: CouponInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(coupons).values(data).returning();
  },

  update(couponId: string, storeId: string, data: Partial<CouponInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(coupons)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)))
      .returning();
  },

  deleteById(couponId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .delete(coupons)
      .where(and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)));
  },

  // ─── Per-customer coupon usage tracking ───

  async countCustomerUsages(couponId: string, customerId: string, tx?: DbOrTx): Promise<number> {
    const executor = tx ?? db;
    const rows = await executor
      .select({ count: count() })
      .from(couponUsages)
      .where(and(eq(couponUsages.couponId, couponId), eq(couponUsages.customerId, customerId)));
    return rows[0]?.count ?? 0;
  },

  async insertCouponUsage(
    data: typeof couponUsages.$inferInsert,
    tx?: DbOrTx,
  ): Promise<typeof couponUsages.$inferSelect> {
    const executor = tx ?? db;
    const [row] = await executor.insert(couponUsages).values(data).returning();
    return row;
  },
};
