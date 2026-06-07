// Domain repository — Drizzle queries for domain_verifications + store domain management
import { db } from '../../db/index.js';
import { domainVerifications, stores } from '../../db/schema.js';
import { eq, and, count, or, desc } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export const domainRepo = {
  async findByStoreId(storeId: string) {
    return db.query.domainVerifications.findMany({
      where: eq(domainVerifications.storeId, storeId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
  },

  async findById(id: string, storeId?: string) {
    const conditions = storeId
      ? [eq(domainVerifications.id, id), eq(domainVerifications.storeId, storeId)]
      : [eq(domainVerifications.id, id)];
    return db.query.domainVerifications.findFirst({
      where: and(...conditions),
    });
  },

  async findPendingVerifications() {
    return db.query.domainVerifications.findMany({
      where: eq(domainVerifications.status, 'pending_dns'),
    });
  },

  async checkDomainExists(domain: string, excludeStoreId?: string): Promise<boolean> {
    // Check subdomains on stores
    const subdomainMatch = await db.query.stores.findFirst({
      where: eq(stores.domain, domain),
    });
    if (subdomainMatch && subdomainMatch.id !== excludeStoreId) return true;

    // Check custom domains on stores
    const customMatch = await db.query.stores.findFirst({
      where: eq(stores.customDomain, domain),
    });
    if (customMatch && customMatch.id !== excludeStoreId) return true;

    // Check active verifications
    const verMatch = await db.query.domainVerifications.findFirst({
      where: and(
        eq(domainVerifications.domain, domain),
        or(
          eq(domainVerifications.status, 'pending_dns'),
          eq(domainVerifications.status, 'dns_verified'),
          eq(domainVerifications.status, 'ssl_provisioning'),
          eq(domainVerifications.status, 'live'),
        ),
      ),
    });
    if (verMatch && verMatch.storeId !== excludeStoreId) return true;

    return false;
  },

  async create(
    data: {
      storeId: string;
      domain: string;
      verificationType: string;
      cnameTarget?: string | null;
      txtName?: string | null;
      txtValue?: string | null;
    },
    tx?: DbOrTx,
  ) {
    const executor = tx ?? db;
    const [result] = await executor.insert(domainVerifications).values(data).returning();
    return result!;
  },

  async updateStatus(
    id: string,
    data: {
      status?: string;
      sslStatus?: string;
      verifiedAt?: Date | null;
      lastCheckedAt?: Date;
      errorMessage?: string;
    },
    tx?: DbOrTx,
  ) {
    const executor = tx ?? db;
    const [result] = await executor
      .update(domainVerifications)
      .set(data)
      .where(eq(domainVerifications.id, id))
      .returning();
    return result!;
  },

  async delete(id: string, storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    await executor
      .delete(domainVerifications)
      .where(and(eq(domainVerifications.id, id), eq(domainVerifications.storeId, storeId)));
  },

  async updateStoreDomain(storeId: string, domain: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [result] = await executor
      .update(stores)
      .set({ domain, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return result!;
  },

  async updateStoreCustomDomain(
    storeId: string,
    customDomain: string,
    verified: boolean,
    tx?: DbOrTx,
  ) {
    const executor = tx ?? db;
    const [result] = await executor
      .update(stores)
      .set({
        customDomain,
        customDomainVerified: verified,
        customDomainVerifiedAt: verified ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId))
      .returning();
    return result!;
  },

  async clearStoreCustomDomain(storeId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    await executor
      .update(stores)
      .set({
        customDomain: null,
        customDomainVerified: false,
        customDomainVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId));
  },

  async findStoresWithCustomDomains(query: { status?: string; page: number; limit: number }) {
    const conditions: ReturnType<typeof eq>[] = [];
    if (query.status) {
      conditions.push(eq(domainVerifications.status, query.status));
    }
    const offset = (query.page - 1) * query.limit;
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Manual join since domainVerifications has no Drizzle relations defined
    const rows = await db
      .select({
        verification: domainVerifications,
        store: stores,
      })
      .from(domainVerifications)
      .innerJoin(stores, eq(domainVerifications.storeId, stores.id))
      .where(where)
      .orderBy(desc(domainVerifications.createdAt))
      .limit(query.limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: count() })
      .from(domainVerifications)
      .where(where);

    return {
      data: rows.map((r) => ({ ...r.verification, store: r.store })),
      total: totalResult[0]?.count ?? 0,
    };
  },
};
