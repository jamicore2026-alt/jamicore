// Redis client factory - handles ESM/CJS interop for ioredis
// ioredis doesn't play well with NodeNext module resolution

import IORedis from 'ioredis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RedisConstructor = (IORedis as any).default || IORedis;

export function createRedisClient(url: string, options: Record<string, unknown> = {}): RedisClientType {
  const opts: Record<string, unknown> = { ...options };
  if (url.startsWith('rediss://')) {
    opts.tls = {};
  }
  return new RedisConstructor(url, opts);
}

// Define Redis client type based on what we actually use
export interface RedisClientType {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string | number, ...args: unknown[]): Promise<[string, string[]]>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  on(event: string, callback: (...args: unknown[]) => void): void;
}
