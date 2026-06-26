// Payment repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { paymentProviders, payments } from '../../db/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

// ─── Provider queries ───

export async function findProvidersByStoreId(storeId: string): Promise<typeof paymentProviders.$inferSelect[]> {
  return db.query.paymentProviders.findMany({
    where: eq(paymentProviders.storeId, storeId),
  });
}

export async function findProvider(storeId: string, provider: string): Promise<typeof paymentProviders.$inferSelect | undefined> {
  return db.query.paymentProviders.findFirst({
    where: and(
      eq(paymentProviders.storeId, storeId),
      eq(paymentProviders.provider, provider),
    ),
  });
}

export async function upsertProvider(
  storeId: string,
  provider: string,
  data: { isEnabled: boolean; config?: Record<string, string> | string },
): Promise<typeof paymentProviders.$inferSelect> {
  const existing = await findProvider(storeId, provider);
  const configValue = data.config;

  if (existing) {
    const [updated] = await db
      .update(paymentProviders)
      .set({
        isEnabled: data.isEnabled,
        config: configValue as Record<string, string> | null | undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(paymentProviders.storeId, storeId),
        eq(paymentProviders.provider, provider),
      ))
      .returning();
    return updated!;
  }

  const [inserted] = await db
    .insert(paymentProviders)
    .values({
      storeId,
      provider,
      isEnabled: data.isEnabled,
      config: configValue as Record<string, string> | null | undefined,
    })
    .returning();
  return inserted;
}

// ─── Payment queries ───

export async function insertPayment(
  data: typeof payments.$inferInsert,
  tx?: DbOrTx,
): Promise<typeof payments.$inferSelect> {
  const executor = tx ?? db;
  const [payment] = await executor.insert(payments).values(data).returning();
  return payment;
}

export async function findPaymentById(id: string, storeId: string): Promise<typeof payments.$inferSelect | undefined> {
  return db.query.payments.findFirst({
    where: and(eq(payments.id, id), eq(payments.storeId, storeId)),
  });
}

export async function findPaymentByOrderId(orderId: string, storeId: string): Promise<typeof payments.$inferSelect | undefined> {
  return db.query.payments.findFirst({
    where: and(eq(payments.orderId, orderId), eq(payments.storeId, storeId)),
  });
}

/**
 * M4: find the completed (captured) payment for an order, if any.
 * Used by the return/refund flow to decide whether a provider refund API call
 * is needed (card payments) or whether to skip it (COD / no payment on file).
 */
export async function findCompletedPaymentByOrderId(orderId: string, storeId: string): Promise<typeof payments.$inferSelect | undefined> {
  return db.query.payments.findFirst({
    where: and(
      eq(payments.orderId, orderId),
      eq(payments.storeId, storeId),
      eq(payments.status, 'completed'),
    ),
  });
}

export async function updatePaymentStatus(
  id: string,
  storeId: string,
  data: {
    status?: string;
    providerPaymentId?: string;
    metadata?: Record<string, unknown>;
  },
  tx?: DbOrTx,
): Promise<typeof payments.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(payments)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, id), eq(payments.storeId, storeId)))
    .returning();
  return updated;
}

/**
 * M3: Atomically transition a payment to `completed` only if it is not already
 * completed. Returns the updated row, or `undefined` when 0 rows matched (the
 * payment was already completed by a concurrent webhook — idempotent no-op).
 * Moving the status guard into the UPDATE makes the completion + downstream
 * order/inventory writes safe against duplicate/replayed webhook events
 * without a read-then-write TOCTOU race.
 */
export async function transitionPaymentToCompleted(
  id: string,
  storeId: string,
  data: { providerPaymentId?: string; metadata?: Record<string, unknown> },
  tx?: DbOrTx,
): Promise<typeof payments.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(payments)
    .set({
      status: 'completed',
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(payments.id, id),
        eq(payments.storeId, storeId),
        ne(payments.status, 'completed'),
      ),
    )
    .returning();
  return updated;
}
