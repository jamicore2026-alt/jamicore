// Cart service — business logic, domain errors, cart computation.
// Calls cartRepo for all DB operations. Uses pricingService for price verification.
//
// RLS Phase 1 prep: every carts/cart_items DB operation runs inside
// withTenant(storeId, fn), which opens a transaction on the app_tenant client
// with `app.tenant_id` set transaction-locally. Under RLS-off (today) this is a
// no-op for non-RLS tables; under RLS-on it ensures every query is scoped to the
// tenant. Queue/provider calls (scheduleAbandonedCartRecovery) stay OUTSIDE the
// withTenant tx so a Redis hiccup doesn't roll back the cart write.
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';
import { multiplyDecimalByInt } from '../../lib/decimal.js';
import { cartRepo } from './cart.repo.js';
import { productRepo } from '../product/product.repo.js';
import { pricingService } from '../pricing/pricing.service.js';
import { sanitizePublicProduct } from '../product/product.service.js';
import type { QueueService } from '../../services/queue.service.js';

// Derive the cart-item insert shape from the repo's batch-insert parameter,
// so this file no longer needs a value import of the `cartItems` schema table
// (only the inline SQL aggregate used it, and that has been replaced by
// cartRepo.recalculateCartTotalsInDb).
type CartItemInsert = Parameters<typeof cartRepo.insertCartItemsBatch>[0][number];

type CartLike = Record<string, unknown>;

/**
 * Strip merchant-internal fields from a cart item's nested product (and any
 * bundle.items[].product). Reuses sanitizePublicProduct so the rules stay in
 * one place. Non-mutating.
 */
export function sanitizePublicCartItem<T extends CartLike | undefined>(item: T): CartLike | undefined {
  if (!item) return item as undefined;
  const { storeId: _si, ...rest } = item;
  const out: CartLike = { ...rest };
  if (out.product && typeof out.product === 'object') {
    out.product = sanitizePublicProduct(out.product as CartLike);
  }
  if (out.bundle && typeof out.bundle === 'object') {
    const bundle = { ...(out.bundle as CartLike) };
    const { storeId: _bsi, ...bundleRest } = bundle;
    const bundleItems = (bundleRest as CartLike).items;
    if (Array.isArray(bundleItems)) {
      (bundleRest as CartLike).items = bundleItems.map((i: unknown) => {
        if (i && typeof i === 'object') {
          const { storeId: _isi, ...iRest } = i as CartLike;
          const o: CartLike = { ...iRest };
          if (o.product && typeof o.product === 'object') {
            o.product = sanitizePublicProduct(o.product as CartLike);
          }
          return o;
        }
        return i;
      });
    }
    out.bundle = bundleRest;
  }
  return out;
}

/**
 * Strip merchant-internal fields from a cart before returning it on a public
 * route. Removes the cart's storeId (tenant id), sessionId, customerId (customer
 * linkage), and the storeId on each item, and sanitizes every nested product
 * (item.product + item.bundle.items[].product) so merchant cost (purchasePrice)
 * does not leak. Non-mutating.
 */
