// Queue Service - BullMQ for async job processing
import { Queue, Worker, type Job } from 'bullmq';

const parseRedisUrl = (url: string): Record<string, unknown> => {
  const parsed = new URL(url);
  const result: Record<string, unknown> = {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379'),
  };
  if (parsed.password) result.password = parsed.password;
  if (parsed.username && parsed.username !== 'default') result.username = parsed.username;
  const db = parsed.pathname.slice(1);
  if (db) result.db = parseInt(db);
  if (url.startsWith('rediss://')) {
    result.tls = {};
  }
  return result;
};

export const createQueueService = (redisUrl: string) => {
  const connection = parseRedisUrl(redisUrl);

  // Email queue
  const emailQueue = new Queue('emails', { connection });

  // Image processing queue
  const imageQueue = new Queue('images', { connection });

  // Analytics queue
  const analyticsQueue = new Queue('analytics', { connection });

  // Webhook delivery queue
  const webhookQueue = new Queue('webhooks', { connection });

  // Abandoned cart queue
  const abandonedCartQueue = new Queue('abandoned-cart', { connection });

  // Track workers for graceful shutdown
  const workers: Worker[] = [];

  const createWorker = <T>(
    queueName: string,
    processor: (job: Job<T>) => Promise<void>,
  ) => {
    const worker = new Worker<T>(queueName, processor, {
      connection,
      concurrency: 5,
    });
    workers.push(worker);
    return worker;
  };

  return {
    emailQueue,
    imageQueue,
    analyticsQueue,
    webhookQueue,
    abandonedCartQueue,
    createWorker,
    async closeAll(): Promise<void> {
      await Promise.all(workers.map((w) => w.close()));
      await emailQueue.close();
      await imageQueue.close();
      await analyticsQueue.close();
      await webhookQueue.close();
      await abandonedCartQueue.close();
    },
  };
};

export type QueueService = ReturnType<typeof createQueueService>;
