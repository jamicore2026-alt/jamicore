// Return service — business logic and orchestration
import { returns, returnItems, orderItems } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { returnRepo } from './return.repo.js';
import { orderRepo } from '../order/order.repo.js';
import { productRepo } from '../product/product.repo.js';
import { refundService } from '../payment/payment.refund.service.js';
import * as paymentRepo from '../payment/payment.repo.js';
import { toCents, fromCents, multiplyDecimalByInt } from '../../lib/decimal.js';
import { ErrorCodes } from '../../errors/codes.js';
import { withTenant } from '../../lib/withTenant.js';

type ReturnStatus = 'requested' | 'approved' | 'received' | 'inspected' | 'refunded' | 'rejected' | 'cancelled';

export const returnService = {
  async createReturn(data: {
    storeId: string;
    orderId: string;
    customerId?: string;
    reason: string;
    notes?: string;
    items: { orderItemId: string; quantity: number; reason?: string; condition?: string }[];
  }) {
    return withTenant(data.storeId, async (tx) => {
      const order = await orderRepo.findById(data.orderId, data.storeId, tx);
      if (!order) {
        throw Object.assign(new Error('Order not found'), { code: ErrorCodes.ORDER_NOT_FOUND });
      }
      if (data.customerId && order.customerId !== data.customerId) {
        throw Object.assign(new Error('Order does not belong to customer'), { code: ErrorCodes.RETURN_UNAUTHORIZED });
      }
      if (order.status === 'cancelled') {
        throw Object.assign(new Error('Order is cancelled'), { code: ErrorCodes.ORDER_CANCELLED });
      }
      if (!['fulfilled', 'delivered'].includes(order.status)) {
        throw Object.assign(new Error('Order must be fulfilled before requesting a return'), {
          code: ErrorCodes.ORDER_NOT_FULFILLED,
        });
      }

      // C2: Validate orderItemIds belong to the target order
      const validOrderItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, data.orderId));
      const validOrderItemIds = new Set(validOrderItems.map((oi) => oi.id));
      for (const item of data.items) {
        if (!validOrderItemIds.has(item.orderItemId)) {
          throw Object.assign(
            new Error('Order item does not belong to this order'),
            { code: ErrorCodes.VALIDATION_ERROR },
          );
        }
      }

      // C3: Validate return quantity does not exceed purchased quantity
      const existingReturns = await tx.select({ id: returns.id }).from(returns).where(eq(returns.orderId, data.orderId));
      const alreadyReturnedMap = new Map<string, number>();
      for (const ret of existingReturns) {
        const existingItems = await tx
          .select({ orderItemId: returnItems.orderItemId, quantity: returnItems.quantity })
          .from(returnItems)
          .where(eq(returnItems.returnId, ret.id));
        for (const item of existingItems) {
          alreadyReturnedMap.set(item.orderItemId, (alreadyReturnedMap.get(item.orderItemId) ?? 0) + item.quantity);
        }
      }

      const orderItemMap = new Map(validOrderItems.map((oi) => [oi.id, oi]));
      for (const item of data.items) {
        const orderItem = orderItemMap.get(item.orderItemId);
        if (!orderItem) continue;
        const alreadyReturned = alreadyReturnedMap.get(item.orderItemId) ?? 0;
        if (alreadyReturned + item.quantity > orderItem.quantity) {
          throw Object.assign(
            new Error(`Return quantity exceeds purchased quantity for order item ${item.orderItemId}`),
            { code: ErrorCodes.VALIDATION_ERROR },
          );
        }
      }

      const ret = await returnRepo.create({
        storeId: data.storeId,
        orderId: data.orderId,
        customerId: data.customerId,
        status: 'requested',
        reason: data.reason,
        notes: data.notes,
      }, tx);

      for (const item of data.items) {
        await returnRepo.createItem({
          returnId: ret.id,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          reason: item.reason,
          condition: item.condition,
        }, tx);
      }

      return returnRepo.findByIdWithItems(ret.id, data.storeId, tx);
    });
  },

  async updateStatus(returnId: string, storeId: string, newStatus: ReturnStatus, adminNotes?: string) {
    const ret = await returnRepo.findById(returnId, storeId);
    if (!ret) {
      throw Object.assign(new Error('Return not found'), { code: ErrorCodes.RETURN_NOT_FOUND });
    }

    const validTransitions: Record<ReturnStatus, ReturnStatus[]> = {
      requested: ['approved', 'rejected', 'cancelled'],
      approved: ['received', 'cancelled'],
      received: ['inspected'],
      inspected: ['refunded', 'rejected'],
      rejected: [],
      refunded: [],
      cancelled: [],
    };

    if (!validTransitions[ret.status as ReturnStatus]?.includes(newStatus)) {
      throw Object.assign(
        new Error(`Invalid status transition from ${ret.status} to ${newStatus}`),
        { code: ErrorCodes.RETURN_INVALID_STATUS },
      );
    }

    const extra: Partial<typeof returns.$inferInsert> = {};
    if (adminNotes) extra.adminNotes = adminNotes;
    if (newStatus === 'received') extra.receivedAt = new Date();
    if (newStatus === 'inspected') extra.inspectedAt = new Date();
    if (newStatus === 'refunded') extra.refundedAt = new Date();

    // M4: 'refunded' must actually issue the provider refund + restore inventory.
    // The prior implementation only stamped `refundedAt` — the customer was never
    // refunded and the stock was never restored.
    if (newStatus === 'refunded') {
      return processRefund(returnId, storeId);
    }

    return returnRepo.updateStatus(returnId, storeId, newStatus, extra);
  },

  async listReturns(storeId: string, opts?: { page?: number; limit?: number; status?: string; customerId?: string }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const result = await withTenant(storeId, (tx) =>
      returnRepo.findByStore(storeId, page, limit, opts?.status, opts?.customerId, tx),
    );
    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  },

  async getReturn(id: string, storeId: string) {
    const ret = await withTenant(storeId, (tx) => returnRepo.findByIdWithItems(id, storeId, tx));
    if (!ret) {
      throw Object.assign(new Error('Return not found'), { code: ErrorCodes.RETURN_NOT_FOUND });
    }
    return ret;
  },
};

