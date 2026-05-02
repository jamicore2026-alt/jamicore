import { db } from '../db/index.js';
import { carts } from '../db/schema.js';
import { and, lt, isNotNull, gt } from 'drizzle-orm';
import type { QueueService } from '../services/queue.service.js';
import type { RedisClientType } from '../lib/redis.js';

import type { Logger } from 'pino';

const LOCK_KEY = 'cron:abandoned-cart:lock';
const LOCK_TTL_SECONDS = 60; // 1 minute — longer than the job should take

export async function runAbandonedCartCron(
  queueService: QueueService,
  logger: Logger,
  redis: RedisClientType,
) {
  // Distributed lock: only one instance runs the cron
  const acquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
  if (!acquired) {
    logger.debug('Abandoned cart cron skipped: lock held by another instance');
    return;
  }

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const abandonedCarts = await db.select().from(carts)
      .where(and(
        isNotNull(carts.customerId),
        gt(carts.itemCount, 0),
        lt(carts.updatedAt, oneHourAgo),
        gt(carts.updatedAt, twoHoursAgo),
      ));

    for (const cart of abandonedCarts) {
      await queueService.abandonedCartQueue.add(
        'abandoned-cart',
        { storeId: cart.storeId, cartId: cart.id, customerId: cart.customerId! },
        { jobId: `ac-${cart.id}`, attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
      );
    }

    logger.info(`Enqueued ${abandonedCarts.length} abandoned cart recovery emails`);
  } finally {
    await redis.del(LOCK_KEY);
  }
}
