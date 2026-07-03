import { describe, it, expect, vi, beforeEach } from 'vitest';

// Force the production branch (the meaningful path) for these tests.
vi.mock('../config/env.js', () => ({
  env: { isProduction: true, isDevelopment: false, isTest: false },
}));

import { checkLoginRateLimit, loginRateLimitPayload } from './loginRateLimit.js';

function fakeRedis() {
  const store = new Map<string, number>();
  const ttls = new Map<string, number>();
  return {
    incr: vi.fn(async (k: string) => {
      const n = (store.get(k) ?? 0) + 1;
      store.set(k, n);
      return n;
    }),
    expire: vi.fn(async (k: string, s: number) => {
      ttls.set(k, s);
      return 1;
    }),
    ttl: vi.fn(async (k: string) => ttls.get(k) ?? -2),
  };
}

describe('checkLoginRateLimit (production branch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows up to max attempts then blocks the next', async () => {
    const redis = fakeRedis();
    for (let i = 0; i < 5; i++) {
      const r = await checkLoginRateLimit(redis, 'merchant', 'a@b.com', 5);
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkLoginRateLimit(redis, 'merchant', 'a@b.com', 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('buckets per (scope, identifier) — different email is independent', async () => {
    const redis = fakeRedis();
    for (let i = 0; i < 5; i++) await checkLoginRateLimit(redis, 'merchant', 'a@b.com', 5);
    const other = await checkLoginRateLimit(redis, 'merchant', 'other@b.com', 5);
    expect(other.allowed).toBe(true);
  });

  it('lowercases the identifier so case variants share a bucket', async () => {
    const redis = fakeRedis();
    await checkLoginRateLimit(redis, 'merchant', 'A@B.COM', 5);
    await checkLoginRateLimit(redis, 'merchant', 'a@b.com', 5);
    expect(redis.incr).toHaveBeenLastCalledWith('rl:login:merchant:a@b.com');
  });
});

describe('loginRateLimitPayload', () => {
  it('includes the RATE_LIMIT_EXCEEDED code and retryAfter', () => {
    const p = loginRateLimitPayload(42);
    expect(p.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(p.retryAfter).toBe(42);
  });
});