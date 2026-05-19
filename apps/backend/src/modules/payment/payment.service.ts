// Payment service — business logic, provider API calls, webhook verification
import crypto from 'node:crypto';
import { db } from '../../db/index.js';
import { payments, paymentProviders } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';
import { orderRepo } from '../order/order.repo.js';
import { productRepo } from '../product/product.repo.js';
import * as repo from './payment.repo.js';
import { encryptConfig, decryptConfig } from '../../lib/encryption.js';
import { toCents, isPositive } from '../../lib/decimal.js';

/** Mask a secret string, showing only the last 4 characters. */
function maskSecret(value: string | undefined): string {
  if (!value || value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

/** Mask all values in a config record (API keys etc.). */
function maskConfig(config: Record<string, string> | null | undefined): Record<string, string> | null {
  if (!config) return null;
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    masked[key] = maskSecret(value);
  }
  return masked;
}

/** Decrypt and mask a provider row for public API responses. */
function decryptAndMaskProvider(provider: typeof paymentProviders.$inferSelect) {
  return {
    ...provider,
    config: maskConfig(decryptConfig(provider.config)),
  };
}

/** Generate a UUID-based idempotency key. */
function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export const paymentService = {
  // ─── Provider configuration ───

  async getProviders(storeId: string) {
    const providers = await repo.findProvidersByStoreId(storeId);
    // Decrypt and mask API keys in responses
    return providers.map((p) => decryptAndMaskProvider(p));
  },

  async configureProvider(
    storeId: string,
    provider: string,
    isEnabled: boolean,
    config?: Record<string, string>,
  ) {
    // COD needs no API keys
    if (provider === 'cod') {
      const result = await repo.upsertProvider(storeId, provider, { isEnabled, config: undefined });
      return { ...result, config: null };
    }

    // Stripe/Razorpay: validate required config keys are present when enabling
    if (isEnabled) {
      if (provider === 'stripe' && (!config?.secret_key || !config?.webhook_secret)) {
        throw Object.assign(new Error('Stripe requires secret_key and webhook_secret in config'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }
      if (provider === 'razorpay' && (!config?.key_id || !config?.key_secret || !config?.webhook_secret)) {
        throw Object.assign(new Error('Razorpay requires key_id, key_secret, and webhook_secret in config'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }
    }

    let encryptedConfig: string | undefined;
    if (config && Object.keys(config).length > 0) {
      encryptedConfig = encryptConfig(config);
    }

    const result = await repo.upsertProvider(storeId, provider, {
      isEnabled,
      config: encryptedConfig ? (encryptedConfig as unknown as Record<string, string>) : config,
    });

    return { ...result, config: maskConfig(decryptConfig(result.config)) };
  },

  // ─── Payment intent creation ───

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
    const providerConfig = await this.findProviderByStoreId(storeId, provider);
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

  // ─── Refund payment ───

  async refundPayment(storeId: string, orderId: string, amount: string) {
    // M2: Validate amount
    if (!isPositive(amount)) {
      throw Object.assign(new Error('Refund amount must be greater than zero'), { code: ErrorCodes.VALIDATION_ERROR });
    }

    const orderPayments = await db
      .select()
      .from(payments)
      .where(and(eq(payments.storeId, storeId), eq(payments.orderId, orderId)))
      .orderBy(payments.createdAt);

    const successfulPayment = orderPayments.find((p) => p.status === 'completed');
    if (!successfulPayment) {
      throw Object.assign(new Error('No successful payment found for refund'), { code: ErrorCodes.PAYMENT_FAILED });
    }

    if (toCents(amount) > toCents(successfulPayment.amount)) {
      throw Object.assign(new Error('Refund amount exceeds payment amount'), { code: ErrorCodes.VALIDATION_ERROR });
    }

    const provider = successfulPayment.provider;
    if (provider === 'cod') {
      return { success: true, refundId: null, message: 'COD refunds are handled manually' };
    }

    const providerRow = await repo.findProvider(storeId, provider);
    if (!providerRow?.config) {
      throw Object.assign(new Error('Payment provider not configured'), { code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED });
    }

    const config = decryptConfig(providerRow.config);
    if (!config) {
      throw Object.assign(new Error('Failed to decrypt provider config'), { code: ErrorCodes.PAYMENT_FAILED });
    }

    // M1: Generate idempotency key
    const iKey = generateIdempotencyKey();

    if (provider === 'stripe') {
      const response = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${config.secret_key}`,
          'Idempotency-Key': iKey,
        },
        body: new URLSearchParams({
          payment_intent: successfulPayment.providerPaymentId ?? '',
          amount: String(toCents(amount)),
        }).toString(),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw Object.assign(new Error(`Stripe refund error: ${response.status} - ${errBody}`), {
          code: ErrorCodes.PAYMENT_FAILED,
        });
      }

      const refund = await response.json() as { id: string };

      // M3: Persist refund result
      await db.update(payments)
        .set({
          metadata: {
            refundId: refund.id,
            refundedAt: new Date().toISOString(),
            refundAmount: amount,
          },
          updatedAt: new Date(),
        })
        .where(eq(payments.id, successfulPayment.id));

      return { success: true, refundId: refund.id };
    }

    if (provider === 'razorpay') {
      const response = await fetch(
        `https://api.razorpay.com/v1/payments/${successfulPayment.providerPaymentId ?? ''}/refund`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${config.key_id}:${config.key_secret}`).toString('base64')}`,
            'Idempotency-Key': iKey,
          },
          body: JSON.stringify({
            amount: toCents(amount),
          }),
        },
      );

      if (!response.ok) {
        const errBody = await response.text();
        throw Object.assign(new Error(`Razorpay refund error: ${response.status} - ${errBody}`), {
          code: ErrorCodes.PAYMENT_FAILED,
        });
      }

      const refund = await response.json() as { id: string };

      // M3: Persist refund result
      await db.update(payments)
        .set({
          metadata: {
            refundId: refund.id,
            refundedAt: new Date().toISOString(),
            refundAmount: amount,
          },
          updatedAt: new Date(),
        })
        .where(eq(payments.id, successfulPayment.id));

      return { success: true, refundId: refund.id };
    }

    throw Object.assign(new Error('Refund not supported for this provider'), { code: ErrorCodes.PAYMENT_FAILED });
  },

  // ─── Webhook handling ───

  async handleWebhook(
    provider: string,
    payload: Record<string, unknown>,
    signature: string,
    rawBody: string,
    storeId: string,
  ) {
    if (provider === 'razorpay') {
      return handleRazorpayWebhook(payload, signature, rawBody, storeId);
    }
    if (provider === 'stripe') {
      return handleStripeWebhook(payload, signature, rawBody, storeId);
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

// ─── Razorpay API calls ───

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

// ─── Stripe API calls ───

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

// ─── Razorpay webhook ───

async function handleRazorpayWebhook(
  payload: Record<string, unknown>,
  signature: string,
  rawBody: string,
  storeId: string,
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
      return { received: true }; // Already processed — idempotent
    }

    await db.transaction(async (tx) => {
      await repo.updatePaymentStatus(
        payment.id,
        payment.storeId,
        {
          status: 'completed',
          providerPaymentId: razorpayPaymentId,
        },
        tx,
      );
      await orderRepo.updateOrder(payment.orderId, payment.storeId, {
        paymentStatus: 'paid',
        updatedAt: new Date(),
      }, tx);

      // Decrement inventory atomically with payment status update
      const items = await orderRepo.findOrderItemsByOrderId(payment.orderId, payment.storeId);
      for (const item of items) {
        if (item.variantId) {
          await productRepo.decrementVariantOptionStock(
            item.variantId,
            payment.storeId,
            item.quantity,
            tx,
          );
        }
        if (item.productId) {
          await orderRepo.decrementInventory(
            item.productId,
            payment.storeId,
            item.quantity,
            tx,
          );
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
      return { received: true }; // Already processed — idempotent
    }

    await db.transaction(async (tx) => {
      await repo.updatePaymentStatus(
        payment.id,
        payment.storeId,
        { status: 'completed' },
        tx,
      );
      await orderRepo.updateOrder(payment.orderId, payment.storeId, {
        paymentStatus: 'paid',
        updatedAt: new Date(),
      }, tx);

      // Decrement inventory atomically with payment status update
      const items = await orderRepo.findOrderItemsByOrderId(payment.orderId, payment.storeId);
      for (const item of items) {
        if (item.variantId) {
          await productRepo.decrementVariantOptionStock(
            item.variantId,
            payment.storeId,
            item.quantity,
            tx,
          );
        }
        if (item.productId) {
          await orderRepo.decrementInventory(
            item.productId,
            payment.storeId,
            item.quantity,
            tx,
          );
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
