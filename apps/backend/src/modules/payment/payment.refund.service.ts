// Payment refund — refundPayment (COD manual, Stripe API, Razorpay API).
import { db } from '../../db/index.js';
import { payments } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';
import { toCents, isPositive } from '../../lib/decimal.js';
import { decryptConfig } from '../../lib/encryption.js';
import { generateIdempotencyKey } from './payment.helpers.js';
import * as repo from './payment.repo.js';

export const refundService = {
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
};
