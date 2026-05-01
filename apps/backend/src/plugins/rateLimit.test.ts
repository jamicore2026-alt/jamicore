import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

describe('rate limiting', () => {
  it('returns 429 after exceeding auth tier limit (5/min)', async () => {
    process.env.FORCE_RATE_LIMIT = 'true';
    const { default: rateLimitPlugin } = await import('./rateLimit.js');

    const fastify = Fastify({ logger: false });
    await fastify.register(rateLimitPlugin);

    fastify.post('/api/v1/customer/auth/login', async () => ({ success: true }));

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

  it('returns 429 after exceeding checkout tier limit (5/min)', async () => {
    process.env.FORCE_RATE_LIMIT = 'true';
    const { default: rateLimitPlugin } = await import('./rateLimit.js');

    const fastify = Fastify({ logger: false });
    await fastify.register(rateLimitPlugin);

    fastify.post('/api/v1/customer/checkout', async () => ({ success: true }));

    for (let i = 0; i < 6; i++) {
      await fastify.inject({
        method: 'POST',
        url: '/api/v1/customer/checkout',
      });
    }

    const res = await fastify.inject({
      method: 'POST',
      url: '/api/v1/customer/checkout',
    });

    expect(res.statusCode).toBe(429);

    delete process.env.FORCE_RATE_LIMIT;
    await fastify.close();
  });

  it('returns 429 after exceeding merchant tier limit (60/min)', async () => {
    process.env.FORCE_RATE_LIMIT = 'true';
    const { default: rateLimitPlugin } = await import('./rateLimit.js');

    const fastify = Fastify({ logger: false });
    await fastify.register(rateLimitPlugin);

    fastify.post('/api/v1/merchant/products', async () => ({ success: true }));

    for (let i = 0; i < 61; i++) {
      await fastify.inject({
        method: 'POST',
        url: '/api/v1/merchant/products',
        payload: { titleEn: 'test' },
      });
    }

    const res = await fastify.inject({
      method: 'POST',
      url: '/api/v1/merchant/products',
      payload: { titleEn: 'test' },
    });

    expect(res.statusCode).toBe(429);

    delete process.env.FORCE_RATE_LIMIT;
    await fastify.close();
  });

  it('returns 429 after exceeding general tier limit (100/min)', async () => {
    process.env.FORCE_RATE_LIMIT = 'true';
    const { default: rateLimitPlugin } = await import('./rateLimit.js');

    const fastify = Fastify({ logger: false });
    await fastify.register(rateLimitPlugin);

    fastify.get('/api/v1/customer/wishlist', async () => ({ items: [] }));

    for (let i = 0; i < 101; i++) {
      await fastify.inject({
        method: 'GET',
        url: '/api/v1/customer/wishlist',
      });
    }

    const res = await fastify.inject({
      method: 'GET',
      url: '/api/v1/customer/wishlist',
    });

    expect(res.statusCode).toBe(429);

    delete process.env.FORCE_RATE_LIMIT;
    await fastify.close();
  });

  it('allows requests within public-read tier limit (300/min)', async () => {
    process.env.FORCE_RATE_LIMIT = 'true';
    const { default: rateLimitPlugin } = await import('./rateLimit.js');

    const fastify = Fastify({ logger: false });
    await fastify.register(rateLimitPlugin);

    fastify.get('/api/v1/public/products', async () => ({ items: [] }));

    for (let i = 0; i < 50; i++) {
      const res = await fastify.inject({
        method: 'GET',
        url: '/api/v1/public/products',
      });
      expect(res.statusCode).toBe(200);
    }

    delete process.env.FORCE_RATE_LIMIT;
    await fastify.close();
  });
});
