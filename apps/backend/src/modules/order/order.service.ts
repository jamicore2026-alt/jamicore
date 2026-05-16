// Order service — business logic, domain errors, transaction orchestration.
// Calls orderRepo for all DB operations. Imports db ONLY for db.transaction().
import crypto from 'node:crypto';
import { db } from '../../db/index.js';
import { orders } from '../../db/schema.js';
import { ErrorCodes } from '../../errors/codes.js';
import { orderRepo } from './order.repo.js';
import { productRepo } from '../product/product.repo.js';
import { webhookService } from '../webhook/webhook.service.js';
import { notificationService } from '../notifications/notifications.service.js';
import { superAdminService } from '../superAdmin/superAdmin.service.js';

export function generateOrderNumber(): string {
  const prefix = Date.now().toString(36).toUpperCase();
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

export const orderService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number; status?: string; search?: string; dateFrom?: string; dateTo?: string }): Promise<{ data: Awaited<ReturnType<typeof orderRepo.findByStoreId>>['data']; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const { data, total } = await orderRepo.findByStoreId(storeId, {
      page, limit,
      status: opts?.status,
      search: opts?.search,
      dateFrom: opts?.dateFrom ? new Date(opts.dateFrom) : undefined,
      dateTo: opts?.dateTo ? new Date(opts.dateTo) : undefined,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findByCustomerId(storeId: string, customerId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const { data, total } = await orderRepo.findByCustomerId(storeId, customerId, { page, limit });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(orderId: string, storeId: string): Promise<NonNullable<Awaited<ReturnType<typeof orderRepo.findById>>>> {
    const order = await orderRepo.findById(orderId, storeId);

    if (!order) {
      throw Object.assign(new Error('Order not found'), {
        code: ErrorCodes.ORDER_NOT_FOUND,
      });
    }

    return order;
  },

  async create(data: {
    storeId: string;
    customerId?: string;
    email: string;
    phone?: string;
    currency: string;
    subtotal: string;
    tax?: string;
    shipping?: string;
    discount?: string;
    total: string;
    items: Array<{
      productId: string;
      productTitle: string;
      productImage?: string;
      variantName?: string;
      variantId?: string;
      quantity: number;
      price: string;
      total: string;
      modifiers?: unknown;
    }>;
    cartId?: string;
    billingAddress?: Partial<typeof orders.$inferInsert>;
    shippingAddress?: Partial<typeof orders.$inferInsert>;
    paymentMethod?: string;
    couponId?: string;
    couponCode?: string;
    notes?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const MAX_RETRIES = 3;
    let result;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const orderNumber = generateOrderNumber();
      try {
        result = await db.transaction(async (tx) => {
          // Create the order
          const order = await orderRepo.insertOrder({
            storeId: data.storeId,
            customerId: data.customerId,
            orderNumber,
            email: data.email,
            phone: data.phone,
            currency: data.currency,
            subtotal: data.subtotal,
            tax: data.tax,
            shipping: data.shipping,
            discount: data.discount,
            total: data.total,
            billingName: data.billingAddress?.billingName,
            billingFirstName: data.billingAddress?.billingFirstName,
            billingLastName: data.billingAddress?.billingLastName,
            billingAddressLine1: data.billingAddress?.billingAddressLine1,
            billingAddressLine2: data.billingAddress?.billingAddressLine2,
            billingCity: data.billingAddress?.billingCity,
            billingState: data.billingAddress?.billingState,
            billingCountry: data.billingAddress?.billingCountry,
            billingPostalCode: data.billingAddress?.billingPostalCode,
            shippingName: data.shippingAddress?.shippingName,
            shippingFirstName: data.shippingAddress?.shippingFirstName,
            shippingLastName: data.shippingAddress?.shippingLastName,
            shippingAddressLine1: data.shippingAddress?.shippingAddressLine1,
            shippingAddressLine2: data.shippingAddress?.shippingAddressLine2,
            shippingCity: data.shippingAddress?.shippingCity,
            shippingState: data.shippingAddress?.shippingState,
            shippingCountry: data.shippingAddress?.shippingCountry,
            shippingPostalCode: data.shippingAddress?.shippingPostalCode,
            paymentMethod: data.paymentMethod,
            couponId: data.couponId,
            couponCode: data.couponCode,
            notes: data.notes,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          }, tx);

          // Create order items
          if (data.items.length > 0) {
            await orderRepo.insertOrderItems(
              data.items.map((item) => ({
                orderId: order.id,
                storeId: data.storeId,
                productId: item.productId,
                productTitle: item.productTitle,
                productImage: item.productImage,
                variantName: item.variantName,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                modifiers: item.modifiers as typeof import('../../db/schema.js').orderItems.$inferInsert extends { modifiers: infer M } ? M : never,
              })),
              tx,
            );
          }

          // Atomic variant-level + product-level inventory decrement
          for (const item of data.items) {
            if (item.variantId) {
              const variantResult = await productRepo.decrementVariantOptionStock(
                item.variantId,
                data.storeId,
                item.quantity,
                tx,
              );
              if (variantResult.length === 0) {
                throw Object.assign(new Error('Insufficient variant inventory'), {
                  code: ErrorCodes.INSUFFICIENT_INVENTORY,
                });
              }
            }

            const productResult = await orderRepo.decrementInventory(
              item.productId,
              data.storeId,
              item.quantity,
              tx,
            );

            if (productResult.length === 0) {
              throw Object.assign(new Error('Insufficient inventory'), {
                code: ErrorCodes.INSUFFICIENT_INVENTORY,
              });
            }
          }

          // Clear the cart if cartId is provided
          if (data.cartId) {
            await orderRepo.deleteCartItems(data.cartId, tx);
            await orderRepo.resetCartTotals(data.cartId, tx);
          }

          // Atomically increment coupon usage with limit check inside transaction
          if (data.couponId) {
            const couponResult = await orderRepo.incrementCouponUsage(
              data.couponId,
              data.customerId,
              order.id,
              data.storeId,
              tx,
            );

            if (couponResult.length === 0) {
              throw Object.assign(new Error('Coupon usage limit reached'), {
                code: ErrorCodes.COUPON_USAGE_EXCEEDED,
              });
            }
          }

          return order;
        });
        break;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error(String(err));
        const pgErr = e as Error & { code?: string; constraint?: string };
        if (pgErr.code === '23505' && pgErr.constraint === 'orders_order_number_unique') {
          if (attempt === MAX_RETRIES - 1) throw err;
          continue;
        }
        throw err;
      }
    }

    if (!result) {
      throw new Error('Order creation failed after retries');
    }

    // Fire webhook async (fire-and-forget)
    webhookService.dispatchWebhook('order.created', { orderId: result.id, orderNumber: result.orderNumber, total: result.total }, data.storeId).catch(() => {});

    // Notify merchant of new order (fire-and-forget)
    notificationService.createNotification({
      storeId: data.storeId,
      type: 'order',
      title: 'New Order Received',
      body: `Order ${result.orderNumber} for ${data.total} ${data.currency}`,
    }).catch(() => {});

    // Notify super admins of new order (fire-and-forget)
    superAdminService.createNotification({
      type: 'order',
      title: 'New Order Received',
      body: `Store received order ${result.orderNumber} for ${data.total} ${data.currency}`,
      targetStoreId: data.storeId,
    }).catch(() => {});

    return this.findById(result.id, data.storeId);
  },

  async updateStatus(orderId: string, storeId: string, status: string): Promise<typeof orders.$inferSelect | undefined> {
    const order = await orderRepo.findByIdSimple(orderId, storeId);

    if (!order) {
      throw Object.assign(new Error('Order not found'), {
        code: ErrorCodes.ORDER_NOT_FOUND,
      });
    }

    if (order.status === 'cancelled') {
      throw Object.assign(new Error('Order is already cancelled'), {
        code: ErrorCodes.ORDER_CANCELLED,
      });
    }

    if (order.paymentStatus === 'paid' && status === 'cancelled') {
      throw Object.assign(new Error('Cannot cancel a paid order'), {
        code: ErrorCodes.ORDER_ALREADY_PAID,
      });
    }

    if (order.fulfillmentStatus === 'fulfilled' && status === 'cancelled') {
      throw Object.assign(new Error('Cannot cancel a fulfilled order'), {
        code: ErrorCodes.ORDER_ALREADY_FULFILLED,
      });
    }

    const updateData: Partial<typeof orders.$inferInsert> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'shipped') {
      updateData.shippedAt = new Date();
      updateData.fulfillmentStatus = 'shipped';
    }

    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      updateData.fulfillmentStatus = 'fulfilled';
    }

    if (status === 'cancelled') {
      // Restore product quantities for cancelled order (within store tenant)
      const items = await orderRepo.findOrderItems(orderId);

      const updated = await db.transaction(async (tx) => {
        for (const item of items) {
          if (item.productId) {
            await orderRepo.restoreInventory(
              item.productId,
              storeId,
              item.quantity,
              tx,
            );
          }
        }

        return orderRepo.updateOrder(orderId, storeId, updateData, tx);
      });

      return updated;
    }

    return orderRepo.updateOrder(orderId, storeId, updateData);
  },
};