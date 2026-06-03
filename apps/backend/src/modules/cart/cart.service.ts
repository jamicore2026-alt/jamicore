// Cart service — business logic, domain errors, cart computation.
// Calls cartRepo for all DB operations. Uses pricingService for price verification.
import { ErrorCodes } from '../../errors/codes.js';
import { multiplyDecimalByInt } from '../../lib/decimal.js';
import { cartRepo } from './cart.repo.js';
import { productRepo } from '../product/product.repo.js';
import { pricingService } from '../pricing/pricing.service.js';
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
      for (const item of guestCart.items || []) {
        const modifiers = typeof item.modifiers === 'string'
          ? JSON.parse(item.modifiers)
          : (item.modifiers || {});
        await cartService.addItem(customerCart.id, storeId, {
          productId: item.productId,
          quantity: item.quantity,
          bundleId: item.bundleId || undefined,
          variantOptionIds: modifiers.variantOptionIds,
          combinationKey: modifiers.combinationKey,
          modifierOptionIds: modifiers.modifierOptionIds,
        }, customerId, queueService);
      }
      await cartRepo.deleteCart(guestCartId);
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