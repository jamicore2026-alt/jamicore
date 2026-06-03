// Payment intent — createPaymentIntent (COD, Razorpay, Stripe flows).
import { db } from '../../db/index.js';
import { ErrorCodes } from '../../errors/codes.js';
import { orderRepo } from '../order/order.repo.js';
import * as repo from './payment.repo.js';
import { toCents } from '../../lib/decimal.js';
import { generateIdempotencyKey } from './payment.helpers.js';
import { webhookService } from './payment.webhook.service.js';

export const intentService = {
  async createPaymentIntent(
    storeId: string,
    orderId: string,
    provider: string,
    idempotencyKey?: string,
  ) {
    // Verify the order exists and is in pending status
    const order = await orderRepo.findByIdSimple(orderId, storeId);
    if (!order) {
      throw Object.assign(new Error('Order not found'), {
        code: ErrorCodes.ORDER_NOT_FOUND,
      });
    }
    if (order.status !== 'pending') {
      throw Object.assign(new Error('Order is not in pending status'), {
        code: ErrorCodes.PAYMENT_ALREADY_PROCESSED,
      });
    }
    if (order.paymentStatus === 'paid') {
      throw Object.assign(new Error('Payment already completed for this order'), {
        code: ErrorCodes.PAYMENT_ALREADY_PROCESSED,
      });
    }

    // Check for existing processing payment to prevent duplicate intents
    const existing = await repo.findPaymentByOrderId(orderId, storeId);
    if (existing && existing.status === 'processing') {
      return existing;
    }
    if (existing && existing.status === 'completed') {
      throw Object.assign(new Error('Order already paid'), {
        code: ErrorCodes.PAYMENT_ALREADY_PROCESSED,
      });
    }

    // Verify the provider is enabled for this store
    const providerConfig = await webhookService.findProviderByStoreId(storeId, provider);
    if (!providerConfig || !providerConfig.isEnabled) {
      throw Object.assign(new Error(`Payment provider ${provider} is not enabled`), {
        code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED,
      });
    }

    const config = providerConfig.config;
    if (!config) {
      throw Object.assign(new Error('Payment provider config not available'), {
        code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED,
      });
    }
    const iKey = idempotencyKey || generateIdempotencyKey();

    // For COD: create payment record as completed immediately
    if (provider === 'cod') {
      const result = await db.transaction(async (tx) => {
        const payment = await repo.insertPayment({
          storeId,
          orderId,
          provider: 'cod',
          status: 'completed',
          amount: order.total,
          currency: order.currency,
          idempotencyKey: iKey,
        }, tx);

        // Update order payment status
        await orderRepo.updateOrder(orderId, storeId, {
          paymentStatus: 'paid',
          paymentMethod: 'cod',
          updatedAt: new Date(),
        }, tx);

        return payment;
      });

      return {
        paymentId: result.id,
        provider: 'cod',
        status: 'completed',
        amount: result.amount,
        currency: result.currency,
      };
    }

    // For Razorpay: call Razorpay Orders API
    if (provider === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder(
        config,
        order.total,
        order.currency === 'INR' ? 'INR' : 'USD',
        iKey,
        orderId,
      );

      const result = await db.transaction(async (tx) => {
        const payment = await repo.insertPayment({
          storeId,
          orderId,
          provider: 'razorpay',
          providerPaymentId: razorpayOrder.id,
          status: 'processing',
          amount: order.total,
          currency: order.currency,
          idempotencyKey: iKey,
        }, tx);

        // Update order payment method
        await orderRepo.updateOrder(orderId, storeId, {
          paymentMethod: 'razorpay',
          updatedAt: new Date(),
        }, tx);

        return payment;
      });

      return {
        paymentId: result.id,
        provider: 'razorpay',
        status: 'processing',
        amount: result.amount,
        currency: result.currency,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: config.key_id,
      };
    }

    // For Stripe: call Stripe PaymentIntents API
    if (provider === 'stripe') {
      const stripeIntent = await createStripePaymentIntent(
        config,
        order.total,
        order.currency,
        iKey,
        orderId,
      );

      const result = await db.transaction(async (tx) => {
        const payment = await repo.insertPayment({
          storeId,
          orderId,
          provider: 'stripe',
          providerPaymentId: stripeIntent.id,
          status: 'processing',
          amount: order.total,
          currency: order.currency,
          idempotencyKey: iKey,
        }, tx);

        // Update order payment method
        await orderRepo.updateOrder(orderId, storeId, {
          paymentMethod: 'stripe',
          updatedAt: new Date(),
        }, tx);

        return payment;
      });

      return {
        paymentId: result.id,
        provider: 'stripe',
        status: 'processing',
        amount: result.amount,
        currency: result.currency,
        clientSecret: stripeIntent.client_secret,
        publishableKey: config.publishable_key,
      };
    }

    throw Object.assign(new Error(`Unsupported payment provider: ${provider}`), {
      code: ErrorCodes.PAYMENT_FAILED,
    });
  },
};

// ─── Razorpay API call ───

async function createRazorpayOrder(
  config: Record<string, string>,
  amount: string,
  currency: string,
  idempotencyKey: string,
  receipt: string,
) {
  const amountPaise = toCents(amount);

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${config.key_id}:${config.key_secret}`).toString('base64')}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: currency === 'INR' ? 'INR' : 'USD',
      receipt: receipt.slice(0, 40), // Razorpay limit
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw Object.assign(new Error(`Razorpay API error: ${response.status} - ${errBody}`), {
      code: ErrorCodes.PAYMENT_FAILED,
    });
  }

  return response.json() as Promise<{ id: string; amount: number; currency: string }>;
}

// ─── Stripe API call ───

async function createStripePaymentIntent(
  config: Record<string, string>,
  amount: string,
  currency: string,
  idempotencyKey: string,
  metadataOrderId: string,
) {
  const amountCents = toCents(amount);
  // Stripe expects lowercase 3-letter currency codes
  const cur = currency.toLowerCase();

  const params = new URLSearchParams({
    amount: String(amountCents),
    currency: cur,
    'metadata[orderId]': metadataOrderId,
  });
  params.append('payment_method_types[0]', 'card');

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${config.secret_key}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw Object.assign(new Error(`Stripe API error: ${response.status} - ${errBody}`), {
      code: ErrorCodes.PAYMENT_FAILED,
    });
  }

  return response.json() as Promise<{ id: string; client_secret: string; amount: number; currency: string }>;
}
