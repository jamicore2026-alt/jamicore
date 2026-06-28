/* eslint-disable @typescript-eslint/no-explicit-any */
// RLS Phase 1 prep — verifies the 4 ownership-verification `cartRepo.findCartById`
// reads in cart.route.public.ts (GET /, POST /items, PATCH /items/:itemId,
// DELETE /items/:itemId) are wrapped in withTenant(request.storeId) and that
// findCartById receives the forwarded sentinel tx. Was bare-db → would return
// zero rows under carts-RLS → cart reported "not found" → cartId cleared.
import Fastify from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock state ───
const { withTenantMock, sentinelTx } = vi.hoisted(() => {
  const withTenantMock = vi.fn();
  const sentinelTx = { __sentinel: 'route-tx' };
  return { withTenantMock, sentinelTx };
});

// ─── Mock withTenant: record storeId, forward sentinel tx ───
vi.mock('../../lib/withTenant.js', () => ({
  withTenant: async (storeId: string, fn: (tx: unknown) => Promise<unknown>) => {
    withTenantMock(storeId);
    return fn(sentinelTx);
  },
}));

// ─── Mock cartRepo (route calls findCartById directly for ownership check) ───
const { cartRepoMock } = vi.hoisted(() => ({
  cartRepoMock: {
    findCartById: vi.fn().mockResolvedValue({
      id: 'c1',
      storeId: 's1',
      customerId: undefined,
      items: [],
    }),
  },
}));
vi.mock('./cart.repo.js', () => ({ cartRepo: cartRepoMock }));

// ─── Mock cartService (downstream calls; already wrapped by Task 2) ───
const { cartServiceMock } = vi.hoisted(() => ({
  cartServiceMock: {
    getOrCreateCart: vi
      .fn()
      .mockResolvedValue({ cart: { id: 'c1', items: [] }, isNew: false }),
    addItem: vi
      .fn()
      .mockResolvedValue({ cart: { id: 'c1', items: [] }, item: { id: 'i1' } }),
    updateItemQuantity: vi
      .fn()
      .mockResolvedValue({ cart: { id: 'c1', items: [] }, item: { id: 'i1' } }),
    removeItem: vi.fn().mockResolvedValue({ cart: { id: 'c1', items: [] } }),
  },
}));
vi.mock('./cart.service.js', () => ({ cartService: cartServiceMock }));

// ─── Mock env (route uses env.isProduction for cookie secure flag) ───
vi.mock('../../config/env.js', () => ({ env: { isProduction: false } }));

import publicCartRoutes from './cart.route.public.js';

const STORE_ID = 's1';
const CART_ID = 'c1';
const ITEM_ID = '550e8400-e29b-41d4-a716-446655440050';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440001';

async function buildApp() {
  const app = Fastify({ logger: false });
  // Stub the public-scope storeId + cookies decorators.
  app.addHook('preHandler', async (req: any) => {
    req.storeId = STORE_ID;
    req.customerId = undefined;
    req.cookies = { cartId: CART_ID };
  });
  app.register(publicCartRoutes);
  return app;
}

describe('cart.route.public wraps findCartById in withTenant(storeId)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / verifies ownership inside withTenant(storeId) and threads tx', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/' });

    expect(res.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(cartRepoMock.findCartById).toHaveBeenCalledWith(
      CART_ID,
      STORE_ID,
      sentinelTx,
    );
    await app.close();
  });

  it('POST /items verifies ownership inside withTenant(storeId) and threads tx', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/items',
      payload: { productId: PRODUCT_ID, quantity: 2 },
    });

    expect(res.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(cartRepoMock.findCartById).toHaveBeenCalledWith(
      CART_ID,
      STORE_ID,
      sentinelTx,
    );
    await app.close();
  });

  it('PATCH /items/:itemId verifies ownership inside withTenant(storeId) and threads tx', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: `/items/${ITEM_ID}`,
      payload: { quantity: 2 },
    });

    expect(res.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(cartRepoMock.findCartById).toHaveBeenCalledWith(
      CART_ID,
      STORE_ID,
      sentinelTx,
    );
    await app.close();
  });

  it('DELETE /items/:itemId verifies ownership inside withTenant(storeId) and threads tx', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'DELETE',
      url: `/items/${ITEM_ID}`,
    });

    expect(res.statusCode).toBe(200);
    expect(withTenantMock).toHaveBeenCalledWith(STORE_ID);
    expect(cartRepoMock.findCartById).toHaveBeenCalledWith(
      CART_ID,
      STORE_ID,
      sentinelTx,
    );
    await app.close();
  });
});