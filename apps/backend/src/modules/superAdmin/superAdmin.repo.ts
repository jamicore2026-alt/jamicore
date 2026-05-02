// TODO: Split into domain-specific repos (store, stats, ticket, invoice)
// This file exceeds 400 lines and should be refactored

// SuperAdmin repository — Drizzle queries only. No business logic, no ErrorCodes.
import { db } from '../../db/index.js';
import { stores, merchantPlans, orders, activityLogs, supportTickets, ticketReplies, platformSettings, invoices, adminNotifications, users, staffInvitations, products, customers } from '../../db/schema.js';
import { eq, and, desc, count, sql, like, or, gte, ne } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export const superAdminRepo = {
  // ─── Store queries ───

  async findStores(opts: { page: number; limit: number; status?: string; search?: string }): Promise<{ data: typeof stores.$inferSelect[]; total: number }> {
    const conditions = [];
    if (opts.status) {
      conditions.push(eq(stores.status, opts.status));
    }
    if (opts.search) {
      const searchTerm = `%${opts.search}%`;
      conditions.push(
        or(
          like(stores.name, searchTerm),
          like(stores.domain, searchTerm),
          like(stores.ownerEmail, searchTerm),
        )!,
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      db.query.stores.findMany({
        where,
        orderBy: desc(stores.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
      }),
      db.select({ count: count() })
        .from(stores)
        .where(where ?? sql`1=1`),
    ]);

    return {
      data: rows,
      total: totalResult[0]?.count ?? 0,
    };
  },

  async findStoreById(storeId: string): Promise<typeof stores.$inferSelect | undefined> {
    return db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
  },

  async findStoreByIdWithCounts(storeId: string): Promise<(typeof stores.$inferSelect & { plan?: typeof merchantPlans.$inferSelect | null; productsCount: number; ordersCount: number; customersCount: number; staffCount: number }) | undefined> {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      with: { plan: true },
    });
    if (!store) return undefined;

    const [[productsResult], [ordersResult], [customersResult], [staffResult]] = await Promise.all([
      db.select({ count: count() }).from(products).where(eq(products.storeId, storeId)),
      db.select({ count: count() }).from(orders).where(eq(orders.storeId, storeId)),
      db.select({ count: count() }).from(customers).where(eq(customers.storeId, storeId)),
      db.select({ count: count() }).from(users).where(eq(users.storeId, storeId)),
    ]);

    return {
      ...store,
      productsCount: productsResult?.count ?? 0,
      ordersCount: ordersResult?.count ?? 0,
      customersCount: customersResult?.count ?? 0,
      staffCount: staffResult?.count ?? 0,
    };
  },

  async updateStore(storeId: string, data: Partial<typeof stores.$inferInsert>, tx?: DbOrTx): Promise<typeof stores.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return updated;
  },

  // ─── Plan queries ───

  async findPlans(): Promise<typeof merchantPlans.$inferSelect[]> {
    return db.query.merchantPlans.findMany({
      orderBy: desc(merchantPlans.createdAt),
    });
  },

  async findPlanById(planId: string): Promise<typeof merchantPlans.$inferSelect | undefined> {
    return db.query.merchantPlans.findFirst({
      where: eq(merchantPlans.id, planId),
    });
  },

  async insertPlan(data: typeof merchantPlans.$inferInsert, tx?: DbOrTx): Promise<typeof merchantPlans.$inferSelect> {
    const executor = tx ?? db;
    const [plan] = await executor.insert(merchantPlans).values(data).returning();
    return plan;
  },

  async updatePlan(planId: string, data: Partial<typeof merchantPlans.$inferInsert>, tx?: DbOrTx): Promise<typeof merchantPlans.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(merchantPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(merchantPlans.id, planId))
      .returning();
    return updated;
  },

  async deletePlan(planId: string, tx?: DbOrTx): Promise<void> {
    const executor = tx ?? db;
    await executor.delete(merchantPlans).where(eq(merchantPlans.id, planId));
  },

  // ─── Stats queries ───

  async countStores(): Promise<number> {
    const result = await db.select({ count: count() }).from(stores);
    return result[0]?.count ?? 0;
  },

  async countStoresByStatus(): Promise<{ status: string; count: number }[]> {
    const result = await db
      .select({ status: stores.status, count: count() })
      .from(stores)
      .groupBy(stores.status);
    return result;
  },

  async countActiveStores(): Promise<number> {
    const result = await db.select({ count: count() }).from(stores).where(eq(stores.status, 'active'));
    return result[0]?.count ?? 0;
  },

  async countPendingStores(): Promise<number> {
    const result = await db.select({ count: count() }).from(stores).where(eq(stores.status, 'pending'));
    return result[0]?.count ?? 0;
  },

  async countSuspendedStores(): Promise<number> {
    const result = await db.select({ count: count() }).from(stores).where(eq(stores.status, 'suspended'));
    return result[0]?.count ?? 0;
  },

  async findRecentStores(limit: number): Promise<typeof stores.$inferSelect[]> {
    return db.query.stores.findMany({
      orderBy: desc(stores.createdAt),
      limit,
    });
  },

  async countPlans(): Promise<number> {
    const result = await db.select({ count: count() }).from(merchantPlans);
    return result[0]?.count ?? 0;
  },

  // ─── Revenue queries ───

  async getRevenueSummary(days = 30): Promise<{ totalRevenue: number; totalOrders: number; avgOrderValue: number; totalCustomers: number }> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const dateFilter = sql`${orders.createdAt} >= ${since}`;

    const [orderStats, totalRevenue] = await Promise.all([
      db.select({
        totalOrders: count(),
        avgOrderValue: sql`COALESCE(AVG(${orders.total}), 0)`,
        totalCustomers: sql`COUNT(DISTINCT ${orders.customerId})`,
      }).from(orders).where(and(eq(orders.status, 'delivered'), dateFilter)),
      db.select({ sum: sql`COALESCE(SUM(${orders.total}), 0)` }).from(orders).where(and(eq(orders.status, 'delivered'), dateFilter)),
    ]);
    return {
      totalRevenue: Number(totalRevenue[0]?.sum ?? 0),
      totalOrders: Number(orderStats[0]?.totalOrders ?? 0),
      avgOrderValue: Number(orderStats[0]?.avgOrderValue ?? 0),
      totalCustomers: Number(orderStats[0]?.totalCustomers ?? 0),
    };
  },

  async getRevenueByStore(days = 30): Promise<{ storeId: string; storeName: unknown; revenue: unknown; orderCount: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return db.select({
      storeId: orders.storeId,
      storeName: sql`MAX(${stores.name})`,
      revenue: sql`COALESCE(SUM(${orders.total}), 0)`,
      orderCount: count(),
    })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(and(
        eq(orders.status, 'delivered'),
        gte(orders.createdAt, since),
      ))
      .groupBy(orders.storeId)
      .orderBy(sql`COALESCE(SUM(${orders.total}), 0) DESC`)
      .limit(10);
  },

  async getRecentRevenue(days = 30): Promise<{ date: unknown; revenue: unknown; orders: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return db.select({
      date: sql`DATE(${orders.createdAt})`,
      revenue: sql`COALESCE(SUM(${orders.total}), 0)`,
      orders: count(),
    })
      .from(orders)
      .where(and(
        eq(orders.status, 'delivered'),
        gte(orders.createdAt, since),
      ))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);
  },

  // ─── Audit log queries ───

  async findActivityLogs(opts: { page: number; limit: number; entityType?: string; action?: string }): Promise<{ data: typeof activityLogs.$inferSelect[]; total: number }> {
    const conditions = [];
    if (opts.entityType) conditions.push(eq(activityLogs.entityType, opts.entityType));
    if (opts.action) conditions.push(eq(activityLogs.action, opts.action));

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.activityLogs.findMany({
        where,
        orderBy: desc(activityLogs.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: {
          store: { columns: { id: true, name: true } },
        },
      }),
      db.select({ count: count() }).from(activityLogs).where(where),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  // ─── Support Ticket Queries ───

  async findTickets(opts: { page: number; limit: number; status?: string; priority?: string }): Promise<{ data: typeof supportTickets.$inferSelect[]; total: number }> {
    const conditions = [];
    if (opts.status) conditions.push(eq(supportTickets.status, opts.status));
    if (opts.priority) conditions.push(eq(supportTickets.priority, opts.priority));

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.supportTickets.findMany({
        where,
        orderBy: desc(supportTickets.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: { store: { columns: { id: true, name: true, domain: true } } },
      }),
      db.select({ count: count() }).from(supportTickets).where(where),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  async findTicketById(ticketId: string): Promise<typeof supportTickets.$inferSelect | undefined> {
    return db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
      with: {
        store: { columns: { id: true, name: true, domain: true, ownerEmail: true } },
        assignedAdmin: { columns: { id: true, name: true, email: true } },
        replies: { orderBy: desc(ticketReplies.createdAt) },
      },
    });
  },

  async insertTicket(data: typeof supportTickets.$inferInsert, tx?: DbOrTx): Promise<typeof supportTickets.$inferSelect> {
    const executor = tx ?? db;
    const [ticket] = await executor.insert(supportTickets).values(data).returning();
    return ticket;
  },

  async updateTicket(ticketId: string, data: Partial<typeof supportTickets.$inferInsert>, tx?: DbOrTx): Promise<typeof supportTickets.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor.update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return updated;
  },

  async insertTicketReply(data: typeof ticketReplies.$inferInsert, tx?: DbOrTx): Promise<typeof ticketReplies.$inferSelect> {
    const executor = tx ?? db;
    const [reply] = await executor.insert(ticketReplies).values(data).returning();
    return reply;
  },

  // ─── Platform Settings Queries ───

  async findSettings(): Promise<typeof platformSettings.$inferSelect[]> {
    return db.select().from(platformSettings).orderBy(platformSettings.key);
  },

  async findSettingByKey(key: string): Promise<typeof platformSettings.$inferSelect | undefined> {
    return db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, key),
    });
  },

  async upsertSetting(key: string, value: string, type: string, updatedBy: string): Promise<typeof platformSettings.$inferSelect> {
    const existing = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, key),
    });
    if (existing) {
      const [updated] = await db.update(platformSettings)
        .set({ value, type, updatedBy, updatedAt: new Date() })
        .where(eq(platformSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(platformSettings)
      .values({ key, value, type, updatedBy })
      .returning();
    return created;
  },

  // ─── Invoice Queries ───

  async findInvoices(opts: { page: number; limit: number; status?: string; storeId?: string }): Promise<{ data: typeof invoices.$inferSelect[]; total: number }> {
    const conditions = [];
    if (opts.status) conditions.push(eq(invoices.status, opts.status));
    if (opts.storeId) conditions.push(eq(invoices.storeId, opts.storeId));

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.invoices.findMany({
        where,
        orderBy: desc(invoices.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: { store: { columns: { id: true, name: true } }, plan: true },
      }),
      db.select({ count: count() }).from(invoices).where(where),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  async findInvoiceById(id: string): Promise<typeof invoices.$inferSelect | undefined> {
    return db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: { store: { columns: { id: true, name: true, domain: true } }, plan: true },
    });
  },

  async insertInvoice(data: typeof invoices.$inferInsert, tx?: DbOrTx): Promise<typeof invoices.$inferSelect> {
    const executor = tx ?? db;
    const [invoice] = await executor.insert(invoices).values(data).returning();
    return invoice;
  },

  async updateInvoice(id: string, data: Partial<typeof invoices.$inferInsert>, tx?: DbOrTx): Promise<typeof invoices.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor.update(invoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  },

  // ─── Notification Queries ───

  async findNotifications(opts: { page: number; limit: number; unreadOnly?: boolean }): Promise<{ data: typeof adminNotifications.$inferSelect[]; total: number; unread: number }> {
    const conditions = [];
    if (opts.unreadOnly) conditions.push(sql`${adminNotifications.readAt} IS NULL`);

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult, unreadResult] = await Promise.all([
      db.query.adminNotifications.findMany({
        where,
        orderBy: desc(adminNotifications.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
      }),
      db.select({ count: count() }).from(adminNotifications).where(where ?? sql`1=1`),
      db.select({ count: count() }).from(adminNotifications).where(sql`${adminNotifications.readAt} IS NULL`),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0, unread: unreadResult[0]?.count ?? 0 };
  },

  async findNotificationById(id: string): Promise<typeof adminNotifications.$inferSelect | undefined> {
    return db.query.adminNotifications.findFirst({
      where: eq(adminNotifications.id, id),
    });
  },

  async insertNotification(data: typeof adminNotifications.$inferInsert, tx?: DbOrTx): Promise<typeof adminNotifications.$inferSelect> {
    const executor = tx ?? db;
    const [notification] = await executor.insert(adminNotifications).values(data).returning();
    return notification;
  },

  async markNotificationRead(id: string, tx?: DbOrTx): Promise<typeof adminNotifications.$inferSelect | undefined> {
    const executor = tx ?? db;
    const [updated] = await executor.update(adminNotifications)
      .set({ readAt: new Date() })
      .where(eq(adminNotifications.id, id))
      .returning();
    return updated;
  },

  async markAllNotificationsRead(tx?: DbOrTx): Promise<void> {
    const executor = tx ?? db;
    await executor.update(adminNotifications)
      .set({ readAt: new Date() })
      .where(sql`${adminNotifications.readAt} IS NULL`);
  },

  async countUnreadNotifications(): Promise<number> {
    const result = await db.select({ count: count() }).from(adminNotifications).where(sql`${adminNotifications.readAt} IS NULL`);
    return result[0]?.count ?? 0;
  },

  // ─── Custom Domain Queries ───

  async findStoresWithCustomDomains(opts: { page: number; limit: number; verified?: boolean }): Promise<{ data: typeof stores.$inferSelect[]; total: number }> {
    const conditions = [sql`${stores.customDomain} IS NOT NULL`];
    if (opts.verified !== undefined) {
      conditions.push(eq(stores.customDomainVerified, opts.verified));
    }

    const where = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.stores.findMany({
        where,
        orderBy: desc(stores.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: { plan: true },
      }),
      db.select({ count: count() }).from(stores).where(where),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  async verifyCustomDomain(storeId: string): Promise<typeof stores.$inferSelect | undefined> {
    const [updated] = await db.update(stores)
      .set({ customDomainVerified: true, customDomainVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return updated;
  },

  async rejectCustomDomain(storeId: string): Promise<typeof stores.$inferSelect | undefined> {
    const [updated] = await db.update(stores)
      .set({ customDomainVerified: false, customDomainVerifiedAt: null, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return updated;
  },

  // ─── Staff Management Queries ───

  async findAllStaff(opts: { page: number; limit: number; storeId?: string; role?: string }): Promise<{ data: typeof users.$inferSelect[]; total: number }> {
    const conditions = [ne(users.role, 'OWNER')];
    if (opts.storeId) conditions.push(eq(users.storeId, opts.storeId));
    if (opts.role) conditions.push(eq(users.role, opts.role));

    const where = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.users.findMany({
        where,
        orderBy: desc(users.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: { store: { columns: { id: true, name: true } } },
      }),
      db.select({ count: count() }).from(users).where(where),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  async findAllInvitations(opts: { page: number; limit: number; storeId?: string; status?: string }): Promise<{ data: typeof staffInvitations.$inferSelect[]; total: number }> {
    const conditions = [];
    if (opts.storeId) conditions.push(eq(staffInvitations.storeId, opts.storeId));
    if (opts.status) conditions.push(eq(staffInvitations.status, opts.status));

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.staffInvitations.findMany({
        where,
        orderBy: desc(staffInvitations.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        with: { store: { columns: { id: true, name: true } } },
      }),
      db.select({ count: count() }).from(staffInvitations).where(where ?? sql`1=1`),
    ]);

    return { data: rows, total: totalResult[0]?.count ?? 0 };
  },

  async deleteStaff(userId: string, storeId: string): Promise<void> {
    await db.delete(users).where(and(eq(users.id, userId), eq(users.storeId, storeId)));
  },

  async revokeInvitation(invitationId: string) {
    const [updated] = await db.update(staffInvitations)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(eq(staffInvitations.id, invitationId))
      .returning();
    return updated;
  },

  async findUserById(userId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  },

  async findInvitationById(id: string) {
    return db.query.staffInvitations.findFirst({
      where: eq(staffInvitations.id, id),
    });
  },
};