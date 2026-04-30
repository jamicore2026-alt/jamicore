// Merchant Billing repository — Drizzle queries only
import { db } from '../../db/index.js';
import { stores, invoices, merchantPlans } from '../../db/schema.js';
import { eq, desc, count } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export const billingRepo = {
  async findStoreWithPlan(storeId: string) {
    return db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      with: { plan: true },
    });
  },

  async findInvoicesByStore(storeId: string, page: number, limit: number) {
    const where = eq(invoices.storeId, storeId);

    const [rows, totalResult] = await Promise.all([
      db.query.invoices.findMany({
        where,
        orderBy: desc(invoices.createdAt),
        limit,
        offset: (page - 1) * limit,
        with: { plan: true },
      }),
      db.select({ count: count() }).from(invoices).where(where),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  async updateStorePlan(storeId: string, data: Partial<typeof stores.$inferInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return updated;
  },

  async insertInvoice(data: typeof invoices.$inferInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [invoice] = await executor.insert(invoices).values(data).returning();
    return invoice;
  },

  async findPlanById(planId: string) {
    return db.query.merchantPlans.findFirst({
      where: eq(merchantPlans.id, planId),
    });
  },

  async findActivePlans() {
    return db.query.merchantPlans.findMany({
      where: eq(merchantPlans.isActive, true),
      orderBy: desc(merchantPlans.price),
    });
  },
};
