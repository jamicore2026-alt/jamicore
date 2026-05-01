// Category repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { categories, subcategories } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export type CategorySelect = typeof categories.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type SubcategorySelect = typeof subcategories.$inferSelect;
export type SubcategoryInsert = typeof subcategories.$inferInsert;

export const categoryRepo = {
  findManyByStoreId(storeId: string, options?: { limit?: number; offset?: number }) {
    return db.query.categories.findMany({
      where: eq(categories.storeId, storeId),
      with: {
        subcategories: true,
      },
      orderBy: [desc(categories.createdAt)],
      limit: options?.limit ?? 200,
      offset: options?.offset,
    });
  },

  countByStoreId(storeId: string) {
    return db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.storeId, storeId));
  },

  findById(id: string, storeId: string) {
    return db.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.storeId, storeId)),
      with: {
        subcategories: true,
      },
    });
  },

  create(data: CategoryInsert) {
    return db.insert(categories).values(data).returning();
  },

  update(id: string, storeId: string, data: Partial<CategoryInsert>) {
    return db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning();
  },

  delete(id: string, storeId: string) {
    return db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning();
  },

  // --- Subcategory queries ---

  createSubcategory(data: SubcategoryInsert) {
    return db.insert(subcategories).values(data).returning();
  },

  updateSubcategory(id: string, storeId: string, data: Partial<SubcategoryInsert>) {
    return db
      .update(subcategories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(subcategories.id, id), eq(subcategories.storeId, storeId)))
      .returning();
  },

  deleteSubcategory(id: string, storeId: string) {
    return db
      .delete(subcategories)
      .where(and(eq(subcategories.id, id), eq(subcategories.storeId, storeId)))
      .returning();
  },
};