// Wishlist repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { wishlists } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

type DbExecutor = typeof db;

export const wishlistRepo = {
  async findByCustomerId(customerId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.wishlists.findMany({
      where: and(
        eq(wishlists.customerId, customerId),
        eq(wishlists.storeId, storeId),
      ),
      with: {
        product: true,
      },
    });
  },

  async findExistingItem(customerId: string, productId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.wishlists.findFirst({
      where: and(
        eq(wishlists.customerId, customerId),
        eq(wishlists.productId, productId),
      ),
    });
  },

  async insertItem(data: typeof wishlists.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [item] = await executor.insert(wishlists).values(data).returning();
    return item;
  },

  async deleteItem(customerId: string, productId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.delete(wishlists).where(
      and(
        eq(wishlists.customerId, customerId),
        eq(wishlists.productId, productId),
      ),
    );
  },
};