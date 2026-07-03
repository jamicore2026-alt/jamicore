// Tax repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { taxRates } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

// ─── CRUD queries ───

export async function insertRate(
  storeId: string,
  data: {
    name: string;
    rate: string;
    country?: string;
    state?: string;
    postalCode?: string;
    isCompound?: boolean;
    priority?: number;
    isActive?: boolean;
  },
  tx?: DbOrTx,
): Promise<typeof taxRates.$inferSelect> {
  const executor = tx ?? db;
  const [rate] = await executor
    .insert(taxRates)
    .values({
      storeId,
      name: data.name,
      rate: data.rate,
      country: data.country,
      state: data.state,
      postalCode: data.postalCode,
      isCompound: data.isCompound ?? false,
      priority: data.priority ?? 1,
      isActive: data.isActive ?? true,
    })
    .returning();
  return rate;
}

export async function findRatesByStoreId(storeId: string, tx?: DbOrTx): Promise<typeof taxRates.$inferSelect[]> {
  const executor = tx ?? db;
  return executor.query.taxRates.findMany({
    where: eq(taxRates.storeId, storeId),
    orderBy: (rates, { asc }) => [asc(rates.priority)],
  });
}

export async function findRateById(rateId: string, storeId: string, tx?: DbOrTx): Promise<typeof taxRates.$inferSelect | undefined> {
  const executor = tx ?? db;
  return executor.query.taxRates.findFirst({
    where: and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)),
  });
}

export async function updateRate(
  rateId: string,
  storeId: string,
  data: Partial<{
    name: string;
    rate: string;
    country: string;
    state: string;
    postalCode: string;
    isCompound: boolean;
    priority: number;
    isActive: boolean;
  }>,
  tx?: DbOrTx,
): Promise<typeof taxRates.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(taxRates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)))
    .returning();
  return updated;
}

export async function deleteRateById(rateId: string, storeId: string, tx?: DbOrTx): Promise<typeof taxRates.$inferSelect[]> {
  const executor = tx ?? db;
  return executor
    .delete(taxRates)
    .where(and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)))
    .returning();
}

// ─── Calculate Tax queries ───

export async function findActiveRatesByStoreId(storeId: string, tx?: DbOrTx): Promise<typeof taxRates.$inferSelect[]> {
  const executor = tx ?? db;
  return executor.query.taxRates.findMany({
    where: and(eq(taxRates.storeId, storeId), eq(taxRates.isActive, true)),
    orderBy: (rates, { asc }) => [asc(rates.priority)],
  });
}