export function sanitizePublicCart<T extends CartLike | undefined>(cart: T): CartLike | undefined {
  if (!cart) return cart as undefined;
  const { storeId: _si, sessionId: _se, customerId: _ci, ...rest } = cart;
  const out: CartLike = { ...rest };
  const items = out.items;
  if (Array.isArray(items)) {
    out.items = items.map((i: unknown) =>
      i && typeof i === 'object' ? sanitizePublicCartItem(i as CartLike) : i,
    );
  }
  return out;
}

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
   *
   * All carts/cart_items reads+writes run inside withTenant(storeId, fn) so
   * they ride the tenant-scoped transaction (RLS Phase 1 prep).
   */
  async getOrCreateCart(cartId: string | undefined, storeId: string) {
    return withTenant(storeId, async (tx) => {
      if (cartId) {
        const existingCart = await cartRepo.findCartById(cartId, storeId, tx);
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
      }, tx);

      return { cart: { ...newCart, items: [] }, isNew: true };
    });
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
   *   4. Batch-insert new items + batch-update existing matches (via UPDATE ... FROM (VALUES))
   *   5. Recalculate totals once (not per-item)
   *   6. Schedule abandoned-cart recovery once (not per-item) — OUTSIDE the tx
   *
   * RLS Phase 1 prep: the entire body runs inside withTenant(storeId, fn).
   * The previous inner db.transaction(...) wrapper is removed — its body runs
   * directly on the withTenant tx (no nested transaction / savepoint). The
   * abandoned-cart queue-add is hoisted out of the tx so a Redis failure does
   * not roll back the merge.
   */
  async mergeCartOnLogin(
    guestCartId: string,
    customerId: string,
    storeId: string,
    queueService?: QueueService,
  ) {
    const outcome = await withTenant(storeId, async (tx) => {
      const guestCart = await cartRepo.findCartById(guestCartId, storeId, tx);
      const customerCart = await cartRepo.findCartByCustomerId(customerId, storeId, tx);

      if (guestCart && customerCart) {
        const guestItems = guestCart.items || [];
        if (guestItems.length === 0) {
          await cartRepo.deleteCart(guestCartId, tx);
          return { scheduleFor: undefined as string | undefined };
        }

        // Step 1: batch-load all referenced products. (products have no RLS
        // this phase — findManyByIds has no tx param and stays bare.)
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
        const existingItems = await cartRepo.findCartItemsByCartId(customerCart.id, tx);

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

        const toInsert: CartItemInsert[] = [];
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

        // Step 4: batch write directly on the withTenant tx (NO inner
        // db.transaction — the withTenant tx is the atomicity boundary). If the
        // recalc or recovery fails after, the merge itself is already atomic.
        if (toInsert.length > 0) {
          await cartRepo.insertCartItemsBatch(toInsert, tx);
        }
        if (toIncrement.length > 0) {
          await cartRepo.incrementCartItemQuantities(toIncrement, tx);
        }
        // Recompute the merged cart's totals in one round-trip (replaces the
        // previous manual SELECT aggregate + updateCartTotals pair).
        await cartRepo.recalculateCartTotalsInDb(customerCart.id, tx);

        // Step 5: delete the guest cart on the same tx.
        await cartRepo.deleteCart(guestCartId, tx);

        return { scheduleFor: customerCart.id };
      } else if (guestCart && !customerCart) {
        await cartRepo.updateCartCustomerId(guestCartId, customerId, tx);
        // Original behavior: this branch (adopt guest cart as customer's first
        // cart) only reassigns ownership — it does NOT schedule abandoned-cart
        // recovery. The merge branch above schedules once after the merge
        // (spec §4.2 mandates behavior-identical). Keep scheduleFor undefined
        // so the post-withTenant guard does not fire.
        return { scheduleFor: undefined as string | undefined };
      }

      return { scheduleFor: undefined as string | undefined };
    });

    // Step 6: schedule abandoned-cart recovery once — OUTSIDE the withTenant
    // tx so a Redis failure does not roll back the merge.
    if (outcome.scheduleFor) {
      await scheduleAbandonedCartRecovery(outcome.scheduleFor, storeId, customerId, queueService);
    }
  },

  /**
   * Recalculate cart totals from the current cart items.
   * PERF-006: now a single SQL UPDATE that aggregates in the database
   * (was previously 3 round-trips: SELECT items → JS sum → UPDATE).
   *
   * RLS Phase 1 prep: runs inside withTenant(storeId, fn). Internal callers
   * (addItem/updateItemQuantity/removeItem) ride the same tx directly via
   * cartRepo.recalculateCartTotalsInDb(cartId, tx) to avoid a nested withTenant.
   */
  async recalculateTotals(storeId: string, cartId: string) {
    return withTenant(storeId, (tx) => cartRepo.recalculateCartTotalsInDb(cartId, tx));
  },

  /**
   * Add an item to the cart. Verifies price server-side via pricingService.
   * If the same product with identical modifiers already exists, increments quantity.
   * Returns the updated cart and the affected item.
   *
   * RLS Phase 1 prep: body runs inside withTenant(storeId, fn); the internal
   * recalc rides the same tx via cartRepo.recalculateCartTotalsInDb(cartId, tx)
   * (no nested withTenant). productRepo.findById (products, no RLS this phase)
   * stays bare. The abandoned-cart queue-add is hoisted out of the tx.
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
    const result = await withTenant(storeId, async (tx) => {
      // Verify product exists and has sufficient inventory.
      // (products have no RLS this phase — findById has no tx param and stays bare.)
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
      const existingItems = await cartRepo.findCartItemsByProductId(cartId, params.productId, tx);

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
        }, tx);

        // Ride the same tx (no nested withTenant).
        await cartRepo.recalculateCartTotalsInDb(cartId, tx);

        const cart = await cartRepo.findCartById(cartId, storeId, tx);
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
      }, tx);

      // Ride the same tx (no nested withTenant).
      await cartRepo.recalculateCartTotalsInDb(cartId, tx);

      const cart = await cartRepo.findCartById(cartId, storeId, tx);
      return { cart, item };
    });

    // Schedule abandoned-cart recovery OUTSIDE the withTenant tx.
    await scheduleAbandonedCartRecovery(cartId, storeId, customerId, queueService);
    return result;
  },

  /**
   * Update the quantity of a cart item.
   * Recomputes total from the stored (server-verified) price.
   *
   * RLS Phase 1 prep: body runs inside withTenant(storeId, fn); the internal
   * recalc rides the same tx. The abandoned-cart queue-add is hoisted out of the tx.
   */
  async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number,
    storeId: string,
    customerId?: string,
    queueService?: QueueService,
  ) {
    const result = await withTenant(storeId, async (tx) => {
      const item = await cartRepo.findCartItemById(itemId, cartId, tx);

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
      }, tx);

      // Ride the same tx (no nested withTenant).
      await cartRepo.recalculateCartTotalsInDb(cartId, tx);

      const cart = await cartRepo.findCartById(cartId, storeId, tx);
      return { cart, item: updated };
    });

    // Schedule abandoned-cart recovery OUTSIDE the withTenant tx.
    await scheduleAbandonedCartRecovery(cartId, storeId, customerId, queueService);
    return result;
  },

  /**
   * Remove an item from the cart.
   *
   * RLS Phase 1 prep: body runs inside withTenant(storeId, fn); the internal
   * recalc rides the same tx.
   */
  async removeItem(cartId: string, itemId: string, storeId: string) {
    return withTenant(storeId, async (tx) => {
      await cartRepo.deleteCartItem(itemId, cartId, tx);
      // Ride the same tx (no nested withTenant).
      await cartRepo.recalculateCartTotalsInDb(cartId, tx);

      const cart = await cartRepo.findCartById(cartId, storeId, tx);
      return { cart };
    });
  },
};