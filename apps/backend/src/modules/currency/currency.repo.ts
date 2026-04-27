// Currency repository â€” DB-only operations, no business logic
import { db } from '../../db/index.js';
import { exchangeRates } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

// â”€â”€â”€ CRUD queries â”€â”€â”€

export async function findRate(baseCurrency: string, targetCurrency: string) {
  return db.query.exchangeRates.findFirst({
    where: and(
      eq(exchangeRates.baseCurrency, baseCurrency),
      eq(exchangeRates.targetCurrency, targetCurrency),
    ),
  });
}

export async function upsertRate(data: {
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
}) {
  const existing = await findRate(data.baseCurrency, data.targetCurrency);

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
      baseCurrency: data.baseCurrency,
      targetCurrency: data.targetCurrency,
      rate: data.rate,
    })
    .returning();
  return inserted;
}

export async function findAllRates() {
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
