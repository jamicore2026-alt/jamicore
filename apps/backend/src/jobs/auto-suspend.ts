// Auto-suspend job � suspends stores whose trial has expired
import { dbAdmin } from '../db/index.js';
import { stores } from '../db/schema.js';
import { eq, and, lt } from 'drizzle-orm';

import type { Logger } from 'pino';

// Cross-tenant background job: scans ALL stores regardless of tenant context,
// so it runs on dbAdmin (BYPASSRLS). On app_tenant (RLS-enforced since
// migration 0031) a bare db read with no app.tenant_id fails closed → 0 rows.
export async function runAutoSuspend(logger: Logger) {
  const now = new Date();

  const expiredStores = await dbAdmin
    .select({ id: stores.id })
    .from(stores)
    .where(
      and(
        eq(stores.status, 'active'),
        lt(stores.trialEndsAt, now),
      ),
    );

  if (expiredStores.length === 0) {
    logger.info('[auto-suspend] No stores to suspend');
    return;
  }

  const ids = expiredStores.map((s) => s.id);

  await dbAdmin
    .update(stores)
    .set({ status: 'suspended', updatedAt: new Date() })
    .where(
      and(
        eq(stores.status, 'active'),
        lt(stores.trialEndsAt, now),
      ),
    );

  logger.info(`[auto-suspend] Suspended ${ids.length} store(s)`);
}
