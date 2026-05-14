// apps/backend/src/services/redis.service.ts
import { createRedisClient } from '../lib/redis.js';
import { env } from '../config/env.js';

export const redis = createRedisClient(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