/**
 * M4: Issue a provider refund (for card payments) and restore inventory for the
 * returned items, then atomically transition the return inspected → refunded.
 *
 * - Card payments (stripe/razorpay): call the provider refund API with a
 *   return-derived idempotency key (`refund-<returnId>`) so a retry after a
 *   crash cannot double-refund. The API call happens OUTSIDE the DB transaction
 *   to avoid holding a lock across network I/O.
 * - COD / no completed payment on file: skip the provider refund (COD refunds
 *   are manual; an order with no payment record has nothing to refund) but still
 *   restore inventory.
 *
 * Inventory restore runs in the SAME tx as the status transition, and AFTER
 * the atomic `transitionStatus(inspected → refunded)` guard: only the call that
 * wins the transition restores stock. A concurrent duplicate (0 rows) returns
 * the current row without re-restoring, so inventory is never restored twice.
 */
async function processRefund(returnId: string, storeId: string) {
  const ret = await withTenant(storeId, (tx) => returnRepo.findByIdWithItems(returnId, storeId, tx));
  if (!ret) {
    throw Object.assign(new Error('Return not found'), { code: ErrorCodes.RETURN_NOT_FOUND });
  }

  const orderId = ret.orderId;
  const refundAmount = computeRefundAmount(ret.items);

  // Only card (non-COD) completed payments need a provider API call.
  const completed = await paymentRepo.findCompletedPaymentByOrderId(orderId, storeId);
  // P1-M4: persist the refund amount + provider refund id on the return so
  // cumulative refund tracking (refundService sums returns.refundAmount) stays
  // accurate for future refunds on the same order.
  const refundMethod = completed?.provider ?? null;
  let providerRefundId: string | null = null;
  if (completed && completed.provider !== 'cod' && refundAmount) {
    // Outside the tx: network call to the provider. A throw here leaves the
    // return in 'inspected' so the merchant can retry the refund safely.
    const res = await refundService.refundPayment(storeId, orderId, refundAmount, `refund-${returnId}`);
    providerRefundId = res.refundId ?? null;
  }

  return withTenant(storeId, async (tx) => {
    // M4: claim the inspected→refunded transition FIRST. Only the call that wins
    // this atomic conditional proceeds to restore inventory; a concurrent
    // duplicate (0 rows) returns the current row WITHOUT re-restoring, so stock
    // is never restored twice. The prior ordering restored BEFORE this guard, so
    // both concurrent calls committed their restore → double stock inflate.
    const refunded = await returnRepo.transitionStatus(
      returnId,
      storeId,
      'inspected',
      'refunded',
      {
        refundedAt: new Date(),
        refundAmount,
        refundMethod: refundMethod ?? undefined,
        refundTransactionId: providerRefundId ?? undefined,
      },
      tx,
    );

    // Idempotent: a concurrent call already moved it out of 'inspected'.
    if (!refunded) {
      // returns has no RLS this phase; reads fine on bare db.
      return returnRepo.findById(returnId, storeId) ?? undefined;
    }

    // Winner: restore inventory for each returned item (within store tenant).
    // The decrement-at-payment path decrements BOTH variant-option stock (when
    // the order item has a variantId) AND product-level currentQuantity, so the
    // refund must restore both — restoring only the product left variant-option
    // stock permanently decremented, so returned variants drifted to
    // out-of-stock over time.
    for (const item of ret.items) {
      const productId = item.orderItem?.productId;
      const variantId = item.orderItem?.variantId;
      if (variantId) {
        await productRepo.restoreVariantOptionStock(variantId, storeId, item.quantity, tx);
      }
      if (productId) {
        await orderRepo.restoreInventory(productId, storeId, item.quantity, tx);
      }
    }
    return refunded;
  });
}

/**
 * Sum the returned-line totals from the return items (each item carries the
 * returned quantity and its parent order item's unit price). Uses integer-cent
 * math to avoid float rounding errors on money.
 */
function computeRefundAmount(
  items: Array<{ quantity: number; orderItem?: { price: string | null } | null }>,
): string {
  let totalCents = 0;
  for (const item of items) {
    const unitPrice = item.orderItem?.price ?? '0';
    totalCents += toCents(multiplyDecimalByInt(unitPrice, item.quantity));
  }
  return fromCents(totalCents);
}
