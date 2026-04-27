// Auto-suspend job � suspends stores whose trial has expired
import { db } from '../db/index.js';
import { stores } from '../db/schema.js';
import { eq, and, lt } from 'drizzle-orm';

import type { Logger } from 'pino';

export async function runAutoSuspend(logger: Logger) {
  const now = new Date();

  const expiredStores = await db
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

  await db
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
