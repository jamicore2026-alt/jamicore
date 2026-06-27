// Per-identifier (email) login rate limit.
//
// P1-S3: the IP-based @fastify/rate-limit buckets can be bypassed by rotating
// the X-Forwarded-For header (one fresh value per request → fresh bucket each
// time), defeating the 5/min brute-force cap on /auth/login. This helper adds
// a per-EMAIL bucket backed by Redis, so an attacker rotating IPs still cannot
// exceed `max` attempts against a single account per minute.
//
// Skipped in dev/test (mirrors the global rate-limit plugin) for e2e compat.

import { env } from '../config/env.js';
import { ErrorCodes } from '../errors/codes.js';

const WINDOW_SECONDS = 60;

interface RedisLike {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
}

export interface LoginRateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

export async function checkLoginRateLimit(
  redis: RedisLike,
  scope: string,
  identifier: string,
  max: number,
): Promise<LoginRateLimitResult> {
  if (!env.isProduction) {
    return { allowed: true, retryAfter: 0 };
  }

  const key = `rl:login:${scope}:${identifier.toLowerCase()}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  if (count > max) {
    const ttl = await redis.ttl(key);
    return { allowed: false, retryAfter: ttl > 0 ? ttl : WINDOW_SECONDS };
  }
  return { allowed: true, retryAfter: 0 };
}

export function loginRateLimitPayload(retryAfter: number) {
  return {
    error: 'Too Many Requests',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    message: 'Too many login attempts. Please try again later.',
    retryAfter,
  };
}