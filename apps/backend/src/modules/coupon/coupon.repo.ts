// Coupon repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { coupons, couponUsages } from '../../db/schema.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';

export type CouponSelect = typeof coupons.$inferSelect;
export type CouponInsert = typeof coupons.$inferInsert;

export const couponRepo = {
  findManyByStoreId(storeId: string, options?: { limit?: number; offset?: number }) {
    const where = eq(coupons.storeId, storeId);
    return db.query.coupons.findMany({
      where,
      orderBy: desc(coupons.createdAt),
      limit: options?.limit,
      offset: options?.offset,
    });
  },

  countByStoreId(storeId: string) {
    const where = eq(coupons.storeId, storeId);
    return db
      .select({ count: count() })
      .from(coupons)
      .where(where);
  },

  findById(couponId: string, storeId: string) {
    return db.query.coupons.findFirst({
      where: and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)),
    });
  },

  findByCode(code: string, storeId: string) {
    return db.query.coupons.findFirst({
      where: and(
        eq(coupons.storeId, storeId),
        eq(sql`UPPER(${coupons.code})`, code.toUpperCase()),
      ),
    });
  },

  create(data: CouponInsert) {
    return db.insert(coupons).values(data).returning();
  },

  update(couponId: string, storeId: string, data: Partial<CouponInsert>) {
    return db
      .update(coupons)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)))
      .returning();
  },

  deleteById(couponId: string, storeId: string) {
    return db
      .delete(coupons)
      .where(and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)));
  },

  // ─── Per-customer coupon usage tracking ───

  async countCustomerUsages(couponId: string, customerId: string) {
    const rows = await db
      .select({ count: count() })
      .from(couponUsages)
      .where(and(eq(couponUsages.couponId, couponId), eq(couponUsages.customerId, customerId)));
    return rows[0]?.count ?? 0;
  },

  async insertCouponUsage(data: typeof couponUsages.$inferInsert) {
    const [row] = await db.insert(couponUsages).values(data).returning();
    return row;
  },
};
