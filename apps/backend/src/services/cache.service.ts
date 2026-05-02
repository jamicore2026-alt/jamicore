// Cache Service - Redis-backed with stampede protection
import type { RedisClientType } from '../lib/redis.js';

const CACHE_TTL = {
  PRODUCTS: 300,
  CATEGORIES: 600,
  STORE: 60,
  ANALYTICS: 3600,
} as const;

export type CacheTTLKey = keyof typeof CACHE_TTL;

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  wrap<T>(key: string, fn: () => Promise<T>, ttl?: number, retries?: number): Promise<T>;
  getTTL(key: CacheTTLKey): number;
}

let cacheServiceInstance: CacheService | null = null;

export function setCacheServiceInstance(instance: CacheService) {
  cacheServiceInstance = instance;
}

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    throw new Error('Cache service not initialized. Ensure setCacheServiceInstance is called in index.ts');
  }
  return cacheServiceInstance;
}

export const createCacheService = (redis: RedisClientType): CacheService => ({
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    const jitter = Math.floor(Math.random() * ttl * 0.1);
    await redis.setex(key, ttl + jitter, JSON.stringify(value));
  },

  async delete(key: string): Promise<void> {
    await redis.del(key);
  },

  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  async wrap<T>(key: string, fn: () => Promise<T>, ttl: number = 300, retries = 10): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    // Distributed lock to prevent cache stampede
    const lockKey = `${key}:lock`;
    const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');

    if (!acquired) {
      if (retries <= 0) {
        // Lock held too long; fall through to compute anyway
        const data = await fn();
        await this.set(key, data, ttl);
        return data;
      }
      const baseDelay = 500 * (2 ** (10 - retries));
      const jitter = Math.floor(Math.random() * baseDelay * 0.3);
      const delay = Math.min(baseDelay + jitter, 2000);
      await new Promise((r) => setTimeout(r, delay));
      return this.wrap(key, fn, ttl, retries - 1);
    }

    try {
      const data = await fn();
      await this.set(key, data, ttl);
      return data;
    } finally {
      await redis.del(lockKey);
    }
  },

  getTTL(key: CacheTTLKey): number {
    return CACHE_TTL[key];
  },
});
