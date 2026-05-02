// Analytics repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { orders, customers, products } from '../../db/schema.js';
import { eq, and, sql, count, gte, lte } from 'drizzle-orm';

export async function countOrders(storeId: string): Promise<{ count: number }[]> {
  return db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.storeId, storeId));
}

export async function countCustomers(storeId: string): Promise<{ count: number }[]> {
  return db
    .select({ count: count() })
    .from(customers)
    .where(eq(customers.storeId, storeId));
}

export async function countProducts(storeId: string): Promise<{ count: number }[]> {
  return db
    .select({ count: count() })
    .from(products)
    .where(eq(products.storeId, storeId));
}

export async function getRevenueStats(storeId: string): Promise<{ totalRevenue: string; averageOrderValue: string }[]> {
  return db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      averageOrderValue: sql<string>`COALESCE(AVG(${orders.total}), 0)`,
    })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), sql`${orders.status} != 'cancelled'`));
}

export async function countRecentOrders(storeId: string, since: Date): Promise<{ count: number }[]> {
  return db
    .select({ count: count() })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, since)));
}

export async function getRecentRevenue(storeId: string, since: Date): Promise<{ totalRevenue: string }[]> {
  return db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        sql`${orders.status} != 'cancelled'`,
        gte(orders.createdAt, since),
      ),
    );
}

const DATE_FORMAT_MAP: Record<string, string> = {
  'YYYY-MM-DD': 'YYYY-MM-DD',
  'IYYY-IW': 'IYYY-IW',
  'YYYY-MM': 'YYYY-MM',
};

export function buildPeriodExpr(dateFormat: string): ReturnType<typeof sql<string>> {
  const safe = DATE_FORMAT_MAP[dateFormat];
  if (!safe) {
    throw new Error(`Unsupported date format: ${dateFormat}`);
  }
  return sql<string>`to_char(${orders.createdAt}, ${sql.raw(`'${safe}'`)})`;
}

export async function getRevenueByPeriod(
  storeId: string,
  periodExpr: ReturnType<typeof sql>,
  startDate: Date,
  endDate: Date,
) {
  return db
    .select({
      period: periodExpr,
      revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      orderCount: count(),
      averageOrderValue: sql<string>`COALESCE(AVG(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        sql`${orders.status} != 'cancelled'`,
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
      ),
    )
    .groupBy(periodExpr)
    .orderBy(periodExpr);
}