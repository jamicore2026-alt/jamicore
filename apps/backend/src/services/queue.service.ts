// Queue Service - BullMQ for async job processing
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';

const parseRedisUrl = (url: string): ConnectionOptions => {
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
  return result as ConnectionOptions;
};

// PERF-009: bounded retry + retention across all queues. Without these,
// a job that always throws would be retried forever, and completed/failed
// jobs would accumulate in Redis indefinitely.
const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { count: 1_000, age: 7 * 24 * 60 * 60 }, // keep last 1k or 7d
  removeOnFail: { count: 5_000, age: 30 * 24 * 60 * 60 }, // keep last 5k or 30d
};

export const createQueueService = (redisUrl: string) => {
  const connection = parseRedisUrl(redisUrl);

  // Email queue
  const emailQueue = new Queue('emails', { connection, defaultJobOptions });

  // Image processing queue
  const imageQueue = new Queue('images', { connection, defaultJobOptions });

  // Analytics queue
  const analyticsQueue = new Queue('analytics', { connection, defaultJobOptions });

  // Webhook delivery queue
  const webhookQueue = new Queue('webhooks', { connection, defaultJobOptions });

  // Abandoned cart queue
  const abandonedCartQueue = new Queue('abandoned-cart', { connection, defaultJobOptions });

  // Notification queue
  const notificationQueue = new Queue('notifications', { connection, defaultJobOptions });

  // Track workers for graceful shutdown
  const workers: Worker[] = [];

  interface FailedJob {
    queueName: string;
    id: string;
    name: string;
    data: unknown;
    failedReason: string;
    timestamp: number;
  }

  /**
   * PERF-009: List the most recent failed jobs across all queues. BullMQ
   * already retains failed jobs for inspection (bounded by
   * removeOnFail above). This helper returns the merged list for a
   * super-admin "DLQ" view.
   */
  async function getFailedJobs(limit: number): Promise<FailedJob[]> {
    const allQueues: Queue[] = [emailQueue, imageQueue, analyticsQueue, webhookQueue, abandonedCartQueue, notificationQueue];
    const resultLists = await Promise.all(
      allQueues.map(async (q): Promise<FailedJob[]> => {
        const failed = await q.getJobs(['failed'], 0, limit - 1);
        return failed.map((job) => ({
          queueName: q.name,
          id: String(job.id),
          name: job.name,
          data: job.data,
          failedReason: job.failedReason ?? '',
          timestamp: job.timestamp,
        }));
      }),
    );
    return resultLists.flat().sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

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

  /**
   * PERF-009: List the most recent failed jobs across all queues. BullMQ
   * already retains failed jobs for inspection (bounded by
   * removeOnFail above). This helper returns the merged list for a
   * super-admin "DLQ" view.
   */

  return {
    emailQueue,
    imageQueue,
    analyticsQueue,
    webhookQueue,
    abandonedCartQueue,
    notificationQueue,
    createWorker,
    getFailedJobs,
    async closeAll(): Promise<void> {
      await Promise.all(workers.map((w) => w.close()));
      await emailQueue.close();
      await imageQueue.close();
      await analyticsQueue.close();
      await webhookQueue.close();
      await abandonedCartQueue.close();
      await notificationQueue.close();
    },
  };
};

export type QueueService = ReturnType<typeof createQueueService>;
