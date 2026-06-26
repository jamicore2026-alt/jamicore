// Payment webhook + status — handleWebhook, getPaymentStatus, findProviderByStoreId.
// Also exports signature verification helpers (used by route handlers).
import crypto from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import { db } from '../../db/index.js';
import { payments } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';
import { orderRepo } from '../order/order.repo.js';
import { productRepo } from '../product/product.repo.js';
import { decryptConfig } from '../../lib/encryption.js';
import * as repo from './payment.repo.js';

export const webhookService = {
  // ─── Webhook dispatch ───

  async handleWebhook(
    provider: string,
    payload: Record<string, unknown>,
    signature: string,
    rawBody: string,
    storeId: string,
    logger?: FastifyBaseLogger,
  ) {
    if (provider === 'razorpay') {
      return handleRazorpayWebhook(payload, signature, rawBody, storeId, logger);
    }
    if (provider === 'stripe') {
      return handleStripeWebhook(payload, signature, rawBody, storeId, logger);
    }
    throw Object.assign(new Error(`Unsupported webhook provider: ${provider}`), {
      code: ErrorCodes.PAYMENT_FAILED,
    });
  },

  // ─── Payment status ───

  async getPaymentStatus(orderId: string, storeId: string) {
    const order = await orderRepo.findByIdSimple(orderId, storeId);
    if (!order) {
      throw Object.assign(new Error('Order not found'), {
        code: ErrorCodes.ORDER_NOT_FOUND,
      });
    }

    const payment = await repo.findPaymentByOrderId(orderId, storeId);
    return {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      payment: payment
        ? {
            id: payment.id,
            provider: payment.provider,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            providerPaymentId: payment.providerPaymentId,
            createdAt: payment.createdAt,
          }
        : null,
    };
  },

  // ─── Provider lookup for webhooks (internal) ───

  async findProviderByStoreId(storeId: string, provider: string) {
    const row = await repo.findProvider(storeId, provider);
    if (!row) return null;
    return {
      ...row,
      config: decryptConfig(row.config),
    };
  },
};

// ─── Razorpay webhook ───

