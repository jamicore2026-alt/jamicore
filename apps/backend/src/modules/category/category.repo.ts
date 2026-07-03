// Category repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { categories, subcategories } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type CategorySelect = typeof categories.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type SubcategorySelect = typeof subcategories.$inferSelect;
export type SubcategoryInsert = typeof subcategories.$inferInsert;

export const categoryRepo = {
  findManyByStoreId(storeId: string, options?: { limit?: number; offset?: number }, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.query.categories.findMany({
      where: eq(categories.storeId, storeId),
      with: {
        subcategories: true,
      },
      orderBy: [desc(categories.createdAt)],
      limit: options?.limit ?? 200,
      offset: options?.offset,
    });
  },

  countByStoreId(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.storeId, storeId));
  },

  findById(id: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.storeId, storeId)),
      with: {
        subcategories: true,
      },
    });
  },

  create(data: CategoryInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(categories).values(data).returning();
  },

  update(id: string, storeId: string, data: Partial<CategoryInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning();
  },

  delete(id: string, storeId: string, tx?: DbOrTx): Promise<CategorySelect[]> {
    const executor = tx ?? db;
    return executor
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning();
  },

  // --- Subcategory queries ---

  createSubcategory(data: SubcategoryInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(subcategories).values(data).returning();
  },

  updateSubcategory(id: string, storeId: string, data: Partial<SubcategoryInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(subcategories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(subcategories.id, id), eq(subcategories.storeId, storeId)))
      .returning();
  },

  deleteSubcategory(id: string, storeId: string, tx?: DbOrTx): Promise<SubcategorySelect[]> {
    const executor = tx ?? db;
    return executor
      .delete(subcategories)
      .where(and(eq(subcategories.id, id), eq(subcategories.storeId, storeId)))
      .returning();
  },
};