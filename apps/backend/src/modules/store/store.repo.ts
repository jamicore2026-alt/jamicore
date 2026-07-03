// Store repository — Drizzle queries only, no business logic.
// stores is the tenant root (its id IS the tenant id), so nearly every caller
// is pre-tenant (host-header resolution, registration, auth/session hooks) or
// cross-tenant (superAdmin). All methods default to dbAdmin (BYPASSRLS); a
// passed tx takes precedence. RLS-on-stores policy: id = app.tenant_id.
import { dbAdmin } from '../../db/index.js';
import { stores } from '../../db/schema.js';
import { eq, or } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export type StoreSelect = typeof stores.$inferSelect;
export type StoreInsert = typeof stores.$inferInsert;

export const storeRepo = {
  async findById(storeId: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? dbAdmin;
    return executor.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
  },

  // D1: resolve a store by EITHER its subdomain (stores.domain) OR its verified
  // custom domain (stores.customDomain). The previous implementation checked only
  // stores.domain, so every request on a merchant's custom domain missed and the
  // entire custom-domain feature returned 400 "Store not found".
  // Pre-tenant path (public host-header resolution) → dbAdmin bypass.
  async findByDomain(domain: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? dbAdmin;
    return executor.query.stores.findFirst({
      where: or(eq(stores.domain, domain), eq(stores.customDomain, domain)),
    });
  },

  async findByOwnerId(ownerEmail: string, tx?: DbOrTx): Promise<StoreSelect | undefined> {
    const executor = tx ?? dbAdmin;
    return executor.query.stores.findFirst({
      where: eq(stores.ownerEmail, ownerEmail),
    });
  },

  create(data: StoreInsert, tx?: DbOrTx) {
    const executor = tx ?? dbAdmin;
    return executor.insert(stores).values(data).returning();
  },

  update(storeId: string, data: Partial<StoreInsert>, tx?: DbOrTx) {
    const executor = tx ?? dbAdmin;
    return executor
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
  },
};