async function handleRazorpayWebhook(
  payload: Record<string, unknown>,
  signature: string,
  rawBody: string,
  storeId: string,
  logger?: FastifyBaseLogger,
) {
  // Defense-in-depth: verify webhook signature in the service layer
  const providerConfig = await repo.findProvider(storeId, 'razorpay');
  if (!providerConfig?.config) {
    throw Object.assign(new Error('Razorpay provider config not found'), {
      code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED,
    });
  }
  const config = providerConfig.config as Record<string, string>;
  if (typeof config.webhook_secret !== 'string' || config.webhook_secret.length === 0) {
    throw Object.assign(new Error('Razorpay webhook secret not configured'), {
      code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED,
    });
  }
  const isValid = verifyRazorpaySignature(rawBody, signature, config.webhook_secret);
  if (!isValid) {
    throw Object.assign(new Error('Invalid Razorpay webhook signature'), {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Razorpay webhook payload has: entity, event, contains, etc.
  const event = payload.event as string;
  const payloadData = payload.payload as Record<string, unknown> | undefined;
  const paymentEntity = payloadData?.payment
    ? (payloadData.payment as Record<string, unknown>).entity as Record<string, unknown> | undefined
    : undefined;

  if (event === 'payment.captured' && paymentEntity) {
    const razorpayOrderId = paymentEntity.order_id as string;
    const razorpayPaymentId = paymentEntity.id as string;

    // Find the payment by providerPaymentId (razorpay order id) and storeId for isolation
    const payment = await db.query.payments.findFirst({
      where: and(eq(payments.providerPaymentId, razorpayOrderId), eq(payments.storeId, storeId)),
    });

    if (!payment) {
      throw Object.assign(new Error('Payment not found for Razorpay order'), {
        code: ErrorCodes.ORDER_NOT_FOUND,
      });
    }

    // CRITICAL: verify store isolation
    if (payment.storeId !== storeId) {
      throw Object.assign(new Error('Payment storeId mismatch'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    if (payment.status === 'completed') {
      return { received: true }; // Already processed — idempotent (fast path)
    }

    await db.transaction(async (tx) => {
      // M3: atomic status transition — only completes if not already completed.
      // 0 rows = a concurrent webhook already completed this payment; skip the
      // order/inventory writes so duplicates can never double-decrement stock.
      const updated = await repo.transitionPaymentToCompleted(
        payment.id,
        payment.storeId,
        { providerPaymentId: razorpayPaymentId },
        tx,
      );
      if (!updated) {
        return; // idempotent — already completed by a concurrent webhook
      }

      await orderRepo.updateOrder(payment.orderId, payment.storeId, {
        paymentStatus: 'paid',
        updatedAt: new Date(),
      }, tx);

      // Decrement inventory atomically with payment status update.
      // M2: the conditional UPDATE returns 0 rows when stock is gone (oversell).
      // The customer has already been charged, so we MUST still complete the
      // payment — we surface the oversell via a warning for manual handling
      // instead of silently no-op'ing (the prior bug) or throwing (which would
      // make the provider retry forever and leave the customer with no order).
      const items = await orderRepo.findOrderItemsByOrderId(payment.orderId, payment.storeId);
      for (const item of items) {
        if (item.variantId) {
          const dec = await productRepo.decrementVariantOptionStock(
            item.variantId,
            payment.storeId,
            item.quantity,
            tx,
          );
          if (dec.length === 0) {
            logger?.warn(
              { storeId: payment.storeId, orderId: payment.orderId, variantId: item.variantId, quantity: item.quantity },
              'Oversell at webhook: variant out of stock — payment completed, inventory not decremented',
            );
          }
        }
        if (item.productId) {
          const dec = await orderRepo.decrementInventory(
            item.productId,
            payment.storeId,
            item.quantity,
            tx,
          );
          if (dec.length === 0) {
            logger?.warn(
              { storeId: payment.storeId, orderId: payment.orderId, productId: item.productId, quantity: item.quantity },
              'Oversell at webhook: product out of stock — payment completed, inventory not decremented',
            );
          }
        }
      }
    });
  }

  return { received: true };
}

// ─── Stripe webhook ───

async function handleStripeWebhook(
  payload: Record<string, unknown>,
  signature: string,
  rawBody: string,
  storeId: string,
  logger?: FastifyBaseLogger,
) {
  // Defense-in-depth: verify webhook signature in the service layer
  const providerConfig = await repo.findProvider(storeId, 'stripe');
  if (!providerConfig?.config) {
    throw Object.assign(new Error('Stripe provider config not found'), {
      code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED,
    });
  }
  const config = providerConfig.config as Record<string, string>;
  if (typeof config.webhook_secret !== 'string' || config.webhook_secret.length === 0) {
    throw Object.assign(new Error('Stripe webhook secret not configured'), {
      code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED,
    });
  }
  const isValid = verifyStripeSignature(rawBody, signature, config.webhook_secret);
  if (!isValid) {
    throw Object.assign(new Error('Invalid Stripe webhook signature'), {
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  const type = payload.type as string;
  const dataObject = (payload.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;

  if (type === 'payment_intent.succeeded' && dataObject) {
    const stripePaymentIntentId = dataObject.id as string;

    const payment = await db.query.payments.findFirst({
      where: and(eq(payments.providerPaymentId, stripePaymentIntentId), eq(payments.storeId, storeId)),
    });

    if (!payment) {
      throw Object.assign(new Error('Payment not found for Stripe intent'), {
        code: ErrorCodes.ORDER_NOT_FOUND,
      });
    }

    // CRITICAL: verify store isolation
    if (payment.storeId !== storeId) {
      throw Object.assign(new Error('Payment storeId mismatch'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    if (payment.status === 'completed') {
      return { received: true }; // Already processed — idempotent (fast path)
    }

    await db.transaction(async (tx) => {
      // M3: atomic status transition — only completes if not already completed.
      // 0 rows = a concurrent webhook already completed this payment; skip the
      // order/inventory writes so duplicates can never double-decrement stock.
      const updated = await repo.transitionPaymentToCompleted(
        payment.id,
        payment.storeId,
        {},
        tx,
      );
      if (!updated) {
        return; // idempotent — already completed by a concurrent webhook
      }

      await orderRepo.updateOrder(payment.orderId, payment.storeId, {
        paymentStatus: 'paid',
        updatedAt: new Date(),
      }, tx);

      // Decrement inventory atomically with payment status update.
      // M2: detect 0-row oversell and warn (customer already charged — do not
      // throw, or the provider would retry forever and the customer would lose
      // their order with no restoration path).
      const items = await orderRepo.findOrderItemsByOrderId(payment.orderId, payment.storeId);
      for (const item of items) {
        if (item.variantId) {
          const dec = await productRepo.decrementVariantOptionStock(
            item.variantId,
            payment.storeId,
            item.quantity,
            tx,
          );
          if (dec.length === 0) {
            logger?.warn(
              { storeId: payment.storeId, orderId: payment.orderId, variantId: item.variantId, quantity: item.quantity },
              'Oversell at webhook: variant out of stock — payment completed, inventory not decremented',
            );
          }
        }
        if (item.productId) {
          const dec = await orderRepo.decrementInventory(
            item.productId,
            payment.storeId,
            item.quantity,
            tx,
          );
          if (dec.length === 0) {
            logger?.warn(
              { storeId: payment.storeId, orderId: payment.orderId, productId: item.productId, quantity: item.quantity },
              'Oversell at webhook: product out of stock — payment completed, inventory not decremented',
            );
          }
        }
      }
    });
  }

  return { received: true };
}

// ─── Webhook signature verification (exported for route handlers) ───

export function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

export function verifyStripeSignature(
  payload: string,
  signature: string,
  webhookSecret: string,
): boolean {
  // Stripe signature format: t=timestamp,v1=signature
  const parts = signature.split(',');
  let timestamp = '';
  let v1Sig = '';
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') v1Sig = value;
  }

  if (!timestamp || !v1Sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(v1Sig),
    );
  } catch {
    return false;
  }
}
