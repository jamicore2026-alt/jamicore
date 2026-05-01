import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

describe('rate limiting', () => {
  it('returns 429 after exceeding login rate limit', async () => {
    process.env.FORCE_RATE_LIMIT = 'true';
    const { default: rateLimitPlugin } = await import('./rateLimit.js');

    const fastify = Fastify({ logger: false });
    await fastify.register(rateLimitPlugin);

    fastify.post('/api/v1/customer/auth/login', async () => ({ success: true }));

    // Make 6 rapid login requests (max 5 per minute for auth tier)
    for (let i = 0; i < 6; i++) {
      await fastify.inject({
        method: 'POST',
        url: '/api/v1/customer/auth/login',
        payload: { email: 'test@test.com', password: 'wrong' },
      });
    }

    const res = await fastify.inject({
      method: 'POST',
      url: '/api/v1/customer/auth/login',
      payload: { email: 'test@test.com', password: 'wrong' },
    });

    expect(res.statusCode).toBe(429);

    delete process.env.FORCE_RATE_LIMIT;
    await fastify.close();
  });
});
