// Return service — business logic and orchestration
import { db } from '../../db/index.js';
import { returns, returnItems, orderItems } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { returnRepo } from './return.repo.js';
import { orderRepo } from '../order/order.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

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
    return db.transaction(async (tx) => {
      const order = await orderRepo.findById(data.orderId, data.storeId);
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

      return returnRepo.findByIdWithItems(ret.id, tx);
    });
  },

  async updateStatus(returnId: string, storeId: string, newStatus: ReturnStatus, adminNotes?: string) {
    const ret = await returnRepo.findById(returnId);
    if (!ret || ret.storeId !== storeId) {
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

    return returnRepo.updateStatus(returnId, storeId, newStatus, extra);
  },

  async listReturns(storeId: string, opts?: { page?: number; limit?: number; status?: string; customerId?: string }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const result = await returnRepo.findByStore(storeId, page, limit, opts?.status, opts?.customerId);
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
    const ret = await returnRepo.findByIdWithItems(id);
    if (!ret || ret.storeId !== storeId) {
      throw Object.assign(new Error('Return not found'), { code: ErrorCodes.RETURN_NOT_FOUND });
    }
    return ret;
  },
};
