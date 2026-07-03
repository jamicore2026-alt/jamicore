// Review repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { reviews } from '../../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type ReviewSelect = typeof reviews.$inferSelect;
export type ReviewInsert = typeof reviews.$inferInsert;

// Safe customer columns — excludes password and reset tokens
const safeCustomerColumns = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  storeId: true,
} as const;

export const reviewRepo = {
  findManyByProductId(productId: string, storeId: string, options?: { limit?: number; offset?: number }, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = and(
      eq(reviews.productId, productId),
      eq(reviews.storeId, storeId),
    );

    return executor.query.reviews.findMany({
      where,
      orderBy: desc(reviews.createdAt),
      limit: options?.limit ?? 50,
      offset: options?.offset,
      with: {
        customer: {
          columns: safeCustomerColumns,
        },
      },
    });
  },

  countByProductId(productId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = and(
      eq(reviews.productId, productId),
      eq(reviews.storeId, storeId),
    );

    return executor
      .select({ count: count() })
      .from(reviews)
      .where(where);
  },

  findManyByStoreId(storeId: string, options?: { limit?: number; offset?: number }, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = eq(reviews.storeId, storeId);

    return executor.query.reviews.findMany({
      where,
      orderBy: desc(reviews.createdAt),
      limit: options?.limit ?? 50,
      offset: options?.offset,
      with: {
        customer: {
          columns: safeCustomerColumns,
        },
        product: true,
      },
    });
  },

  countByStoreId(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const where = eq(reviews.storeId, storeId);

    return executor
      .select({ count: count() })
      .from(reviews)
      .where(where);
  },

  findById(reviewId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)),
      with: {
        customer: {
          columns: safeCustomerColumns,
        },
        product: true,
      },
    });
  },

  async findByIdBasic(reviewId: string, storeId: string, tx?: DbOrTx): Promise<ReviewSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)),
    });
  },

  create(data: ReviewInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.insert(reviews).values(data).returning();
  },

  update(reviewId: string, storeId: string, data: Partial<ReviewInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)))
      .returning();
  },

  deleteById(reviewId: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor
      .delete(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)));
  },
};