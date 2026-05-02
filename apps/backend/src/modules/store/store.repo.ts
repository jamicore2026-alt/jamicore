// Store repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { stores } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type StoreSelect = typeof stores.$inferSelect;
export type StoreInsert = typeof stores.$inferInsert;

export const storeRepo = {
  async findById(storeId: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
  },

  async findByDomain(domain: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.stores.findFirst({
      where: eq(stores.domain, domain),
    });
  },

  async findByOwnerId(ownerEmail: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.stores.findFirst({
      where: eq(stores.ownerEmail, ownerEmail),
    });
  },

  create(data: StoreInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(stores).values(data).returning();
  },

  update(storeId: string, data: Partial<StoreInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
  },
};