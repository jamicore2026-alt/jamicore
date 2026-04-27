// Cart repository — Drizzle queries only. No business logic, no ErrorCodes.
import { db } from '../../db/index.js';
import { carts, cartItems } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export const cartRepo = {
  // ─── Read operations ───

  async findCartById(cartId: string, storeId: string) {
    return db.query.carts.findFirst({
      where: and(eq(carts.id, cartId), eq(carts.storeId, storeId)),
      with: {
        items: {
          with: {
            product: true,
            bundle: {
              with: {
                items: {
                  with: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async findCartBySessionId(sessionId: string) {
    return db.query.carts.findFirst({
      where: eq(carts.sessionId, sessionId),
      with: {
        items: {
          with: {
            product: true,
            bundle: {
              with: {
                items: {
                  with: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async findCartItemsByCartId(cartId: string) {
    return db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  },

  async findCartItemById(itemId: string, cartId: string) {
    return db.select().from(cartItems).where(
      and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId))
    ).then(rows => rows[0] ?? null);
  },

  async findCartItemsByProductId(cartId: string, productId: string) {
    return db.select().from(cartItems).where(
      and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
    );
  },

  // ─── Write operations (transaction-aware) ───

  async insertCart(data: typeof carts.$inferInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [cart] = await executor.insert(carts).values(data).returning();
    return cart;
  },

  async insertCartItem(data: typeof cartItems.$inferInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [item] = await executor.insert(cartItems).values(data).returning();
    return item;
  },

  async updateCartItem(itemId: string, data: Partial<typeof cartItems.$inferInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(cartItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cartItems.id, itemId))
      .returning();
    return updated;
  },

  async deleteCartItem(itemId: string, cartId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    return executor.delete(cartItems).where(
      and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)),
    );
  },

  async updateCartTotals(cartId: string, subtotal: string, total: string, itemCount: number, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(carts)
      .set({
        subtotal,
        total,
        itemCount,
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId))
      .returning();
    return updated;
  },
};