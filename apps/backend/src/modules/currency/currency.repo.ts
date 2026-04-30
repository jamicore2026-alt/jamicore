// Currency repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { exchangeRates } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

// ─── CRUD queries ───

export async function findRate(baseCurrency: string, targetCurrency: string, storeId?: string) {
  if (storeId) {
    const storeRate = await db.query.exchangeRates.findFirst({
      where: and(
        eq(exchangeRates.storeId, storeId),
        eq(exchangeRates.baseCurrency, baseCurrency),
        eq(exchangeRates.targetCurrency, targetCurrency),
      ),
    });
    if (storeRate) return storeRate;
  }
  return db.query.exchangeRates.findFirst({
    where: and(
      eq(exchangeRates.baseCurrency, baseCurrency),
      eq(exchangeRates.targetCurrency, targetCurrency),
    ),
  });
}

export async function findRateById(id: string) {
  return db.query.exchangeRates.findFirst({
    where: eq(exchangeRates.id, id),
  });
}

export async function upsertRate(data: {
  storeId?: string | null;
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
}) {
  const existing = data.storeId
    ? await db.query.exchangeRates.findFirst({
        where: and(
          eq(exchangeRates.storeId, data.storeId),
          eq(exchangeRates.baseCurrency, data.baseCurrency),
          eq(exchangeRates.targetCurrency, data.targetCurrency),
        ),
      })
    : await findRate(data.baseCurrency, data.targetCurrency);

  if (existing) {
    const [updated] = await db
      .update(exchangeRates)
      .set({
        rate: data.rate,
        updatedAt: new Date(),
      })
      .where(eq(exchangeRates.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(exchangeRates)
    .values({
      storeId: data.storeId ?? null,
      baseCurrency: data.baseCurrency,
      targetCurrency: data.targetCurrency,
      rate: data.rate,
    })
    .returning();
  return inserted;
}

export async function findAllRates(storeId?: string) {
  if (storeId) {
    return db.query.exchangeRates.findMany({
      where: eq(exchangeRates.storeId, storeId),
      orderBy: (rates, { asc }) => [asc(rates.baseCurrency), asc(rates.targetCurrency)],
    });
  }
  return db.query.exchangeRates.findMany({
    orderBy: (rates, { asc }) => [asc(rates.baseCurrency), asc(rates.targetCurrency)],
  });
}

export async function deleteRate(id: string) {
  return db
    .delete(exchangeRates)
    .where(eq(exchangeRates.id, id))
    .returning();
}
