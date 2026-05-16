# Testing Patterns

Use `node:test` (Node.js built-in) or `vitest` for testing. Use Fastify's `inject()` method for API testing without starting a real server.

## API Test Example

```typescript
// test/merchant/products.test.ts
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../../src/app';

describe('Merchant Products API', () => {
  let app: FastifyInstance;
  let authCookie: string;

  beforeEach(async () => {
    app = await buildApp();

    // Login to get auth cookie
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/auth/login',
      payload: { email: 'test@example.com', password: 'TestPass123' }
    });
    authCookie = loginResponse.headers['set-cookie'] as string;
  });

  afterEach(async () => {
    await app.close();
  });

  test('GET /products - returns products list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/products',
      headers: { cookie: authCookie }
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.ok(Array.isArray(body.products));
  });

  test('GET /products - requires auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/products'
      // No cookie = no auth
    });

    assert.strictEqual(response.statusCode, 401);
  });

  test('POST /products - validates body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/products',
      headers: { cookie: authCookie },
      payload: { titleEn: '' }  // Invalid - empty title
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('POST /products - rejects unknown fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/products',
      headers: { cookie: authCookie },
      payload: {
        titleEn: 'Test Product',
        salePrice: '10.00',
        categoryId: 'valid-uuid-here',
        maliciousField: 'hacked'  // Should be rejected by strictObject
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });
});
```

## Test Organization

```
apps/backend/
├── test/
│   ├── helpers/
│   │   ├── setup.ts        ← Test DB setup, seed data
│   │   └── auth.ts         ← Login helpers, token generators
│   ├── merchant/
│   │   ├── products.test.ts
│   │   ├── orders.test.ts
│   │   └── categories.test.ts
│   ├── public/
│   │   └── store.test.ts
│   ├── customer/
│   │   └── checkout.test.ts
│   └── superAdmin/
│       └── merchants.test.ts
```

## Key Testing Rules

1. **Use `fastify.inject()`** — Never start a real server in tests
2. **Test auth boundaries** — Every test suite should verify 401/403 behavior
3. **Test Zod validation** — Verify unknown fields are rejected
4. **Isolate with transactions** — Wrap each test in a DB transaction and rollback
5. **Never mock the database** — Use a test database with the same schema