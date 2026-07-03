// Merchant Billing repository — Drizzle queries only
import { db, dbAdmin } from '../../db/index.js';
import { stores, invoices, merchantPlans } from '../../db/schema.js';
import { eq, desc, count, asc } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export const billingRepo = {
  // stores has RLS (migration 0031); this is a merchant-scope read with no
  // withTenant tx, so use dbAdmin (BYPASSRLS). The eq(stores.id, storeId)
  // filter still scopes the result to the caller's store.
  async findStoreWithPlan(storeId: string) {
    return dbAdmin.query.stores.findFirst({
      where: eq(stores.id, storeId),
      with: { plan: true },
    });
  },

  async findInvoicesByStore(storeId: string, page: number, limit: number): Promise<{ data: typeof invoices.$inferSelect[]; total: number }> {
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

  async updateStorePlan(storeId: string, data: Partial<typeof stores.$inferInsert>, tx?: DbOrTx): Promise<typeof stores.$inferSelect | undefined> {
    const executor = tx ?? dbAdmin;
    const [updated] = await executor
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return updated;
  },

  async insertInvoice(data: typeof invoices.$inferInsert, tx?: DbOrTx): Promise<typeof invoices.$inferSelect> {
    const executor = tx ?? db;
    const [invoice] = await executor.insert(invoices).values(data).returning();
    return invoice;
  },

  async findPlanById(planId: string): Promise<typeof merchantPlans.$inferSelect | undefined> {
    return db.query.merchantPlans.findFirst({
      where: eq(merchantPlans.id, planId),
    });
  },

  async findActivePlans(): Promise<typeof merchantPlans.$inferSelect[]> {
    return db.query.merchantPlans.findMany({
      where: eq(merchantPlans.isActive, true),
      orderBy: asc(merchantPlans.sortOrder),
    });
  },
};
