// Cart service — business logic, domain errors, cart computation.
// Calls cartRepo for all DB operations. Uses pricingService for price verification.
import { ErrorCodes } from '../../errors/codes.js';
import { multiplyDecimalByInt } from '../../lib/decimal.js';
import { cartRepo } from './cart.repo.js';
import { productRepo } from '../product/product.repo.js';
import { pricingService } from '../pricing/pricing.service.js';
import { db } from '../../db/index.js';
import { cartItems } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { QueueService } from '../../services/queue.service.js';

async function scheduleAbandonedCartRecovery(
  cartId: string,
  storeId: string,
  customerId: string | undefined,
  queueService: QueueService | undefined,
) {
  if (customerId && queueService?.abandonedCartQueue) {
    await queueService.abandonedCartQueue.add(
      'abandoned-cart',
      { storeId, cartId, customerId },
      { delay: 60 * 60 * 1000, jobId: `ac-${cartId}` },
    );
  }
}

export const cartService = {
  /**
   * Get an existing cart or create a new one.
   * Returns the cart with items and whether a new cart was created.
   */
  async getOrCreateCart(cartId: string | undefined, storeId: string) {
    if (cartId) {
      const existingCart = await cartRepo.findCartById(cartId, storeId);
      if (existingCart) {
        return { cart: existingCart, isNew: false };
      }
    }

    // Create a new cart with 7-day expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newCart = await cartRepo.insertCart({
      storeId,
      sessionId: crypto.randomUUID(),
      subtotal: '0',
      total: '0',
      itemCount: 0,
      expiresAt,
    });

    return { cart: { ...newCart, items: [] }, isNew: true };
  },

  /**
   * Merge a guest cart into a customer's cart on login.
   * If the customer already has a cart, items from the guest cart are added to it.
   * If the customer has no cart, the guest cart is assigned to the customer.
   *
   * PERF-002: previously this called addItem() once per guest cart item.
   * Each addItem fires ~7 DB round-trips (product lookup, price compute,
   * existing-item check, insert/update, recalculate, findCart, etc.),
   * so a 10-item guest cart cost 70+ round-trips per login.
   *
   * The new flow:
   *   1. Batch-load all referenced products in 1 query (findManyByIds)
   *   2. Compute prices for each item (pricingService is per-item, but
   *      products are batched so the upstream cost is gone)
   *   3. Fetch the customer cart's existing items in 1 query
   *   4. In a transaction, batch-insert new items + batch-update existing
   *      matches (via UPDATE ... FROM (VALUES))
   *   5. Recalculate totals once (not per-item)
   *   6. Schedule abandoned-cart recovery once (not per-item)
   */
  async mergeCartOnLogin(
    guestCartId: string,
    customerId: string,
    storeId: string,
    queueService?: QueueService,
  ) {
    const guestCart = await cartRepo.findCartById(guestCartId, storeId);
    const customerCart = await cartRepo.findCartByCustomerId(customerId, storeId);

    if (guestCart && customerCart) {
      const guestItems = guestCart.items || [];
      if (guestItems.length === 0) {
        await cartRepo.deleteCart(guestCartId);
        return;
      }

      // Step 1: batch-load all referenced products.
      const productIds = Array.from(new Set(guestItems.map((i) => i.productId)));
      const productRows = await productRepo.findManyByIds(productIds, storeId);
      const productById = new Map(productRows.map((p) => [p.id, p]));

      // Verify every product exists before doing any writes.
      for (const item of guestItems) {
        if (!productById.has(item.productId)) {
          throw Object.assign(new Error(`Product ${item.productId} not found`), {
            code: ErrorCodes.PRODUCT_NOT_FOUND,
          });
        }
      }

      // Step 2: compute verified price per item. pricingService is per-item,
      // so this can't be batched at the SQL level, but the products are now
      // batched and the per-item calls are pure CPU + Redis (no extra DB
      // round-trips beyond what addItem already paid).
      const prepared = await Promise.all(guestItems.map(async (item) => {
        const modifiers = typeof item.modifiers === 'string'
          ? JSON.parse(item.modifiers)
          : (item.modifiers || {});
        const itemPricing = await pricingService.computeItemPrice({
          storeId,
          productId: item.productId,
          bundleId: item.bundleId || undefined,
          variantOptionIds: modifiers.variantOptionIds,
          combinationKey: modifiers.combinationKey,
          modifierOptionIds: modifiers.modifierOptionIds,
          quantity: item.quantity,
        });
        return {
          sourceId: item.id,
          productId: item.productId,
          bundleId: item.bundleId || undefined,
          quantity: item.quantity,
          price: itemPricing.effectivePrice,
          lineTotal: itemPricing.lineTotal,
          modifiers: item.modifiers,
        };
      }));

      // Step 3: fetch the customer cart's existing items to dedup-merge.
      const existingItems = await cartRepo.findCartItemsByCartId(customerCart.id);

      // Build a dedup key per existing item: productId + sorted modifierOptionIds +
      // combinationKey. (The guest items use the same convention.)
      const dedupKey = (productId: string, modifiers: unknown): string => {
        if (!modifiers) return productId;
        const m = typeof modifiers === 'string' ? JSON.parse(modifiers) : modifiers;
        const variantIds = (m.variantOptionIds || []).slice().sort().join(',');
        const modifierIds = (m.modifierOptionIds || []).slice().sort().join(',');
        const combo = m.combinationKey || '';
        return `${productId}|${variantIds}|${modifierIds}|${combo}`;
      };

      const existingByKey = new Map(
        existingItems.map((i) => [dedupKey(i.productId, i.modifiers), i]),
      );

      const toInsert: Array<typeof cartItems.$inferInsert> = [];
      const toIncrement: Array<{ id: string; quantity: number; total: string }> = [];

      for (const p of prepared) {
        const key = dedupKey(p.productId, p.modifiers);
        const existing = existingByKey.get(key);
        if (existing) {
          // Merge by incrementing quantity on the existing row.
          const newQuantity = existing.quantity + p.quantity;
          const newTotal = multiplyDecimalByInt(p.price, newQuantity);
          toIncrement.push({ id: existing.id, quantity: p.quantity, total: newTotal });
        } else {
          toInsert.push({
            cartId: customerCart.id,
            productId: p.productId,
            bundleId: p.bundleId,
            quantity: p.quantity,
            price: p.price,
            total: p.lineTotal,
            modifiers: p.modifiers,
          });
        }
      }

      // Step 4: batch write inside a transaction. If the recalc or recovery
      // fails after, the merge itself is already atomic.
      await db.transaction(async (tx) => {
        if (toInsert.length > 0) {
          await cartRepo.insertCartItemsBatch(toInsert, tx);
        }
        if (toIncrement.length > 0) {
          await cartRepo.incrementCartItemQuantities(toIncrement, tx);
        }
        // Recompute the merged cart's totals from SQL aggregate.
        const [totals] = await tx
          .select({
            subtotal: sql<string>`COALESCE(SUM(${cartItems.total}), 0)::text`,
            itemCount: sql<number>`COALESCE(SUM(${cartItems.quantity}), 0)::int`,
          })
          .from(cartItems)
          .where(eq(cartItems.cartId, customerCart.id));
        await cartRepo.updateCartTotals(
          customerCart.id,
          totals?.subtotal ?? '0.00',
          totals?.subtotal ?? '0.00',
          totals?.itemCount ?? 0,
          tx,
        );
      });

      // Step 5: delete the guest cart (one query, outside the merge txn
      // so a delete failure doesn't roll back the merge).
      await cartRepo.deleteCart(guestCartId);

      // Step 6: schedule abandoned-cart recovery once.
      await scheduleAbandonedCartRecovery(customerCart.id, storeId, customerId, queueService);
    } else if (guestCart && !customerCart) {
      await cartRepo.updateCartCustomerId(guestCartId, customerId);
    }
  },

  /**
   * Recalculate cart totals from the current cart items.
   * PERF-006: now a single SQL UPDATE that aggregates in the database
   * (was previously 3 round-trips: SELECT items → JS sum → UPDATE).
   */
  async recalculateTotals(cartId: string) {
    return cartRepo.recalculateCartTotalsInDb(cartId);
  },

  /**
   * Add an item to the cart. Verifies price server-side via pricingService.
   * If the same product with identical modifiers already exists, increments quantity.
   * Returns the updated cart and the affected item.
   */
  async addItem(
    cartId: string,
    storeId: string,
    params: {
      productId: string;
      quantity: number;
      bundleId?: string;
      variantOptionIds?: string[];
      combinationKey?: string;
      modifierOptionIds?: string[];
    },
    customerId?: string,
    queueService?: QueueService,
  ) {
    // Verify product exists and has sufficient inventory
    const product = await productRepo.findById(params.productId, storeId);
    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    const requestedQty = params.quantity || 1;
    if ((product.currentQuantity ?? 0) < requestedQty) {
      throw Object.assign(new Error('Insufficient inventory'), {
        code: ErrorCodes.INSUFFICIENT_INVENTORY,
      });
    }

    // Compute verified price for this item
    const itemPricing = await pricingService.computeItemPrice({
      storeId,
      productId: params.productId,
      bundleId: params.bundleId,
      variantOptionIds: params.variantOptionIds,
      combinationKey: params.combinationKey,
      modifierOptionIds: params.modifierOptionIds,
      quantity: params.quantity,
    });

    const price = itemPricing.effectivePrice;
    const itemTotal = itemPricing.lineTotal;

    // Build modifiers JSON for matching
    const modifiersJson = (params.variantOptionIds || params.modifierOptionIds)
      ? JSON.stringify({
          variantOptionIds: params.variantOptionIds,
          combinationKey: params.combinationKey,
          modifierOptionIds: params.modifierOptionIds,
        })
      : null;

    // Check if item with same productId + modifiers already exists in cart
    const existingItems = await cartRepo.findCartItemsByProductId(cartId, params.productId);

    const existingItem = existingItems.find((item) => {
      if (!modifiersJson && !item.modifiers) return true;
      if (modifiersJson && item.modifiers) {
        try {
          const existing = typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers;
          const incoming = JSON.parse(modifiersJson);
          return JSON.stringify(existing) === JSON.stringify(incoming);
        } catch {
          return false;
        }
      }
      return false;
    });

    if (existingItem) {
      // Increment quantity of existing item
      const newQuantity = existingItem.quantity + params.quantity;
      const newTotal = multiplyDecimalByInt(price, newQuantity);
      const updated = await cartRepo.updateCartItem(existingItem.id, {
        quantity: newQuantity,
        total: newTotal,
      });

      await cartService.recalculateTotals(cartId);

      const cart = await cartRepo.findCartById(cartId, storeId);
      await scheduleAbandonedCartRecovery(cartId, storeId, customerId, queueService);
      return { cart, item: updated };
    }

    // Add new item
    const item = await cartRepo.insertCartItem({
      cartId,
      productId: params.productId,
      bundleId: params.bundleId,
      quantity: params.quantity,
      price,
      total: itemTotal,
      modifiers: modifiersJson,
    });

    await cartService.recalculateTotals(cartId);

    const cart = await cartRepo.findCartById(cartId, storeId);
    await scheduleAbandonedCartRecovery(cartId, storeId, customerId, queueService);
    return { cart, item };
  },

  /**
   * Update the quantity of a cart item.
   * Recomputes total from the stored (server-verified) price.
   */
  async updateItemQuantity(cartId: string, itemId: string, quantity: number, storeId: string, customerId?: string, queueService?: QueueService) {
    const item = await cartRepo.findCartItemById(itemId, cartId);

    if (!item) {
      throw Object.assign(new Error('Cart item not found'), {
        code: ErrorCodes.CART_ITEM_NOT_FOUND,
      });
    }

    // Recompute total from stored (server-verified) price x new quantity
    const newTotal = multiplyDecimalByInt(item.price, quantity);
    const updated = await cartRepo.updateCartItem(itemId, {
      quantity,
      total: newTotal,
    });

    await cartService.recalculateTotals(cartId);

    const cart = await cartRepo.findCartById(cartId, storeId);
    await scheduleAbandonedCartRecovery(cartId, storeId, customerId, queueService);
    return { cart, item: updated };
  },

  /**
   * Remove an item from the cart.
   */
  async removeItem(cartId: string, itemId: string, storeId: string) {
    await cartRepo.deleteCartItem(itemId, cartId);
    await cartService.recalculateTotals(cartId);

    const cart = await cartRepo.findCartById(cartId, storeId);
    return { cart };
  },
};