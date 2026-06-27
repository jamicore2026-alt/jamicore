// Tenant context primitive for RLS. Runs `fn` inside a transaction on the
// app_tenant client with `app.tenant_id` set transaction-locally, so every
// query `fn` issues (via the tx it receives) is scoped to that tenant by the
// database's row-level-security policies.
//
// set_config(name, value, true) — the `true` is is_local: the value is scoped
// to the current transaction and resets at COMMIT/ROLLBACK. This is the ONLY
// safe way to set tenant context on a pooled connection (SET SESSION would
// leak across tenants when the connection is reused by another request).
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import type { DbOrTx } from '../modules/_shared/db-types.js';

export async function withTenant<T>(
  storeId: string,
  fn: (tx: DbOrTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${storeId}, true)`);
    return fn(tx);
  });
}