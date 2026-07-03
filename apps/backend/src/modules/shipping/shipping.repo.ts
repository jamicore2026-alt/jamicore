// Shipping repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { shippingZones, shippingRates } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type ShippingRateSelect = typeof shippingRates.$inferSelect;

// ─── Zone queries ───

export async function insertZone(
  storeId: string,
  data: {
    name: string;
    countries?: string[];
    states?: string[];
    postalCodePatterns?: string[];
    isActive?: boolean;
  },
  tx?: DbOrTx,
): Promise<typeof shippingZones.$inferSelect> {
  const executor = tx ?? db;
  const [zone] = await executor
    .insert(shippingZones)
    .values({
      storeId,
      name: data.name,
      countries: data.countries || [],
      states: data.states || [],
      postalCodePatterns: data.postalCodePatterns || [],
      isActive: data.isActive ?? true,
    })
    .returning();
  return zone;
}

export async function findZonesByStoreId(storeId: string, tx?: DbOrTx) {
  const executor = tx ?? db;
  return executor.query.shippingZones.findMany({
    where: eq(shippingZones.storeId, storeId),
    with: { rates: true },
  });
}

export async function findZoneById(zoneId: string, storeId: string, tx?: DbOrTx) {
  const executor = tx ?? db;
  return executor.query.shippingZones.findFirst({
    where: and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)),
    with: { rates: true },
  });
}

export async function updateZone(
  zoneId: string,
  storeId: string,
  data: Partial<{
    name: string;
    countries: string[];
    states: string[];
    postalCodePatterns: string[];
    isActive: boolean;
  }>,
  tx?: DbOrTx,
): Promise<typeof shippingZones.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(shippingZones)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)))
    .returning();
  return updated;
}

export async function deleteZoneById(zoneId: string, storeId: string, tx?: DbOrTx): Promise<typeof shippingZones.$inferSelect[]> {
  const executor = tx ?? db;
  return executor
    .delete(shippingZones)
    .where(and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)))
    .returning();
}

// ─── Zone lookup (no relation) ───

export async function findZoneByIdFlat(zoneId: string, storeId: string, tx?: DbOrTx): Promise<typeof shippingZones.$inferSelect | undefined> {
  const executor = tx ?? db;
  return executor.query.shippingZones.findFirst({
    where: and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)),
  });
}

// ─── Rate queries ───

export async function insertRate(
  storeId: string,
  data: {
    zoneId: string;
    name: string;
    method: string;
    carrier?: string;
    price: string;
    freeAbove?: string;
    weightBased?: boolean;
    pricePerKg?: string;
    estimatedDays?: number;
    isActive?: boolean;
  },
  tx?: DbOrTx,
): Promise<typeof shippingRates.$inferSelect> {
  const executor = tx ?? db;
  const [rate] = await executor
    .insert(shippingRates)
    .values({
      storeId,
      zoneId: data.zoneId,
      name: data.name,
      method: data.method,
      carrier: data.carrier,
      price: data.price,
      freeAbove: data.freeAbove,
      weightBased: data.weightBased ?? false,
      pricePerKg: data.pricePerKg,
      estimatedDays: data.estimatedDays,
      isActive: data.isActive ?? true,
    })
    .returning();
  return rate;
}

export async function findRatesByZoneId(zoneId: string, storeId: string, tx?: DbOrTx): Promise<ShippingRateSelect[]> {
  const executor = tx ?? db;
  return executor.query.shippingRates.findMany({
    where: and(eq(shippingRates.zoneId, zoneId), eq(shippingRates.storeId, storeId)),
  });
}

export async function findRateById(rateId: string, storeId: string, tx?: DbOrTx): Promise<ShippingRateSelect | undefined> {
  const executor = tx ?? db;
  return executor.query.shippingRates.findFirst({
    where: and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)),
  });
}

export async function updateRate(
  rateId: string,
  storeId: string,
  data: Partial<{
    name: string;
    method: string;
    carrier: string;
    price: string;
    freeAbove: string;
    weightBased: boolean;
    pricePerKg: string;
    estimatedDays: number;
    isActive: boolean;
  }>,
  tx?: DbOrTx,
): Promise<typeof shippingRates.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(shippingRates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)))
    .returning();
  return updated;
}

export async function deleteRateById(rateId: string, storeId: string, tx?: DbOrTx): Promise<typeof shippingRates.$inferSelect[]> {
  const executor = tx ?? db;
  return executor
    .delete(shippingRates)
    .where(and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)))
    .returning();
}

// ─── Calculate Shipping queries ───

export async function findActiveZonesWithRates(storeId: string, tx?: DbOrTx) {
  const executor = tx ?? db;
  return executor.query.shippingZones.findMany({
    where: and(eq(shippingZones.storeId, storeId), eq(shippingZones.isActive, true)),
    with: { rates: { where: eq(shippingRates.isActive, true) } },
  });
}