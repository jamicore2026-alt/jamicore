// Customer repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { customers, customerAddresses } from '../../db/schema.js';
import { eq, and, desc, count, isNull } from 'drizzle-orm';

type DbExecutor = typeof db;

export const customerRepo = {
  /**
   * Run multiple repo operations in a single transaction.
   * The callback receives a transaction executor that can be
   * passed to any repo method as the `tx` parameter.
   */
  async withTransaction<T>(
    callback: (tx: DbExecutor) => Promise<T>,
  ): Promise<T> {
    // PgTransaction shares the query API with PostgresJsDatabase but
    // TypeScript doesn't reflect this due to the $client property difference.
    // The cast is safe because both expose .query, .insert, .update, .delete, .select.
    return db.transaction(async (tx) => callback(tx as unknown as DbExecutor));
  },

  async findByStoreId(
    storeId: string,
    opts: { limit: number; offset: number },
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const where = and(eq(customers.storeId, storeId), isNull(customers.deletedAt));

    const [rows, totalResult] = await Promise.all([
      executor.query.customers.findMany({
        where,
        columns: {
          id: true,
          storeId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isVerified: true,
          marketingEmails: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [desc(customers.createdAt)],
        limit: opts.limit,
        offset: opts.offset,
      }),
      executor.select({ count: count() })
        .from(customers)
        .where(where),
    ]);

    return { rows, total: totalResult[0]?.count ?? 0 };
  },

  async findById(customerId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: and(eq(customers.id, customerId), eq(customers.storeId, storeId), isNull(customers.deletedAt)),
      columns: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        marketingEmails: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        addresses: true,
        orders: {
          orderBy: [desc(customers.createdAt)],
          limit: 10,
        },
      },
    });
  },

  async findByEmail(email: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: and(
        eq(customers.email, email),
        eq(customers.storeId, storeId),
      ),
    });
  },

  async insertCustomer(data: typeof customers.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [customer] = await executor.insert(customers).values(data).returning();
    return customer;
  },

  async insertAddresses(addresses: (typeof customerAddresses.$inferInsert)[], tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.insert(customerAddresses).values(addresses);
  },

  async updateCustomer(
    customerId: string,
    storeId: string,
    data: Partial<typeof customers.$inferInsert>,
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
      .returning();
    return updated;
  },

  async findFullProfileForExport(customerId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: and(eq(customers.id, customerId), eq(customers.storeId, storeId)),
      columns: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        marketingEmails: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        addresses: true,
        orders: true,
        reviews: true,
        couponUsages: true,
      },
    });
  },

  async anonymizeCustomer(customerId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(customers)
      .set({
        email: `deleted-${customerId}@anonymized.local`,
        firstName: 'Deleted User',
        lastName: '',
        phone: null,
        avatarUrl: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        marketingEmails: false,
        isVerified: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
      .returning();
    return updated;
  },
};